import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Pencil, Loader2, X, AlertTriangle, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { callRewriteArticleSection } from '../services/articleService';

interface ContentEditToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  articleId: string;
  onContentUpdated?: (newContent: string) => void;
}

type RewriteMode = 'selection' | 'full';

/**
 * Floating toolbar that appears when text is selected in the content preview.
 * Offers:
 * - "Rewrite Selection" — rewrites just the selected text via Claude
 * - "Rewrite Article" — rewrites the full article with an instruction prompt
 *
 * Also supports manual inline editing via contentEditable on the container.
 */
export function ContentEditToolbar({
  containerRef,
  articleId,
  onContentUpdated,
}: ContentEditToolbarProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>('selection');
  const [instruction, setInstruction] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  // The live Range for the current selection — captured while the selection
  // exists (it collapses as soon as the user clicks the toolbar/prompt), so
  // the rewritten HTML can be spliced back in exactly where the user selected.
  const selectionRangeRef = useRef<Range | null>(null);
  // Ticket for the in-flight rewrite. Cancel and the timeout backstop mark it
  // stale, and a late-settling promise then discards its result instead of
  // splicing content into an article the user has already moved on from.
  const rewriteTicketRef = useRef<{ stale: boolean } | null>(null);

  const handleSelectionChange = useCallback(() => {
    if (showPrompt || isRewriting) return; // Don't interfere while prompt is open

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setShowToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setShowToolbar(false);
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 5) {
      setShowToolbar(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setSelectedText(text);
    selectionRangeRef.current = range.cloneRange();
    setRewriteError(null); // a fresh selection supersedes a previous failure
    setToolbarPos({
      top: rect.top - containerRect.top - 44,
      left: Math.min(
        Math.max(rect.left - containerRect.left + rect.width / 2, 80),
        containerRect.width - 80
      ),
    });
    setShowToolbar(true);
  }, [containerRef, showPrompt, isRewriting]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  // Close toolbar on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current && !toolbarRef.current.contains(e.target as Node) &&
        promptRef.current && !promptRef.current.contains(e.target as Node)
      ) {
        if (!showPrompt) setShowToolbar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPrompt]);

  const openRewritePrompt = (mode: RewriteMode) => {
    setRewriteMode(mode);
    setInstruction('');
    setRewriteError(null);
    setShowPrompt(true);
    setShowToolbar(false);
  };

  /** The element whose innerHTML is the article content. The outer container
   * also holds this toolbar's overlays — reading container.innerHTML would
   * save toolbar markup into the article, so always target the inner div. */
  const getContentElement = (): HTMLElement | null => {
    const container = containerRef.current;
    if (!container) return null;
    return (container.querySelector('[data-content-inner]') as HTMLElement | null) ?? container;
  };

  /**
   * Splice the rewritten HTML into the article at the captured selection.
   * A plain string replace on innerHTML fails whenever the selection spans
   * HTML tags or entities (which is almost always for paragraphs), so the
   * primary path replaces the saved DOM Range; the text replace is only a
   * fallback for simple intra-node selections. Returns the updated inner
   * HTML, or null when the selection can no longer be located.
   */
  const replaceSelectionInContent = (rewrittenHtml: string): string | null => {
    const contentEl = getContentElement();
    if (!contentEl) return null;

    const range = selectionRangeRef.current;
    if (range && contentEl.contains(range.commonAncestorContainer)) {
      try {
        range.deleteContents();
        range.insertNode(range.createContextualFragment(rewrittenHtml));
        return contentEl.innerHTML;
      } catch {
        // Range became stale (content re-rendered) — fall through
      }
    }

    const currentHtml = contentEl.innerHTML;
    if (selectedText && currentHtml.includes(selectedText)) {
      return currentHtml.replace(selectedText, rewrittenHtml);
    }
    return null;
  };

  const handleRewrite = async () => {
    if (!instruction.trim() && rewriteMode === 'full') {
      toast.error('Please provide an instruction for the rewrite');
      return;
    }

    const ticket = { stale: false };
    rewriteTicketRef.current = ticket;
    setIsRewriting(true);
    setShowPrompt(false);
    setRewriteError(null);

    // Backstop only — the callable below carries its own 120s timeout that
    // matches the Cloud Function budget. If that mechanism ever fails (sleeping
    // tab, dropped connection), this guarantees the overlay can never spin
    // forever. The ticket goes stale so a late result is discarded, not spliced.
    const timeoutId = setTimeout(() => {
      ticket.stale = true;
      setIsRewriting(false);
      setRewriteError('The rewrite timed out. Please try again.');
      toast.error('Rewrite timed out', { description: 'The AI took too long to respond. Please try again.' });
    }, 130000);

    try {
      // production: httpsCallable<..., { success; rewrittenContent }>(
      //   functions, 'rewriteArticleSection', { timeout: 120000 }) — the mock
      // resolves with the unwrapped payload.
      const payload: { articleId: string; instruction: string; sectionText?: string } = {
        articleId,
        instruction: instruction.trim() || `Improve this section for clarity, engagement, and SEO`,
      };

      // If selection mode, pass the selected text
      if (rewriteMode === 'selection' && selectedText) {
        payload.sectionText = selectedText;
        payload.instruction = instruction.trim() || `Rewrite this section to be more engaging and clear`;
      }

      const result = await callRewriteArticleSection(payload);

      // User cancelled (or the backstop fired) while Claude was still working —
      // discard the late result rather than editing an article they've left.
      if (ticket.stale) return;

      const rewritten = result.rewrittenContent;
      if (!result.success || !rewritten) {
        // Previously a silent no-op — the spinner cleared and nothing changed.
        throw new Error('The AI returned no rewritten content. Please try again.');
      }

      if (rewriteMode === 'selection') {
        const updatedHtml = replaceSelectionInContent(rewritten);
        if (!updatedHtml) {
          throw new Error('Could not locate the selected text in the article (it may have changed). Please re-select the paragraph and try again.');
        }
        onContentUpdated?.(updatedHtml);
        toast.success('Section rewritten', { description: 'The selected text has been updated.' });
      } else {
        // For full article mode: save the complete rewritten content
        onContentUpdated?.(rewritten);
        toast.success('Article rewritten', { description: 'The full content has been updated.' });
      }

      // Success — clear the consumed selection
      setSelectedText('');
      selectionRangeRef.current = null;
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      if (ticket.stale) return; // cancelled/timed-out — already handled
      const raw = err as Error & { code?: string };
      const message =
        raw.code === 'functions/deadline-exceeded'
          ? 'The rewrite took longer than 2 minutes and was cancelled. Please try again.'
          : raw.message || 'Rewrite failed. Please try again.';
      // Keep selection state so "Try Again" can re-run the same rewrite
      setRewriteError(message);
      toast.error('Rewrite failed', { description: message });
    } finally {
      clearTimeout(timeoutId);
      // Only the still-active rewrite may touch state — if a newer attempt has
      // already started, this settling promise belongs to a stale ticket and
      // must not clear the new attempt's spinner.
      if (rewriteTicketRef.current === ticket) {
        rewriteTicketRef.current = null;
        setIsRewriting(false);
      }
    }
  };

  /**
   * Cancel the in-flight rewrite. The HTTPS call itself can't be aborted, but
   * the stale ticket makes its late result a no-op — the overlay closes
   * immediately and the article is never touched. Selection state is kept so
   * the user can re-run the same rewrite straight away.
   */
  const handleCancelRewrite = () => {
    if (rewriteTicketRef.current) rewriteTicketRef.current.stale = true;
    setIsRewriting(false);
    toast.info('Rewrite cancelled');
  };

  const handleCancel = () => {
    setShowPrompt(false);
    setInstruction('');
    setShowToolbar(false);
    setRewriteError(null);
    selectionRangeRef.current = null;
    window.getSelection()?.removeAllRanges();
  };

  return (
    <>
      {/* Floating toolbar on text selection */}
      {showToolbar && !isRewriting && (
        <div
          ref={toolbarRef}
          className="absolute z-50 animate-in fade-in slide-in-from-bottom-1 duration-150"
          style={{ top: toolbarPos.top, left: toolbarPos.left, transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-card border border-border shadow-xl">
            <button
              onClick={() => openRewritePrompt('selection')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-foreground hover:bg-accent/10 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Rewrite Selection
            </button>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={() => openRewritePrompt('full')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-foreground hover:bg-accent/10 transition-colors whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-500" />
              Rewrite Article
            </button>
          </div>
        </div>
      )}

      {/* Rewrite instruction prompt (inline, not browser prompt()) */}
      {showPrompt && (
        <div
          ref={promptRef}
          className="absolute z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ top: toolbarPos.top + 8, left: toolbarPos.left, transform: 'translateX(-50%)' }}
        >
          <div className="w-[340px] bg-card border border-border rounded-xl shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-[12px] font-semibold text-foreground">
                  {rewriteMode === 'selection' ? 'Rewrite Selection' : 'Rewrite Entire Article'}
                </span>
              </div>
              <button onClick={handleCancel} className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>

            {rewriteMode === 'selection' && selectedText && (
              <div className="bg-muted/50 rounded-md px-3 py-2 border-l-3 border-accent/40">
                <p className="text-[10px] text-muted-foreground mb-0.5">Selected text:</p>
                <p className="text-[11px] text-foreground line-clamp-3 italic">
                  "{selectedText.slice(0, 150)}{selectedText.length > 150 ? '...' : ''}"
                </p>
              </div>
            )}

            <Textarea
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder={
                rewriteMode === 'selection'
                  ? 'How should this be rewritten? (e.g., "Make it more conversational", "Add more data points")'
                  : 'What should change? (e.g., "Make the intro more engaging", "Add more personal experience")'
              }
              className="text-[11px] min-h-[70px] resize-none"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleRewrite();
                }
              }}
            />

            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">⌘+Enter to submit</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[10px] bg-accent text-accent-foreground hover:bg-accent/90 gap-1"
                  onClick={handleRewrite}
                >
                  <Sparkles className="w-3 h-3" />
                  Rewrite
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error state — surfaced inline (with retry) instead of failing silently */}
      {rewriteError && !isRewriting && !showPrompt && (
        <div
          className="absolute z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ top: Math.max(toolbarPos.top, 0), left: toolbarPos.left, transform: 'translateX(-50%)' }}
        >
          <div className="w-[320px] bg-card border border-destructive/40 rounded-xl shadow-2xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-destructive">Rewrite failed</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{rewriteError}</p>
              </div>
              <button onClick={() => setRewriteError(null)} className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center shrink-0">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleCancel}>
                Dismiss
              </Button>
              <Button size="sm" className="h-7 text-[10px] gap-1" onClick={handleRewrite}>
                <RotateCw className="w-3 h-3" /> Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rewriting indicator — fixed to the VIEWPORT, not the content column:
          on long articles an absolute overlay centres the spinner thousands of
          pixels off-screen and the user just sees blurred text. Cancel lets
          the user bail instantly; the late response is discarded via ticket. */}
      {isRewriting && (
        <div className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4 shadow-2xl">
            <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-foreground">
                {rewriteMode === 'selection' ? 'Rewriting selection...' : 'Rewriting article...'}
              </p>
              <p className="text-[10px] text-muted-foreground">Claude is working — this can take up to 2 minutes</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] shrink-0"
              onClick={handleCancelRewrite}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
