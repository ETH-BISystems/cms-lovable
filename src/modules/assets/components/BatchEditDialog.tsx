/**
 * BatchEditDialog Component (CMS-158)
 *
 * Applies the same description and/or tags ("keywords") to every selected
 * asset in one action via the batchApplyAssetMetadata callable.
 *
 * - Blank description → existing descriptions are kept.
 * - Tags default to REPLACE (the ticket's ask: exact same tags on all);
 *   an Append mode merges into existing tags instead.
 * - Per-asset failures are reported from the function result.
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { TagsInput } from './TagsInput';
import { useAssetMutations } from '../hooks/useAssetMutations';
import { buildBatchApplyPayload } from '../utils/batchMetadata';
import type { BatchTagMode, BatchApplyAssetMetadataResult } from '../types';

export interface BatchEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetIds: string[];
  /** Called after a successful apply (e.g. to clear the selection). */
  onApplied?: () => void;
}

export function BatchEditDialog({ open, onOpenChange, assetIds, onApplied }: BatchEditDialogProps) {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<BatchTagMode>('replace');
  const [applying, setApplying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchApplyAssetMetadataResult | null>(null);

  const { batchApply } = useAssetMutations();

  // Reset the form each time the dialog is opened for a fresh selection.
  useEffect(() => {
    if (open) {
      setDescription('');
      setTags([]);
      setTagMode('replace');
      setFormError(null);
      setResult(null);
      setApplying(false);
    }
  }, [open]);

  const handleApply = async () => {
    setFormError(null);
    let payload;
    try {
      payload = buildBatchApplyPayload({ assetIds, description, tags, tagMode });
    } catch (error) {
      setFormError((error as Error).message);
      return;
    }

    try {
      setApplying(true);
      const applyResult = await batchApply(payload);
      setResult(applyResult);
      if (applyResult.failureCount === 0) {
        toast.success(`Metadata applied to ${applyResult.successCount} asset${applyResult.successCount !== 1 ? 's' : ''}`);
        onApplied?.();
      } else {
        toast.warning(
          `Applied to ${applyResult.successCount} of ${applyResult.totalProcessed} assets — see details`
        );
      }
    } catch (error: any) {
      setFormError(error?.message || 'Batch apply failed');
    } finally {
      setApplying(false);
    }
  };

  const handleDone = () => {
    // Any failures left un-retried simply close; successes already applied.
    if (result && result.successCount > 0 && result.failureCount > 0) {
      onApplied?.();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Batch Edit ({assetIds.length} selected)
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <Alert variant={result.failureCount > 0 ? 'destructive' : 'default'}>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Applied to {result.successCount} of {result.totalProcessed} selected asset
                {result.totalProcessed !== 1 ? 's' : ''}.
                {result.failureCount > 0 && ` ${result.failureCount} failed.`}
              </AlertDescription>
            </Alert>
            {result.failures.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-md border p-3 text-xs space-y-1">
                {result.failures.map((failure) => (
                  <li key={failure.assetId} className="text-destructive">
                    {failure.assetId}: {failure.error}
                  </li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button onClick={handleDone}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Everything you enter below is applied to all {assetIds.length} selected asset
                {assetIds.length !== 1 ? 's' : ''} in one action. Leave the description blank to
                keep each asset&apos;s existing description.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="batch-description">Description</Label>
              <Textarea
                id="batch-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. United Polaris Lounge dining area"
                rows={3}
                disabled={applying}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags / Keywords</Label>
              <TagsInput
                tags={tags}
                onChange={setTags}
                placeholder="e.g. lounge, meals, seat…"
                disabled={applying}
              />
            </div>

            {tags.length > 0 && (
              <RadioGroup
                value={tagMode}
                onValueChange={(value) => setTagMode(value as BatchTagMode)}
                className="space-y-1"
                disabled={applying}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="tag-mode-replace" />
                  <Label htmlFor="tag-mode-replace" className="font-normal">
                    Replace tags on all selected assets
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="append" id="tag-mode-append" />
                  <Label htmlFor="tag-mode-append" className="font-normal">
                    Append to existing tags
                  </Label>
                </div>
              </RadioGroup>
            )}

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={applying || assetIds.length === 0}>
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply to {assetIds.length} asset{assetIds.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
