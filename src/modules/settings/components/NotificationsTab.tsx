import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { NotificationsSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

export function NotificationsTab() {
  const { data, loading, error, save } = useSettings<NotificationsSettings>('notifications');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('notifications');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const defaults = data?.defaults || [];
  const categories = [...new Set(defaults.map(d => d.category))];

  return (
    <NotYetAvailable note="Notification preferences are not yet wired — delivery routing currently uses the Slack webhook configured via Firebase Secrets.">
    <div className="space-y-6">
      {/* Global Notification Defaults */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Global Notification Defaults</h3>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Custom Event</Button>}
        </div>
        <div className="px-5 py-4">
          {defaults.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No notification events configured.</p>
          ) : (
            <div className="space-y-2">
              {categories.map(category => {
                const categoryEvents = defaults.filter(d => d.category === category);
                const isExpanded = expandedCategory === category;
                return (
                  <div key={category} className="border border-border rounded-md">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <span className="font-medium capitalize">{category}</span>
                        <Badge variant="outline" className="text-[9px]">{categoryEvents.length} events</Badge>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border">
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b border-border bg-muted/30">
                                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Event</th>
                                <th className="text-center py-2 px-2 text-muted-foreground font-medium">Slack</th>
                                <th className="text-center py-2 px-2 text-muted-foreground font-medium">Dashboard</th>
                                <th className="text-center py-2 px-2 text-muted-foreground font-medium">Email</th>
                                <th className="text-center py-2 px-2 text-muted-foreground font-medium">Push</th>
                                <th className="text-center py-2 px-2 text-muted-foreground font-medium">Priority</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categoryEvents.map(evt => (
                                <tr key={evt.id} className="border-b border-border last:border-0">
                                  <td className="py-2 px-3 font-medium">{evt.event}</td>
                                  <td className="py-2 px-2 text-center"><Switch checked={evt.slack} disabled={readOnly} className="scale-75" /></td>
                                  <td className="py-2 px-2 text-center"><Switch checked={evt.dashboard} disabled={readOnly} className="scale-75" /></td>
                                  <td className="py-2 px-2 text-center"><Switch checked={evt.email} disabled={readOnly} className="scale-75" /></td>
                                  <td className="py-2 px-2 text-center"><Switch checked={evt.push} disabled={readOnly} className="scale-75" /></td>
                                  <td className="py-2 px-2 text-center">
                                    <Badge variant={evt.priority === 'high' ? 'destructive' : evt.priority === 'medium' ? 'default' : 'secondary'} className="text-[9px]">
                                      {evt.priority}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Quiet Hours</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={data?.quietHours?.enabled || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Enable Quiet Hours</label>
          </div>
          {data?.quietHours?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-8">
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Start Time</label>
                <Input value={data.quietHours.startTime || ''} disabled={readOnly} className="text-[12px] h-8" placeholder="22:00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">End Time</label>
                <Input value={data.quietHours.endTime || ''} disabled={readOnly} className="text-[12px] h-8" placeholder="08:00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Timezone</label>
                <Input value={data.quietHours.timezone || ''} disabled={readOnly} className="text-[12px] h-8" placeholder="America/New_York" />
              </div>
            </div>
          )}
          {data?.quietHours?.enabled && (
            <div className="flex items-center gap-3 pl-8">
              <Switch checked={data.quietHours.weekendQuietHours || false} disabled={readOnly} />
              <label className="text-[12px] text-muted-foreground">Weekend Quiet Hours</label>
            </div>
          )}
        </div>
      </div>

      {/* Digest Preferences */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Digest Preferences</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Dashboard Digest</label>
              <select disabled={readOnly} value={data?.digestPreferences?.dashboardDigest || 'realtime'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3 w-full">
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Email Digest</label>
              <select disabled={readOnly} value={data?.digestPreferences?.emailDigest || 'never'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3 w-full">
                <option value="never">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
    </NotYetAvailable>
  );
}
