/**
 * EditAIImageDialog Component
 *
 * Iterative AI image editing dialog - similar to Nano Banana UX.
 * Shows current image, allows follow-up prompts, maintains edit history.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Loader2,
  Sparkles,
  Image as ImageIcon,
  History,
  ArrowRight,
  CheckCircle2,
  Plus,
  X
} from 'lucide-react';
import { editAIImage, fetchImageAsDataUrl } from '../services/assetService';
import { useImageSizes, imageSizeKey } from '../hooks/useImageSizes';
import { ImageUploadZone, UploadedImage } from './ImageUploadZone';
import type { AssetDocument, EditAIImageResult } from '../types';

export interface EditAIImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDocument;
  onEdited?: (newAssetId: string) => void;
}

interface EditHistoryEntry {
  assetId: string;
  prompt: string;
  cdnUrl: string;
  timestamp: Date;
}

export function EditAIImageDialog({
  open,
  onOpenChange,
  asset,
  onEdited,
}: EditAIImageDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [sourceImages, setSourceImages] = useState<UploadedImage[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAsset, setCurrentAsset] = useState<AssetDocument>(asset);
  const [instanceCount, setInstanceCount] = useState(1);
  const [strictMode, setStrictMode] = useState(false);
  const [variations, setVariations] = useState<Array<{ assetId: string; cdnUrl: string }>>([]);
  const { sizes, selectedSize, selectSize, addCustomSize, removeCustomSize } = useImageSizes();
  const [addSizeOpen, setAddSizeOpen] = useState(false);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [addSizeError, setAddSizeError] = useState<string | null>(null);
  const [addingSize, setAddingSize] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([
    {
      assetId: asset.id,
      prompt: asset.description,
      cdnUrl: asset.cdnUrl,
      timestamp: new Date(asset.uploadedAt.toDate()),
    },
  ]);

  const handleEdit = async () => {
    if (!prompt.trim()) {
      setError('Please enter an edit instruction');
      return;
    }

    try {
      setEditing(true);
      setError(null);

      // Process source images: upload URLs and convert files to data URLs
      const sourceImageUrls: string[] = [];

      for (const img of sourceImages) {
        if (img.url) {
          // For URLs, fetch as base64 data URI — no Firestore document created
          try {
            const dataUri = await fetchImageAsDataUrl(img.url);
            sourceImageUrls.push(dataUri);
          } catch (error) {
            console.error('Failed to fetch source image from URL:', error);
            setError(`Failed to load image from URL: ${img.url}`);
            setEditing(false);
            return;
          }
        } else if (img.dataUrl) {
          // Use data URL directly
          sourceImageUrls.push(img.dataUrl);
        }
      }

      const result = await editAIImage({
        assetId: currentAsset.id,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        sourceImages: sourceImageUrls.length > 0 ? sourceImageUrls : undefined,
        instanceCount,
        strictMode,
        width: selectedSize.width,
        height: selectedSize.height,
      });

      // Add to history
      const newHistoryEntry: EditHistoryEntry = {
        assetId: result.assetId,
        prompt: prompt.trim(),
        cdnUrl: result.cdnUrl,
        timestamp: new Date(),
      };

      setEditHistory([...editHistory, newHistoryEntry]);

      // If multiple variations were returned, show them for selection
      if (instanceCount > 1 && result.additionalAssets && result.additionalAssets.length > 0) {
        setVariations([
          { assetId: result.assetId, cdnUrl: result.cdnUrl },
          ...result.additionalAssets,
        ]);
      } else {
        setVariations([]);
      }

      // Update current asset (approximate - in real app would fetch from Firestore)
      setCurrentAsset({
        ...currentAsset,
        id: result.assetId,
        cdnUrl: result.cdnUrl,
        description: `${currentAsset.description} - ${prompt.trim()}`,
      });

      setPrompt('');
      setNegativePrompt('');
      setSourceImages([]);
      onEdited?.(result.assetId);
    } catch (err: any) {
      console.error('Image edit error:', err);
      setError(err.message || 'Failed to edit image');
    } finally {
      setEditing(false);
    }
  };

  const handleAddCustomSize = async () => {
    setAddingSize(true);
    try {
      const error = await addCustomSize(Number(customWidth), Number(customHeight));
      if (error) {
        setAddSizeError(error);
        return;
      }
      setAddSizeError(null);
      setCustomWidth('');
      setCustomHeight('');
      setAddSizeOpen(false);
    } finally {
      setAddingSize(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setNegativePrompt('');
    setSourceImages([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Edit AI Image
          </DialogTitle>
          <DialogDescription>
            Iteratively refine your image by adding follow-up instructions. Each edit creates a new version.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0">
          {/* Left Column: Current Image */}
          <div className="space-y-4 flex flex-col min-h-0 overflow-y-auto">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Current Version</Label>
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted border">
                <img
                  src={currentAsset.cdnUrl}
                  alt={currentAsset.description}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Variation Picker */}
            {variations.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Pick a variation</Label>
                <div className="grid grid-cols-2 gap-2">
                  {variations.map((v, i) => (
                    <div
                      key={v.assetId}
                      role="button"
                      tabIndex={0}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer ${
                        currentAsset.id === v.assetId ? 'border-primary' : 'border-muted'
                      }`}
                      onClick={() => {
                        setCurrentAsset({
                          ...currentAsset,
                          id: v.assetId,
                          cdnUrl: v.cdnUrl,
                        });
                        setVariations([]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCurrentAsset({
                            ...currentAsset,
                            id: v.assetId,
                            cdnUrl: v.cdnUrl,
                          });
                          setVariations([]);
                        }
                      }}
                    >
                      <img
                        src={v.cdnUrl}
                        alt={`Variation ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      <Badge className="absolute top-1 left-1" variant="secondary">
                        {i + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit History */}
            {editHistory.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Edit History ({editHistory.length} versions)
                </Label>
                <ScrollArea className="h-[200px] rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-3">
                    {editHistory.map((entry, index) => (
                      <div
                        key={entry.assetId}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer"
                        onClick={() => {
                          setCurrentAsset({
                            ...currentAsset,
                            id: entry.assetId,
                            cdnUrl: entry.cdnUrl,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setCurrentAsset({
                              ...currentAsset,
                              id: entry.assetId,
                              cdnUrl: entry.cdnUrl,
                            });
                          }
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <Badge variant={index === editHistory.length - 1 ? 'default' : 'outline'} className="mt-0.5">
                            {index === 0 ? 'Original' : `Edit ${index}`}
                          </Badge>
                          <div className="flex-1 text-xs">
                            <p className="text-muted-foreground line-clamp-2">
                              {entry.prompt}
                            </p>
                            {index === editHistory.length - 1 && (
                              <div className="flex items-center gap-1 mt-1 text-primary">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="font-medium">Current</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {index < editHistory.length - 1 && (
                          <div className="ml-14 mt-1">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Right Column: Edit Controls */}
          <div className="space-y-4 flex flex-col min-h-0 overflow-y-auto pr-2">
            {/* Reference Images */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Reference Images (optional)</Label>
              <ImageUploadZone
                images={sourceImages}
                onChange={setSourceImages}
                maxImages={3}
                disabled={editing}
              />
              <p className="text-xs text-muted-foreground">
                Add reference images to guide the AI (e.g., a champagne glass to add, a style to match)
              </p>
            </div>

            {/* Edit Prompt */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">What would you like to change?</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Add a glass of champagne on the table, make the lighting warmer, remove the background object..."
                rows={5}
                disabled={editing}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {sourceImages.length > 0
                  ? "Describe how to use the reference images (e.g., 'add the object from reference image to the foreground')"
                  : "Describe the specific changes you want. Be clear and concise."}
              </p>
            </div>

            {/* Negative Prompt */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Things to avoid (optional)</Label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, artifacts..."
                rows={2}
                disabled={editing}
                className="resize-none"
              />
            </div>

            {/* Strict Mode Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold cursor-pointer" htmlFor="strict-mode">
                  {strictMode ? '🔒 Strict / Technical' : '🎨 Creative'}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {strictMode
                    ? 'Preserve the original exactly — only make the specified change'
                    : 'AI can adjust the image freely to achieve the best result'}
                </p>
              </div>
              <button
                id="strict-mode"
                type="button"
                role="switch"
                aria-checked={strictMode}
                onClick={() => setStrictMode(!strictMode)}
                disabled={editing}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  strictMode ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                  strictMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Size Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Size</Label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1" data-testid="size-selector">
                <ToggleGroup
                  type="single"
                  value={imageSizeKey(selectedSize)}
                  onValueChange={(value) => {
                    if (value) selectSize(value);
                  }}
                  disabled={editing}
                  className="justify-start gap-2"
                >
                  {sizes.map((size) => {
                    const key = imageSizeKey(size);
                    return (
                      <div key={key} className="group relative flex-shrink-0">
                        <ToggleGroupItem
                          value={key}
                          aria-label={`${size.width} by ${size.height} pixels`}
                          className="h-8 whitespace-nowrap rounded-full border px-3 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {size.width} × {size.height}
                        </ToggleGroupItem>
                        {size.isCustom && (
                          <button
                            type="button"
                            aria-label={`Remove ${size.width} × ${size.height} size`}
                            onClick={() => removeCustomSize(key)}
                            disabled={editing}
                            className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex group-focus-within:flex"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </ToggleGroup>
                <Popover
                  open={addSizeOpen}
                  onOpenChange={(open) => {
                    setAddSizeOpen(open);
                    if (!open) setAddSizeError(null);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={editing}
                      className="h-8 flex-shrink-0 rounded-full px-3 text-xs"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add size
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 space-y-3" align="start">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="custom-size-width" className="text-xs">Width</Label>
                        <Input
                          id="custom-size-width"
                          type="number"
                          min={64}
                          max={4096}
                          value={customWidth}
                          onChange={(e) => setCustomWidth(e.target.value)}
                          placeholder="1024"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="custom-size-height" className="text-xs">Height</Label>
                        <Input
                          id="custom-size-height"
                          type="number"
                          min={64}
                          max={4096}
                          value={customHeight}
                          onChange={(e) => setCustomHeight(e.target.value)}
                          placeholder="1024"
                        />
                      </div>
                    </div>
                    {addSizeError && (
                      <p className="text-xs text-destructive">{addSizeError}</p>
                    )}
                    <Button size="sm" className="w-full" onClick={handleAddCustomSize} disabled={addingSize}>
                      {addingSize && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                      {addingSize ? 'Adding...' : 'Add'}
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-xs text-muted-foreground">
                Output dimensions for the edited image. OpenAI supports 1024 × 1024, 1536 × 1024, and 1024 × 1536 only.
              </p>
            </div>

            <Separator />

            {/* Variation Count */}
            <div className="space-y-2">
              <Label htmlFor="variation-count" className="text-sm font-semibold">Variations</Label>
              <select
                id="variation-count"
                data-testid="variation-count"
                value={instanceCount}
                onChange={(e) => setInstanceCount(Number(e.target.value))}
                disabled={editing}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value={1}>1 image</option>
                <option value={2}>2 images</option>
                <option value={3}>3 images</option>
                <option value={4}>4 images</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Generate multiple variations to choose from.
              </p>
            </div>

            {/* Status Messages */}
            {editing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Applying your edits...</span>
                </div>
                <Progress value={50} className="animate-pulse" />
                <p className="text-xs text-muted-foreground">
                  This may take 30-60 seconds. Please wait.
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!editing && editHistory.length > 1 && (
              <Alert>
                <ImageIcon className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Last edit applied successfully!</div>
                  <div className="mt-1 text-sm">
                    Continue editing or close to save.
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={editing}
          >
            {editHistory.length > 1 ? 'Done' : 'Cancel'}
          </Button>
          <Button
            onClick={handleEdit}
            disabled={editing || !prompt.trim()}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {editing ? 'Editing...' : 'Apply Edit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
