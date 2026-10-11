import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ImageIcon, Copy, ExternalLink, Loader2, Sparkles, Check, Trash2, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { EditAIImageDialog, assetService, type AssetDocument } from '@/modules/assets';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { callExtractSourceImages, callUpdateArticle } from '../services/articleService';
import {
  dismissSourceImage,
  toggleSourceImageSelection,
  upsertEditedSourceImage,
  visibleSourceImages,
  type VisibleSourceImage,
} from './sourceImageSelection';
import type { PipelineArticle, SelectedSourceImage } from '../types';

/**
 * Source Article Images (CMS-53 / CMS-67) — Content Preview tab.
 *
 * Lists the images used by the researched/selected source articles (stored
 * sourceUrls + Deep Research citations) so the editor can pick which to
 * reuse. Extraction runs via the extractSourceImages callable and persists
 * to article.sourceImages.
 *
 * CMS-67 turns the list into a working selection tool:
 * - SELECT: picks persist on article.selectedSourceImages (updateArticle
 *   callable) and render visually distinct;
 * - REMOVE: dismissed URLs persist on article.dismissedSourceImageUrls so a
 *   re-scan doesn't bring them back;
 * - EDIT WITH AI: reuses the Asset Library's EditAIImageDialog — the source
 *   image is imported as an asset (uploadAssetFromURL), edited via the
 *   editAIImage function, and the edited result lands in the Asset Library
 *   AND in this article's selection (replacing prior edits of the same
 *   original).
 */
