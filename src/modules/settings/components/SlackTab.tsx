import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Plus, Trash2, Loader2, Hash, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useConnectionTest } from '../hooks/useConnectionTest';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { SlackSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

export function SlackTab() {
  const { data, loading, error, save } = useSettings<SlackSettings>('slack');
  const { test, testing, result } = useConnectionTest('slack');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('slack');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const channels = data?.channels || [];
  const alerts = data?.customAlerts || [];

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Slack Workspace</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          {data?.connected ? (
            <div className="flex items-center gap-3 p-3 rounded-md bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-[12px] font-medium">Connected to {data.workspaceName}</p>
                <p className="text-[10px] text-muted-foreground">Connected by {data.connectedBy} • Scopes: {data.oauthScopes?.join(', ') || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Hash className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-[12px] text-muted-foreground mb-3">Slack workspace not connected.</p>
              {!readOnly && <Button variant="outline" size="sm" className="text-[12px]">Connect Slack Workspace</Button>}
            </div>
          )}
          {!readOnly && data?.connected && (
            <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={() => test()} disabled={testing}>
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Test Message
            </Button>
          )}
        </div>
      </div>

      {/* Channel Routing */}
      <NotYetAvailable note="Everything below the webhook test is display-only — channel routing and digests are not yet wired; alerts currently go to the single webhook managed via Firebase Secrets.">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Channel Routing</h3>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Channel</Button>}
        </div>
        <div className="px-5 py-4">
          {channels.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No channels configured. Add a channel to route notifications.</p>
          ) : (
            <div className="space-y-3">
              {channels.map(channel => (
                <div key={channel.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[12px] font-medium">{channel.name}</span>
                      <Badge variant={channel.enabled ? 'default' : 'secondary'} className="text-[10px]">{channel.enabled ? 'Active' : 'Disabled'}</Badge>
                    </div>
                    <Switch checked={channel.enabled} disabled={readOnly} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{channel.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {channel.events.map(evt => (
                      <Badge key={evt} variant="outline" className="text-[9px]">{evt}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Digest */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Daily Digest</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Channel</label>
              <Input value={data?.dailyDigest?.channelId || ''} disabled={readOnly} className="text-[12px] h-8" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Send Time</label>
              <Input value={data?.dailyDigest?.sendTime || ''} disabled={readOnly} className="text-[12px] h-8" placeholder="09:00" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Content Checks</label>
            <div className="flex flex-wrap gap-1">
              {(data?.dailyDigest?.contentChecks || []).map((check, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{check}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Alerts */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Custom Alerts</h3>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Create Alert</Button>}
        </div>
        <div className="px-5 py-4">
          {alerts.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No custom alerts configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Trigger</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Channel</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Priority</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map(alert => (
                    <tr key={alert.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{alert.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{alert.triggerType}</td>
                      <td className="py-2 px-2 text-muted-foreground">{alert.channelId}</td>
                      <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{alert.priority}</Badge></td>
                      <td className="py-2 px-2"><Switch checked={alert.active} disabled={readOnly} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Notification Formatting */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Notification Formatting</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Message Format</label>
            <div className="flex gap-2">
              {(['rich', 'simple'] as const).map(fmt => (
                <button
                  key={fmt}
                  className={cn('text-[11px] px-3 py-1.5 rounded-md border transition-colors capitalize', data?.formatting?.messageFormat === fmt ? 'bg-accent/10 border-accent text-accent font-medium' : 'border-border text-muted-foreground')}
                  disabled={readOnly}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data?.formatting?.includeDashboardLinks || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Include Dashboard Links</label>
          </div>
        </div>
      </div>
      </NotYetAvailable>
    </div>
  );
}
