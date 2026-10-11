import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ImageIcon, Loader2, Sparkles, Check, Trash2, CheckCircle2, Download, ImagePlus, ExternalLink, Library,
} from 'lucide-react';
import { toast } from 'sonner';
import { EditAIImageDialog, assetService, type AssetDocument } from '@/modules/assets';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { callExtractSourceImages, callUpdateArticle } from '../services/articleService';
import { buildImageEmbedHtml } from '../utils/imageEmbed';
import {
  dismissSourceImage,
  markSourceImageAsset,
  toggleSourceImageSelection,
  upsertEditedSourceImage,
  visibleSourceImages,
  type VisibleSourceImage,
} from './sourceImageSelection';
import type { PipelineArticle, SelectedSourceImage } from '../types';

interface SourceImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: PipelineArticle;
}

/**
 * Source Images popup at the Add Photos + SEO stage (CMS-155).
 *
 * Pulls every image used by the article's source pages (stored sourceUrls +
 * Deep Research citations) via the existing extractSourceImages callable and
 * shows them in a gallery so the writer can see what those articles used:
 *
 * - SELECT: multi-pick images (persists to article.selectedSourceImages, the
 *   same selection the Content Preview "Source Article Images" section shows);
 * - SAVE TO LIBRARY: downloads the picks server-side into the Asset Library
 *   (uploadAssetFromURL) with provenance (sourceUrl + originalImageUrl) on
 *   the asset doc;
 * - EDIT WITH AI: per-image adjustment workflow — reuses the Asset Library's
 *   EditAIImageDialog (OpenAI gpt-image-2) to amend/regenerate the image
 *   ("add a salt packet to the gray table"); the edit lands in the library
 *   (provenance carries forward + editedWithPrompt) and in the selection;
 * - INSERT INTO ARTICLE: appends the saved/edited image to the article body
 *   as a <figure><img> block (same embed HTML as the Content Preview Add
 *   Image flow) and records the asset↔article usage.
 */
