import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Globe, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useConnectionTest } from '../hooks/useConnectionTest';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { WebflowSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

export function WebflowTab() {
  const { data, loading, error, save } = useSettings<WebflowSettings>('webflow');
  const { test, testing, result } = useConnectionTest('webflow');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('webflow');
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);

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
          <h3 className="text-[14px] font-semibold text-card-foreground">Webflow API Connection</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">API Token</label>
            <div className="flex items-center gap-2">
              <Input value="••••••••••••••••" disabled className="text-[12px] h-8 max-w-xs font-mono" />
              <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={() => test()} disabled={testing || readOnly}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Test Connection
              </Button>
            </div>
            <Badge variant="outline" className="text-[10px]">Managed via Firebase Secrets</Badge>
          </div>
          {(result || data?.connectionStatus === 'connected') && (
            <div className={cn('flex items-center gap-2 p-3 rounded-md', connectionStatus === 'connected' ? 'bg-green-500/10' : 'bg-red-500/10')}>
              {connectionStatus === 'connected' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <div>
                <p className="text-[12px] font-medium">{connectionStatus === 'connected' ? 'Connected' : 'Not Connected'}</p>
                {data?.siteName && <p className="text-[11px] text-muted-foreground">Site: {data.siteName} • Plan: {data.planTier || 'Unknown'} • Rate Limit: {data.rateLimit || 'Unknown'}</p>}
              </div>
            </div>
          )}
          {/* CMS-113: the connection can be green while image transfers fail —
              the token also needs assets:write. Probed by testWebflowConnection. */}
          {result?.details?.assetsWriteScope === 'missing' && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700">
                Token is missing the <strong>assets:write</strong> scope — article thumbnails and card images will NOT transfer to Webflow.
                Regenerate the token in the Webflow workspace with <strong>Assets read + write</strong> scopes (alongside CMS read + write),
                rotate it in Settings → Configuration (Webflow API key), then re-test. Functions pick up the rotated key on their next deploy.
              </p>
            </div>
          )}
          {result?.details?.assetsWriteScope === 'present' && (
            <p className="text-[11px] text-muted-foreground">✓ Token has the assets:write scope — image transfers enabled.</p>
          )}
        </div>
      </div>

      {/* Site Mapping */}
      <NotYetAvailable note="Everything below the connection test is display-only — publishing defaults and field mappings are currently fixed in the publish Cloud Function, and the API token is managed via Firebase Secrets.">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Site Mapping</h3>
        </div>
        <div className="px-5 py-4">
          {(!data?.siteMapping || data.siteMapping.length === 0) ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No sites mapped. Connect Webflow to see site mappings.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Site</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Webflow Site ID</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Domain</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.siteMapping.map(site => (
                    <tr key={site.siteId} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{site.siteName}</td>
                      <td className="py-2 px-2 text-muted-foreground font-mono text-[11px]">{site.webflowSiteId}</td>
                      <td className="py-2 px-2 text-muted-foreground">{site.domain}</td>
                      <td className="py-2 px-2">
                        <Badge variant={site.connectionStatus === 'connected' ? 'default' : 'destructive'} className="text-[10px]">
                          {site.connectionStatus}
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

      {/* Publishing Defaults */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Publishing Defaults</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Default Status</label>
            <select disabled={readOnly} value={data?.publishingDefaults?.defaultStatus || 'draft'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data?.publishingDefaults?.autoSubmitToGSC || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Auto-Submit to Google Search Console</label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data?.publishingDefaults?.postPublishVerification || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Post-Publish Verification</label>
          </div>
          {data?.publishingDefaults?.postPublishVerification && (
            <div className="space-y-1.5 pl-8">
              <label className="text-[12px] font-medium text-muted-foreground">Verification Delay (seconds)</label>
              <Input type="number" value={data?.publishingDefaults?.verificationDelaySeconds || 30} disabled={readOnly} className="text-[12px] h-8 max-w-[120px]" />
            </div>
          )}
        </div>
      </div>

      {/* CMS Field Mappings */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">CMS Field Mapping Reference</h3>
        </div>
        <div className="px-5 py-4">
          {(!data?.cmsFieldMappings || data.cmsFieldMappings.length === 0) ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No field mappings configured.</p>
          ) : (
            <div className="space-y-2">
              {data.cmsFieldMappings.map(col => (
                <div key={col.collectionName} className="border border-border rounded-md">
                  <button
                    onClick={() => setExpandedCollection(expandedCollection === col.collectionName ? null : col.collectionName)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {expandedCollection === col.collectionName ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span className="font-medium">{col.collectionName}</span>
                      <span className="text-muted-foreground">→ {col.firestoreCollection}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{col.itemCount} items</span>
                      {col.pendingItems > 0 && <Badge variant="outline" className="text-[9px]">{col.pendingItems} pending</Badge>}
                    </div>
                  </button>
                  {expandedCollection === col.collectionName && (
                    <div className="px-4 pb-3 border-t border-border">
                      <table className="w-full text-[11px] mt-2">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left py-1">Firestore Field</th>
                            <th className="text-left py-1">Webflow Field</th>
                            <th className="text-left py-1">Type</th>
                            <th className="text-left py-1">Direction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {col.mappings.map((m, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="py-1 font-mono">{m.firestoreField}</td>
                              <td className="py-1 font-mono">{m.webflowField}</td>
                              <td className="py-1">{m.type}</td>
                              <td className="py-1"><Badge variant="outline" className="text-[9px]">{m.syncDirection}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </NotYetAvailable>
    </div>
  );
}
