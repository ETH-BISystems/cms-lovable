import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Play, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { ScraperSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

export function ScraperManagementTab() {
  const { data, loading, error, save } = useSettings<ScraperSettings>('scraper');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('scraper');
  const [expandedError, setExpandedError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const schedules = data?.schedules || [];
  const recentRuns = data?.recentRuns || [];
  const errorLog = data?.errorLog || [];

  const statusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500/10 text-green-600';
      case 'degraded': return 'bg-orange-500/10 text-orange-600';
      case 'offline': return 'bg-red-500/10 text-red-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <NotYetAvailable note="Scraper scheduling and configuration are not yet wired — card scrapes run on their built-in schedule and can be triggered from the Card Data Manager.">
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Platform Status</p>
          <Badge className={cn('text-[10px] mt-2 capitalize', statusColor(data?.platformStatus || 'offline'))}>
            {data?.platformStatus || 'offline'}
          </Badge>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Cards Monitored</p>
          <p className="text-[18px] font-semibold mt-1">{data?.cardsMonitored || 0}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Success Rate (7d)</p>
          <p className="text-[18px] font-semibold mt-1">{data?.successRate7Day || 0}%</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Avg Scrape Time</p>
          <p className="text-[18px] font-semibold mt-1">{data?.avgScrapeTime || 0}s</p>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Schedule Configuration</h3>
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-[12px] gap-1.5">
                <Play className="h-3.5 w-3.5" />Trigger Selected
              </Button>
              <Button variant="default" size="sm" className="text-[12px] gap-1.5">
                <Play className="h-3.5 w-3.5" />Trigger Full Run
              </Button>
            </div>
          )}
        </div>
        <div className="px-5 py-4">
          {schedules.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No scrape schedules configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium w-10">On</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Card Name</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Issuer</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Frequency</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Last Scraped</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(sched => (
                    <tr key={sched.cardId} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 text-center"><Switch checked={sched.enabled} disabled={readOnly} className="scale-75" /></td>
                      <td className="py-2 px-2 font-medium">{sched.cardName}</td>
                      <td className="py-2 px-2 text-muted-foreground">{sched.issuer}</td>
                      <td className="py-2 px-2"><Badge variant="outline" className="text-[10px] capitalize">{sched.frequency}</Badge></td>
                      <td className="py-2 px-2 text-muted-foreground text-[11px]">{sched.lastScraped ? new Date(sched.lastScraped as unknown as string).toLocaleDateString() : '—'}</td>
                      <td className="py-2 px-2">
                        <Badge variant={sched.status === 'active' ? 'default' : sched.status === 'running' ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                          {sched.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Platform Configuration */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Platform Configuration</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['tinyfish', 'firecrawl', 'apify'] as const).map(platform => (
              <button
                key={platform}
                className={cn(
                  'p-3 rounded-md border text-left transition-colors capitalize',
                  data?.platform?.selected === platform ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                )}
                disabled={readOnly}
              >
                <p className="text-[12px] font-medium capitalize">{platform}</p>
                {platform === 'tinyfish' && <p className="text-[10px] text-muted-foreground mt-0.5">Steps: {data?.platform?.tinyfish?.stepsRemaining || 0} remaining</p>}
                {platform === 'firecrawl' && <p className="text-[10px] text-muted-foreground mt-0.5">Credits: {data?.platform?.firecrawl?.creditsRemaining || 0} remaining</p>}
                {platform === 'apify' && <p className="text-[10px] text-muted-foreground mt-0.5">Compute: {data?.platform?.apify?.computeUnits || 0} units</p>}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Timeout (seconds)</label>
              <Input type="number" value={data?.defaultRunOptions?.timeoutSeconds || 60} disabled={readOnly} className="text-[12px] h-8" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Credits Budget Per Run</label>
              <Input type="number" value={data?.defaultRunOptions?.creditsBudgetPerRun || 10} disabled={readOnly} className="text-[12px] h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Recent Runs</h3>
        </div>
        <div className="px-5 py-4">
          {recentRuns.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No recent scrape runs.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Started</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Duration</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cards</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Changes</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.slice(0, 10).map(run => (
                    <tr key={run.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 text-muted-foreground">{run.startedAt ? new Date(run.startedAt as unknown as string).toLocaleString() : '—'}</td>
                      <td className="py-2 px-2 text-right">{run.duration}s</td>
                      <td className="py-2 px-2 text-right">{run.cardsScraped}</td>
                      <td className="py-2 px-2 text-right">{run.changesDetected}</td>
                      <td className="py-2 px-2">
                        <Badge variant={run.status === 'success' ? 'default' : run.status === 'partial' ? 'secondary' : 'destructive'} className="text-[10px] capitalize">
                          {run.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">${run.cost.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rate-Sensitive Triggers */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Rate-Sensitive Triggers</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={data?.rateSensitiveTriggers?.autoScrapeOnFedRate || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Auto-Scrape on Fed Rate Change</label>
          </div>
          {data?.rateSensitiveTriggers?.upcomingFedDates && data.rateSensitiveTriggers.upcomingFedDates.length > 0 && (
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-muted-foreground">Upcoming Fed Dates</label>
              <div className="flex flex-wrap gap-2">
                {data.rateSensitiveTriggers.upcomingFedDates.map((fd, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {fd.date} ({fd.countdown}d)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Log */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Error Log</h3>
        </div>
        <div className="px-5 py-4">
          {errorLog.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No errors recorded.</p>
          ) : (
            <div className="space-y-2">
              {errorLog.map(entry => (
                <div key={entry.id} className="border border-border rounded-md">
                  <button
                    onClick={() => setExpandedError(expandedError === entry.id ? null : entry.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {expandedError === entry.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span className="font-medium">{entry.cardName}</span>
                      <Badge variant={entry.severity === 'high' ? 'destructive' : entry.severity === 'medium' ? 'default' : 'secondary'} className="text-[9px]">
                        {entry.severity}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{entry.timestamp ? new Date(entry.timestamp as unknown as string).toLocaleString() : '—'}</span>
                  </button>
                  {expandedError === entry.id && (
                    <div className="px-3 pb-2 border-t border-border text-[11px] space-y-1 pt-2">
                      <p className="text-muted-foreground">{entry.message}</p>
                      {entry.retryInfo && <p className="text-[10px] text-muted-foreground">Retry: {entry.retryInfo}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </NotYetAvailable>
  );
}
