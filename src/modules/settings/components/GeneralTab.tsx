import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, X, Plus, Globe, Server, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { GeneralSettings, SiteConfig } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

const TIMEZONES = ['Eastern Time (ET)', 'Central Time (CT)', 'Mountain Time (MT)', 'Pacific Time (PT)', 'UTC', 'GMT'];
const DATE_FORMATS: GeneralSettings['dashboard']['dateFormat'][] = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
const WEEK_STARTS: GeneralSettings['dashboard']['weekStartsOn'][] = ['Sunday', 'Monday'];
const SITE_PURPOSES: SiteConfig['purpose'][] = ['Content & Blog', 'Sales Funnel'];

const DASHBOARD_CONTEXTS = [
  { name: 'Blog & Newsletter Management', status: 'Active', sites: 'EPM + ETH' },
  { name: 'Operations Management', status: 'Coming Soon', sites: 'ETH' },
  { name: 'Ads Management', status: 'Future', sites: 'EPM + ETH' },
  { name: 'Content Management', status: 'Coming Soon', sites: 'EPM' },
];

const statusColors: Record<string, string> = {
  'Active': 'bg-green-500/10 text-green-600',
  'Coming Soon': 'bg-orange-500/10 text-orange-600',
  'Future': 'bg-muted text-muted-foreground',
};

