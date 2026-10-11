import { Settings } from 'lucide-react';
import { Link } from '@/lib/router-compat';
import { useScraperStatus } from '../hooks/useScraperStatus';

function formatTimeSince(ms: number | null): string {
  if (ms === null) return 'Never';
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function formatTimeUntil(ms: number | null): string {
  if (ms === null) return 'Not scheduled';
  const diff = ms - Date.now();
  if (diff <= 0) return 'Overdue';
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  if (minutes > 0) return `in ${minutes}m`;
  return 'Soon';
}

export function ScraperStatusBar() {
  const { lastScrapedAt, nextScheduledAt, health, loading } = useScraperStatus();

  const lastScrapedMs = lastScrapedAt?.toMillis ? lastScrapedAt.toMillis() : null;
  const nextScheduledMs = nextScheduledAt?.toMillis ? nextScheduledAt.toMillis() : null;

  const healthColor =
    health === 'healthy' ? 'bg-success' : health === 'warning' ? 'bg-warning' : 'bg-destructive';
  const healthPillCls =
    health === 'healthy'
      ? 'bg-success/10 text-success'
      : health === 'warning'
      ? 'bg-warning/15 text-amber-700'
      : 'bg-destructive/10 text-destructive';
  const healthLabel =
    health === 'healthy' ? 'Healthy' : health === 'warning' ? 'Warning' : 'Errors';

  if (loading) {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5 text-[13px] text-muted-foreground">
        Loading scraper status...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5 text-[13px]">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Last scraped:</span>
        <span className="font-medium text-foreground">{formatTimeSince(lastScrapedMs)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Next scrape:</span>
        <span className="font-medium text-foreground">{formatTimeUntil(nextScheduledMs)}</span>
      </div>
      <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] ${healthPillCls}`}>
        <span className={`h-2 w-2 rounded-full ${healthColor}`} />
        <span className="font-medium">{healthLabel}</span>
      </div>
      <div className="ml-auto">
        <Link
          to="/settings?tab=scraper"
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Scraper settings</span>
        </Link>
      </div>
    </div>
  );
}
