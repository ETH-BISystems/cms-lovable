import { CreditCard, RefreshCw, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useCardsContext } from '../context/CardsContext';
import { useCards } from '../hooks/useCards';
import { useScraperStatus } from '../hooks/useScraperStatus';
import type { CardDocument } from '../types';

function isToday(timestamp: { toMillis?: () => number } | null | undefined): boolean {
  if (!timestamp) return false;
  const ms = timestamp.toMillis ? timestamp.toMillis() : 0;
  const date = new Date(ms);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isThisWeek(timestamp: { toMillis?: () => number } | null | undefined): boolean {
  if (!timestamp) return false;
  const ms = timestamp.toMillis ? timestamp.toMillis() : 0;
  const now = Date.now();
  return now - ms < 7 * 24 * 60 * 60 * 1000;
}

export function StatCards() {
  const { setFilters } = useCardsContext();
  const { cards, loading: cardsLoading, totalCount } = useCards();
  const scraperStatus = useScraperStatus();

  if (cardsLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const updatedTodayCount = cards.filter((c: CardDocument) => isToday(c.lastScraped)).length;
  const changesThisWeekCount = cards.filter((c: CardDocument) => c.status === 'changed' && isThisWeek(c.lastChanged)).length;

  const healthColor =
    scraperStatus.health === 'healthy'
      ? 'bg-success'
      : scraperStatus.health === 'warning'
      ? 'bg-warning'
      : 'bg-destructive';

  const healthLabel =
    scraperStatus.health === 'healthy'
      ? 'Healthy'
      : scraperStatus.health === 'warning'
      ? 'Warning'
      : 'Errors';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Cards Tracked */}
      <Card className="shadow-card card-interactive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12px] font-medium text-muted-foreground">Total Cards Tracked</CardTitle>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <CreditCard className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-[26px] font-display font-semibold tabular-nums tracking-tight">{totalCount}</div>
        </CardContent>
      </Card>

      {/* Cards Updated Today */}
      <Card className="shadow-card card-interactive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12px] font-medium text-muted-foreground">Cards Updated Today</CardTitle>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
            <RefreshCw className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-[26px] font-display font-semibold tabular-nums tracking-tight">{updatedTodayCount}</div>
        </CardContent>
      </Card>

      {/* Data Changes This Week */}
      <Card
        className="shadow-card card-interactive cursor-pointer"
        onClick={() => setFilters({ status: 'changed' })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setFilters({ status: 'changed' })}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[12px] font-medium text-muted-foreground">Data Changes This Week</CardTitle>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-amber-600">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-[26px] font-display font-semibold tabular-nums tracking-tight">{changesThisWeekCount}</div>
          <p className="text-[12px] text-muted-foreground mt-1">Click to filter</p>
        </CardContent>
      </Card>

      {/* Scraper Health */}
      <Popover>
        <PopoverTrigger asChild>
          <Card className="shadow-card card-interactive cursor-pointer" role="button" tabIndex={0}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[12px] font-medium text-muted-foreground">Scraper Health</CardTitle>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <Activity className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${healthColor}`} />
                <span className="text-[18px] font-display font-semibold tracking-tight">{healthLabel}</span>
              </div>
              {scraperStatus.recentErrors.length > 0 && (
                <p className="text-[12px] text-muted-foreground mt-1">
                  {scraperStatus.recentErrors.length} recent error{scraperStatus.recentErrors.length !== 1 ? 's' : ''}
                </p>
              )}
            </CardContent>
          </Card>
        </PopoverTrigger>
        <PopoverContent className="w-96">
          <div className="space-y-2">
            <h4 className="font-semibold text-[13px]">Recent Scraper Errors</h4>
            {scraperStatus.recentErrors.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No recent errors.</p>
            ) : (
              scraperStatus.recentErrors.map((err, i) => (
                <div key={i} className="border border-border/60 bg-muted/30 rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">{err.cardName}</span>
                    <Badge variant={err.severity === 'critical' ? 'danger' : 'neutral'}>
                      {err.severity}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{err.errorMessage}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {err.occurredAt?.toMillis
                      ? new Date(err.occurredAt.toMillis()).toLocaleString()
                      : 'Unknown time'}
                  </p>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
