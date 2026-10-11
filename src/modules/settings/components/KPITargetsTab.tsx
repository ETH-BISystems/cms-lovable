import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, Mail, Wrench, DollarSign, Save } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { KPITargetsSettings } from '../types';

type SectionKey = 'publishing' | 'trafficSeo' | 'newsletter' | 'operational' | 'budget';

interface FieldDef {
  section: SectionKey;
  field: string;
  label: string;
  usedBy: string;
  step?: string;
}

const SECTIONS: Array<{ key: SectionKey; title: string; icon: typeof Target; cols: string }> = [
  { key: 'publishing', title: 'Publishing & Content Targets', icon: Target, cols: 'sm:grid-cols-3' },
  { key: 'trafficSeo', title: 'Traffic & SEO Targets', icon: TrendingUp, cols: 'sm:grid-cols-3' },
  { key: 'newsletter', title: 'Newsletter Targets', icon: Mail, cols: 'sm:grid-cols-3' },
  { key: 'operational', title: 'Operational Thresholds', icon: Wrench, cols: 'sm:grid-cols-2' },
  { key: 'budget', title: 'Budget Targets', icon: DollarSign, cols: 'sm:grid-cols-2' },
];

const FIELDS: FieldDef[] = [
  { section: 'publishing', field: 'weeklyArticleTarget', label: 'Weekly Article Target', usedBy: 'Used by: Dashboard, Pipeline, Calendar' },
  { section: 'publishing', field: 'monthlyArticleTarget', label: 'Monthly Article Target', usedBy: 'Used by: Dashboard, Calendar' },
  { section: 'publishing', field: 'avgQualityScoreTarget', label: 'Avg Quality Score Target', usedBy: 'Used by: Pipeline, Content Library', step: '0.1' },
  { section: 'trafficSeo', field: 'weeklyOrganicTraffic', label: 'Weekly Organic Traffic', usedBy: 'Used by: SEO Dashboard' },
  { section: 'trafficSeo', field: 'keywordsOnPage1', label: 'Keywords on Page 1', usedBy: 'Used by: Position Tracking' },
  { section: 'trafficSeo', field: 'domainRating', label: 'Domain Rating', usedBy: 'Used by: SEO Dashboard' },
  { section: 'newsletter', field: 'subscriberMonthlyGrowth', label: 'Subscriber Monthly Growth', usedBy: 'Used by: Newsletter Dashboard' },
  { section: 'newsletter', field: 'openRate', label: 'Open Rate (%)', usedBy: 'Used by: Newsletter Analytics', step: '0.1' },
  { section: 'newsletter', field: 'clickRate', label: 'Click Rate (%)', usedBy: 'Used by: Newsletter Analytics', step: '0.1' },
  { section: 'operational', field: 'articlesNeedingRefresh', label: 'Articles Needing Refresh', usedBy: 'Used by: Refresh Queue' },
  { section: 'operational', field: 'pipelineBottleneck', label: 'Pipeline Bottleneck', usedBy: 'Used by: Pipeline Dashboard' },
  { section: 'budget', field: 'monthlyApiBudget', label: 'Monthly API Budget ($)', usedBy: 'Used by: API Cost Tracking' },
];

type Values = Record<string, number>;
const key = (f: FieldDef) => `${f.section}.${f.field}`;

export function KPITargetsTab() {
  const { data, loading, error, save } = useSettings<KPITargetsSettings>('kpiTargets');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('kpiTargets');

  const [values, setValues] = useState<Values>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const initial = useMemo<Values>(() => {
    const v: Values = {};
    for (const f of FIELDS) {
      const section = (data as unknown as Record<string, Record<string, number>> | null)?.[f.section];
      v[key(f)] = Number(section?.[f.field] ?? 0);
    }
    return v;
  }, [data]);

  // Sync from server only while the user has no unsaved edits
  useEffect(() => {
    if (!dirty) setValues(initial);
  }, [initial, dirty]);

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

  const setField = (f: FieldDef, raw: string) => {
    setDirty(true);
    setValues((prev) => ({ ...prev, [key(f)]: raw === '' ? 0 : Number(raw) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, Record<string, number>> = {};
      for (const f of FIELDS) {
        payload[f.section] = payload[f.section] ?? {};
        payload[f.section][f.field] = values[key(f)] ?? 0;
      }
      await save(payload as unknown as Partial<KPITargetsSettings>);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {SECTIONS.map(({ key: sectionKey, title, icon: Icon, cols }) => (
        <div key={sectionKey} className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Icon className="h-4 w-4 text-accent" />
            <h3 className="text-[14px] font-semibold text-card-foreground">{title}</h3>
          </div>
          <div className="px-5 py-4">
            <div className={`grid grid-cols-1 ${cols} gap-4`}>
              {FIELDS.filter((f) => f.section === sectionKey).map((f) => (
                <div key={key(f)} className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">{f.label}</label>
                  <Input
                    type="number"
                    value={values[key(f)] ?? 0}
                    onChange={(e) => setField(f, e.target.value)}
                    disabled={readOnly || saving}
                    step={f.step}
                    className="text-[12px] h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">{f.usedBy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save KPI Targets'}
          </Button>
          {dirty && <span className="text-[11px] text-orange-500">Unsaved changes</span>}
        </div>
      )}

      {/* Target Change History */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Target Change History</h3>
        </div>
        <div className="px-5 py-4">
          {(!data?.changeHistory || data.changeHistory.length === 0) ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">
              No changes recorded here yet — every save is logged in the Audit Log tab.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Field</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Old</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">New</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Changed By</th>
                  </tr>
                </thead>
                <tbody>
                  {data.changeHistory.slice(0, 10).map((entry, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 text-muted-foreground">{entry.timestamp ? new Date(entry.timestamp as unknown as string).toLocaleDateString() : '—'}</td>
                      <td className="py-2 px-2 font-medium">{entry.field}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{entry.oldValue}</td>
                      <td className="py-2 px-2 text-right font-medium">{entry.newValue}</td>
                      <td className="py-2 px-2 text-muted-foreground">{entry.changedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
