import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useConnectionTest } from '../hooks/useConnectionTest';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { BeehiivSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

export function BeehiivTab() {
  const { data, loading, error, save } = useSettings<BeehiivSettings>('beehiiv');
  const { test, testing, result } = useConnectionTest('beehiiv');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('beehiiv');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const connectionStatus = result?.status || data?.connectionStatus || 'not_connected';

  return (
    <div className="space-y-6">
      {/* Connection */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Beehiiv API Connection</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">API Key</label>
              <Input value="••••••••••••••••" disabled className="text-[12px] h-8 font-mono" />
              <Badge variant="outline" className="text-[10px]">Managed via Firebase Secrets</Badge>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Publication ID</label>
              <Input value={data?.publicationId || ''} disabled={readOnly} className="text-[12px] h-8" />
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={() => test()} disabled={testing || readOnly}>
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Test Connection
          </Button>
          {(result || data?.connectionStatus === 'connected') && (
            <div className={cn('flex items-center gap-2 p-3 rounded-md', connectionStatus === 'connected' ? 'bg-green-500/10' : 'bg-red-500/10')}>
              {connectionStatus === 'connected' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <div>
                <p className="text-[12px] font-medium">{connectionStatus === 'connected' ? 'Connected' : 'Not Connected'}</p>
                {data?.planTier && <p className="text-[11px] text-muted-foreground">Plan: {data.planTier} • Subscribers: {data.subscriberCount?.toLocaleString() || '0'}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Newsletter Configuration */}
      <NotYetAvailable note="Everything below the connection test is display-only — newsletter configuration is currently fixed in the newsletter Cloud Functions, and the API key is managed via Firebase Secrets.">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Newsletter Configuration</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Default Send Time</label>
              <Input value={data?.newsletterConfig?.defaultSendTime || ''} disabled={readOnly} className="text-[12px] h-8" placeholder="09:00" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Default Sender Name</label>
              <Input value={data?.newsletterConfig?.defaultSenderName || ''} disabled={readOnly} className="text-[12px] h-8" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Reply-To Email</label>
              <Input value={data?.newsletterConfig?.defaultReplyTo || ''} disabled={readOnly} className="text-[12px] h-8" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Footer</label>
              <Input value={data?.newsletterConfig?.footer || ''} disabled={readOnly} className="text-[12px] h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscriber Sync */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Subscriber Sync</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Sync Frequency</label>
            <select disabled={readOnly} value={data?.subscriberSync?.frequency || 'daily'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3">
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Webhook URL</label>
            <div className="flex items-center gap-2">
              <Input value={data?.subscriberSync?.webhookUrl || ''} disabled className="text-[12px] h-8 font-mono" />
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(data?.subscriberSync?.webhookUrl || ''); toast.success('Copied'); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Events</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'newSubscriber', label: 'New Subscriber' },
                { key: 'unsubscribe', label: 'Unsubscribe' },
                { key: 'emailOpen', label: 'Email Open' },
                { key: 'emailClick', label: 'Email Click' },
                { key: 'referral', label: 'Referral' },
                { key: 'tagChange', label: 'Tag Change' },
              ].map(evt => (
                <div key={evt.key} className="flex items-center gap-2">
                  <Switch checked={(data?.subscriberSync?.events as Record<string, boolean>)?.[evt.key] || false} disabled={readOnly} />
                  <span className="text-[11px] text-muted-foreground">{evt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* A/B Testing Defaults */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">A/B Testing Defaults</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Subject Line Variants</label>
              <Input type="number" value={data?.abTestDefaults?.subjectLineVariants || 2} disabled={readOnly} className="text-[12px] h-8" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Split Percentage</label>
              <Input type="number" value={data?.abTestDefaults?.splitPercentage || 20} disabled={readOnly} className="text-[12px] h-8" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Winning Metric</label>
              <select disabled={readOnly} value={data?.abTestDefaults?.winningMetric || 'open_rate'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3">
                <option value="open_rate">Open Rate</option>
                <option value="click_rate">Click Rate</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Test Duration (hours)</label>
              <Input type="number" value={data?.abTestDefaults?.testDurationHours || 4} disabled={readOnly} className="text-[12px] h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Deliverability & Compliance */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Deliverability & Compliance</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'SPF', status: data?.deliverability?.spfStatus },
              { label: 'DKIM', status: data?.deliverability?.dkimStatus },
              { label: 'DMARC', status: data?.deliverability?.dmarcStatus },
              { label: 'Domain Verified', status: data?.deliverability?.sendingDomainVerified ? 'pass' : 'fail' },
            ].map(item => (
              <div key={item.label} className="text-center p-2 rounded-md border border-border">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <Badge variant={item.status === 'pass' ? 'default' : 'destructive'} className="text-[10px] mt-1">
                  {item.status || 'unknown'}
                </Badge>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Switch checked={data?.deliverability?.canSpamCompliant || false} disabled />
            <span className="text-[12px] text-muted-foreground">CAN-SPAM Compliant</span>
          </div>
          <div className="space-y-2 pt-2">
            <p className="text-[12px] font-medium text-muted-foreground">GDPR</p>
            <div className="flex items-center gap-3">
              <Switch checked={data?.deliverability?.gdpr?.doubleOptIn || false} disabled={readOnly} />
              <span className="text-[11px] text-muted-foreground">Double Opt-In</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={data?.deliverability?.gdpr?.consentTracking || false} disabled={readOnly} />
              <span className="text-[11px] text-muted-foreground">Consent Tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Custom Fields</h3>
        </div>
        <div className="px-5 py-4">
          {(!data?.customFields || data.customFields.length === 0) ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No custom fields configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Subscribers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customFields.map(field => (
                    <tr key={field.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{field.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{field.type}</td>
                      <td className="py-2 px-2 text-muted-foreground">{field.subscribersWithValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Webhooks */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Webhook Configuration</h3>
        </div>
        <div className="px-5 py-4">
          {(!data?.webhooks || data.webhooks.length === 0) ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No webhooks configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Event</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">URL</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.webhooks.map(wh => (
                    <tr key={wh.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{wh.eventType}</td>
                      <td className="py-2 px-2 text-muted-foreground font-mono text-[11px] truncate max-w-[200px]">{wh.url}</td>
                      <td className="py-2 px-2"><Badge variant={wh.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{wh.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </NotYetAvailable>
    </div>
  );
}
