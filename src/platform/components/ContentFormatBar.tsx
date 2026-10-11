import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';

interface ContentFormatBarProps {
  containerRef: React.RefObject<HTMLElement>;
  /**
   * Optional extra buttons appended after the built-in formatting items (e.g.
   * "Insert iFrame"). Same contract as the built-ins: `run` fires on
   * mousedown-preventDefault so the editor selection survives.
   */
  extraItems?: Array<{ icon: React.ReactNode; label: string; run: () => void }>;
  /**
   * CMS-111: restrict which heading levels the bar offers (e.g. ['h3'] for
   * card-page section fields whose template only styles one level).
   * Default: all three.
   */
  allowedHeadings?: Array<'h1' | 'h2' | 'h3'>;
  /**
   * CMS-176: pin the bar to the top of the nearest scroll container so it
   * stays reachable while editing far down a long article (no more scrolling
   * back up to format a paragraph). The bar sticks within its parent — the
   * article body container — so it unsticks naturally at the end of the text.
   * Default false (small fields don't need it).
   */
  sticky?: boolean;
}

/**
 * WYSIWYG formatting bar for the article content preview (CMS-73).
 *
 * Drives the existing contentEditable container via document.execCommand so
 * editors can apply the same block formatting the Webflow rich-text editor
 * offers (headings, bullet/numbered lists, blockquote) without hand-editing
 * HTML. Mutations land in the same DOM the manual typing path uses, so the
 * panel's existing save-on-blur persistence picks them up unchanged.
 *
 * Buttons use onMouseDown + preventDefault (not onClick) so the selection in
 * the editable survives the button press — execCommand needs the live range.
 */
export function ContentFormatBar({ containerRef, extraItems, allowedHeadings = ['h1', 'h2', 'h3'], sticky = false }: ContentFormatBarProps) {
  const apply = (command: string, value?: string) => {
    const container = containerRef.current;
    if (!container) return;
    container.focus();
    document.execCommand(command, false, value);
  };

  /**
   * Headings apply to the SELECTED TEXT only — formatBlock would convert the
   * entire paragraph, which is never what an editor wants when they've
   * highlighted one phrase. Instead the selection is replaced by a heading
   * node via insertHTML: the browser splits the surrounding block, so the
   * text before/after the selection stays in its own paragraph(s). With a
   * collapsed caret (no selection) we keep the classic whole-block behaviour.
   */
  const applyHeading = (tag: 'h1' | 'h2' | 'h3') => {
    const container = containerRef.current;
    if (!container) return;
    container.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      if (container.contains(range.commonAncestorContainer)) {
        const holder = document.createElement('div');
        holder.appendChild(range.cloneContents());
        const inner = holder.innerHTML;
        if (inner.trim()) {
          document.execCommand('insertHTML', false, `<${tag}>${inner}</${tag}>`);
          return;
        }
      }
    }
    document.execCommand('formatBlock', false, `<${tag}>`);
  };

  const headingItems: Array<{ tag: 'h1' | 'h2' | 'h3'; icon: React.ReactNode; label: string }> = [
    { tag: 'h1', icon: <Heading1 className="w-3.5 h-3.5" />, label: 'Heading 1' },
    { tag: 'h2', icon: <Heading2 className="w-3.5 h-3.5" />, label: 'Heading 2' },
    { tag: 'h3', icon: <Heading3 className="w-3.5 h-3.5" />, label: 'Heading 3' },
  ];

  const items: Array<{ icon: React.ReactNode; label: string; run: () => void }> = [
    { icon: <Pilcrow className="w-3.5 h-3.5" />, label: 'Paragraph', run: () => apply('formatBlock', '<p>') },
    ...headingItems
      .filter((h) => allowedHeadings.includes(h.tag))
      .map((h) => ({ icon: h.icon, label: h.label, run: () => applyHeading(h.tag) })),
    { icon: <Bold className="w-3.5 h-3.5" />, label: 'Bold', run: () => apply('bold') },
    { icon: <Italic className="w-3.5 h-3.5" />, label: 'Italic', run: () => apply('italic') },
    { icon: <List className="w-3.5 h-3.5" />, label: 'Bullet list', run: () => apply('insertUnorderedList') },
    { icon: <ListOrdered className="w-3.5 h-3.5" />, label: 'Numbered list', run: () => apply('insertOrderedList') },
    { icon: <Quote className="w-3.5 h-3.5" />, label: 'Blockquote', run: () => apply('formatBlock', '<blockquote>') },
    ...(extraItems ?? []),
  ];

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 mb-1.5 px-1.5 py-1 border rounded-lg w-fit',
        sticky
          // Solid backdrop + shadow so article text scrolling underneath
          // doesn't bleed through; z-20 sits above body content/iframes.
          ? 'sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-border shadow-sm'
          : 'bg-muted/40 border-border/60'
      )}
      data-format-bar
    >
      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          variant="ghost"
          size="icon"
          title={item.label}
          aria-label={item.label}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onMouseDown={(e) => {
            e.preventDefault(); // keep the editor's selection alive
            item.run();
          }}
        >
          {item.icon}
        </Button>
      ))}
    </div>
  );
}
