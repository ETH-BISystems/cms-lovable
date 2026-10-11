/**
 * NeedsIntakeBanner Component
 *
 * Amber banner showing draft asset count with "Review Now" button.
 * When draft filter is active, shows accent-colored banner with count
 * and "Show All" button.
 *
 * Matches Lovable prototype's needs-intake banner behavior.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sparkles } from 'lucide-react';

export interface NeedsIntakeBannerProps {
  /** Number of draft assets needing intake */
  draftCount: number;
  /** Whether the draft/intake filter is currently active */
  isFilterActive: boolean;
  /** Number of filtered results when intake filter is active */
  filteredCount: number;
  /** Called when "Review Now" is clicked to activate draft filter */
  onReviewNow: () => void;
  /** Called when "Show All" is clicked to clear draft filter */
  onShowAll: () => void;
}

export function NeedsIntakeBanner({
  draftCount,
  isFilterActive,
  filteredCount,
  onReviewNow,
  onShowAll,
}: NeedsIntakeBannerProps) {
  // Active filter banner (accent-colored)
  if (isFilterActive) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <span className="text-[13px] text-foreground flex-1">
          Showing <strong>{filteredCount.toLocaleString()}</strong> image{filteredCount !== 1 ? 's' : ''} needing intake
        </span>
        <Button
          size="sm"
          variant="outline"
          className="text-xs shrink-0"
          onClick={onShowAll}
        >
          Show All
        </Button>
      </div>
    );
  }

  // No drafts — don't show banner
  if (draftCount === 0) {
    return null;
  }

  // Amber banner with draft count
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-warning/30 bg-warning/10">
      <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
        <AlertTriangle className="h-4 w-4 text-warning" />
      </div>
      <span className="text-[13px] text-foreground flex-1">
        <strong className="font-semibold">{draftCount.toLocaleString()}</strong>{' '}
        <span className="text-muted-foreground">image{draftCount !== 1 ? 's' : ''} need descriptions — complete intake to improve searchability</span>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="text-xs shrink-0"
        onClick={onReviewNow}
      >
        Review Now
      </Button>
    </div>
  );
}
