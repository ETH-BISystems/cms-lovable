/**
 * SEOScoreIndicator Component
 *
 * Displays SEO score with color-coded badge and label.
 * Scores: 80+ = Excellent (green), 50-79 = Good (yellow), <50 = Poor (red)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getSEOScoreColor, getSEOScoreLabel } from '../services/aiService';

export interface SEOScoreIndicatorProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SEOScoreIndicator({
  score,
  showLabel = true,
  size = 'md',
}: SEOScoreIndicatorProps) {
  const color = getSEOScoreColor(score);
  const label = getSEOScoreLabel(score);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={color} className={sizeClasses[size]}>
        {score}/100
      </Badge>
      {showLabel && (
        <span className={`${sizeClasses[size]} text-muted-foreground`}>
          {label}
        </span>
      )}
    </div>
  );
}