export function SourceImagesDialog({ open, onOpenChange, article }: SourceImagesDialogProps) {
  const { role } = useAuth();
  // uploadAssetFromURL / editAIImage / addAssetToArticle are admin+editor only.
  const canManage = role === Role.Admin || role === Role.Editor;

  const [scanning, setScanning] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const autoScannedForRef = useRef<string | null>(null);

  // Optimistic local mirrors of the persisted selection (same pattern as the
  // Content Preview SourceImagesSection — both surfaces share the picks).
  const [selected, setSelected] = useState<SelectedSourceImage[]>(article.selectedSourceImages ?? []);
  const [dismissed, setDismissed] = useState<string[]>(article.dismissedSourceImageUrls ?? []);
  useEffect(() => {
    setSelected(article.selectedSourceImages ?? []);
    setDismissed(article.dismissedSourceImageUrls ?? []);
  }, [article.id, article.selectedSourceImages, article.dismissedSourceImageUrls]);

  // Bulk-save progress
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  // Edit-with-AI dialog state
  const [preparingUrl, setPreparingUrl] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<{ image: VisibleSourceImage; asset: AssetDocument } | null>(null);

  // Insert-into-article state
  const [insertingUrl, setInsertingUrl] = useState<string | null>(null);
  const [insertedUrls, setInsertedUrls] = useState<Set<string>>(new Set());

  const sourceImages = article.sourceImages ?? null;
  const images = visibleSourceImages(sourceImages, selected, dismissed)
    .filter((img) => img.selected || !brokenUrls.has(img.url));
  const selectedCount = selected.length;
  const unsavedCount = images.filter((i) => i.selected && !i.assetId).length;

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

  // First open: pull the source pages' images automatically when the article
  // hasn't been scanned yet (re-scans stay manual so the gallery is stable).
  useEffect(() => {
    if (!open) return;
    if (autoScannedForRef.current === article.id) return;
    autoScannedForRef.current = article.id;
    if (!article.sourceImages && hasSources) {
      void handleScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, article.id]);

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
   * Download the selected images into the Asset Library (server-side fetch →
   * Storage → asset doc with provenance). Already-saved picks are skipped, so
   * re-clicking after failures only retries the missing ones.
   */
  const handleSaveSelected = async () => {
    const toSave = images.filter((i) => i.selected && !i.assetId);
    if (toSave.length === 0) return;
    setSaving(true);
    setSaveProgress({ done: 0, total: toSave.length });
    let next = selected;
    const failures: string[] = [];
    for (const img of toSave) {
      try {
        const imported = await assetService.uploadAssetFromURL({
          url: img.url,
          category: 'Photo',
          description: img.alt || `Source article image for "${article.title}"`,
          tags: ['source-article'],
          ...(img.sourceUrl ? { sourceUrl: img.sourceUrl } : {}),
        });
        next = markSourceImageAsset(next, img.url, imported.assetId);
      } catch {
        failures.push(img.url);
      } finally {
        setSaveProgress((p) => ({ done: p.done + 1, total: p.total }));
      }
    }
    setSelected(next);
    await persistSelection({ selectedSourceImages: next });
    setSaving(false);
    const saved = toSave.length - failures.length;
    if (failures.length === 0) {
      toast.success(`Saved ${saved} image${saved === 1 ? '' : 's'} to the Asset Library`);
    } else if (saved > 0) {
      toast.warning(`Saved ${saved} of ${toSave.length} images — ${failures.length} could not be downloaded`);
    } else {
      toast.error('None of the selected images could be downloaded');
    }
  };

  /**
   * Open the AI adjustment workflow for one image. External source images are
   * imported into the Asset Library first (with provenance) and auto-selected;
   * already-imported/edited images reuse their existing asset.
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
          ...(img.sourceUrl ? { sourceUrl: img.sourceUrl } : {}),
        });
        asset = await assetService.getAsset(imported.assetId);
        if (!asset) throw new Error('Imported asset could not be loaded');
        // Auto-select + remember the asset so a second edit/save doesn't
        // import a duplicate.
        const ensured = selected.some((s) => s.url === img.url)
          ? selected
          : toggleSourceImageSelection(selected, img);
        const next = markSourceImageAsset(ensured, img.url, imported.assetId);
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
      toast.success('AI-edited image saved to the Asset Library and this article’s selection');
    } catch (err) {
      toast.error('Edited image could not be attached to the article', {
        description: (err as Error).message,
      });
    }
  };

  /**
   * Insert a saved/edited image into the article body. The stage panel has no
   * editor caret, so the figure block appends to the body (the writer can move
   * it in Content Preview); usage tracking mirrors the Add Image flow.
   */
  const handleInsert = async (img: VisibleSourceImage) => {
    if (!img.assetId || insertingUrl) return;
    setInsertingUrl(img.url);
    try {
      const asset = await assetService.getAsset(img.assetId);
      if (!asset) throw new Error('Asset not found in the library.');
      const html = buildImageEmbedHtml(asset);
      if (!html) throw new Error('That asset has no image URL yet.');
      const current = (article.content ?? '').trimEnd();
      await callUpdateArticle(article.id, { content: current ? `${current}\n${html}` : html });
      // Non-blocking usage tracking; failures must not affect the insert.
      assetService
        .addAssetToArticle({ assetId: asset.id, articleId: article.id, context: 'inline' })
        .catch(() => {});
      setInsertedUrls((prev) => new Set(prev).add(img.url));
      toast.success('Image inserted at the end of the article body');
    } catch (err) {
      toast.error('Could not insert image', { description: (err as Error).message });
    } finally {
      setInsertingUrl(null);
    }
  };

  const busy = saving || preparingUrl !== null || insertingUrl !== null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-4 h-4" /> Source Article Images
              {selectedCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {selectedCount} selected
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Images the {sourceImages?.scannedUrls.length ?? ''} source articles use — select the ones to
              reuse, save them to the Asset Library, amend with AI, then insert into the article.
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5"
              onClick={handleScan}
              disabled={scanning || saving || !hasSources}
              title={hasSources ? undefined : 'Add source URLs or run Deep Research first'}
            >
              {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {scanning ? 'Scanning…' : sourceImages ? 'Re-scan Sources' : 'Scan Source Articles'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
              onClick={handleSaveSelected}
              disabled={!canManage || busy || unsavedCount === 0}
              title={canManage ? 'Download the selected images into the Asset Library' : 'Admins and editors only'}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {saving
                ? `Saving ${saveProgress.done} of ${saveProgress.total}…`
                : unsavedCount > 0
                  ? `Save ${unsavedCount} Selected to Library`
                  : selectedCount > 0
                    ? 'All Selected Saved'
                    : 'Save Selected to Library'}
            </Button>
            {sourceImages && (
              <p className="text-[11px] text-muted-foreground ml-auto">
                {images.length} image{images.length === 1 ? '' : 's'} from {sourceImages.scannedUrls.length} source page{sourceImages.scannedUrls.length === 1 ? '' : 's'}
                {sourceImages.failedPages > 0 && ` (${sourceImages.failedPages} unreachable)`}
              </p>
            )}
          </div>

          {/* Gallery / states */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {scanning && images.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Pulling images from the source articles…</span>
              </div>
            )}

            {!sourceImages && !scanning && images.length === 0 && (
              <div className="text-center py-16">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {hasSources
                    ? 'Scan the source articles to list the images they use.'
                    : 'No source articles stored yet — add source URLs on the Overview tab or run Deep Research first.'}
                </p>
              </div>
            )}

            {sourceImages && images.length === 0 && !scanning && (
              <div className="text-center py-16">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No images found in the {sourceImages.scannedUrls.length} scanned source page{sourceImages.scannedUrls.length === 1 ? '' : 's'}.
                </p>
              </div>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-1">
                {images.map((img) => {
                  const inserted = insertedUrls.has(img.url) || (!!article.content && !!img.assetId && article.content.includes(img.url));
                  return (
                    <div
                      key={img.url}
                      className={`relative rounded-lg border overflow-hidden bg-card transition-colors ${
                        img.selected ? 'border-primary ring-2 ring-primary/40' : 'border-border'
                      }`}
                    >
                      <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center">
                        {brokenUrls.has(img.url) ? (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
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

                      {/* Select checkbox */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={img.selected}
                        aria-label={img.selected ? 'Deselect image' : 'Select image for this article'}
                        title={img.selected ? 'Deselect image' : 'Select image for this article'}
                        onClick={() => handleToggleSelect(img)}
                        className={`absolute top-2 left-2 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                          img.selected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-background/80 border-muted-foreground/40 text-transparent hover:border-primary'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </button>

                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        {img.edited && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 gap-0.5">
                            <Sparkles className="w-2 h-2" /> AI edited
                          </Badge>
                        )}
                        {img.assetId && !img.edited && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 gap-0.5">
                            <Library className="w-2 h-2" /> In library
                          </Badge>
                        )}
                        {inserted && (
                          <Badge className="text-[8px] px-1 py-0 gap-0.5">
                            <CheckCircle2 className="w-2 h-2" /> Inserted
                          </Badge>
                        )}
                      </div>

                      <div className="p-2 space-y-1">
                        {img.alt && <p className="text-[11px] font-medium text-card-foreground truncate" title={img.alt}>{img.alt}</p>}
                        {img.sourceUrl && (
                          <a
                            href={img.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-muted-foreground hover:text-accent inline-flex items-center gap-0.5 truncate max-w-full"
                          >
                            from {(() => { try { return new URL(img.sourceUrl).hostname.replace('www.', ''); } catch { return img.sourceUrl; } })()}
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        )}
                        <div className="flex items-center gap-1 pt-0.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-1 px-1.5 border-accent/40 text-accent hover:bg-accent/10"
                            disabled={!canManage || busy}
                            title={canManage ? 'Amend this image with AI for this article' : 'Admins and editors only'}
                            onClick={() => handleEditWithAI(img)}
                          >
                            {preparingUrl === img.url
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Sparkles className="w-3 h-3" />}
                            Edit with AI
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-1 px-1.5"
                            disabled={!canManage || busy || !img.assetId || inserted || !(article.content ?? '').trim()}
                            title={
                              !canManage
                                ? 'Admins and editors only'
                                : !(article.content ?? '').trim()
                                  ? 'Generate the article body first'
                                  : !img.assetId
                                    ? 'Save to the Library first'
                                    : inserted
                                      ? 'Already in the article body'
                                      : 'Append this image to the article body'
                            }
                            onClick={() => handleInsert(img)}
                          >
                            {insertingUrl === img.url
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <ImagePlus className="w-3 h-3" />}
                            Insert
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-auto"
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Asset Library AI editor (OpenAI gpt-image-2), reused inside the pipeline. */}
      {editTarget && (
        <EditAIImageDialog
          open
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
          asset={editTarget.asset}
          onEdited={(newAssetId) => void handleEdited(newAssetId, editTarget.image)}
        />
      )}
    </>
  );
}
