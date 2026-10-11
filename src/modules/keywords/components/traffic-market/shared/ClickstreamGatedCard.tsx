import { Link } from '@/lib/router-compat';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ClickstreamGatedCardProps {
  /** Page-specific heading — defaults to the generic clickstream line. */
  title?: string;
  /** Page-specific body copy — say exactly what is gated (CMS-38). */
  description?: string;
  /** Optional extra context line rendered under the standard one-liner. */
  note?: string;
  /**
   * Render without the Card wrapper — for placement inside an existing
   * ChartCard body (e.g. the Traffic Journey card keeps its domain selector).
   */
  inline?: boolean;
  className?: string;
}

/**
 * Compact section-level gate for clickstream-only pieces of an otherwise-live
 * DataForSEO page (meta.dataSource === 'dataforseo'). Slimmer sibling of
 * SimilarwebDisabledCard, which remains the whole-page state for the true
 * 'disabled' dataSource (neither provider available).
 */
export function ClickstreamGatedCard({ title, description, note, inline, className }: ClickstreamGatedCardProps) {
  const body = (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4',
        inline && 'rounded-xl bg-muted/40 px-5 py-4 ring-1 ring-black/[0.05]',
        inline && className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-black/[0.06]">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h3 className="font-display text-sm font-semibold tracking-tight">
            {title ?? 'Clickstream data requires Similarweb'}
          </h3>
          <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
            {description ??
              'Engagement, channel-mix and journey data come from Similarweb clickstream — add an API key under Settings → SEO API Integration to activate this section.'}
          </p>
          {note && <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">{note}</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" asChild className="shrink-0">
        <Link to="/settings">Open Settings</Link>
      </Button>
    </div>
  );

  if (inline) return body;

  return (
    <Card
      className={cn(
        'animate-fade-up rounded-2xl border-0 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(3,43,52,0.06),0_12px_32px_-16px_rgba(3,43,52,0.18)]',
        className,
      )}
    >
      <CardContent className="px-6 py-5">{body}</CardContent>
    </Card>
  );
}
