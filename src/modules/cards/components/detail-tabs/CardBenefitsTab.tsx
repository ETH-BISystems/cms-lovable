import { useState } from 'react';
import { Plus, Trash2, Check, X, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type {
  CardDocument,
  CardDetailData,
  StatementCredit,
  TravelBenefit,
  LoungeAccessEntry,
} from '../../types';
import { CollapsibleSection } from '../shared/ProvenanceComponents';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardBenefitsTabProps {
  card: CardDocument;
  detailData: CardDetailData;
  onUpdateDetail: (fields: Partial<CardDetailData>) => void;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground/70">{label}</label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const FREQ_DIVISORS: Record<string, number> = {
  'Annual': 1, 'Semi-Annual': 2, 'Monthly': 12, 'Quarterly': 4, 'One-Time': 1,
};

const CATEGORIES = ['Travel', 'Dining', 'Entertainment', 'Subscription', 'Shopping', 'Lounge', 'Other'] as const;

// ─── 1. Statement Credits ────────────────────────────────────────────────────

function StatementCreditsSection({ detailData, onUpdateDetail }: { detailData: CardDetailData; onUpdateDetail: (fields: Partial<CardDetailData>) => void }) {
  const credits = detailData.statementCredits ?? [];
  const totalCredits = credits.reduce((sum, c) => sum + c.annualValue, 0);

  const updateCredit = (id: string, updates: Partial<StatementCredit>) => {
    const updated = credits.map(c => {
      if (c.id !== id) return c;
      const merged = { ...c, ...updates };
      // Auto-calc per-period value
      merged.perPeriodValue = Math.round((merged.annualValue / (FREQ_DIVISORS[merged.frequency] || 1)) * 100) / 100;
      return merged;
    });
    onUpdateDetail({ statementCredits: updated });
  };

  const removeCredit = (id: string) => {
    onUpdateDetail({ statementCredits: credits.filter(c => c.id !== id) });
  };

  const addCredit = () => {
    const nc: StatementCredit = {
      id: `sc-${Date.now()}`, name: '', annualValue: 0, frequency: 'Annual',
      perPeriodValue: 0, category: 'Other', autoApplied: false, isOverridden: false,
    };
    onUpdateDetail({ statementCredits: [...credits, nc] });
  };

  return (
    <CollapsibleSection title="Statement Credits" defaultOpen badge={`${totalCredits.toLocaleString()}/yr`} metaKey="statementCredits">
      <div className="bg-accent/10 rounded-lg px-3 py-2 border border-accent/30 mb-1">
        <span className="text-xs text-muted-foreground">Total Annual Credits Value:</span>
        <span className="text-sm font-bold text-accent ml-2">${totalCredits.toLocaleString()}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-[11px]">
              <th className="w-6 py-1.5"></th>
              <th className="text-left py-1.5 pr-2 font-medium">Credit Name</th>
              <th className="text-left py-1.5 pr-2 font-medium">Annual $</th>
              <th className="text-left py-1.5 pr-2 font-medium">Frequency</th>
              <th className="text-left py-1.5 pr-2 font-medium">Per-Period $</th>
              <th className="text-left py-1.5 pr-2 font-medium">Category</th>
              <th className="text-center py-1.5 pr-2 font-medium">Auto</th>
              <th className="text-left py-1.5 pr-2 font-medium">Expiration</th>
              <th className="py-1.5 w-12 text-center font-medium">Override</th>
              <th className="py-1.5 w-7"></th>
            </tr>
          </thead>
          <tbody>
            {credits.map((credit, idx) => {
              const isOverridden = credit.isOverridden;
              return (
                <tr key={credit.id} className={`border-b border-border/40 hover:bg-muted/30 transition-colors ${idx % 2 === 1 ? 'bg-muted/10' : ''}`}>
                  <td className="py-1 text-center">
                    <GripVertical className="lucide-grip-vertical w-3 h-3 text-muted-foreground/40 cursor-grab mx-auto" />
                  </td>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1">
                      {!isOverridden && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-success/10 text-success border-success/30 shrink-0">Auto</Badge>}
                      {isOverridden && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-warning/10 text-warning border-warning/30 shrink-0">Override</Badge>}
                      <Input value={credit.name} onChange={e => updateCredit(credit.id, { name: e.target.value })} disabled={!isOverridden} className={`h-7 text-xs px-2 bg-transparent border-transparent hover:border-input focus:border-input transition-colors ${!isOverridden ? 'opacity-70' : ''}`} />
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <Input type="number" value={credit.annualValue} onChange={e => updateCredit(credit.id, { annualValue: Number(e.target.value) })} disabled={!isOverridden} className={`h-7 text-xs px-2 w-20 bg-transparent border-transparent hover:border-input focus:border-input transition-colors ${!isOverridden ? 'opacity-70' : ''}`} />
                  </td>
                  <td className="py-1 pr-2">
                    <select value={credit.frequency} onChange={e => updateCredit(credit.id, { frequency: e.target.value as StatementCredit['frequency'] })} disabled={!isOverridden} className={`h-7 text-xs bg-transparent border border-transparent hover:border-input rounded-md px-1 transition-colors ${!isOverridden ? 'opacity-70' : ''}`}>
                      {['Annual', 'Semi-Annual', 'Monthly', 'Quarterly', 'One-Time'].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                      ${credit.perPeriodValue.toLocaleString()}
                      <Badge variant="outline" className="text-[8px] px-1 py-0 text-muted-foreground/60 border-muted-foreground/20">calc</Badge>
                    </span>
                  </td>
                  <td className="py-1 pr-2">
                    <select value={credit.category} onChange={e => updateCredit(credit.id, { category: e.target.value })} disabled={!isOverridden} className={`h-7 text-xs bg-transparent border border-transparent hover:border-input rounded-md px-1 transition-colors ${!isOverridden ? 'opacity-70' : ''}`}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-2 text-center">
                    <button onClick={() => updateCredit(credit.id, { autoApplied: !credit.autoApplied })} className="mx-auto block p-0.5 hover:bg-muted rounded transition-colors">
                      {credit.autoApplied ? <Check className="w-3.5 h-3.5 text-success" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40" />}
                    </button>
                  </td>
                  <td className="py-1 pr-2">
                    <Input value={credit.expirationDate || ''} onChange={e => updateCredit(credit.id, { expirationDate: e.target.value || undefined })} disabled={!isOverridden} placeholder="—" className={`h-7 text-xs px-2 w-24 bg-transparent border-transparent hover:border-input focus:border-input transition-colors ${!isOverridden ? 'opacity-70' : ''}`} />
                  </td>
                  <td className="py-1 pr-1 text-center">
                    <Switch checked={isOverridden} onCheckedChange={v => updateCredit(credit.id, { isOverridden: v })} className="scale-[0.6]" />
                  </td>
                  <td className="py-1">
                    <button onClick={() => removeCredit(credit.id)} className="p-1 hover:bg-destructive/10 rounded transition-colors">
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addCredit}>
        <Plus className="w-3 h-3" /> Add Credit
      </Button>
    </CollapsibleSection>
  );
}

// ─── 2. Travel Benefits ──────────────────────────────────────────────────────

function TravelBenefitsSection({ detailData, onUpdateDetail }: { detailData: CardDetailData; onUpdateDetail: (fields: Partial<CardDetailData>) => void }) {
  const benefits = detailData.travelBenefits ?? [];

  const updateBenefit = (id: string, updates: Partial<TravelBenefit>) => {
    onUpdateDetail({ travelBenefits: benefits.map(b => b.id === id ? { ...b, ...updates } : b) });
  };

  const removeBenefit = (id: string) => {
    onUpdateDetail({ travelBenefits: benefits.filter(b => b.id !== id) });
  };

  const addBenefit = () => {
    const nb: TravelBenefit = {
      id: `tb-${Date.now()}`, name: '', coverageDetail: '', coverageAmount: '',
      coverageType: 'Not Applicable', conditions: '', isOverridden: false,
    };
    onUpdateDetail({ travelBenefits: [...benefits, nb] });
  };

  return (
    <CollapsibleSection title="Travel Benefits" defaultOpen badge={`${benefits.length}`} metaKey="travelBenefits">
      <div className="space-y-3">
        {benefits.map(b => (
          <TravelBenefitCard
            key={b.id}
            benefit={b}
            onUpdate={u => updateBenefit(b.id, u)}
            onRemove={() => removeBenefit(b.id)}
          />
        ))}
      </div>
      <Button variant="outline" size="sm" className="text-xs gap-1 mt-1" onClick={addBenefit}>
        <Plus className="w-3 h-3" /> Add Benefit
      </Button>
    </CollapsibleSection>
  );
}

function TravelBenefitCard({ benefit, onUpdate, onRemove }: {
  benefit: TravelBenefit;
  onUpdate: (u: Partial<TravelBenefit>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isOverridden = benefit.isOverridden;

  return (
    <div className="border border-border rounded-lg">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="lucide-grip-vertical w-3.5 h-3.5 text-muted-foreground/40 cursor-grab shrink-0" />
        <button onClick={() => setOpen(!open)} className="flex-1 text-left flex items-center gap-2 min-w-0">
          {!isOverridden && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-success/10 text-success border-success/30 shrink-0">Auto</Badge>}
          {isOverridden && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-warning/10 text-warning border-warning/30 shrink-0">Override</Badge>}
          <span className="text-xs font-medium text-card-foreground truncate">{benefit.name || 'New Benefit'}</span>
          {benefit.coverageAmount && <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{benefit.coverageAmount}</Badge>}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Switch checked={isOverridden} onCheckedChange={v => onUpdate({ isOverridden: v })} className="scale-[0.6]" />
        </div>
        <button onClick={onRemove} className="p-1 hover:bg-destructive/10 rounded shrink-0">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </div>
      {open && (
        <div className="px-3 pb-4 pt-2 space-y-3 border-t border-border">
          <FieldGroup label="Benefit Name">
            <Input value={benefit.name} onChange={e => onUpdate({ name: e.target.value })} disabled={!isOverridden} className={`h-8 text-xs ${!isOverridden ? 'opacity-70' : ''}`} />
          </FieldGroup>
          <FieldGroup label="Coverage Detail">
            <Textarea value={benefit.coverageDetail} onChange={e => onUpdate({ coverageDetail: e.target.value })} className="text-xs min-h-[80px] shadow-inner" placeholder="Editorial — always editable" />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Coverage Amount">
              <Input value={benefit.coverageAmount} onChange={e => onUpdate({ coverageAmount: e.target.value })} disabled={!isOverridden} className={`h-8 text-xs ${!isOverridden ? 'opacity-70' : ''}`} />
            </FieldGroup>
            <FieldGroup label="Coverage Type">
              <SelectField value={benefit.coverageType} onChange={v => onUpdate({ coverageType: v as TravelBenefit['coverageType'] })} options={['Primary', 'Secondary', 'Not Applicable']} />
            </FieldGroup>
          </div>
          <FieldGroup label="Conditions">
            <Textarea value={benefit.conditions} onChange={e => onUpdate({ conditions: e.target.value })} className="text-xs min-h-[80px] shadow-inner" placeholder="Editorial — always editable" />
          </FieldGroup>
        </div>
      )}
    </div>
  );
}

// ─── 3. Lounge Access (multi-entry) ──────────────────────────────────────────

function LoungeAccessSection({ detailData, onUpdateDetail }: { detailData: CardDetailData; onUpdateDetail: (fields: Partial<CardDetailData>) => void }) {
  const entries = detailData.loungeAccess ?? [];

  const updateEntry = (id: string, updates: Partial<LoungeAccessEntry>) => {
    onUpdateDetail({ loungeAccess: entries.map(e => e.id === id ? { ...e, ...updates } : e) });
  };

  const removeEntry = (id: string) => {
    onUpdateDetail({ loungeAccess: entries.filter(e => e.id !== id) });
  };

  const addEntry = () => {
    const ne: LoungeAccessEntry = {
      id: `la-${Date.now()}`, loungeNetwork: '', accessLevel: 'Unlimited',
      guestPolicy: '', annualVisitLimit: null, conditions: '',
    };
    onUpdateDetail({ loungeAccess: [...entries, ne] });
  };

  return (
    <CollapsibleSection title="Lounge Access" badge={`${entries.length}`} metaKey="loungeAccess">
      <div className="space-y-3">
        {entries.map(entry => (
          <LoungeEntryCard key={entry.id} entry={entry} onUpdate={u => updateEntry(entry.id, u)} onRemove={() => removeEntry(entry.id)} />
        ))}
      </div>
      <Button variant="outline" size="sm" className="text-xs gap-1 mt-1" onClick={addEntry}>
        <Plus className="w-3 h-3" /> Add Lounge Network
      </Button>
    </CollapsibleSection>
  );
}

function LoungeEntryCard({ entry, onUpdate, onRemove }: { entry: LoungeAccessEntry; onUpdate: (u: Partial<LoungeAccessEntry>) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={() => setOpen(!open)} className="flex-1 text-left flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-card-foreground truncate">{entry.loungeNetwork || 'New Lounge'}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{entry.accessLevel}</Badge>
          {entry.annualVisitLimit && <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{entry.annualVisitLimit} visits/yr</Badge>}
        </button>
        <button onClick={onRemove} className="p-1 hover:bg-destructive/10 rounded shrink-0">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </div>
      {open && (
        <div className="px-3 pb-4 pt-2 space-y-3 border-t border-border">
          <FieldGroup label="Lounge Network">
            <Input value={entry.loungeNetwork} onChange={e => onUpdate({ loungeNetwork: e.target.value })} className="h-8 text-xs" />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Access Level">
              <SelectField value={entry.accessLevel} onChange={v => onUpdate({ accessLevel: v as LoungeAccessEntry['accessLevel'] })} options={['Unlimited', 'Limited Visits', 'Pay-Per-Visit', 'When Flying Carrier']} />
            </FieldGroup>
            <FieldGroup label="Annual Visit Limit">
              <Input
                type="number"
                value={entry.annualVisitLimit ?? ''}
                onChange={e => onUpdate({ annualVisitLimit: e.target.value ? Number(e.target.value) : null })}
                placeholder="Unlimited"
                className="h-8 text-xs"
              />
            </FieldGroup>
          </div>
          <FieldGroup label="Guest Policy">
            <Textarea value={entry.guestPolicy} onChange={e => onUpdate({ guestPolicy: e.target.value })} className="text-xs min-h-[80px] shadow-inner" />
          </FieldGroup>
          <FieldGroup label="Conditions">
            <Textarea value={entry.conditions} onChange={e => onUpdate({ conditions: e.target.value })} placeholder="e.g., Only when flying Delta from select airports" className="text-xs min-h-[80px] shadow-inner" />
          </FieldGroup>
        </div>
      )}
    </div>
  );
}

// ─── 4. Purchase Protection ──────────────────────────────────────────────────

const PURCHASE_PROTECTION_FIELDS = [
  { key: 'purchaseProtectionAmount', label: 'Purchase Protection Amount' },
  { key: 'coverageWindow', label: 'Coverage Window' },
  { key: 'returnProtectionAmount', label: 'Return Protection Amount' },
  { key: 'returnWindow', label: 'Return Window' },
  { key: 'extendedWarrantyDuration', label: 'Extended Warranty Duration' },
  { key: 'extendedWarrantyMax', label: 'Extended Warranty Max' },
] as const;

function PurchaseProtectionSection({ detailData, onUpdateDetail }: { detailData: CardDetailData; onUpdateDetail: (fields: Partial<CardDetailData>) => void }) {
  const pp = detailData.purchaseProtection ?? {};

  const update = (key: string, value: string) => {
    onUpdateDetail({ purchaseProtection: { ...pp, [key]: value } });
  };

  return (
    <CollapsibleSection title="Purchase Protection" metaKey="purchaseProtection">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Purchase Protection Amount">
            <Input value={pp.purchaseProtectionAmount ?? ''} onChange={e => update('purchaseProtectionAmount', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Coverage Window">
            <Input value={pp.coverageWindow ?? ''} onChange={e => update('coverageWindow', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <FieldGroup label="Exclusions">
          <Textarea value={pp.exclusions ?? ''} onChange={e => update('exclusions', e.target.value)} className="text-xs min-h-[80px] shadow-inner" />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Return Protection Amount">
            <Input value={pp.returnProtectionAmount ?? ''} onChange={e => update('returnProtectionAmount', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Return Window">
            <Input value={pp.returnWindow ?? ''} onChange={e => update('returnWindow', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Extended Warranty Duration">
            <Input value={pp.extendedWarrantyDuration ?? ''} onChange={e => update('extendedWarrantyDuration', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Extended Warranty Max">
            <Input value={pp.extendedWarrantyMax ?? ''} onChange={e => update('extendedWarrantyMax', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
        </div>
      </div>
    </CollapsibleSection>
  );
}

// ─── 5. Insurance Coverage ───────────────────────────────────────────────────

function InsuranceCoverageSection({ detailData, onUpdateDetail }: { detailData: CardDetailData; onUpdateDetail: (fields: Partial<CardDetailData>) => void }) {
  const ic = detailData.insuranceCoverage ?? {};

  const update = (key: string, value: string) => {
    onUpdateDetail({ insuranceCoverage: { ...ic, [key]: value } });
  };

  return (
    <CollapsibleSection title="Insurance Coverage" metaKey="insuranceCoverage">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Trip Cancellation Amount">
            <Input value={ic.tripCancellationAmount ?? ''} onChange={e => update('tripCancellationAmount', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Trip Cancellation Type">
            <SelectField value={ic.tripCancellationType ?? 'Primary'} onChange={v => update('tripCancellationType', v)} options={['Primary', 'Secondary']} />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Trip Delay Amount">
            <Input value={ic.tripDelayAmount ?? ''} onChange={e => update('tripDelayAmount', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Trip Delay Threshold">
            <Input value={ic.tripDelayThreshold ?? ''} onChange={e => update('tripDelayThreshold', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Baggage Delay Amount">
            <Input value={ic.baggageDelayAmount ?? ''} onChange={e => update('baggageDelayAmount', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Baggage Delay Threshold">
            <Input value={ic.baggageDelayThreshold ?? ''} onChange={e => update('baggageDelayThreshold', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Lost Luggage Amount">
            <Input value={ic.lostLuggageAmount ?? ''} onChange={e => update('lostLuggageAmount', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
          <FieldGroup label="Travel Accident Amount">
            <Input value={ic.travelAccidentAmount ?? ''} onChange={e => update('travelAccidentAmount', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Rental Car Coverage Type">
            <SelectField value={ic.rentalCarCoverageType ?? 'Primary'} onChange={v => update('rentalCarCoverageType', v)} options={['Primary', 'Secondary', 'CDW Only']} />
          </FieldGroup>
          <FieldGroup label="Rental Car Coverage Amount">
            <Input value={ic.rentalCarCoverageAmount ?? ''} onChange={e => update('rentalCarCoverageAmount', e.target.value)} className="h-8 text-xs" />
          </FieldGroup>
        </div>
        <FieldGroup label="Emergency Evacuation">
          <Input value={ic.emergencyEvacuation ?? ''} onChange={e => update('emergencyEvacuation', e.target.value)} className="h-8 text-xs" />
        </FieldGroup>
      </div>
    </CollapsibleSection>
  );
}

// ─── 6. Custom Benefit Categories ────────────────────────────────────────────

function CustomCategoriesSection({ detailData, onUpdateDetail }: { detailData: CardDetailData; onUpdateDetail: (fields: Partial<CardDetailData>) => void }) {
  const cats = detailData.customBenefitCategories ?? [];

  const addCategory = () => {
    const nc = {
      id: `cbc-${Date.now()}`,
      name: 'New Benefit Category',
      items: [''],
    };
    onUpdateDetail({ customBenefitCategories: [...cats, nc] });
  };

  const updateCategory = (id: string, updates: Partial<{ name: string; items: string[] }>) => {
    onUpdateDetail({ customBenefitCategories: cats.map(c => c.id === id ? { ...c, ...updates } : c) });
  };

  const removeCategory = (id: string) => {
    onUpdateDetail({ customBenefitCategories: cats.filter(c => c.id !== id) });
  };

  const addItem = (catId: string) => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    updateCategory(catId, { items: [...cat.items, ''] });
  };

  const updateItem = (catId: string, itemIdx: number, value: string) => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    const items = [...cat.items];
    items[itemIdx] = value;
    updateCategory(catId, { items });
  };

  const removeItem = (catId: string, itemIdx: number) => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    updateCategory(catId, { items: cat.items.filter((_, i) => i !== itemIdx) });
  };

  return (
    <CollapsibleSection title="Custom Benefits" badge={`${cats.length}`}>
      {cats.map(cat => (
        <CollapsibleSection key={cat.id} title={cat.name}>
          <div className="space-y-3">
            <FieldGroup label="Category Name">
              <div className="flex gap-2">
                <Input value={cat.name} onChange={e => updateCategory(cat.id, { name: e.target.value })} className="h-8 text-xs flex-1" />
                <button onClick={() => removeCategory(cat.id)} className="p-1.5 hover:bg-destructive/10 rounded">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </FieldGroup>
            {cat.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input value={item} onChange={e => updateItem(cat.id, idx, e.target.value)} placeholder="Benefit detail" className="h-7 text-xs" />
                </div>
                <button onClick={() => removeItem(cat.id, idx)} className="p-1 hover:bg-muted rounded mt-1">
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => addItem(cat.id)}>
              <Plus className="w-3 h-3" /> Add Item
            </Button>
          </div>
        </CollapsibleSection>
      ))}
      <Button variant="outline" size="sm" className="text-xs gap-1 w-full" onClick={addCategory}>
        <Plus className="w-3 h-3" /> Add Benefit Category
      </Button>
    </CollapsibleSection>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────

export function CardBenefitsTab({ card, detailData, onUpdateDetail }: CardBenefitsTabProps) {
  return (
    <div className="space-y-4">
      <StatementCreditsSection detailData={detailData} onUpdateDetail={onUpdateDetail} />
      <TravelBenefitsSection detailData={detailData} onUpdateDetail={onUpdateDetail} />
      <LoungeAccessSection detailData={detailData} onUpdateDetail={onUpdateDetail} />
      <PurchaseProtectionSection detailData={detailData} onUpdateDetail={onUpdateDetail} />
      <InsuranceCoverageSection detailData={detailData} onUpdateDetail={onUpdateDetail} />
      <CustomCategoriesSection detailData={detailData} onUpdateDetail={onUpdateDetail} />
    </div>
  );
}
