import { cn } from '@/lib/utils';
import type { IssueSeverity, IndexStatus } from '../../types';

interface SeverityBadgeProps {
  severity: IssueSeverity | IndexStatus | string;
  size?: 'sm' | 'md';
}

function getBadgeColor(severity: string): string {
  switch (severity) {
    // Issue severity
    case 'Critical':
    case 'Error':
      return 'bg-destructive/15 text-destructive';
    case 'Warning':
    case 'Discovered':
      return 'bg-warning/15 text-warning-foreground';
    case 'Info':
      return 'bg-accent/15 text-accent';
    // Index status
    case 'Indexed':
      return 'bg-green-500/15 text-green-600';
    case 'Crawled':
      return 'bg-blue-500/15 text-blue-600';
    case 'Not Indexed':
      return 'bg-muted text-muted-foreground';
    // Redirect status
    case 'Active':
      return 'bg-green-500/15 text-green-600';
    case 'Broken':
      return 'bg-destructive/15 text-destructive';
    case 'Loop':
      return 'bg-destructive/15 text-destructive';
    // Backlink status
    case 'New':
      return 'bg-green-500/15 text-green-600';
    case 'Lost':
      return 'bg-destructive/15 text-destructive';
    // Link type
    case 'Dofollow':
      return 'bg-accent/15 text-accent';
    case 'Nofollow':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

const SIZE_MAP = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-[11px] px-2.5 py-1',
} as const;

export function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        getBadgeColor(severity),
        SIZE_MAP[size]
      )}
    >
      {severity}
    </span>
  );
}
