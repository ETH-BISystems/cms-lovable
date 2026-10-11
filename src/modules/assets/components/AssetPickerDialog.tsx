/**
 * AssetPickerDialog Component (CMS-13)
 *
 * Article→asset direction picker: from an article context (e.g. the pipeline
 * panel's Content Preview tab), pick an image from the Asset Library.
 * The inverse direction (asset→article) is ArticlePicker.
 *
 * Features:
 * - Real assets from Firestore (drafts excluded — same guard as ArticlePicker)
 * - Search by filename, description, alt text, or tags
 * - Grid with thumbnails + dimensions
 * - Optional 9:16 Reel-portrait hint with a non-blocking warning when the
 *   selected image is another aspect ratio (CMS-13 thumbnail target format)
 * - Loading / empty / error states
 *
 * The dialog only *selects* — the caller persists the choice (e.g. via the
 * addAssetToArticle Cloud Function), keeping mutation ownership with the
 * feature that opened the picker.
 */

import { useEffect, useMemo, useState } from 'react';
import { Search, ImageIcon, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { searchAssets } from '../services/assetService';
import { isReelPortrait, REEL_PORTRAIT } from '../utils/imageAspect';
import type { AssetDocument } from '../types';

export interface AssetPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen library asset. The caller persists the selection. */
  onSelect: (asset: AssetDocument) => void;
  /** Dialog title (defaults to "Select from Asset Library"). */
  title?: string;
  /**
   * Show the 1080×1920 (9:16) Reel-portrait target hint and warn
   * (non-blocking) when the selected image has another aspect ratio.
   */
  showReelPortraitHint?: boolean;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select from Asset Library',
  showReelPortraitHint = false,
}: AssetPickerDialogProps) {
  const [assets, setAssets] = useState<AssetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // CMS-108: picker filters — visible whenever the dialog is open.
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [newOnly, setNewOnly] = useState(false);

  // Fetch on open (one-time read; the library rarely changes mid-pick)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    searchAssets('')
      .then((fetched) => {
        if (cancelled) return;
        // Draft assets cannot be assigned to articles (same guard as ArticlePicker)
        setAssets(fetched.filter((a) => a.status !== 'draft'));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load the asset library.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Filter option lists derive from the loaded library so every real value
  // (including tags like 'Transfer Partner Logo') is selectable.
  const categoryOptions = useMemo(
    () => Array.from(new Set(assets.map((a) => a.category).filter(Boolean))).sort(),
    [assets]
  );
  const tagOptions = useMemo(
    () => Array.from(new Set(assets.flatMap((a) => a.tags ?? []).filter(Boolean))).sort(),
    [assets]
  );

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (categoryFilter !== 'all') result = result.filter((a) => a.category === categoryFilter);
    if (tagFilter !== 'all') result = result.filter((a) => (a.tags ?? []).includes(tagFilter));
    if (newOnly) {
      const cutoff = Date.now() - 30 * 86_400_000;
      result = result.filter((a) => (a.uploadedAt?.toMillis?.() ?? 0) >= cutoff);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.filename.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.altText.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          (a.category ?? '').toLowerCase().includes(q) ||
          (a.source ?? '').toLowerCase().includes(q) ||
          (a.format ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [assets, search, categoryFilter, tagFilter, newOnly]);

  const selectedAsset = selectedId
    ? assets.find((a) => a.id === selectedId) ?? null
    : null;

  // Non-blocking 9:16 warning — only when dimensions are known (device
  // uploads store 0×0 until populated; the caller re-checks after selection)
  const selectedNotPortrait =
    showReelPortraitHint &&
    !!selectedAsset &&
    selectedAsset.width > 0 &&
    selectedAsset.height > 0 &&
    !isReelPortrait(selectedAsset.width, selectedAsset.height);

  const handleConfirm = () => {
    if (!selectedAsset) return;
    onSelect(selectedAsset);
    setSelectedId(null);
    setSearch('');
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedId(null);
      setSearch('');
      setCategoryFilter('all');
      setTagFilter('all');
      setNewOnly(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[700px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-[15px] font-bold">{title}</DialogTitle>
          {showReelPortraitHint && (
            <DialogDescription className="text-[11px]">
              Target format: {REEL_PORTRAIT.width}×{REEL_PORTRAIT.height} (9:16
              Reel portrait). Other ratios work but may crop on publish.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Search + filters (filters always visible — CMS-108) */}
        <div className="px-5 py-3 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-[12px] pl-9"
              placeholder="Search images by name, description, or tags..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[150px] text-[11px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="h-8 w-[170px] text-[11px]">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tagOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground">
              <Checkbox checked={newOnly} onCheckedChange={(v) => setNewOnly(!!v)} className="scale-90" />
              New uploads (30 days)
            </label>
          </div>
          {!loading && !error && (
            <p className="text-[10px] text-muted-foreground">
              {filteredAssets.length} of {assets.length} image{assets.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-[12px]">Loading asset library...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-8 h-8 text-destructive/60 mx-auto mb-2" />
              <p className="text-[12px] text-destructive">{error}</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">
                {assets.length === 0
                  ? 'No assets in the library yet'
                  : 'No images match your search'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = selectedId === asset.id;
                const preview = asset.thumbnailUrl || asset.cdnUrl;
                const hasDims = asset.width > 0 && asset.height > 0;
                const isPortrait = hasDims && isReelPortrait(asset.width, asset.height);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedId(asset.id)}
                    className={`relative rounded-lg border overflow-hidden cursor-pointer transition-all text-left ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center relative overflow-hidden">
                      {preview ? (
                        <img
                          src={preview}
                          alt={asset.altText || asset.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      )}
                      {showReelPortraitHint && isPortrait && (
                        <Badge className="absolute top-1.5 left-1.5 text-[8px] px-1.5 py-0 border-0 bg-success/80 text-white">
                          9:16
                        </Badge>
                      )}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] font-medium text-card-foreground truncate">
                        {asset.filename}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {hasDims ? `${asset.width}×${asset.height}` : 'Unknown size'}
                        {asset.sizeBytes ? ` · ${formatFileSize(asset.sizeBytes)}` : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0 space-y-2">
          {selectedNotPortrait && (
            <div className="flex items-start gap-2 bg-warning/10 text-warning-foreground rounded px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-warning" />
              <p className="text-[10px]">
                {selectedAsset?.width}×{selectedAsset?.height} is not 9:16
                portrait. You can still use it — the target thumbnail format is{' '}
                {REEL_PORTRAIT.width}×{REEL_PORTRAIT.height}.
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-[11px] bg-primary text-primary-foreground"
              disabled={!selectedAsset}
              onClick={handleConfirm}
            >
              Select Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
