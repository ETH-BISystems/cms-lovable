/**
 * AssetCard Component
 *
 * Displays single asset in grid view matching Lovable prototype:
 * - Category badge and usage indicator
 * - Taxonomy pill badges (airline, cabin, destination) with overflow count
 * - Draft overlay (gray with "Draft" badge and "Needs Intake" label)
 * - Hover overlay with "Copy URL" and "View Details" action buttons
 * - Quick-action buttons on hover (Paperclip for quick-assign, Eye for preview)
 * - Multi-select checkboxes that appear on hover or when selected
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Paperclip, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { ArticlePicker } from './ArticlePicker';
import type { AssetDocument } from '../types';

export interface AssetCardProps {
  asset: AssetDocument;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
}

// Helper function to get category badge color — soft tints, readable over imagery
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Photo': 'bg-blue-50/95 text-blue-700 border border-blue-200/70',
    'Screenshot': 'bg-purple-50/95 text-purple-700 border border-purple-200/70',
    'Infographic': 'bg-emerald-50/95 text-emerald-700 border border-emerald-200/70',
    'Card Art': 'bg-amber-50/95 text-amber-700 border border-amber-200/70',
    'Issuer Logo': 'bg-pink-50/95 text-pink-700 border border-pink-200/70',
    'Airline Logo': 'bg-cyan-50/95 text-cyan-700 border border-cyan-200/70',
    'Hotel Logo': 'bg-orange-50/95 text-orange-700 border border-orange-200/70',
    'Alliance Logo': 'bg-indigo-50/95 text-indigo-700 border border-indigo-200/70',
    'Program Logo': 'bg-teal-50/95 text-teal-700 border border-teal-200/70',
    'Team Photo': 'bg-rose-50/95 text-rose-700 border border-rose-200/70',
  };
  return colors[category] || 'bg-slate-50/95 text-slate-700 border border-slate-200/70';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AssetCard({
  asset,
  selected = false,
  onSelect,
  onClick,
}: AssetCardProps) {
  const isDraft = asset.status === 'draft';

  // Build taxonomy pills
  const airlinePills = asset.taxonomy?.airlines?.slice(0, 1) || [];
  const cabinPill = asset.taxonomy?.cabinClass || null;
  const destPills = (asset.taxonomy?.destinations?.slice(0, 1) || []).map(
    (d) => (d.city ? `${d.city}, ${d.country}` : d.country)
  );
  const destOverflow =
    (asset.taxonomy?.destinations?.length || 0) > 1
      ? (asset.taxonomy?.destinations?.length || 0) - 1
      : 0;

  const allPills = [
    ...airlinePills,
    ...(cabinPill ? [cabinPill] : []),
    ...destPills,
  ];
  const visiblePills = allPills.slice(0, 3);
  const overflowCount = Math.max(0, allPills.length - 3 + destOverflow);

  // Calculate display height based on aspect ratio
  const aspectH = asset.height / asset.width;
  const displayH = Math.max(120, Math.min(280, aspectH * 220));

  return (
    <div
      className={`break-inside-avoid group relative rounded-xl border border-border/70 overflow-hidden cursor-pointer transition-all duration-200 ease-out bg-card shadow-card hover:shadow-card-hover hover:border-accent/30 ${
        isDraft ? 'ring-1 ring-warning/40' : ''
      } ${selected ? 'ring-2 ring-accent border-accent/40' : ''}`}
      onClick={onClick}
    >
      {/* Multi-select checkbox — visible on hover or when selected */}
      <div
        className={`absolute top-2 left-2 z-10 ${
          selected ? '' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(!selected);
        }}
      >
        <Checkbox checked={selected} className="bg-background/80" />
      </div>

      {/* Image area */}
      <div
        className="relative bg-muted/30 flex items-center justify-center text-muted-foreground text-xs overflow-hidden rounded-t-xl ring-1 ring-inset ring-black/5"
        style={{ height: displayH }}
      >
        {/* Actual image */}
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.altText}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <span className="opacity-50">
            {asset.width}×{asset.height}
          </span>
        )}

        {/* Draft overlay */}
        {isDraft && (
          <div className="absolute inset-0 bg-muted/60 backdrop-blur-[1px] z-[5] flex items-center justify-center">
            <Badge variant="warning" className="text-[10px] font-semibold shadow-card">
              Draft
            </Badge>
          </div>
        )}

        {/* Category badge — top left (offset if checkbox visible) */}
        <span
          className={`absolute top-2 ${
            selected ? 'left-8' : 'left-2'
          } ${getCategoryColor(asset.category)} backdrop-blur-sm text-[9px] font-semibold px-1.5 py-0.5 rounded-full z-[6]`}
        >
          {asset.category}
        </span>

        {/* Usage / Needs Intake badge — top right */}
        {isDraft ? (
          <span className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50/95 text-amber-700 border border-amber-200/70 backdrop-blur-sm z-[6]">
            Needs Intake
          </span>
        ) : (
          <span className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-background/90 text-muted-foreground border border-border/70 backdrop-blur-sm z-[6]">
            Unused
          </span>
        )}

        {/* Taxonomy pill badges — bottom left */}
        {visiblePills.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap z-[6]">
            {visiblePills.map((pill, idx) => (
              <span
                key={idx}
                className="bg-background/90 backdrop-blur-sm text-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-border/70"
              >
                {pill}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="bg-background/90 backdrop-blur-sm text-muted-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-border/70">
                +{overflowCount}
              </span>
            )}
          </div>
        )}

        {/* Hover overlay with "Copy URL" and "View Details" */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-[7]">
          <Button
            size="sm"
            variant="secondary"
            className="text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(asset.cdnUrl);
              toast.success('CDN URL copied');
            }}
          >
            Copy URL
          </Button>
          <Button size="sm" variant="secondary" className="text-xs h-7">
            View Details
          </Button>
        </div>

        {/* Quick action buttons — bottom right on hover */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-[8]">
          {/* Quick-assign to article */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 rounded-full bg-background/90 border flex items-center justify-center hover:bg-accent/10 transition-colors"
                title="Quick-assign to article"
              >
                <Paperclip className="h-3.5 w-3.5 text-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[280px] p-0"
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <ArticlePicker
                mode="full"
                assetIds={[asset.id]}
                assetStatus={asset.status}
                onComplete={() => {}}
              />
            </PopoverContent>
          </Popover>

          {/* Quick preview */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.info(`${asset.filename} — ${asset.width}×${asset.height}`);
            }}
            className="w-7 h-7 rounded-full bg-background/90 border flex items-center justify-center hover:bg-accent/10 transition-colors"
            title="Quick preview"
          >
            <Eye className="h-3.5 w-3.5 text-foreground" />
          </button>

          {/* Download high-res original */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const response = await fetch(asset.cdnUrl);
                if (!response.ok) throw new Error(String(response.status));
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
                window.open(asset.cdnUrl, '_blank', 'noopener');
              }
            }}
            className="w-7 h-7 rounded-full bg-background/90 border flex items-center justify-center hover:bg-accent/10 transition-colors"
            title="Download high-resolution image"
          >
            <Download className="h-3.5 w-3.5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Card footer */}
      <div className="px-2.5 py-2 border-t border-border/50">
        <p className="text-[11px] font-medium truncate text-foreground">{asset.filename}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {asset.width}×{asset.height} · {formatFileSize(asset.sizeBytes)}
        </p>
      </div>
    </div>
  );
}
