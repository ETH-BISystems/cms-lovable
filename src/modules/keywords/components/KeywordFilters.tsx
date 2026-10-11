import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MagicFilters, MagicIntent } from '../types/magic';

interface KeywordFiltersProps {
  filters: MagicFilters;
  onChange: (filters: MagicFilters) => void;
}

const INTENT_OPTIONS: Array<{ value: MagicIntent; label: string; short: string; color: string }> = [
  { value: 'informational', label: 'Informational', short: 'I', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'commercial', label: 'Commercial', short: 'C', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'transactional', label: 'Transactional', short: 'T', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'navigational', label: 'Navigational', short: 'N', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const VOLUME_PRESETS: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: 'All', min: null, max: null },
  { label: '100,001+', min: 100001, max: null },
  { label: '10,001–100,000', min: 10001, max: 100000 },
  { label: '1,001–10,000', min: 1001, max: 10000 },
  { label: '101–1,000', min: 101, max: 1000 },
  { label: '11–100', min: 11, max: 100 },
  { label: '0–10', min: 0, max: 10 },
];

const KD_PRESETS: Array<{ label: string; min: number | null; max: number | null; dot?: string }> = [
  { label: 'All', min: null, max: null },
  { label: 'Very easy (0–14)', min: 0, max: 14, dot: 'bg-green-500' },
  { label: 'Easy (15–29)', min: 15, max: 29, dot: 'bg-green-400' },
  { label: 'Possible (30–49)', min: 30, max: 49, dot: 'bg-yellow-400' },
  { label: 'Difficult (50–69)', min: 50, max: 69, dot: 'bg-orange-400' },
  { label: 'Hard (70–84)', min: 70, max: 84, dot: 'bg-red-400' },
  { label: 'Very hard (85–100)', min: 85, max: 100, dot: 'bg-red-600' },
];