export function GeneralTab() {
  const { data, loading, error, save } = useSettings<GeneralSettings>('general');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('general');

  const [companyName, setCompanyName] = useState('');
  const [tagline, setTagline] = useState('');
  const [timezone, setTimezone] = useState('Eastern Time (ET)');
  const [dateFormat, setDateFormat] = useState<GeneralSettings['dashboard']['dateFormat']>('MM/DD/YYYY');
  const [weekStart, setWeekStart] = useState<GeneralSettings['dashboard']['weekStartsOn']>('Sunday');
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [confirmRemoveSite, setConfirmRemoveSite] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setCompanyName(data.companyName || '');
      setTagline(data.tagline || '');
      setTimezone(data.dashboard?.timezone || 'Eastern Time (ET)');
      setDateFormat(data.dashboard?.dateFormat || 'MM/DD/YYYY');
      setWeekStart(data.dashboard?.weekStartsOn || 'Sunday');
      setSites(data.sites || []);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const addSite = () => {
    setSites([...sites, { id: crypto.randomUUID(), name: '', domain: '', purpose: 'Content & Blog', primary: false, webflowSiteId: '', active: true }]);
  };

  const removeSite = (i: number) => {
    setSites(sites.filter((_, j) => j !== i));
    setConfirmRemoveSite(null);
    toast.success('Site removed');
  };

  return (
    <NotYetAvailable note="Editing general settings is not yet wired to the backend — changes here would not be saved. Company identity, sites, and preferences will become editable in a future release.">
    <div className="space-y-6">
      {/* Company Identity */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Company Identity</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Company Name</label>
            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={readOnly} className="text-[13px] h-9 max-w-md" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Company Logo</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border border-border bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold">ETH</div>
              <Button variant="outline" size="sm" className="text-[12px] gap-1.5" disabled={readOnly}><Upload className="h-3.5 w-3.5" />Upload New</Button>
              <Button variant="ghost" size="sm" className="text-[12px] text-destructive" disabled={readOnly}>Remove</Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Tagline <span className="text-muted-foreground/60">(optional)</span></label>
            <Input value={tagline} onChange={e => setTagline(e.target.value)} disabled={readOnly} placeholder="Used in newsletter footers and compliance disclosures" className="text-[13px] h-9 max-w-md" />
          </div>
        </div>
      </div>

      {/* Site Configuration */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-accent" />Site Configuration</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          {sites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-[13px]">No sites configured yet.</p>
              {!readOnly && <Button variant="outline" size="sm" className="mt-3 text-[12px] gap-1.5" onClick={addSite}><Plus className="h-3.5 w-3.5" />Add Site</Button>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sites.map((site, i) => (
                  <div key={site.id || i} className={cn('rounded-lg border p-4 space-y-3', site.primary ? 'border-accent bg-accent/5' : 'border-border')}>
                    <div className="flex items-center justify-between">
                      <select
                        value={site.purpose}
                        onChange={e => { const s = [...sites]; s[i] = { ...s[i], purpose: e.target.value as SiteConfig['purpose'] }; setSites(s); }}
                        disabled={readOnly}
                        className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer', site.purpose === 'Content & Blog' ? 'bg-accent/10 text-accent' : 'bg-orange-500/10 text-orange-600')}
                      >
                        {SITE_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div className="flex items-center gap-2">
                        {site.primary && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">Primary</span>}
                        <button
                          onClick={() => { if (readOnly) return; const s = [...sites]; s[i] = { ...s[i], active: !s[i].active }; setSites(s); }}
                          className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer', site.active ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground')}
                        >
                          {site.active ? 'Active' : 'Inactive'}
                        </button>
                        {!site.primary && !readOnly && (
                          confirmRemoveSite === i ? (
                            <div className="flex items-center gap-1">
                              <Button variant="destructive" size="sm" className="text-[9px] h-5 px-1.5" onClick={() => removeSite(i)}>Confirm</Button>
                              <Button variant="ghost" size="sm" className="text-[9px] h-5 px-1.5" onClick={() => setConfirmRemoveSite(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmRemoveSite(i)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Site Name</label>
                      <Input value={site.name} onChange={e => { const s = [...sites]; s[i] = { ...s[i], name: e.target.value }; setSites(s); }} disabled={readOnly} className="text-[12px] h-8" placeholder="My New Site" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Domain URL</label>
                      <Input value={site.domain} onChange={e => { const s = [...sites]; s[i] = { ...s[i], domain: e.target.value }; setSites(s); }} disabled={readOnly} className="text-[12px] h-8" placeholder="example.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-muted-foreground">Webflow Site ID</label>
                      <Input value={site.webflowSiteId} onChange={e => { const s = [...sites]; s[i] = { ...s[i], webflowSiteId: e.target.value }; setSites(s); }} disabled={readOnly} className="text-[12px] h-8" placeholder="wf_xxx_001" />
                    </div>
                    {!site.primary && !readOnly && (
                      <button onClick={() => { const s = sites.map((x, j) => ({ ...x, primary: j === i })); setSites(s); }} className="text-[11px] text-accent hover:underline">Set as Primary</button>
                    )}
                  </div>
                ))}
              </div>
              {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={addSite}><Plus className="h-3.5 w-3.5" />Add Site</Button>}
            </>
          )}
        </div>
      </div>

      {/* Dashboard Preferences */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Dashboard Preferences</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)} disabled={readOnly} className="w-full max-w-xs text-[12px] h-9 rounded-md border border-input bg-background px-3">
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Date Format</label>
              <div className="flex gap-2">
                {DATE_FORMATS.map(f => (
                  <button key={f} onClick={() => { if (!readOnly) setDateFormat(f); }} className={cn('text-[11px] px-3 py-1.5 rounded-md border transition-colors', dateFormat === f ? 'bg-accent/10 border-accent text-accent font-medium' : 'border-border text-muted-foreground hover:border-accent/50')}>{f}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Week Starts On</label>
              <div className="flex gap-2">
                {WEEK_STARTS.map(w => (
                  <button key={w} onClick={() => { if (!readOnly) setWeekStart(w); }} className={cn('text-[11px] px-3 py-1.5 rounded-md border transition-colors', weekStart === w ? 'bg-accent/10 border-accent text-accent font-medium' : 'border-border text-muted-foreground hover:border-accent/50')}>{w}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Environment (Read-Only) */}
      <div className="bg-muted/40 rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground flex items-center gap-2"><Server className="h-4 w-4 text-muted-foreground" />Platform Environment <span className="text-[10px] text-muted-foreground font-normal">(Read-Only)</span></h3>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Firebase Project ID', value: 'elite-travel-hackers' },
              { label: 'Region', value: 'us-central1' },
              { label: 'Environment', value: 'Production', badge: 'bg-green-500/10 text-green-600' },
              { label: 'Build Version', value: 'React + Vite' },
              { label: 'Last Deployed', value: '—' },
              { label: 'Cloud Functions Runtime', value: 'Node.js 22 / TypeScript' },
            ].map(item => (
              <div key={item.label} className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                {item.badge ? (
                  <div><span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', item.badge)}>{item.value}</span></div>
                ) : (
                  <p className="text-[12px] text-card-foreground font-medium">{item.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Contexts */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Dashboard Contexts <span className="text-[10px] text-muted-foreground font-normal">(Reference)</span></h3>
        </div>
        <div className="divide-y divide-border">
          {DASHBOARD_CONTEXTS.map(ctx => (
            <div key={ctx.name} className="flex items-center justify-between px-5 py-3">
              <span className="text-[13px] text-card-foreground font-medium">{ctx.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground">{ctx.sites}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statusColors[ctx.status])}>{ctx.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </NotYetAvailable>
  );
}
