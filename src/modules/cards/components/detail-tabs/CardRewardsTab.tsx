import { useState } from 'react';
import { Plus, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CardDocument, CardDetailData, EarnRate, BonusCategoryRow, CppValuation } from '../../types';
import { CollapsibleSection } from '../shared/ProvenanceComponents';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardRewardsTabProps {
  card: CardDocument;
  detailData: CardDetailData;
  onUpdateDetail: (fields: Partial<CardDetailData>) => void;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

const CAP_OPTIONS = ['Unlimited', '$25,000/year', '$50,000/year', '$75,000/year', '$150,000/year', 'First $X', 'Custom...'];

function rateColor(rate: string): string {
  const n = parseFloat(rate);
  if (isNaN(n)) return 'bg-muted text-muted-foreground';
  if (n >= 10) return 'bg-accent text-accent-foreground';
  if (n >= 5) return 'bg-accent/80 text-accent-foreground';
  if (n >= 3) return 'bg-accent/60 text-accent-foreground';
  if (n >= 2) return 'bg-accent/40 text-accent-foreground';
  return 'bg-muted text-muted-foreground';
}

function cppColor(value: number, target: number, floor: number): string {
  if (value >= target) return 'text-success';
  if (value >= floor) return 'text-warning';
  return 'text-muted-foreground';
}

// ── Inline editable cell ──

function EditableCell({ value, onChange, placeholder, className: extraClass, multiline, minWidth }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; multiline?: boolean; minWidth?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [showMore, setShowMore] = useState(false);

  if (editing) {
    if (multiline) {
      return (
        <Textarea
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          placeholder={placeholder}
          className={cn('text-xs min-h-[32px] resize-y', extraClass)}
          style={{ minWidth }}
        />
      );
    }
    return (
      <Input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
        placeholder={placeholder}
        className={cn('h-7 text-xs', extraClass)}
        style={{ minWidth }}
      />
    );
  }

  const displayText = value || placeholder || '—';
  const isLong = displayText.length > 80;

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn('cursor-pointer rounded px-1.5 py-1 hover:bg-muted/50 text-xs min-h-[28px] flex items-start', !value && 'text-muted-foreground italic', extraClass)}
      style={{ minWidth }}
    >
      <span className="whitespace-pre-wrap break-words">
        {isLong && !showMore ? (
          <>
            {displayText.slice(0, 80)}...
            <button onClick={e => { e.stopPropagation(); setShowMore(true); }} className="text-accent ml-1 hover:underline">more</button>
          </>
        ) : displayText}
      </span>
    </div>
  );
}

// ── Rate badge editor ──

function RateBadgeEditor({ rate, onChange }: { rate: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex items-center gap-0.5">
        <Input
          autoFocus
          type="number"
          step="0.5"
          value={parseFloat(rate) || ''}
          onChange={e => onChange(`${e.target.value}x`)}
          onBlur={() => setEditing(false)}
          onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
          className="h-6 text-xs w-14 text-center"
        />
        <span className="text-[10px] text-muted-foreground">x</span>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="inline-flex">
      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-bold cursor-pointer hover:ring-1 hover:ring-accent/50', rateColor(rate))}>
        {rate || '—'}
      </Badge>
    </button>
  );
}

// ── Cap dropdown ──

function CapEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [customMode, setCustomMode] = useState(false);
  const isCustomValue = value !== '' && !CAP_OPTIONS.includes(value);

  if (customMode) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setCustomMode(false)}
        onKeyDown={e => { if (e.key === 'Enter') setCustomMode(false); }}
        className="h-7 text-xs w-32"
        placeholder="Enter custom cap..."
      />
    );
  }

  // A previously-saved custom value can't be shown via the Select below (its
  // trigger can only render one of CAP_OPTIONS' literal labels), and Radix
  // won't re-fire onValueChange for re-clicking an already-selected item — so
  // render it as its own clickable label that both displays the real text and
  // re-enters edit mode.
  if (isCustomValue) {
    return (
      <button
        type="button"
        onClick={() => setCustomMode(true)}
        className="h-7 text-xs w-32 px-2 text-left rounded hover:bg-muted/50 truncate"
        title={value}
      >
        {value}
      </button>
    );
  }

  return (
    <Select value={value || undefined} onValueChange={v => {
      if (v === 'Custom...') { setCustomMode(true); } else { onChange(v); }
    }}>
      <SelectTrigger className="h-7 text-xs w-32 border-0 bg-transparent hover:bg-muted/50">
        <SelectValue placeholder="Select cap..." />
      </SelectTrigger>
      <SelectContent>
        {CAP_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CardRewardsTab({ card, detailData, onUpdateDetail }: CardRewardsTabProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    (detailData.earnRatesDetailed ?? []).forEach(r => { o[r.id] = r.isOverridden ?? false; });
    return o;
  });
  const [undoTimer, setUndoTimer] = useState<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  // Bonus / Rotating Categories — use detailData or default
  const bonusRows = detailData.bonusCategories ?? [];

  const updateBonusRows = (rows: BonusCategoryRow[]) => {
    onUpdateDetail({ bonusCategories: rows });
  };

  // CPP valuation — use detailData or defaults
  const cpp: CppValuation = detailData.cppValuation ?? {
    floor: 1.0, target: 1.8, ceiling: 3.5,
    flights: 2.1, hotels: 1.5, portalValue: 1.25, cashValue: 1.0,
    rationale: '', lastReviewed: '', reviewedBy: '',
  };

  const updateCpp = (updates: Partial<CppValuation>) => {
    onUpdateDetail({ cppValuation: { ...cpp, ...updates } });
  };

  // ── Earning Rates helpers ──

  const earnRates = detailData.earnRatesDetailed ?? [];

  const updateRate = (id: string, updates: Partial<EarnRate>) => {
    onUpdateDetail({ earnRatesDetailed: earnRates.map(r => r.id === id ? { ...r, ...updates } : r) });
  };

  const removeRate = (id: string) => {
    const rate = earnRates.find(r => r.id === id);
    const filtered = earnRates.filter(r => r.id !== id);
    onUpdateDetail({ earnRatesDetailed: filtered });

    // Clear any existing undo timer
    if (undoTimer) {
      clearTimeout(undoTimer.timer);
    }

    const timer = setTimeout(() => { setUndoTimer(null); }, 5000);
    setUndoTimer({ id, timer });

    toast(`Remove "${rate?.category || 'Category'}"?`, {
      description: 'Click Undo within 5 seconds to restore.',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timer);
          setUndoTimer(null);
          onUpdateDetail({ earnRatesDetailed: earnRates });
        },
      },
    });
  };

  const addRate = () => {
    const nr: EarnRate = { id: `er-${Date.now()}`, category: '', rate: '', capLimit: 'Unlimited', notes: '', isOverridden: true };
    onUpdateDetail({ earnRatesDetailed: [...earnRates, nr] });
    setOverrides(prev => ({ ...prev, [nr.id]: true }));
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const items = [...earnRates];
    const [moved] = items.splice(dragIdx, 1);
    items.splice(idx, 0, moved);
    onUpdateDetail({ earnRatesDetailed: items });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  return (
    <div className="space-y-4">
      {/* ── Earning Rates Table ── */}
      <CollapsibleSection
        title="Earning Rates"
        defaultOpen
        metaKey="earningRates"
        badge={<Badge variant="outline" className="text-[9px] px-1 py-0 bg-accent/10 text-accent">{earnRates.length} categories</Badge>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="w-8 py-1.5"></th>
                <th className="text-left py-1.5 pr-2" style={{ minWidth: '200px' }}>Spending Category</th>
                <th className="text-left py-1.5 pr-2 w-20">Earn Rate</th>
                <th className="text-left py-1.5 pr-2 w-[120px]">Cap / Limit</th>
                <th className="text-left py-1.5 pr-2" style={{ minWidth: '180px' }}>Notes</th>
                <th className="py-1.5 w-20 text-center">Override</th>
                <th className="py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {earnRates.map((rate, idx) => {
                const isManual = overrides[rate.id] ?? rate.isOverridden ?? false;
                return (
                  <tr
                    key={rate.id}
                    className={cn('border-b border-border/50 group', dragIdx === idx && 'opacity-50')}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                  >
                    <td className="py-1.5 cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    </td>
                    <td className="py-1.5 pr-2" style={{ minWidth: '200px' }}>
                      {isManual ? (
                        <EditableCell value={rate.category} onChange={v => updateRate(rate.id, { category: v })} placeholder="e.g. Travel (Chase Travel Portal)" minWidth="180px" />
                      ) : (
                        <span className="text-xs px-1.5 py-1 whitespace-pre-wrap break-words">{rate.category || '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {isManual ? (
                        <RateBadgeEditor rate={rate.rate} onChange={v => updateRate(rate.id, { rate: v })} />
                      ) : (
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-bold', rateColor(rate.rate))}>{rate.rate}</Badge>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {isManual ? (
                        <CapEditor value={rate.capLimit} onChange={v => updateRate(rate.id, { capLimit: v })} />
                      ) : (
                        <span className="text-xs px-1.5 py-1">{rate.capLimit}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2" style={{ minWidth: '180px' }}>
                      {isManual ? (
                        <EditableCell value={rate.notes} onChange={v => updateRate(rate.id, { notes: v })} placeholder="Add notes..." minWidth="160px" />
                      ) : (
                        <span className="text-xs px-1.5 py-1 whitespace-pre-wrap break-words">{rate.notes || '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-center">
                      <button
                        onClick={() => {
                          const newVal = !isManual;
                          setOverrides(prev => ({ ...prev, [rate.id]: newVal }));
                          updateRate(rate.id, { isOverridden: newVal });
                        }}
                        className="inline-flex"
                      >
                        <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 cursor-pointer', isManual ? 'bg-warning/15 text-warning border-warning/30' : 'bg-success/15 text-success border-success/30')}>
                          {isManual ? 'Manual' : 'Auto'}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-1.5">
                      <button onClick={() => removeRate(rate.id)} className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={addRate}>
          <Plus className="w-3 h-3" /> Add Category
        </Button>
      </CollapsibleSection>

      {/* ── Bonus / Rotating Categories ── */}
      <CollapsibleSection
        title="Bonus / Rotating Categories"
        metaKey="bonusCategories"
        badge={<Badge variant="outline" className="text-[9px] px-1 py-0">{bonusRows.length} active</Badge>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-1.5 pr-2" style={{ minWidth: '160px' }}>Category Name</th>
                <th className="text-left py-1.5 pr-2 w-16">Rate</th>
                <th className="text-left py-1.5 pr-2 w-24">Period</th>
                <th className="text-left py-1.5 pr-2 w-28">Start Date</th>
                <th className="text-left py-1.5 pr-2 w-28">End Date</th>
                <th className="text-left py-1.5 pr-2" style={{ minWidth: '140px' }}>Notes</th>
                <th className="py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {bonusRows.map((row, idx) => (
                <tr key={row.id} className="border-b border-border/50 group">
                  <td className="py-1.5 pr-2">
                    <EditableCell value={row.category} onChange={v => { const nr = [...bonusRows]; nr[idx] = { ...nr[idx], category: v }; updateBonusRows(nr); }} placeholder="Category name..." />
                  </td>
                  <td className="py-1.5 pr-2">
                    <RateBadgeEditor rate={row.rate} onChange={v => { const nr = [...bonusRows]; nr[idx] = { ...nr[idx], rate: v }; updateBonusRows(nr); }} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <EditableCell value={row.period} onChange={v => { const nr = [...bonusRows]; nr[idx] = { ...nr[idx], period: v }; updateBonusRows(nr); }} placeholder="Q1 2026" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input type="date" value={row.startDate} onChange={e => { const nr = [...bonusRows]; nr[idx] = { ...nr[idx], startDate: e.target.value }; updateBonusRows(nr); }} className="h-6 text-xs border-0 bg-transparent" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input type="date" value={row.endDate} onChange={e => { const nr = [...bonusRows]; nr[idx] = { ...nr[idx], endDate: e.target.value }; updateBonusRows(nr); }} className="h-6 text-xs border-0 bg-transparent" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <EditableCell value={row.notes} onChange={v => { const nr = [...bonusRows]; nr[idx] = { ...nr[idx], notes: v }; updateBonusRows(nr); }} placeholder="Notes..." />
                  </td>
                  <td className="py-1.5">
                    <button onClick={() => { updateBonusRows(bonusRows.filter((_, i) => i !== idx)); }} className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
          updateBonusRows([...bonusRows, { id: `br-${Date.now()}`, category: '', rate: '', period: '', startDate: '', endDate: '', notes: '' }]);
        }}>
          <Plus className="w-3 h-3" /> Add Bonus Category
        </Button>
      </CollapsibleSection>

      {/* ── Points Valuation (CPP) ── */}
      <CollapsibleSection
        title="Points Valuation (CPP)"
        defaultOpen
        metaKey="pointsValuation"
        badge={<Badge variant="outline" className="text-[9px] px-1 py-0 bg-warning/15 text-warning border-warning/30">Manual</Badge>}
      >
        <div className="space-y-3">
          {/* 3-col grid: Floor, Target, Ceiling */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'CPP Floor', desc: 'Minimum fair redemption', key: 'floor' as const, value: cpp.floor },
              { label: 'CPP Target', desc: 'ETH recommended target', key: 'target' as const, value: cpp.target },
              { label: 'CPP Ceiling', desc: 'Max realistic CPP', key: 'ceiling' as const, value: cpp.ceiling },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground block">{f.label}</label>
                <p className="text-[9px] text-muted-foreground/70">{f.desc}</p>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={f.value}
                    onChange={e => updateCpp({ [f.key]: Number(e.target.value) })}
                    className="h-7 text-xs w-20"
                  />
                  <span className="text-[10px] text-muted-foreground">¢/pt</span>
                </div>
              </div>
            ))}
          </div>

          {/* Visual gradient bar */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Floor: {cpp.floor}¢</span>
              <span>Target: {cpp.target}¢</span>
              <span>Ceiling: {cpp.ceiling}¢</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden relative">
              <div className="absolute h-full bg-gradient-to-r from-warning via-accent to-success rounded-full" style={{ left: '0%', width: '100%' }} />
              {cpp.ceiling > cpp.floor && (
                <div
                  className="absolute h-full w-0.5 bg-card-foreground"
                  style={{ left: `${((cpp.target - cpp.floor) / (cpp.ceiling - cpp.floor)) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* CPP by redemption type: 4-col grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'CPP Flights', value: cpp.flights, key: 'flights' as const, color: cppColor(cpp.flights, cpp.target, cpp.floor) },
              { label: 'CPP Hotels', value: cpp.hotels, key: 'hotels' as const, color: cppColor(cpp.hotels, cpp.target, cpp.floor) },
              { label: 'Portal Value', value: cpp.portalValue, key: 'portalValue' as const, color: 'text-muted-foreground' },
              { label: 'Cash Value', value: cpp.cashValue, key: 'cashValue' as const, color: 'text-muted-foreground' },
            ].map(f => (
              <div key={f.key} className="p-2 bg-muted/20 rounded-lg border border-border">
                <span className="text-[10px] text-muted-foreground">{f.label}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Input
                    type="number"
                    step="0.1"
                    value={f.value}
                    onChange={e => updateCpp({ [f.key]: Number(e.target.value) })}
                    className={cn('h-6 text-xs w-16 border-0 bg-transparent font-semibold', f.color)}
                  />
                  <span className="text-[10px] text-muted-foreground">¢/pt</span>
                </div>
              </div>
            ))}
          </div>

          {/* Valuation Rationale */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground block">How ETH arrived at these values</label>
            <Textarea
              value={cpp.rationale ?? ''}
              onChange={e => updateCpp({ rationale: e.target.value })}
              placeholder="Explain the methodology and data points behind these valuations..."
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* Last Reviewed */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Last Reviewed:</span>
              <Input
                type="date"
                value={cpp.lastReviewed ?? ''}
                onChange={e => updateCpp({ lastReviewed: e.target.value })}
                className="h-6 text-xs w-32 border-0 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Reviewed by:</span>
              <Input
                value={cpp.reviewedBy ?? ''}
                onChange={e => updateCpp({ reviewedBy: e.target.value })}
                placeholder="Reviewer name"
                className="h-6 text-xs w-28 border-0 bg-transparent font-medium text-card-foreground"
              />
            </div>
          </div>

          <button onClick={() => window.open('/experience', '_self')} className="flex items-center gap-1.5 text-xs text-accent hover:underline">
            <ExternalLink className="w-3 h-3" /> View CPP Calculator
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
}
