import { Check, FileText, LayoutTemplate } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScratchPreview, TemplatePreview } from './TemplatePreview';
import type { PageTemplate } from './pageTemplates';

/**
 * Selectable template gallery with wireframe previews (CMS-150) — shared by
 * the New Article template step ("Start from a template OR from scratch")
 * and the Content Preview template library modal. Each card shows the
 * template's seeded structure as a mini preview, not just a name.
 */

export const SCRATCH_ID = 'scratch';

interface TemplateGalleryProps {
  templates: PageTemplate[];
  /** Currently selected option ('scratch' or a template id). */
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Template already applied to this article (Content Preview flow). */
  currentTemplateId?: string | null;
  /** Show the "Start from Scratch" card first. Default true. */
  includeScratch?: boolean;
  /** Card preview height cap in px. Default 120. */
  previewHeight?: number;
}

export function TemplateGallery({
  templates,
  selectedId,
  onSelect,
  currentTemplateId,
  includeScratch = true,
  previewHeight = 120,
}: TemplateGalleryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {includeScratch && (
        <button
          type="button"
          onClick={() => onSelect(SCRATCH_ID)}
          className={cn(
            'text-left rounded-lg border p-2.5 transition-all',
            selectedId === SCRATCH_ID
              ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
              : 'border-border hover:border-accent/40'
          )}
        >
          <ScratchPreview maxHeight={previewHeight} />
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-card-foreground">Start from Scratch</span>
            {selectedId === SCRATCH_ID && (
              <Badge className="text-[9px] px-1.5 py-0 bg-accent/15 text-accent border-0 gap-0.5 ml-auto">
                <Check className="h-2.5 w-2.5" /> Selected
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Blank article body — write without a predefined structure.
          </p>
        </button>
      )}

      {templates.map((template) => {
        const isSelected = template.id === selectedId;
        const isCurrent = template.id === currentTemplateId;
        return (
          <button
            type="button"
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={cn(
              'text-left rounded-lg border p-2.5 transition-all',
              isSelected
                ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                : 'border-border hover:border-accent/40'
            )}
          >
            <TemplatePreview template={template} maxHeight={previewHeight} />
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <LayoutTemplate className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-[12px] font-semibold text-card-foreground">{template.name}</span>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{template.pageType}</Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 tabular-nums">
                {template.sections.length} sections
              </Badge>
              {isCurrent && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-accent/40 text-accent">
                  Current
                </Badge>
              )}
              {isSelected && (
                <Badge className="text-[9px] px-1.5 py-0 bg-accent/15 text-accent border-0 gap-0.5 ml-auto">
                  <Check className="h-2.5 w-2.5" /> Selected
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">{template.description}</p>
          </button>
        );
      })}
    </div>
  );
}
