import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader2, Plus, Save, ShieldCheck, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { ComplianceSettings, ComplianceRulesSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';
import { DEFAULT_COMPLIANCE_RULES } from '../complianceDefaultRules';

/**
 * The editable compliance rules document (settings/complianceRules.rulesText)
 * that the pipeline's final-step compliance check audits every article
 * against. Prefilled with the embedded default rules until first saved, so
 * the first Save persists the seed text.
 */
function ComplianceRulesDocumentSection() {
  const { data, loading, error, save } = useSettings<ComplianceRulesSettings>('complianceRules');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('complianceRules');

  const [text, setText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const savedText = data?.rulesText && data.rulesText.trim() ? data.rulesText : null;

  // Initialize the editor once loading settles: saved text wins, otherwise
  // seed with the default so the first Save persists it.
  useEffect(() => {
    if (!loading && text === null) {
      setText(savedText ?? DEFAULT_COMPLIANCE_RULES);
    }
  }, [loading, savedText, text]);

  if (loading || text === null) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (error) {
    return <div className="text-destructive text-[12px]">Failed to load compliance rules: {error.message}</div>;
  }

  const dirty = text !== (savedText ?? '');
  const needsSeeding = !savedText;

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({ rulesText: text });
    } catch {
      // useSettings already surfaced the toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <div>
            <h3 className="text-[14px] font-semibold text-card-foreground">Article Compliance Document</h3>
            <p className="text-[11px] text-muted-foreground">
              Paste the compliance rules here. Every article in the final pipeline stage is checked
              against this document by the AI compliance auditor.
            </p>
          </div>
        </div>
        {!readOnly && (
          <Button size="sm" className="text-[12px] gap-1.5 shrink-0" onClick={handleSave} disabled={saving || (!dirty && !needsSeeding)}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : 'Save Rules'}
          </Button>
        )}
      </div>
      <div className="px-5 py-4 space-y-2">
        {needsSeeding && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-info/10 border border-info/20">
            <AlertTriangle className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <p className="text-[11px] text-info">
              Showing the built-in default rules — they haven't been saved to Settings yet. The pipeline check already
              uses this default; press Save Rules to persist it so future edits start from here.
            </p>
          </div>
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={readOnly}
          spellCheck={false}
          className="font-mono text-[11px] leading-relaxed h-96 resize-y whitespace-pre-wrap"
          placeholder="Paste the credit-card affiliate compliance rules document…"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums">{text.length.toLocaleString()} characters</span>
          <span>
            {data?.updatedAt
              ? `Last updated ${format(data.updatedAt.toDate(), 'MMM d, yyyy h:mm a')}${data.updatedBy ? ` · ${data.updatedBy}` : ''}`
              : 'Never saved — using built-in default'}
            {dirty && !needsSeeding && ' · unsaved changes'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ComplianceRulesTab() {
  const { data, loading, error } = useSettings<ComplianceSettings>('compliance');

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

  const disclaimers = data?.disclaimers || [];
  const guardrails = data?.financialAdviceGuardrails || [];
  const readOnly = true; // legacy sections below are display-only until wired

  return (
    <div className="space-y-6">
    <ComplianceRulesDocumentSection />
    <NotYetAvailable note="The sections below are shown for reference — editing is not yet wired. The pipeline's compliance check uses the Compliance Rules Document above.">
    <div className="space-y-6">
      {/* FTC Affiliate Disclosure */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">FTC Affiliate Disclosure</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Disclosure Text</label>
            <Textarea
              value={data?.ftcDisclosure?.text || ''}
              disabled={readOnly}
              className="text-[12px] min-h-[80px]"
              placeholder="Enter FTC disclosure text..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Position</label>
              <select disabled={readOnly} value={data?.ftcDisclosure?.position || 'top_of_article'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3 w-full">
                <option value="top_of_article">Top of Article</option>
                <option value="below_title">Below Title</option>
                <option value="before_first_affiliate_link">Before First Affiliate Link</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Style</label>
              <select disabled={readOnly} value={data?.ftcDisclosure?.style || 'standard_box'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3 w-full">
                <option value="standard_box">Standard Box</option>
                <option value="inline_text">Inline Text</option>
                <option value="collapsible">Collapsible</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data?.ftcDisclosure?.autoInsert || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Auto-Insert Disclosure</label>
          </div>
          {!data?.ftcDisclosure?.autoInsert && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
              <p className="text-[11px] text-orange-600">Auto-insert is disabled. Articles may be published without FTC disclosure, creating compliance risk.</p>
            </div>
          )}
          {/* Live Preview */}
          {data?.ftcDisclosure?.text && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[12px] font-medium text-muted-foreground">Preview</label>
              <div className={cn(
                'p-3 rounded-md border text-[11px]',
                data.ftcDisclosure.style === 'standard_box' ? 'bg-muted/50 border-border' :
                data.ftcDisclosure.style === 'collapsible' ? 'bg-muted/30 border-dashed' : ''
              )}>
                {data.ftcDisclosure.text}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer Templates */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Disclaimer Templates</h3>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Disclaimer</Button>}
        </div>
        <div className="px-5 py-4">
          {disclaimers.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No disclaimers configured.</p>
          ) : (
            <div className="space-y-3">
              {disclaimers.map(disc => (
                <div key={disc.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium">{disc.name}</span>
                      <Badge variant={disc.active ? 'default' : 'secondary'} className="text-[10px]">{disc.active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button className="text-muted-foreground hover:text-foreground p-1"><Edit className="h-3.5 w-3.5" /></button>
                        <button className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Trigger: {disc.triggerCondition}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{disc.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Financial Advice Guardrails */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Financial Advice Guardrails</h3>
        </div>
        <div className="px-5 py-4">
          {guardrails.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No guardrails configured.</p>
          ) : (
            <ul className="space-y-2">
              {guardrails.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Card Terms Verification */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Card Terms Verification</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={data?.cardTermsVerification?.realTimeVerification || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Real-Time Verification</label>
          </div>
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-muted-foreground">Verification Fields</label>
            <div className="flex flex-wrap gap-1.5">
              {(data?.cardTermsVerification?.verificationFields || []).map((field, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{field}</Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Halt Behavior</label>
            <select disabled={readOnly} value={data?.cardTermsVerification?.haltBehavior || 'halt_and_alert'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3">
              <option value="halt_and_alert">Halt & Alert</option>
              <option value="halt_alert_and_flag">Halt, Alert & Flag</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compliance Audit Settings */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Compliance Audit Settings</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Retention Period</label>
            <select disabled={readOnly} value={data?.auditSettings?.retentionPeriod || '2_years'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3">
              <option value="1_year">1 Year</option>
              <option value="2_years">2 Years</option>
              <option value="3_years">3 Years</option>
              <option value="indefinite">Indefinite</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data?.auditSettings?.autoComplianceReport || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Auto-Generate Compliance Report</label>
          </div>
        </div>
      </div>
    </div>
    </NotYetAvailable>
    </div>
  );
}
