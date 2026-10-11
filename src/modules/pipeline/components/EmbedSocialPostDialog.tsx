import { useMemo, useState } from 'react';
import { Search, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useExperiences, type ExperienceItem } from '@/modules/experience';

interface EmbedSocialPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the selected item — its sourceUrl is guaranteed non-empty */
  onEmbed: (item: ExperienceItem) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  'x-twitter': 'X/Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
};

/**
 * Picks a social post from the Experience Library to embed inline in the
 * article content. Every imported post with a source URL is listed — the
 * caller builds a script-less iframe (YouTube/TikTok/Instagram/Facebook/
 * LinkedIn) or a linked thumbnail card (X/Twitter/Pinterest) from it, both
 * of which survive the publish sanitizer.
 */
export function EmbedSocialPostDialog({ open, onOpenChange, onEmbed }: EmbedSocialPostDialogProps) {
  const { items, loading } = useExperiences();
  const [search, setSearch] = useState('');

  const embeddable = useMemo(() => {
    const withEmbed = items.filter((i) => i.sourceUrl && i.sourceUrl.trim().length > 0);
    if (!search.trim()) return withEmbed;
    const q = search.toLowerCase();
    return withEmbed.filter(
      (i) =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.caption || '').toLowerCase().includes(q) ||
        i.transcript.toLowerCase().includes(q) ||
        (i.sourceUrl || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Embed Social Post
          </DialogTitle>
          <DialogDescription>
            Insert a social post from the Experience Library as an inline embed. Video platforms
            render as the native player; X/Twitter and Pinterest insert as a linked thumbnail card.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search imported posts…"
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto min-w-0">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
          ) : embeddable.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No imported posts found.</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Import a TikTok, Instagram, Facebook, YouTube, X/Twitter, LinkedIn, or Pinterest
                post in the Experience Library first — every imported post can be embedded.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 pr-2">
              {embeddable.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onEmbed(item);
                    onOpenChange(false);
                  }}
                  className="w-full text-left rounded-md border border-border p-2.5 hover:border-accent/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
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
                          {PLATFORM_LABELS[item.source] || item.source}
                        </Badge>
                        <span className="text-[11px] font-medium truncate flex-1">
                          {item.title || item.caption || item.sourceUrl || 'Untitled post'}
                        </span>
                      </div>
                      {item.transcript && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                          {item.transcript}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
