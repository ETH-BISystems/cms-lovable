/**
 * AssetDetailPanel Component
 *
 * Detailed view of asset with all metadata and actions.
 * Features:
 * - Image preview (full size)
 * - All metadata fields (editable)
 * - Usage tracker
 * - Actions: Edit, Delete, Sync to Webflow, Start AI Intake
 */

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Edit,
  Save,
  X,
  Trash2,
  Cloud,
  Sparkles,
  ExternalLink,
  Wand2,
  Paperclip,
  Archive,
  ArchiveRestore,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SEOScoreIndicator } from './SEOScoreIndicator';
import { TagsInput } from './TagsInput';
import { ContentTagsSection } from './ContentTagsSection';
import { UsageTracker } from './UsageTracker';
import { EditAIImageDialog } from './EditAIImageDialog';
import { ArticlePicker } from './ArticlePicker';
import { useAssetMutations } from '../hooks/useAssetMutations';
import { getWebflowSyncStatusColor } from '../services/webflowService';
import type { AssetDocument } from '../types';

export interface AssetDetailPanelProps {
  asset: AssetDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  onSync?: () => void;
  onAIIntake?: () => void;
}

export function AssetDetailPanel({
  asset,
  open,
  onOpenChange,
  onDelete,
  onSync,
  onAIIntake,
}: AssetDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editedAsset, setEditedAsset] = useState<Partial<AssetDocument>>({});
  const [editAIDialogOpen, setEditAIDialogOpen] = useState(false);

  const { mutationState, update } = useAssetMutations();

  if (!asset) {
    return null;
  }

  const handleEdit = () => {
    setEditing(true);
    setEditedAsset({
      filename: asset.filename,
      description: asset.description,
      altText: asset.altText,
      titleAttribute: asset.titleAttribute,
      tags: asset.tags,
      taxonomy: asset.taxonomy,
    });
  };

  const handleSave = async () => {
    try {
      await update({
        assetId: asset.id,
        fields: editedAsset,
      });
      setEditing(false);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditedAsset({});
  };

  const handleArchiveToggle = async () => {
    const archiving = asset.status !== 'archived';
    try {
      await update({
        assetId: asset.id,
        fields: { status: archiving ? 'archived' : 'active' },
      });
      toast.success(archiving ? 'Asset archived' : 'Asset restored', {
        description: archiving
          ? 'Moved to the Archived tab — restore it anytime.'
          : 'Asset is active again in the library.',
      });
      if (archiving) onOpenChange(false);
    } catch (error) {
      toast.error(archiving ? 'Archive failed' : 'Restore failed', {
        description: (error as Error).message,
      });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(asset.cdnUrl);
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = asset.filename || 'asset';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // CORS on the CDN can block a same-tab fetch — fall back to opening
      // the full-resolution image directly
      window.open(asset.cdnUrl, '_blank', 'noopener');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Asset Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Image Preview */}
          <div className="overflow-hidden rounded-lg border">
            <img
              src={asset.cdnUrl}
              alt={asset.altText}
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {!editing ? (
              <>
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                {['AI Generated', 'Upload', 'Stock'].includes(asset.source) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditAIDialogOpen(true)}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Edit with AI
                  </Button>
                )}
                {asset.status === 'draft' && onAIIntake && (
                  <Button size="sm" variant="outline" onClick={onAIIntake}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Intake
                  </Button>
                )}
                {asset.status !== 'draft' && onAIIntake && (
                  <Button size="sm" variant="outline" onClick={onAIIntake}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Re-run AI Intake
                  </Button>
                )}
                {/* Add to Article — ArticlePicker popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Paperclip className="mr-2 h-4 w-4" />
                      Add to Article
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <ArticlePicker
                      mode="full"
                      assetIds={[asset.id]}
                      assetStatus={asset.status}
                      onComplete={() => {}}
                    />
                  </PopoverContent>
                </Popover>
                {asset.status === 'active' && onSync && (
                  <Button size="sm" variant="outline" onClick={onSync}>
                    <Cloud className="mr-2 h-4 w-4" />
                    Sync to Webflow
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleArchiveToggle}
                  disabled={mutationState.loading}
                >
                  {asset.status === 'archived' ? (
                    <>
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                      Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={mutationState.loading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={mutationState.loading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>

          {mutationState.error && (
            <Alert variant="destructive">
              <AlertDescription>{mutationState.error.message}</AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Basic Information</h3>

            {/* Filename */}
            <div className="space-y-2">
              <Label>Filename</Label>
              {editing ? (
                <Input
                  value={editedAsset.filename || ''}
                  onChange={(e) =>
                    setEditedAsset({ ...editedAsset, filename: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{asset.filename}</p>
              )}
            </div>

            {/* Category & Format */}
            <div className="flex gap-2">
              <Badge>{asset.category}</Badge>
              <Badge variant="secondary">{asset.format}</Badge>
              <Badge variant={asset.status === 'active' ? 'success' : 'secondary'}>
                {asset.status}
              </Badge>
            </div>

            {/* Dimensions & Size */}
            <div className="text-sm text-muted-foreground">
              {asset.width} × {asset.height} • {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>

          <Separator />

          {/* SEO Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">SEO</h3>

            <SEOScoreIndicator score={asset.seoScore} />

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              {editing ? (
                <Textarea
                  value={editedAsset.description || ''}
                  onChange={(e) =>
                    setEditedAsset({ ...editedAsset, description: e.target.value })
                  }
                  rows={3}
                />
              ) : (
                <p className="text-sm">{asset.description}</p>
              )}
            </div>

            {/* Alt Text */}
            <div className="space-y-2">
              <Label>Alt Text</Label>
              {editing ? (
                <Textarea
                  value={editedAsset.altText || ''}
                  onChange={(e) =>
                    setEditedAsset({ ...editedAsset, altText: e.target.value })
                  }
                  rows={2}
                />
              ) : (
                <p className="text-sm">{asset.altText}</p>
              )}
            </div>

            {/* Title Attribute */}
            <div className="space-y-2">
              <Label>Title Attribute</Label>
              {editing ? (
                <Input
                  value={editedAsset.titleAttribute || ''}
                  onChange={(e) =>
                    setEditedAsset({ ...editedAsset, titleAttribute: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{asset.titleAttribute}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Tags & Keywords */}
          <div className="space-y-4">
            <h3 className="font-semibold">Tags & Keywords</h3>
            {editing ? (
              <TagsInput
                tags={editedAsset.tags || []}
                onChange={(tags) => setEditedAsset({ ...editedAsset, tags })}
              />
            ) : (
              <div className="space-y-3">
                {(asset.tags?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {asset.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags or keywords yet. Run AI Intake to generate them.</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Taxonomy */}
          <div className="space-y-4">
            <h3 className="font-semibold">Taxonomy</h3>
            {editing ? (
              <ContentTagsSection
                taxonomy={editedAsset.taxonomy || asset.taxonomy}
                onChange={(taxonomy) =>
                  setEditedAsset({ ...editedAsset, taxonomy })
                }
                freeTags={editedAsset.tags || asset.tags}
                onFreeTagsChange={(tags) =>
                  setEditedAsset({ ...editedAsset, tags })
                }
                assetId={asset.id}
              />
            ) : (
              <div className="space-y-2 text-sm">
                {(asset.taxonomy.airlines?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Airlines: </span>
                    {asset.taxonomy.airlines.join(', ')}
                  </div>
                )}
                {(asset.taxonomy.hotels?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Hotels: </span>
                    {asset.taxonomy.hotels.join(', ')}
                  </div>
                )}
                {asset.taxonomy.cabinClass && (
                  <div>
                    <span className="font-medium">Cabin: </span>
                    {asset.taxonomy.cabinClass}
                  </div>
                )}
                {(asset.taxonomy.creditCards?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Cards: </span>
                    {asset.taxonomy.creditCards.join(', ')}
                  </div>
                )}
                {(asset.taxonomy.aircraftTypes?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Aircraft: </span>
                    {asset.taxonomy.aircraftTypes.join(', ')}
                  </div>
                )}
                {(asset.taxonomy.lounges?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Lounges: </span>
                    {asset.taxonomy.lounges.join(', ')}
                  </div>
                )}
                {(asset.taxonomy.experienceTypes?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Experience: </span>
                    {asset.taxonomy.experienceTypes.join(', ')}
                  </div>
                )}
                {(asset.taxonomy.destinations?.length ?? 0) > 0 && (
                  <div>
                    <span className="font-medium">Destinations: </span>
                    {asset.taxonomy.destinations.map(d => `${d.city}, ${d.country}`).join('; ')}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Webflow */}
          <div className="space-y-4">
            <h3 className="font-semibold">Webflow Sync</h3>
            <div className="flex items-center gap-2">
              <Badge variant={getWebflowSyncStatusColor(asset.webflowSync)}>
                {asset.webflowSync}
              </Badge>
              {asset.lastSynced && (
                <span className="text-sm text-muted-foreground">
                  Last synced: {asset.lastSynced.toDate().toLocaleDateString()}
                </span>
              )}
            </div>
            {asset.webflowItemId && (
              <Button size="sm" variant="outline" asChild>
                <a
                  href={`https://webflow.com/dashboard/sites/assets/${asset.webflowItemId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View in Webflow
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>

          <Separator />

          {/* Usage */}
          <UsageTracker assetId={asset.id} />

          <Separator />

          {/* CDN URL */}
          <div className="space-y-2">
            <Label>CDN URL</Label>
            <div className="flex gap-2">
              <Input value={asset.cdnUrl} readOnly className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(asset.cdnUrl)}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>

      {/* Edit AI Image Dialog */}
      <EditAIImageDialog
        open={editAIDialogOpen}
        onOpenChange={setEditAIDialogOpen}
        asset={asset}
        onEdited={(newAssetId) => {
          console.log('New edited asset created:', newAssetId);
          // Optionally refresh or navigate to new asset
        }}
      />
    </Sheet>
  );
}
