/**
 * AssetGrid Component
 *
 * Masonry-style grid layout for displaying asset cards.
 * Handles loading, empty, and error states.
 * Matches Lovable prototype's columns layout.
 */

import React from 'react';
import { AssetCard } from './AssetCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import type { AssetDocument } from '../types';

export interface AssetGridProps {
  assets: AssetDocument[];
  loading?: boolean;
  error?: Error | null;
  selectedIds?: Set<string>;
  onSelect?: (assetId: string, selected: boolean) => void;
  onAssetClick?: (asset: AssetDocument) => void;
}

export function AssetGrid({
  assets,
  loading = false,
  error = null,
  selectedIds = new Set(),
  onSelect,
  onAssetClick,
}: AssetGridProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading assets: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (assets.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No assets found
          </p>
          <p className="text-sm text-muted-foreground">
            Upload your first asset to get started
          </p>
        </div>
      </div>
    );
  }

  // Masonry grid layout matching Lovable prototype
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          selected={selectedIds.has(asset.id)}
          onSelect={
            onSelect ? (selected) => onSelect(asset.id, selected) : undefined
          }
          onClick={() => onAssetClick?.(asset)}
        />
      ))}
    </div>
  );
}
