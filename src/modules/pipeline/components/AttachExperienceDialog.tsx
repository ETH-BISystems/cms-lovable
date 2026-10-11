import { useMemo, useState } from 'react';
import { Library, Link2, Search, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useExperiences,
  callAttachToArticle,
  callDetachFromArticle,
  type ExperienceItem,
} from '@/modules/experience';

interface AttachExperienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
  articleTitle: string;
}

const SOURCE_LABELS: Record<string, string> = {
  'voice-note': 'Voice Note',
  'editorial-note': 'Editorial Note',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  'x-twitter': 'X/Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
};

/**
 * Attach Experience Library items (voice notes, editorial notes, imported
 * social transcripts) to the current article from inside the article panel —
 * the mirror of the Experience Library's ArticlePickerDialog. Attached
 * transcripts feed the article's E-E-A-T context and draft generation.
 */
export function AttachExperienceDialog({ open, onOpenChange, articleId, articleTitle }: AttachExperienceDialogProps) {
  const { items, loading } = useExperiences();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.caption || '').toLowerCase().includes(q) ||
        i.transcript.toLowerCase().includes(q) ||
        (i.accountHandle || '').toLowerCase().includes(q) ||
        (i.sourceUrl || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const isAttached = (item: ExperienceItem) => item.attachedArticles.some((a) => a.id === articleId);

  const handleAttach = async (item: ExperienceItem) => {
    setBusyId(item.id);
    try {
      await callAttachToArticle(item.id, articleId);
      toast.success('Experience attached', { description: item.title || item.caption || 'Attached to this article.' });
    } catch (err) {
      toast.error('Failed to attach experience', { description: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDetach = async (item: ExperienceItem) => {
    setBusyId(item.id);
    try {
      await callDetachFromArticle(item.id, articleId);
      toast.success('Experience detached');
    } catch (err) {
      toast.error('Failed to detach experience', { description: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="w-4 h-4" /> Attach Experience
          </DialogTitle>
          <DialogDescription>
            Attach voice notes and imported social transcripts to “{articleTitle}”. Attached
            experience feeds the article's E-E-A-T context and AI draft.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes and imported posts…"
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Plain scroll container with min-w-0: DialogContent is a grid, and
            nowrap titles would otherwise push rows wider than the dialog. */}
        <div className="max-h-[360px] overflow-y-auto min-w-0">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No experience items found.</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Record a note or import a social post in the Experience Library first.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 pr-2">
              {filtered.map((item) => {
                const attached = isAttached(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-md border border-border p-2.5"
                  >
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="w-16 h-12 object-cover rounded shrink-0 border border-border/60"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {SOURCE_LABELS[item.source] || item.source}
                        </Badge>
                        <span className="text-[11px] font-medium truncate flex-1">
                          {item.title || item.caption || item.sourceUrl || 'Untitled'}
                        </span>
                      </div>
                      {item.transcript && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{item.transcript}</p>
                      )}
                    </div>
                    {attached ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] text-destructive shrink-0"
                        disabled={busyId === item.id}
                        onClick={() => handleDetach(item)}
                      >
                        <Unlink className="w-3 h-3 mr-1" /> Detach
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] shrink-0"
                        disabled={busyId === item.id}
                        onClick={() => handleAttach(item)}
                      >
                        <Link2 className="w-3 h-3 mr-1" /> Attach
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
