/**
 * BulkActionsToolbar Component
 *
 * Toolbar for bulk operations when assets are selected.
 * Actions: Batch Edit (CMS-158), Export ZIP, Add to Article, Delete Selected, Clear.
 * Matches Lovable prototype's bulk actions bar.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Pencil, Download, Trash2, X, PlusCircle } from 'lucide-react';
import { ArticlePicker } from './ArticlePicker';
import type { AssetStatus } from '../types';

export interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedAssetIds: string[];
  /** Status of selected assets — used for draft guard in article picker */
  selectedAssetsHaveDraft?: boolean;
  /** Opens the Batch Edit dialog (description + tags applied to all selected). */
  onBatchEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedAssetIds,
  selectedAssetsHaveDraft = false,
  onBatchEdit,
  onExport,
  onDelete,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const [articlePickerOpen, setArticlePickerOpen] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-md bg-primary/5 border border-primary/20">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      <Button
        size="sm"
        variant="outline"
        onClick={onBatchEdit}
        className="h-7 text-xs"
      >
        <Pencil className="h-3 w-3 mr-1" />
        Batch Edit
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={onExport}
        className="h-7 text-xs"
      >
        <Download className="h-3 w-3 mr-1" />
        Export ZIP
      </Button>

      {/* Add to Article — opens ArticlePicker popover */}
      <Popover open={articlePickerOpen} onOpenChange={setArticlePickerOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <PlusCircle className="h-3 w-3" />
            Add to Article
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <ArticlePicker
            mode="inline-only"
            assetIds={selectedAssetIds}
            assetStatus={selectedAssetsHaveDraft ? 'draft' : 'active'}
            onComplete={() => setArticlePickerOpen(false)}
          />
        </PopoverContent>
      </Popover>

      <Button
        size="sm"
        variant="outline"
        onClick={onDelete}
        className="h-7 text-xs text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Delete Selected
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={onClearSelection}
        className="h-7 text-xs ml-auto"
      >
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}
