import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnalyticsIntentBadgeProps {
  /** Lowercase intent string from DataForSEO (e.g. "informational"). */
  intent: string | null;
  className?: string;
}

const INTENT_STYLES: Record<string, string> = {
  informational: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  commercial: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  transactional: 'bg-green-100 text-green-800 hover:bg-green-100',
  navigational: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
};

/** Intent badge for DataForSEO lowercase intent values ("informational", …). */
export function AnalyticsIntentBadge({ intent, className }: AnalyticsIntentBadgeProps) {
  if (!intent) return <span className="text-xs text-muted-foreground">—</span>;
  const key = intent.toLowerCase();
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return (
    <Badge variant="secondary" className={cn('text-xs font-medium', INTENT_STYLES[key] ?? INTENT_STYLES.navigational, className)}>
      {label}
    </Badge>
  );
}
