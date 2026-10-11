import { useMemo, useState } from 'react';
import { Link2, Loader2, Play, Search, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useExperiences,
  buildVideoEmbedHtml,
  callImportSocialPost,
  type ExperienceItem,
} from '@/modules/experience';

interface AddVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the Webflow-safe iframe HTML block and a human label. */
  onInsert: (embedHtml: string, label: string) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

/**
 * "Add Video" picker for the Content Preview tab (spec CMS-9 criterion 5).
 * Lists imported videos from the Experience Library with thumbnails, or
 * imports a pasted YouTube/TikTok/Instagram URL on the spot (via the
 * importSocialPost callable), then inserts a script-less iframe video block
 * at the caret — the block plays in the CMS preview and on the published
 * Webflow article (sanitizeRichText strips <script>, iframes survive).
 */
export function AddVideoDialog({ open, onOpenChange, onInsert }: AddVideoDialogProps) {
  const { items, loading, error } = useExperiences();
  const [search, setSearch] = useState('');
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Only items whose source URL converts to a script-less iframe embed
  const videos = useMemo(() => {
    const embeddable = items.filter(
      (i) => i.sourceUrl && buildVideoEmbedHtml(i.sourceUrl) !== null
    );
    if (!search.trim()) return embeddable;
    const q = search.toLowerCase();
    return embeddable.filter(
      (i) =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.caption || '').toLowerCase().includes(q) ||
        i.transcript.toLowerCase().includes(q) ||
        (i.accountHandle || '').toLowerCase().includes(q) ||
        (i.sourceUrl || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const insertItem = (item: ExperienceItem) => {
    const label = item.title || item.caption || item.sourceUrl || 'video';
    const html = item.sourceUrl ? buildVideoEmbedHtml(item.sourceUrl, item.title || item.caption || undefined) : null;
    if (!html) return;
    onInsert(html, label);
    onOpenChange(false);
  };

  const handleImportUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const html = buildVideoEmbedHtml(trimmed);
    if (!html) {
      toast.error('Not a supported video URL', {
        description: 'Paste a YouTube, TikTok, or Instagram video link.',
      });
      return;
    }
    setImporting(true);
    try {
      const result = await callImportSocialPost({ url: trimmed });
      toast.success(
        result.alreadyExisted
          ? 'Video already in the Experience Library — inserting'
          : 'Video imported to the Experience Library'
      );
      onInsert(html, trimmed);
      setUrl('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Video import failed', { description: (err as Error).message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-4 h-4" /> Add Video
          </DialogTitle>
          <DialogDescription>
            Pick an imported video or paste a video URL — it's inserted where your cursor was and
            plays on the published Webflow article.
          </DialogDescription>
        </DialogHeader>

        {/* Paste-a-URL import */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube, TikTok, or Instagram video URL…"
              className="pl-8 h-8 text-xs"
              disabled={importing}
            />
          </div>
          <Button size="sm" className="h-8 text-[11px] gap-1 shrink-0" onClick={handleImportUrl} disabled={importing || !url.trim()}>
            {importing ? <><Loader2 className="w-3 h-3 animate-spin" /> Importing…</> : 'Import & Insert'}
          </Button>
        </div>

        {/* Library search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search imported videos…"
            className="pl-8 h-8 text-xs"
          />
        </div>

        <ScrollArea className="max-h-[340px]">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
          ) : error ? (
            <p className="text-xs text-destructive text-center py-8">Failed to load videos: {error}</p>
          ) : videos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No imported videos found.</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Import YouTube, TikTok, or Instagram videos in the Experience Library — or paste a
                video URL above to import one now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pr-2">
              {videos.map((item) => (
                <button
                  key={item.id}
                  onClick={() => insertItem(item)}
                  className="text-left rounded-md border border-border overflow-hidden hover:border-accent/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="relative h-24 bg-muted">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <Badge variant="secondary" className="absolute top-1 left-1 text-[9px] px-1.5 py-0">
                      {PLATFORM_LABELS[item.source] || item.source}
                    </Badge>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-medium line-clamp-2">
                      {item.title || item.caption || item.sourceUrl || 'Untitled video'}
                    </p>
                    {item.accountHandle && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.accountHandle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
