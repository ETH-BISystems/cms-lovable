import { Link } from '@/lib/router-compat';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SimilarwebDisabledCardProps {
  /** Slimmer variant for in-section placement. */
  compact?: boolean;
}

/**
 * Disabled state for Similarweb-dependent sections, shown when a
 * traffic-market response carries `meta.dataSource === 'disabled'` (no API
 * key configured and sample mode off). Replaces the data sections below the
 * page hero; sections with independent sources (e.g. the DataForSEO keyword
 * cloud) stay live alongside it.
 */
export function SimilarwebDisabledCard({ compact }: SimilarwebDisabledCardProps) {
  return (
    <Card className="animate-fade-up rounded-2xl border-0 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(3,43,52,0.06),0_12px_32px_-16px_rgba(3,43,52,0.18)]">
      <CardContent
        className={cn(
          'flex flex-col items-center gap-4 text-center',
          compact ? 'py-8' : 'py-14',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-2xl bg-muted ring-1 ring-black/[0.06]',
            compact ? 'h-10 w-10' : 'h-12 w-12',
          )}
        >
          <Lock className={cn('text-muted-foreground', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        </span>
        <div className="space-y-1.5">
          <h3 className="font-display text-base font-semibold tracking-tight">
            Similarweb integration disabled
          </h3>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Competitive traffic intelligence requires a Similarweb API key. An admin can add one under
            Settings → SEO API Integration — these sections activate automatically once the key is
            verified. Keys are stored in Google Secret Manager, never in the app database.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/settings">Open Settings</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