export function SourceImagesSection({ article }: { article: PipelineArticle }) {
  const { role } = useAuth();
  const canEditWithAI = role === Role.Admin || role === Role.Editor;

  const [scanning, setScanning] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());

  // Optimistic local mirrors of the persisted selection state — updated
  // immediately on click, confirmed (or reverted on error) by the article
  // subscription round-trip.
  const [selected, setSelected] = useState<SelectedSourceImage[]>(article.selectedSourceImages ?? []);
  const [dismissed, setDismissed] = useState<string[]>(article.dismissedSourceImageUrls ?? []);
  useEffect(() => {
    setSelected(article.selectedSourceImages ?? []);
    setDismissed(article.dismissedSourceImageUrls ?? []);
  }, [article.id, article.selectedSourceImages, article.dismissedSourceImageUrls]);

  // Edit-with-AI dialog state
  const [preparingUrl, setPreparingUrl] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{ image: VisibleSourceImage; asset: AssetDocument } | null>(null);

  const sourceImages = article.sourceImages ?? null;
  // Unloadable thumbnails hide unselected scan noise, but rows the editor
  // picked (incl. AI-edited versions) must never vanish silently — they stay
  // listed with a placeholder thumbnail.
  const images = visibleSourceImages(sourceImages, selected, dismissed)
    .filter((img) => img.selected || !brokenUrls.has(img.url));
  const selectedCount = selected.length;

  const hasSources =
    (article.sourceUrls?.length ?? 0) > 0 ||
    (article.researchBrief?.findings?.length ?? 0) > 0;

  const persistSelection = async (updates: {
    selectedSourceImages?: SelectedSourceImage[];
    dismissedSourceImageUrls?: string[];
  }) => {
    try {
      await callUpdateArticle(article.id, updates);
    } catch (err) {
      // Revert the optimistic state to what the article actually holds.
      setSelected(article.selectedSourceImages ?? []);
      setDismissed(article.dismissedSourceImageUrls ?? []);
      toast.error('Could not save image selection', { description: (err as Error).message });
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await callExtractSourceImages(article.id);
      setBrokenUrls(new Set());
      if ((result.images?.length ?? 0) === 0) {
        toast.info('No images found in the source articles');
      } else {
        toast.success(`${result.images.length} image${result.images.length === 1 ? '' : 's'} found in source articles`);
      }
    } catch (err) {
      toast.error('Source image scan failed', { description: (err as Error).message });
    } finally {
      setScanning(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success('Image URL copied');
      setTimeout(() => setCopiedUrl((prev) => (prev === url ? null : prev)), 2000);
    } catch {
      toast.error('Could not copy URL');
    }
  };

  const handleToggleSelect = (img: VisibleSourceImage) => {
    const next = toggleSourceImageSelection(selected, img);
    setSelected(next);
    void persistSelection({ selectedSourceImages: next });
  };

  const handleRemove = (img: VisibleSourceImage) => {
    const next = dismissSourceImage(selected, dismissed, img.url);
    setSelected(next.selectedSourceImages);
    setDismissed(next.dismissedSourceImageUrls);
    void persistSelection(next);
  };

  /**
   * Open the Asset Library's AI editor for a source image. External source
   * images are first imported into the Asset Library (uploadAssetFromURL)
   * and auto-selected for this article; already-imported/edited images reuse
   * their existing asset.
   */
  const handleEditWithAI = async (img: VisibleSourceImage) => {
    setPreparingUrl(img.url);
    try {
      let asset: AssetDocument | null = null;
      if (img.assetId) {
        asset = await assetService.getAsset(img.assetId);
      }
      if (!asset) {
        const imported = await assetService.uploadAssetFromURL({
          url: img.url,
          category: 'Photo',
          description: img.alt || `Source article image for "${article.title}"`,
          tags: ['source-article'],
        });
        asset = await assetService.getAsset(imported.assetId);
        if (!asset) throw new Error('Imported asset could not be loaded');
        // Remember the asset on the selection entry (auto-select) so a second
        // "Edit with AI" doesn't import a duplicate.
        const withoutImg = selected.filter((s) => s.url !== img.url);
        const next: SelectedSourceImage[] = [
          ...withoutImg,
          {
            url: img.url,
            sourceUrl: img.sourceUrl,
            alt: img.alt,
            assetId: asset.id,
            ...(img.editedFromUrl ? { editedFromUrl: img.editedFromUrl } : {}),
          },
        ];
        setSelected(next);
        void persistSelection({ selectedSourceImages: next });
      }
      setEditTarget({ image: img, asset });
    } catch (err) {
      toast.error('Could not open the AI image editor', { description: (err as Error).message });
    } finally {
      setPreparingUrl(null);
    }
  };

  /** An AI edit landed (new asset in the library) — put it in the selection. */
  const handleEdited = async (newAssetId: string, original: VisibleSourceImage) => {
    try {
      const asset = await assetService.getAsset(newAssetId);
      if (!asset) return;
      const next = upsertEditedSourceImage(selected, {
        url: asset.cdnUrl,
        sourceUrl: original.sourceUrl,
        alt: asset.altText || original.alt || 'AI-edited source image',
        assetId: newAssetId,
        // Chain edits of edits back to the first original so each original
        // keeps exactly one current AI version in the selection.
        editedFromUrl: original.editedFromUrl ?? original.url,
      });
      setSelected(next);
      await persistSelection({ selectedSourceImages: next });
      toast.success('AI-edited image saved to this article’s selection');
    } catch (err) {
      toast.error('Edited image could not be attached to the article', {
        description: (err as Error).message,
      });
    }
  };

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
          Source Article Images
          {selectedCount > 0 && (
            <span className="ml-2 normal-case tracking-normal text-primary font-semibold">
              {selectedCount} selected
            </span>
          )}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1"
          onClick={handleScan}
          disabled={scanning || !hasSources}
          title={hasSources ? undefined : 'Add source URLs or run Deep Research first'}
        >
          {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {scanning ? 'Scanning…' : sourceImages ? 'Re-scan Sources' : 'Scan Source Articles'}
        </Button>
      </div>

      {!sourceImages && !scanning && images.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">
          {hasSources
            ? 'Scan the researched source articles to list the images they use — then pick which to reuse.'
            : 'No source articles stored yet. Add source URLs or run Deep Research first.'}
        </p>
      )}

      {sourceImages && images.length === 0 && !scanning && (
        <p className="text-[11px] text-muted-foreground italic">
          No images found in the {sourceImages.scannedUrls.length} scanned source page{sourceImages.scannedUrls.length === 1 ? '' : 's'}.
        </p>
      )}

      {images.length > 0 && (
        <>
          {sourceImages && (
            <p className="text-[10px] text-muted-foreground">
              {images.length} image{images.length === 1 ? '' : 's'} from {sourceImages.scannedUrls.length} source page{sourceImages.scannedUrls.length === 1 ? '' : 's'}
              {sourceImages.failedPages > 0 && ` (${sourceImages.failedPages} page${sourceImages.failedPages === 1 ? '' : 's'} unreachable)`}
              {' '}— select the images to use in this article.
            </p>
          )}
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {images.map((img) => (
              <div
                key={img.url}
                className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                  img.selected
                    ? 'border-primary ring-1 ring-primary/40 bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={img.selected}
                  aria-label={img.selected ? 'Deselect image' : 'Select image for this article'}
                  title={img.selected ? 'Deselect image' : 'Select image for this article'}
                  onClick={() => handleToggleSelect(img)}
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    img.selected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/40 text-transparent hover:border-primary'
                  }`}
                >
                  <Check className="w-3 h-3" />
                </button>
                <div className="w-16 h-12 rounded bg-muted/50 overflow-hidden flex items-center justify-center shrink-0 border border-border/60">
                  {brokenUrls.has(img.url) ? (
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <img
                      src={img.url}
                      alt={img.alt || 'Source article image'}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={() => setBrokenUrls((prev) => new Set(prev).add(img.url))}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {img.edited && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 shrink-0 gap-0.5">
                        <Sparkles className="w-2 h-2" /> AI edited
                      </Badge>
                    )}
                    {img.selected && (
                      <Badge className="text-[8px] px-1 py-0 shrink-0 gap-0.5">
                        <CheckCircle2 className="w-2 h-2" /> Selected
                      </Badge>
                    )}
                    {img.alt && <p className="text-[11px] font-medium text-card-foreground truncate">{img.alt}</p>}
                  </div>
                  <p className="text-[10px] text-primary truncate" title={img.url}>{img.url}</p>
                  {img.sourceUrl && (
                    <a
                      href={img.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-muted-foreground hover:text-accent inline-flex items-center gap-0.5 truncate max-w-full"
                    >
                      from {(() => { try { return new URL(img.sourceUrl).hostname.replace('www.', ''); } catch { return img.sourceUrl; } })()}
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1"
                    onClick={() => handleCopy(img.url)}
                  >
                    {copiedUrl === img.url ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    {copiedUrl === img.url ? 'Copied' : 'Copy URL'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 border-accent/40 text-accent hover:bg-accent/10"
                    disabled={!canEditWithAI || preparingUrl !== null}
                    title={canEditWithAI ? 'Amend this image with AI for this article' : 'Admins and editors only'}
                    onClick={() => handleEditWithAI(img)}
                  >
                    {preparingUrl === img.url
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Sparkles className="w-3 h-3" />}
                    Edit with AI
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="Open image in new tab"
                    onClick={() => window.open(img.url, '_blank', 'noopener,noreferrer')}
                  >
                    <ImageIcon className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    title="Remove image from this list"
                    onClick={() => handleRemove(img)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Asset Library AI editor, reused inside the pipeline (CMS-67). */}
      {editTarget && (
        <EditAIImageDialog
          open
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
          asset={editTarget.asset}
          onEdited={(newAssetId) => void handleEdited(newAssetId, editTarget.image)}
        />
      )}
    </div>
  );
}
