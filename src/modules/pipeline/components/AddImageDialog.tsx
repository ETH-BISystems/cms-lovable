import { useState } from 'react';
import { ImagePlus, Library, Loader2, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AssetPickerDialog,
  GenerateAIImageDialog,
  UploadDialog,
  assetService,
  type AssetDocument,
} from '@/modules/assets';
import { buildImageEmbedHtml } from '../utils/imageEmbed';

interface AddImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the Webflow-safe figure/img HTML block and a human label. */
  onInsert: (imgHtml: string, label: string) => void;
  /** Recording the asset↔article usage association (context: 'inline').
   * Optional (CMS-107): card embed fields insert images without an article
   * context — the usage-tracking call is skipped when absent. */
  articleId?: string;
}

type Source = 'library' | 'upload' | 'generate' | null;

/**
 * "Add Image" picker for the Content Preview tab (CMS-96) — insert an image
 * at the caret, anywhere in the article body. Mirrors the thumbnail flow the
 * team already knows (Select from Library / Upload / Generate with AI), then
 * inserts a <figure><img> block that renders in the CMS preview and survives
 * the Webflow publish sanitize (which only strips script/style elements,
 * event-handler attributes, and inline styles). Images inserted this way are
 * recorded on the asset's usage list with context 'inline'.
 */
export function AddImageDialog({ open, onOpenChange, onInsert, articleId }: AddImageDialogProps) {
  const [source, setSource] = useState<Source>(null);
  const [resolving, setResolving] = useState(false);

  const insertAsset = (asset: AssetDocument) => {
    const html = buildImageEmbedHtml(asset);
    if (!html) {
      toast.error('That asset has no image URL yet — pick another one.');
      return;
    }
    onInsert(html, asset.filename || 'image');
    // Non-blocking usage tracking; failures must not affect the insert.
    // Skipped outside article contexts (CMS-107 card embed fields).
    if (articleId) {
      assetService
        .addAssetToArticle({ assetId: asset.id, articleId, context: 'inline' })
        .catch(() => {});
    }
    setSource(null);
    onOpenChange(false);
  };

  // Upload / AI-generate resolve to an assetId — fetch the doc, then insert.
  const insertAssetId = async (assetId: string) => {
    if (resolving) return;
    setResolving(true);
    try {
      const asset = await assetService.getAsset(assetId);
      if (!asset) throw new Error('Asset not found in the library.');
      insertAsset(asset);
    } catch (err) {
      toast.error('Failed to insert image', { description: (err as Error).message });
    } finally {
      setResolving(false);
    }
  };

  const openSource = (next: Exclude<Source, null>) => {
    onOpenChange(false);
    setSource(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="w-4 h-4" /> Add Image
            </DialogTitle>
            <DialogDescription>
              Choose where the image comes from — it's inserted where your cursor was and renders
              on the published article.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => openSource('library')}
              className="flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors hover:border-primary hover:bg-muted/40"
            >
              <Library className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>
                <span className="block text-sm font-medium">Select from Library</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Pick an image already in the Asset Library.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => openSource('upload')}
              className="flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors hover:border-primary hover:bg-muted/40"
            >
              <Upload className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>
                <span className="block text-sm font-medium">Upload</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Upload a new image from your device — it's saved to the Library too.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => openSource('generate')}
              className="flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors hover:border-primary hover:bg-muted/40"
            >
              <Sparkles className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>
                <span className="block text-sm font-medium">Generate with AI</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Create a new image with the AI generator (saved to the Library).
                </span>
              </span>
            </button>
          </div>

          {resolving && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Preparing image…
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Library */}
      <AssetPickerDialog
        open={source === 'library'}
        onOpenChange={(v) => !v && setSource(null)}
        title="Insert Image from Asset Library"
        onSelect={insertAsset}
      />

      {/* Device upload — lands in the Library, then inserts */}
      <UploadDialog
        open={source === 'upload'}
        onOpenChange={(v) => !v && setSource(null)}
        onUploadComplete={(assetId) => insertAssetId(assetId)}
      />

      {/* AI generation — content images default to landscape 16:9 at 2K */}
      <GenerateAIImageDialog
        open={source === 'generate'}
        onOpenChange={(v) => !v && setSource(null)}
        defaultAspectRatio="16:9"
        defaultResolution="2K"
        onSaved={(assetId) => insertAssetId(assetId)}
      />
    </>
  );
}