function rangeLabel(min: number | null, max: number | null, prefix = ''): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${prefix}${min.toLocaleString()}–${prefix}${max.toLocaleString()}`;
  if (min !== null) return `≥ ${prefix}${min.toLocaleString()}`;
  return `≤ ${prefix}${max!.toLocaleString()}`;
}

/**
 * Debounced text input — typing updates local state instantly; the filter
 * commit (which re-filters and re-sorts the whole keyword set) fires after
 * the user pauses, so keystrokes stay responsive on large result sets.
 */
function DebouncedInput({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // External resets (e.g. Clear filters) sync back into the input — but never
  // while the user is mid-typing (a pending debounce), or the echo of our own
  // commit would clobber newer keystrokes.
  useEffect(() => {
    if (!timerRef.current) setLocal(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Input
      value={local}
      onChange={e => {
        const next = e.target.value;
        setLocal(next);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          onCommit(next);
        }, 300);
      }}
      placeholder={placeholder}
      className="h-7 text-[11px] w-[140px]"
    />
  );
}

/** Filter bar: Volume, KD%, Intent, CPC dropdowns + include/exclude keyword inputs. */
export function KeywordFilters({ filters, onChange }: KeywordFiltersProps) {
  const hasAnyFilter =
    filters.volumeMin !== null || filters.volumeMax !== null ||
    filters.kdMin !== null || filters.kdMax !== null ||
    filters.cpcMin !== null || filters.cpcMax !== null ||
    filters.intents.length > 0 || filters.include || filters.exclude;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <RangeFilter
        label="Volume"
        min={filters.volumeMin}
        max={filters.volumeMax}
        presets={VOLUME_PRESETS}
        onApply={(min, max) => onChange({ ...filters, volumeMin: min, volumeMax: max })}
      />
      <RangeFilter
        label="KD %"
        min={filters.kdMin}
        max={filters.kdMax}
        presets={KD_PRESETS}
        onApply={(min, max) => onChange({ ...filters, kdMin: min, kdMax: max })}
      />
      <IntentFilter
        intents={filters.intents}
        onChange={intents => onChange({ ...filters, intents })}
      />
      <RangeFilter
        label="CPC (USD)"
        min={filters.cpcMin}
        max={filters.cpcMax}
        valuePrefix="$"
        onApply={(min, max) => onChange({ ...filters, cpcMin: min, cpcMax: max })}
      />
      <DebouncedInput
        value={filters.include}
        onCommit={include => onChange({ ...filters, include })}
        placeholder="Include keywords..."
      />
      <DebouncedInput
        value={filters.exclude}
        onCommit={exclude => onChange({ ...filters, exclude })}
        placeholder="Exclude keywords..."
      />
      {hasAnyFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[10px] gap-1 text-muted-foreground"
          onClick={() => onChange({
            volumeMin: null, volumeMax: null, kdMin: null, kdMax: null,
            cpcMin: null, cpcMax: null, intents: [], include: '', exclude: '',
          })}
        >
          <X className="w-3 h-3" /> Clear filters
        </Button>
      )}
    </div>
  );
}

// ─── Range filter (Volume / KD / CPC) ───────────────────────────────────────
function RangeFilter({
  label,
  min,
  max,
  presets,
  valuePrefix = '',
  onApply,
}: {
  label: string;
  min: number | null;
  max: number | null;
  presets?: Array<{ label: string; min: number | null; max: number | null; dot?: string }>;
  valuePrefix?: string;
  onApply: (min: number | null, max: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const active = min !== null || max !== null;
  const activeLabel = rangeLabel(min, max, valuePrefix);

  const applyCustom = () => {
    const parsedMin = customMin.trim() === '' ? null : Number(customMin);
    const parsedMax = customMax.trim() === '' ? null : Number(customMax);
    onApply(
      parsedMin !== null && !Number.isNaN(parsedMin) ? parsedMin : null,
      parsedMax !== null && !Number.isNaN(parsedMax) ? parsedMax : null,
    );
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-7 text-[11px] gap-1', active && 'border-accent text-accent')}
        >
          {label}{activeLabel ? `: ${activeLabel}` : ''}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {presets && (
          <div className="space-y-0.5 mb-2">
            {presets.map(preset => (
              <button
                key={preset.label}
                onClick={() => { onApply(preset.min, preset.max); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-left transition-colors',
                  preset.min === min && preset.max === max
                    ? 'bg-accent/10 font-medium text-foreground'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                {preset.dot && <span className={cn('w-2 h-2 rounded-full shrink-0', preset.dot)} />}
                {preset.label}
              </button>
            ))}
          </div>
        )}
        <div className="border-t border-border pt-2 space-y-2">
          <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Custom range</p>
          <div className="flex items-center gap-1.5">
            <Input
              value={customMin}
              onChange={e => setCustomMin(e.target.value)}
              placeholder="From"
              className="h-7 text-[11px]"
              inputMode="decimal"
            />
            <span className="text-[10px] text-muted-foreground">–</span>
            <Input
              value={customMax}
              onChange={e => setCustomMax(e.target.value)}
              placeholder="To"
              className="h-7 text-[11px]"
              inputMode="decimal"
              onKeyDown={e => e.key === 'Enter' && applyCustom()}
            />
          </div>
          <Button size="sm" className="h-7 w-full text-[11px] bg-accent text-accent-foreground hover:bg-accent/90" onClick={applyCustom}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Intent multi-select filter ─────────────────────────────────────────────
function IntentFilter({
  intents,
  onChange,
}: {
  intents: MagicIntent[];
  onChange: (intents: MagicIntent[]) => void;
}) {
  const active = intents.length > 0;
  const label = active
    ? `Intent: ${intents.map(i => INTENT_OPTIONS.find(o => o.value === i)?.short).join(', ')}`
    : 'Intent';

  const toggle = (value: MagicIntent) => {
    onChange(intents.includes(value) ? intents.filter(i => i !== value) : [...intents, value]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-7 text-[11px] gap-1', active && 'border-accent text-accent')}
        >
          {label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 space-y-1" align="start">
        {INTENT_OPTIONS.map(option => (
          <label
            key={option.value}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
          >
            <Checkbox
              checked={intents.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
              className="h-3.5 w-3.5"
            />
            <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold border', option.color)}>
              {option.short}
            </span>
            <span className="text-[11px] text-foreground">{option.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
