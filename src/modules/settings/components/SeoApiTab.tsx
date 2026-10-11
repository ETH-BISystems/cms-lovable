import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, Search, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useConnectionTest } from '../hooks/useConnectionTest';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { SeoApiSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';
import { SimilarwebCard } from './SimilarwebCard';

export function SeoApiTab() {
  const { data, loading, error, save } = useSettings<SeoApiSettings>('seoApi');
  const { test, testing, result } = useConnectionTest('dataforseo');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('seoApi');

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

  const connectionStatus = result?.status || data?.connectionStatus || 'not_connected';

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">SEO Data Provider</h3>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'dataforseo', name: 'DataForSEO', desc: 'Full API access, pay-per-use' },
              { id: 'semrush', name: 'SEMrush', desc: 'Comprehensive SEO suite' },
              { id: 'se_ranking', name: 'SE Ranking', desc: 'Affordable rank tracking' },
              { id: 'similarweb', name: 'Similarweb', desc: 'Traffic & Market intelligence' },
            ].map(provider => (
              <button
                key={provider.id}
                className={cn(
                  'p-3 rounded-md border text-left transition-colors',
                  data?.provider === provider.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                )}
                disabled={readOnly}
              >
                <p className="text-[12px] font-medium">{provider.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{provider.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Provider Configuration */}
      <NotYetAvailable note="Everything below the connection test is display-only — provider configuration is currently fixed in the SEO Cloud Functions, and credentials are managed via Firebase Secrets.">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Provider Configuration</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">API Credentials</label>
            <div className="flex items-center gap-2">
              <Input value="••••••••••••••••" disabled className="text-[12px] h-8 max-w-xs font-mono" />
              <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={() => test()} disabled={testing || readOnly}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Test Connection
              </Button>
            </div>
            <Badge variant="outline" className="text-[10px]">Managed via Firebase Secrets</Badge>
          </div>
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-[12px] font-medium">Connected</p>
                {data?.accountBalance != null && <p className="text-[11px] text-muted-foreground">Balance: ${data.accountBalance.toFixed(2)}</p>}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Daily Request Budget</label>
            <Input type="number" value={data?.dailyRequestBudget || 0} disabled={readOnly} className="text-[12px] h-8 max-w-[150px]" />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Priority Allocation</label>
            {(data?.priorityAllocation || []).map((alloc, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] w-32">{alloc.module}</span>
                <Progress value={alloc.percentage} className="h-2 flex-1" />
                <span className="text-[11px] text-muted-foreground w-10 text-right">{alloc.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Google Search Console */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Google Search Console</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data?.googleSearchConsole?.connected ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
              <span className="text-[12px]">{data?.googleSearchConsole?.connected ? 'Connected' : 'Not Connected'}</span>
            </div>
            {!readOnly && <Button variant="outline" size="sm" className="text-[12px]">{data?.googleSearchConsole?.connected ? 'Disconnect' : 'Connect'}</Button>}
          </div>
          {data?.googleSearchConsole?.connected && (
            <>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Sync Frequency</label>
                <select disabled={readOnly} value={data.googleSearchConsole.syncFrequency} className="text-[12px] h-8 rounded-md border border-input bg-background px-3">
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-muted-foreground">Data Scope</label>
                {[
                  { key: 'indexingStatus', label: 'Indexing Status' },
                  { key: 'searchPerformance', label: 'Search Performance' },
                  { key: 'coreWebVitals', label: 'Core Web Vitals' },
                ].map(scope => (
                  <div key={scope.key} className="flex items-center gap-2">
                    <Switch checked={(data.googleSearchConsole.dataScope as Record<string, boolean>)[scope.key] || false} disabled={readOnly} />
                    <span className="text-[11px] text-muted-foreground">{scope.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Google Analytics 4 */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Google Analytics 4</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data?.googleAnalytics4?.connected ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
              <span className="text-[12px]">{data?.googleAnalytics4?.connected ? 'Connected' : 'Not Connected'}</span>
            </div>
            {!readOnly && <Button variant="outline" size="sm" className="text-[12px]">{data?.googleAnalytics4?.connected ? 'Disconnect' : 'Connect'}</Button>}
          </div>
        </div>
      </div>

      {/* Google Ads */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Google Ads</h3>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data?.googleAds?.connected ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
              <span className="text-[12px]">{data?.googleAds?.connected ? 'Connected' : 'Not Connected'}</span>
            </div>
            {!readOnly && <Button variant="outline" size="sm" className="text-[12px]">{data?.googleAds?.connected ? 'Disconnect' : 'Connect'}</Button>}
          </div>
        </div>
      </div>

      {/* DataForSEO Capabilities */}
      {data?.dataForSeoCapabilities && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-[14px] font-semibold text-card-foreground">DataForSEO Capabilities</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-[10px]">{data.dataForSeoCapabilities.planBadge}</Badge>
              <span className="text-[11px] text-muted-foreground">Rate Limits: {data.dataForSeoCapabilities.rateLimits}</span>
            </div>
            <div className="space-y-2">
              {data.dataForSeoCapabilities.modules.map(mod => (
                <div key={mod.name} className="flex items-center gap-3">
                  <Switch checked={mod.enabled} disabled={readOnly} />
                  <span className="text-[11px] flex-1">{mod.name}</span>
                  <span className="text-[10px] text-muted-foreground">{mod.monthlyUsage} uses • ${mod.cost.toFixed(2)} • ${mod.budgetRemaining.toFixed(2)} remaining</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Redirects */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Webflow Redirects</h3>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Redirect</Button>}
        </div>
        <div className="px-5 py-4">
          {(!data?.redirects || data.redirects.length === 0) ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No redirects configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Old URL</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">New URL</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.redirects.map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-mono text-[11px]">{r.oldUrl}</td>
                      <td className="py-2 px-2 font-mono text-[11px]">{r.newUrl}</td>
                      <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{r.type}</Badge></td>
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
      </NotYetAvailable>

      {/* Similarweb — Traffic & Market (live controls, outside NotYetAvailable) */}
      <SimilarwebCard />
    </div>
  );
}
