/**
 * AssetListView Component
 *
 * Table/list view for assets matching Lovable prototype.
 * Columns: Checkbox, Thumbnail, Name, Category, Airline/Hotel, Cabin,
 *          Destination, Dimensions, Format, Size, Usage, Uploaded, Webflow status
 * Features:
 * - Sortable column headers for: Name, Category, Format, Size, Usage, Uploaded
 * - Amber background tint and "Draft" badge for draft assets
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import type { AssetDocument } from '../types';

export interface AssetListViewProps {
  assets: AssetDocument[];
  loading?: boolean;
  error?: Error | null;
  selectedIds?: Set<string>;
  onSelect?: (assetId: string, selected: boolean) => void;
  onAssetClick?: (asset: AssetDocument) => void;
}

type SortColumn = 'name' | 'category' | 'format' | 'size' | 'usage' | 'uploaded' | null;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Soft tinted category chips — no saturated fills
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Photo': 'bg-blue-500/10 text-blue-700',
    'Screenshot': 'bg-purple-500/10 text-purple-700',
    'Infographic': 'bg-emerald-500/10 text-emerald-700',
    'Card Art': 'bg-amber-500/10 text-amber-700',
    'Issuer Logo': 'bg-pink-500/10 text-pink-700',
    'Airline Logo': 'bg-cyan-500/10 text-cyan-700',
    'Hotel Logo': 'bg-orange-500/10 text-orange-700',
    'Alliance Logo': 'bg-indigo-500/10 text-indigo-700',
    'Program Logo': 'bg-teal-500/10 text-teal-700',
    'Team Photo': 'bg-rose-500/10 text-rose-700',
  };
  return colors[category] || 'bg-muted text-muted-foreground';
}

const syncColor: Record<string, string> = {
  'Synced': 'text-success',
  'Pending': 'text-warning',
  'Failed': 'text-destructive',
  'Not Published': 'text-muted-foreground',
  'N/A': 'text-muted-foreground',
};

export function AssetListView({
  assets,
  loading = false,
  error = null,
  selectedIds = new Set(),
  onSelect,
  onAssetClick,
}: AssetListViewProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      if (sortDir === 'desc') {
        setSortColumn(null);
        setSortDir('asc');
      } else {
        setSortDir('desc');
      }
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortColumn) return assets;
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...assets].sort((a, b) => {
      switch (sortColumn) {
        case 'name':
          return dir * a.filename.localeCompare(b.filename);
        case 'category':
          return dir * a.category.localeCompare(b.category);
        case 'format':
          return dir * a.format.localeCompare(b.format);
        case 'size':
          return dir * (a.sizeBytes - b.sizeBytes);
        case 'usage':
          return 0; // Usage count not yet on document
        case 'uploaded': {
          const aTime = a.uploadedAt?.toMillis?.() ?? 0;
          const bTime = b.uploadedAt?.toMillis?.() ?? 0;
          return dir * (aTime - bTime);
        }
        default:
          return 0;
      }
    });
  }, [assets, sortColumn, sortDir]);

  const sortIcon = (col: SortColumn) =>
    sortColumn === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

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
      <div className="flex h-64 items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <ImageIcon className="h-5 w-5 text-accent" />
          </div>
          <p className="text-[14px] font-semibold text-foreground">
            No assets found
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Upload your first asset to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead className="w-12" />
          <TableHead
            className="cursor-pointer hover:text-foreground"
            onClick={() => handleSort('name')}
          >
            Name{sortIcon('name')}
          </TableHead>
          <TableHead
            className="cursor-pointer hover:text-foreground"
            onClick={() => handleSort('category')}
          >
            Category{sortIcon('category')}
          </TableHead>
          <TableHead>Airline/Hotel</TableHead>
          <TableHead>Cabin</TableHead>
          <TableHead>Destination</TableHead>
          <TableHead>Dimensions</TableHead>
          <TableHead
            className="cursor-pointer hover:text-foreground"
            onClick={() => handleSort('format')}
          >
            Format{sortIcon('format')}
          </TableHead>
          <TableHead
            className="cursor-pointer hover:text-foreground"
            onClick={() => handleSort('size')}
          >
            Size{sortIcon('size')}
          </TableHead>
          <TableHead
            className="cursor-pointer hover:text-foreground"
            onClick={() => handleSort('usage')}
          >
            Usage{sortIcon('usage')}
          </TableHead>
          <TableHead
            className="cursor-pointer hover:text-foreground"
            onClick={() => handleSort('uploaded')}
          >
            Uploaded{sortIcon('uploaded')}
          </TableHead>
          <TableHead>Webflow</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((asset) => {
          const isDraft = asset.status === 'draft';
          const airlineHotel =
            asset.taxonomy?.airlines?.length > 0
              ? asset.taxonomy.airlines.join(', ')
              : asset.taxonomy?.hotels?.length > 0
                ? asset.taxonomy.hotels.join(', ')
                : '—';
          const cabin = asset.taxonomy?.cabinClass || '—';
          const destination =
            asset.taxonomy?.destinations?.length > 0
              ? asset.taxonomy.destinations
                  .map((d) => (d.city ? `${d.city}, ${d.country}` : d.country))
                  .join(', ')
              : '—';

          return (
            <TableRow
              key={asset.id}
              className={`cursor-pointer ${
                isDraft ? 'bg-warning/5' : ''
              }`}
              onClick={() => onAssetClick?.(asset)}
            >
              {/* Checkbox */}
              <TableCell
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(asset.id, !selectedIds.has(asset.id));
                }}
              >
                <Checkbox checked={selectedIds.has(asset.id)} />
              </TableCell>

              {/* Thumbnail */}
              <TableCell>
                <div className="h-10 w-12 rounded-md ring-1 ring-black/5 bg-muted flex items-center justify-center text-[9px] text-muted-foreground relative overflow-hidden">
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.altText}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    asset.format
                  )}
                  {isDraft && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-warning" />
                  )}
                </div>
              </TableCell>

              {/* Name */}
              <TableCell className="font-medium text-sm max-w-[180px] truncate">
                {asset.filename}
                {isDraft && (
                  <Badge variant="warning" className="ml-1.5 text-[9px] px-1.5 py-0">
                    Draft
                  </Badge>
                )}
              </TableCell>

              {/* Category */}
              <TableCell>
                <span
                  className={`${getCategoryColor(asset.category)} text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap`}
                >
                  {asset.category}
                </span>
              </TableCell>

              {/* Airline/Hotel */}
              <TableCell className="text-xs text-muted-foreground">
                {airlineHotel}
              </TableCell>

              {/* Cabin */}
              <TableCell className="text-xs">{cabin}</TableCell>

              {/* Destination */}
              <TableCell className="text-xs text-muted-foreground">
                {destination}
              </TableCell>

              {/* Dimensions */}
              <TableCell className="text-xs text-muted-foreground">
                {asset.width}×{asset.height}
              </TableCell>

              {/* Format */}
              <TableCell className="text-xs text-muted-foreground">
                {asset.format}
              </TableCell>

              {/* Size */}
              <TableCell className="text-xs text-muted-foreground">
                {formatFileSize(asset.sizeBytes)}
              </TableCell>

              {/* Usage */}
              <TableCell>
                <span className="text-xs text-muted-foreground">Unused</span>
              </TableCell>

              {/* Uploaded */}
              <TableCell className="text-xs text-muted-foreground">
                {formatTimeAgo(asset.uploadedAt)}
              </TableCell>

              {/* Webflow */}
              <TableCell
                className={`text-xs font-medium ${
                  syncColor[asset.webflowSync] || 'text-muted-foreground'
                }`}
              >
                {asset.webflowSync}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
