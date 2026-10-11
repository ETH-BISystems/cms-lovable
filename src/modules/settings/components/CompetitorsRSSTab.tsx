import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Globe, Rss, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { CompetitorsRSSSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

export function CompetitorsRSSTab() {
  const { data, loading, error, save } = useSettings<CompetitorsRSSSettings>('competitorsRss');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('competitorsRss');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const competitors = data?.competitors || [];
  const feeds = data?.rssFeeds || [];
  const newsletters = data?.newsletterMonitoring || [];

  return (
    <NotYetAvailable note="Feeds are managed in the RSS Feed Monitor module (sidebar → RSS Feed Monitor), which owns the live rss-feeds collection. This tab will become the consolidated view in a future release.">
    <div className="space-y-6">
      {/* Competitor Sites */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent" />
            <h3 className="text-[14px] font-semibold text-card-foreground">Competitor Sites</h3>
          </div>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Competitor</Button>}
        </div>
        <div className="px-5 py-4">
          {competitors.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No competitors configured. Add competitor domains to monitor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Domain</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map(comp => (
                    <tr key={comp.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{comp.name}</td>
                      <td className="py-2 px-2 text-muted-foreground font-mono text-[11px]">{comp.domain}</td>
                      <td className="py-2 px-2 text-right">
                        {!readOnly && <button className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RSS Feeds */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rss className="h-4 w-4 text-accent" />
            <h3 className="text-[14px] font-semibold text-card-foreground">RSS Feeds</h3>
          </div>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Feed</Button>}
        </div>
        <div className="px-5 py-4">
          {feeds.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No RSS feeds configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">URL</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeds.map(feed => (
                    <tr key={feed.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{feed.name}</td>
                      <td className="py-2 px-2 text-muted-foreground font-mono text-[11px] truncate max-w-[200px]">{feed.url}</td>
                      <td className="py-2 px-2">
                        <Badge variant={feed.status === 'active' ? 'default' : feed.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {feed.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {!readOnly && <button className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Newsletter Monitoring */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            <h3 className="text-[14px] font-semibold text-card-foreground">Newsletter Monitoring</h3>
          </div>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Newsletter</Button>}
        </div>
        <div className="px-5 py-4">
          {newsletters.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No competitor newsletters being monitored.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Email</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {newsletters.map(nl => (
                    <tr key={nl.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{nl.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{nl.email}</td>
                      <td className="py-2 px-2">
                        <Badge variant={nl.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{nl.status}</Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {!readOnly && <button className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </NotYetAvailable>
  );
}
