import { useEffect, useMemo, useRef, useState } from 'react';
import { Frame, ArrowRightLeft, ImagePlus, Video, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { ContentFormatBar } from '@/platform/components/ContentFormatBar';
import { IframeInsertModal, type IframeHost } from '@/modules/iframes';
import { TpTableInsertModal } from '@/modules/transfer-partners';
import { AddImageDialog, AddVideoDialog, EmbedSocialPostDialog } from '@/modules/pipeline';
import { buildSocialEmbedHtml } from '@/modules/experience';

// ─── Value conversion ─────────────────────────────────────────────────────────
// The field stores HTML end-to-end (dashboard → Firestore → Webflow rich text,
// CMS-90). Legacy plain-text values are converted for editing exactly the way
// the sync converts them for Webflow: blank-line separated blocks become
// paragraphs, single newlines become <br>.

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function looksLikeHtml(value: string): boolean {
  return /<\s*[a-zA-Z][^>]*>/.test(value);
}

/** Legacy plain text → editable HTML; HTML passes through untouched. */
export function toEditableHtml(value: string): string {
  const text = (value ?? '').trim();
  if (text === '') return '';
  if (looksLikeHtml(text)) return text;
  return text
    .split(/\r?\n\s*\r?\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.split(/\r?\n/).map((line) => escapeHtml(line.trim())).filter(Boolean).join('<br>')}</p>`)
    .join('');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /**
   * When set, an "Insert iFrame" button appears in the format bar (iFrame
   * Manager). The host identifies this field for the embed audit index.
   */
  iframeHost?: IframeHost;
  /**
   * CMS-107: the full article-pipeline insert set — Insert iFrame, Insert TP
   * Table, Add Image, Add Video, Embed Social Post (requires iframeHost).
   */
  editorialTools?: boolean;
  /**
   * CMS-111: restrict the format bar's heading levels (e.g. ['h3'] for
   * card-page section fields whose template styles a single level).
   */
  allowedHeadings?: Array<'h1' | 'h2' | 'h3'>;
  /**
   * CMS-109: called with the field HTML immediately after a modal insert
   * (iFrame / TP Table / image / video / social). Lets the caller persist
   * embed inserts straight to Firestore instead of waiting for the tab's
   * manual Save — text edits still flow through the Save flow.
   */
  onPersist?: (html: string) => void;
}

/**
 * EMBED-INSERT COMMIT GUARANTEE — 2026-09-02, recurring production bug.
 *
 * ⚠️ AI WARNING — DO NOT "simplify" this back to a DOM-read-back-only commit.
 *
 * The bug: inserting an iFrame/TP-table embed looked fine in the editor (the
 * iframe rendered), but the value committed to state/Firestore was EMPTY —
 * the publish then pushed nothing to Webflow and reopening the card showed a
 * blank field. change_history proved it: insert-time writes arrived as ''
 * or never arrived at all. Root cause: the committed value was read BACK
 * from the contentEditable DOM (inner.innerHTML) after inserting the embed
 * node — and browser editable regions can silently drop iframe/script nodes,
 * or a stale caret range can insert into a detached node. The editor showed
 * one truth; the committed state told another.
 *
 * The rule enforced here: after ANY embed insert, the committed+persisted
 * value MUST contain that embed's `/iframe/<id>` src. If the DOM round-trip
 * lost it, the value is rebuilt deterministically (previous committed
 * content + the embed appended) — never trusting the DOM for embeds.
 */
export function computeEmbedInsertCommit(
  embedHtml: string,
  committedHtml: string,
  preInsertCommitted: string
): { value: string; domLost: boolean } {
  const embedSrc = embedHtml.match(/\/iframe\/[A-Za-z0-9_-]+/)?.[0] ?? null;
  // Not an iframe embed (image/video/social inserts) — nothing to guarantee.
  if (!embedSrc) return { value: committedHtml, domLost: false };
  // Normal case: the read-back kept the embed.
  if (committedHtml.includes(embedSrc)) return { value: committedHtml, domLost: false };
  // The DOM round-trip ate the embed. Rebuild: keep whatever content the
  // read-back DID capture, falling back to the pre-insert committed value
  // when even that came back empty.
  const base = committedHtml.trim() !== '' ? committedHtml : preInsertCommitted;
  return { value: `${base ? `${base}\n` : ''}${embedHtml}`, domLost: true };
}

/**
 * WYSIWYG rich-text field for card editorial content (CMS-90), reusing the
 * article pipeline's ContentFormatBar (CMS-73): paragraph/H1/H2/H3, bold,
 * italic, bullet/numbered lists, blockquote. The produced HTML is what the
 * Webflow sync pushes raw into the card's RichText fields.
 *
 * Edits commit to parent state on EVERY input (keystroke/paste) — committing
 * only on blur loses content when the user clicks Save/Publish directly from
 * the field: the click handler reads the pre-blur render closure (CMS-109
 * follow-up, 2026-08-24). The editable DOM remounts only when the value
 * changes EXTERNALLY (card switch, scrape, another editor), tracked against
 * the last HTML we committed ourselves — our own commits never remount, so
 * the caret is never lost mid-edit.
 *
 * iFrame embeds commit immediately on insert (modal focus makes blur-save
 * unreliable) — ALWAYS through computeEmbedInsertCommit (see its warning).
 * Embeds are rendered non-interactive here (pointer-events: none)
 * so they can't trap the caret; edit/delete them from the iFrame Manager.
 */
export function RichTextField({ label, value, onChange, placeholder, minHeight = 120, iframeHost, editorialTools = false, allowedHeadings, onPersist }: RichTextFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [iframePickerOpen, setIframePickerOpen] = useState(false);
  const [tpTablePickerOpen, setTpTablePickerOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [socialPickerOpen, setSocialPickerOpen] = useState(false);
  const initialHtml = useMemo(() => toEditableHtml(value), [value]);

  // External-change remount: only reset the editable DOM when the value
  // differs from the last HTML we committed ourselves.
  const lastCommittedRef = useRef<string | null>(null);
  const [mountKey, setMountKey] = useState(0);
  useEffect(() => {
    if (lastCommittedRef.current === null) {
      lastCommittedRef.current = initialHtml; // first-mount baseline
      return;
    }
    if (initialHtml !== lastCommittedRef.current) {
      lastCommittedRef.current = initialHtml;
      setMountKey((k) => k + 1);
    }
  }, [initialHtml]);

  const commitNow = (): string => {
    const container = containerRef.current;
    if (!container) return '';
    const inner = container.querySelector('[data-rich-text-inner]') as HTMLElement | null;
    const currentHtml = (inner ? inner.innerHTML : container.innerHTML).trim();
    const committed = currentHtml === '<br>' || currentHtml === '<p><br></p>' ? '' : currentHtml;
    lastCommittedRef.current = committed;
    onChange(committed);
    return committed;
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Focus moving to the format bar's buttons must not commit mid-edit —
    // the buttons preventDefault on mousedown precisely so the selection (and
    // focus) survives, but guard anyway.
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest?.('[data-format-bar]')) return;
    const inner = (e.target as HTMLElement).querySelector('[data-rich-text-inner]') as HTMLElement | null;
    const currentHtml = (inner ? inner.innerHTML : (e.target as HTMLElement).innerHTML).trim();
    if (currentHtml !== initialHtml) {
      onChange(currentHtml === '<br>' || currentHtml === '<p><br></p>' ? '' : currentHtml);
    }
  };

  // Capture the caret before the Insert-iFrame button/modal steals focus.
  const saveCaret = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = containerRef.current;
      if (container && container.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  const insertIframeAtCaret = (html: string, insertLabel = 'iFrame') => {
    const container = containerRef.current;
    const range = savedRangeRef.current;
    // Baseline for the embed guarantee: the last value we committed ourselves
    // (keystroke commits keep it current), never the possibly-stale prop.
    const preInsertCommitted = lastCommittedRef.current ?? initialHtml;
    if (container && range && container.contains(range.startContainer)) {
      const selection = window.getSelection();
      if (selection) {
        container.focus();
        selection.removeAllRanges();
        selection.addRange(range);
        range.deleteContents();
        const fragment = range.createContextualFragment(html);
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        // CMS-109: embed inserts persist immediately — the manual Save flow
        // remains for text edits. The committed value MUST go through the
        // embed guarantee (see computeEmbedInsertCommit): a DOM read-back
        // that lost the iframe would persist an empty lie (2026-09-02 bug).
        const { value: committed, domLost } = computeEmbedInsertCommit(html, commitNow(), preInsertCommitted);
        if (domLost) {
          // Persisted state now holds the embed but the editor DOM may not —
          // remount from the committed value so the editor shows the truth.
          lastCommittedRef.current = committed;
          onChange(committed);
          setMountKey((k) => k + 1);
          toast.warning(`${insertLabel} could not be placed at the caret — appended at the end of the field instead.`);
        }
        onPersist?.(committed);
        if (!domLost) toast.success(`Inserted ${insertLabel}`);
        savedRangeRef.current = null;
        return;
      }
    }
    // Fallback: append at end of the field (deterministic — no DOM read-back).
    const appended = `${preInsertCommitted ? `${preInsertCommitted}\n` : ''}${html}`;
    lastCommittedRef.current = appended;
    onChange(appended);
    onPersist?.(appended);
    toast.success(`Inserted ${insertLabel} at end of content`);
    savedRangeRef.current = null;
  };

  const iframeItems = iframeHost
    ? [
        {
          icon: <Frame className="w-3.5 h-3.5" />,
          label: 'Insert iFrame',
          run: () => {
            saveCaret();
            setIframePickerOpen(true);
          },
        },
        {
          icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
          label: 'Insert TP Table',
          run: () => {
            saveCaret();
            setTpTablePickerOpen(true);
          },
        },
        // CMS-107: full article-pipeline insert set
        ...(editorialTools
          ? [
              {
                icon: <ImagePlus className="w-3.5 h-3.5" />,
                label: 'Add Image',
                run: () => {
                  saveCaret();
                  setImagePickerOpen(true);
                },
              },
              {
                icon: <Video className="w-3.5 h-3.5" />,
                label: 'Add Video',
                run: () => {
                  saveCaret();
                  setVideoPickerOpen(true);
                },
              },
              {
                icon: <Share2 className="w-3.5 h-3.5" />,
                label: 'Embed Social Post',
                run: () => {
                  saveCaret();
                  setSocialPickerOpen(true);
                },
              },
            ]
          : []),
      ]
    : undefined;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground/70">{label}</label>
      <div ref={containerRef}>
        <ContentFormatBar containerRef={containerRef} extraItems={iframeItems} allowedHeadings={allowedHeadings} />
        <div
          // Remount the editable DOM only on EXTERNAL value changes (card
          // switch, scrape, another editor) — our own commits never remount,
          // so typing never loses the caret.
          key={mountKey}
          className="bg-card rounded-md border border-input shadow-inner px-3 py-2 text-sm prose prose-sm max-w-none text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-muted-foreground [&_iframe]:pointer-events-none"
          style={{ minHeight }}
          contentEditable
          suppressContentEditableWarning
          data-card-webflow-preview
          data-placeholder={placeholder ?? ''}
          onInput={() => commitNow()}
          onBlur={handleBlur}
          onKeyUp={saveCaret}
          onMouseUp={saveCaret}
        >
          <div data-rich-text-inner dangerouslySetInnerHTML={{ __html: initialHtml }} />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Formatting is stored as HTML and pushed raw into the Webflow rich text field.
      </p>
      {iframeHost && (
        <IframeInsertModal
          open={iframePickerOpen}
          onOpenChange={setIframePickerOpen}
          host={iframeHost}
          onInserted={insertIframeAtCaret}
        />
      )}
      {iframeHost && (
        <TpTableInsertModal
          open={tpTablePickerOpen}
          onOpenChange={setTpTablePickerOpen}
          host={iframeHost}
          onInserted={insertIframeAtCaret}
        />
      )}
      {iframeHost && editorialTools && (
        <>
          <AddImageDialog
            open={imagePickerOpen}
            onOpenChange={setImagePickerOpen}
            onInsert={(html, lbl) => insertIframeAtCaret(html, lbl)}
          />
          <AddVideoDialog
            open={videoPickerOpen}
            onOpenChange={setVideoPickerOpen}
            onInsert={(html, lbl) => insertIframeAtCaret(html, lbl)}
          />
          <EmbedSocialPostDialog
            open={socialPickerOpen}
            onOpenChange={setSocialPickerOpen}
            onEmbed={(item) => {
              const html = buildSocialEmbedHtml(item);
              if (html) insertIframeAtCaret(html, 'social post');
            }}
          />
        </>
      )}
    </div>
  );
}
