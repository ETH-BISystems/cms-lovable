import { useMemo, useState } from 'react';
import { Search, LayoutTemplate } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PAGE_TEMPLATES, type PageTemplate } from './pageTemplates';
import { TemplateGallery } from './TemplateGallery';

interface TemplateLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently applied template id, if any. */
  currentTemplateId?: string | null;
  onSelect: (template: PageTemplate) => void;
}

/**
 * CMS page-template library (CMS-47, previews added CMS-150) — opened from
 * Content Preview. The editor picks the article's page layout from a gallery
 * of wireframe previews; the choice is recorded on the article and, when the
 * article has no content yet, the template's placeholder structure (photo
 * slots, table slots, section headings) is seeded into the body.
 */
export function TemplateLibraryModal({
  open,
  onOpenChange,
  currentTemplateId,
  onSelect,
}: TemplateLibraryModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return PAGE_TEMPLATES;
    const q = search.toLowerCase();
    return PAGE_TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.pageType.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.sections.some((s) => s.title.toLowerCase().includes(q))
    );
  }, [search]);

  const handleSelect = (template: PageTemplate) => {
    onSelect(template);
    onOpenChange(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-accent" /> Page Template Library
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates (review, guide, listicle...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-3 pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <LayoutTemplate className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No templates match your search.</p>
            </div>
          ) : (
            <TemplateGallery
              templates={filtered}
              selectedId={null}
              currentTemplateId={currentTemplateId}
              includeScratch={false}
              previewHeight={110}
              onSelect={(id) => {
                const template = filtered.find((t) => t.id === id);
                if (template) handleSelect(template);
              }}
            />
          )}
        </div>

        <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
          Click a template to apply it — existing content is never overwritten; a blank body gets the placeholder
          structure (photo slots, table slots, headings) seeded. Templates live in{' '}
          <code className="bg-muted px-1 rounded">pageTemplates.ts</code>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
