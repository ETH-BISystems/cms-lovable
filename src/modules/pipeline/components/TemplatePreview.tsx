import { Image as ImageIcon, Table as TableIcon, List as ListIcon } from 'lucide-react';
import { sectionBlocks, type PageTemplate, type TemplateBlockKind } from './pageTemplates';

/**
 * Miniature wireframe preview of a page template (CMS-150) — renders the
 * section structure the template seeds (heading bars, photo slots, table
 * slots, bullet lists, text lines) so an editor can SEE the layout before
 * selecting it. Purely presentational; driven by the same template data
 * buildTemplateSkeletonHtml uses, so the preview always matches the seeded
 * article body.
 */

function TextLines() {
  return (
    <div className="space-y-1">
      <div className="h-1 rounded-full bg-muted-foreground/25 w-full" />
      <div className="h-1 rounded-full bg-muted-foreground/25 w-11/12" />
      <div className="h-1 rounded-full bg-muted-foreground/20 w-4/5" />
    </div>
  );
}

function ListLines() {
  return (
    <div className="space-y-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
          <div className={`h-1 rounded-full bg-muted-foreground/25 ${i === 2 ? 'w-2/3' : 'w-5/6'}`} />
        </div>
      ))}
    </div>
  );
}

function PhotoSlot() {
  return (
    <div className="rounded border border-dashed border-muted-foreground/40 bg-muted/40 h-7 flex items-center justify-center gap-1">
      <ImageIcon className="w-3 h-3 text-muted-foreground/60" />
      <span className="text-[7px] text-muted-foreground/70 font-medium">photo</span>
    </div>
  );
}

function TableSlot() {
  return (
    <div className="rounded border border-dashed border-muted-foreground/40 bg-muted/40 h-7 grid grid-cols-3 grid-rows-2 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-[0.5px] border-muted-foreground/20 flex items-center justify-center">
          {i === 1 && <TableIcon className="w-2.5 h-2.5 text-muted-foreground/50" />}
        </div>
      ))}
    </div>
  );
}

function BlockGlyph({ kind }: { kind: TemplateBlockKind }) {
  switch (kind) {
    case 'photo':
      return <PhotoSlot />;
    case 'table':
      return <TableSlot />;
    case 'list':
      return <ListLines />;
    case 'text':
    default:
      return <TextLines />;
  }
}

interface TemplatePreviewProps {
  template: PageTemplate;
  /** Height cap for the wireframe in px (rest fades out). Default 120. */
  maxHeight?: number;
}

export function TemplatePreview({ template, maxHeight = 120 }: TemplatePreviewProps) {
  return (
    <div
      className="relative rounded-md border border-border bg-card p-2 overflow-hidden select-none"
      style={{ maxHeight }}
      aria-hidden="true"
    >
      <div className="space-y-2">
        {template.sections.map((section, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-1">
              <div className="h-1.5 rounded-full bg-foreground/50 w-2/5" />
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-1">
              {sectionBlocks(section).map((kind, j) => (
                <BlockGlyph key={j} kind={kind} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* fade-out toward the cap so long templates read as "continues" */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
    </div>
  );
}

/** Blank-page wireframe used for the "Start from Scratch" option. */
export function ScratchPreview({ maxHeight = 120 }: { maxHeight?: number }) {
  return (
    <div
      className="relative rounded-md border border-dashed border-border bg-card p-2 overflow-hidden select-none flex flex-col items-center justify-center gap-2"
      style={{ maxHeight, minHeight: Math.min(maxHeight, 90) }}
      aria-hidden="true"
    >
      <ListIcon className="w-4 h-4 text-muted-foreground/40" />
      <div className="w-full space-y-1 px-3">
        <div className="h-1 rounded-full bg-muted-foreground/20 w-full" />
        <div className="h-1 rounded-full bg-muted-foreground/15 w-5/6" />
        <div className="h-1 rounded-full bg-muted-foreground/10 w-4/6" />
      </div>
      <span className="text-[8px] text-muted-foreground/60 font-medium">blank page</span>
    </div>
  );
}
