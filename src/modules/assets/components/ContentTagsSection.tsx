/**
 * ContentTagsSection Component
 *
 * Structured taxonomy editor with multi-select fields for airlines, hotels,
 * aircraft types, cabin class, lounges, destinations, credit cards,
 * experience types, trip component, and free-form tags.
 *
 * Copied from Lovable prototype and adapted to production:
 * - Mock data imports replaced with useTaxonomyData hook (Firestore)
 * - "Smart Tag" button wired to startAIIntake Cloud Function
 * - Toast via sonner instead of Lovable useToast
 *
 * Preserves all UI elements from the Lovable prototype.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  useTaxonomyData,
  searchLocations,
  type AircraftGroup,
  type LoungeGroup,
  type CardGroup,
} from '../hooks/useTaxonomyData';
import type { AssetTaxonomy } from '../types';
import { startAIIntake } from '../services/assetService';
import { describeSmartTagError } from '../services/aiService';

interface ContentTagsSectionProps {
  taxonomy: AssetTaxonomy;
  onChange: (t: AssetTaxonomy) => void;
  freeTags: string[];
  onFreeTagsChange: (tags: string[]) => void;
  compact?: boolean;
  /** Asset ID — required for Smart Tag AI auto-tagging */
  assetId?: string;
  /** Description text — used for client-side smart tagging when no assetId */
  description?: string;
}

// ─── Destination Fields ──────────────────────────────────────────────────────

function DestinationFields({ destinations, onChange }: {
  destinations: { city: string; country: string }[];
  onChange: (dests: { city: string; country: string }[]) => void;
}) {
  const [citySearch, setCitySearch] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);

  const cityResults = citySearch.length >= 2 ? searchLocations(citySearch).filter(r => r.city) : [];
  const countryResults = countrySearch.length >= 2 ? searchLocations(countrySearch).filter(r => !r.city) : [];

  const addDestination = (city: string, country: string) => {
    if (!destinations.some(d => d.city === city && d.country === country)) {
      onChange([...destinations, { city, country }]);
    }
    setCitySearch('');
    setCountrySearch('');
  };

  const removeDestination = (idx: number) => {
    onChange(destinations.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Destination</label>
      <div className="flex flex-wrap gap-1 mb-1">
        {destinations.map((d, i) => (
          <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
            {d.city ? `${d.city}, ${d.country}` : d.country}
            <button onClick={() => removeDestination(i)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={citySearch}
            onChange={e => { setCitySearch(e.target.value); setCityOpen(true); }}
            onFocus={() => { if (citySearch.length >= 2) setCityOpen(true); }}
            onBlur={() => setTimeout(() => setCityOpen(false), 200)}
            placeholder="Search city..."
            className="h-8 text-xs"
          />
          {cityOpen && cityResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[160px] overflow-y-auto">
              {cityResults.map((r, i) => (
                <button key={i} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                  onMouseDown={e => { e.preventDefault(); addDestination(r.city, r.country); setCityOpen(false); }}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative flex-1">
          <Input
            value={countrySearch}
            onChange={e => { setCountrySearch(e.target.value); setCountryOpen(true); }}
            onFocus={() => { if (countrySearch.length >= 2) setCountryOpen(true); }}
            onBlur={() => setTimeout(() => setCountryOpen(false), 200)}
            placeholder="Search country..."
            className="h-8 text-xs"
          />
          {countryOpen && countryResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[160px] overflow-y-auto">
              {countryResults.map((r, i) => (
                <button key={i} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                  onMouseDown={e => { e.preventDefault(); addDestination('', r.country); setCountryOpen(false); }}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button onClick={() => {}} className="text-[10px] text-accent hover:underline mt-1">+ Add Destination</button>
    </div>
  );
}

// ─── Multi-Select Pills ──────────────────────────────────────────────────────

function MultiSelectPills({ label, options, selected, onToggle, placeholder }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-1 mb-1">
        {selected.map(s => (
          <Badge key={s} variant="secondary" className="text-xs gap-1 pr-1">
            {s}
            <button onClick={() => onToggle(s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder || `Search ${label.toLowerCase()}...`}
          className="h-8 text-xs"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent ${selected.includes(opt) ? 'text-primary font-medium' : ''}`}
                onMouseDown={e => { e.preventDefault(); onToggle(opt); setSearch(''); }}
              >
                {opt} {selected.includes(opt) && '✓'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pill Selector ───────────────────────────────────────────────────────────

function PillSelector({ label, options, selected, onToggle, multi = true }: {
  label: string; options: readonly string[]; selected: string[] | string | null; onToggle: (v: string) => void; multi?: boolean;
}) {
  const isSelected = (v: string) => Array.isArray(selected) ? selected.includes(v) : selected === v;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
              isSelected(opt) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-foreground border-border hover:border-primary/50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Grouped Card Selector ───────────────────────────────────────────────────

function GroupedCardSelector({ cardGroups, selected, onToggle }: {
  cardGroups: CardGroup[]; selected: string[]; onToggle: (v: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = cardGroups.map(g => ({
    ...g,
    cards: search ? g.cards.filter(c => c.toLowerCase().includes(search.toLowerCase())) : g.cards,
  })).filter(g => g.cards.length > 0);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Credit Card</label>
      <div className="flex flex-wrap gap-1 mb-1">
        {selected.map(s => (
          <Badge key={s} variant="secondary" className="text-xs gap-1 pr-1">
            {s}
            <button onClick={() => onToggle(s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search cards..."
          className="h-8 text-xs"
        />
        {open && filtered.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-md max-h-52 overflow-y-auto">
            {filtered.map(group => (
              <div key={group.issuer}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0">{group.issuer}</div>
                {group.cards.map(card => (
                  <button
                    key={card}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2 ${selected.includes(card) ? 'text-primary font-medium' : ''}`}
                    onMouseDown={e => { e.preventDefault(); onToggle(card); setSearch(''); setOpen(false); }}
                  >
                    <span className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">{group.issuer[0]}</span>
                    {card} {selected.includes(card) && '✓'}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Grouped Aircraft Selector ───────────────────────────────────────────────

function GroupedAircraftSelector({ aircraftGroups, selected, onToggle }: {
  aircraftGroups: AircraftGroup[]; selected: string[]; onToggle: (v: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const filtered = aircraftGroups.map(g => ({
    ...g,
    types: search ? g.types.filter(t => t.toLowerCase().includes(search.toLowerCase())) : g.types,
  })).filter(g => g.types.length > 0);

  const addCustom = () => {
    if (customInput.trim() && !selected.includes(customInput.trim())) {
      onToggle(customInput.trim());
      setCustomInput('');
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Aircraft Type</label>
      <div className="flex flex-wrap gap-1 mb-1">
        {selected.map(s => (
          <Badge key={s} variant="secondary" className="text-xs gap-1 pr-1">
            {s}
            <button onClick={() => onToggle(s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search aircraft types..."
          className="h-8 text-xs"
        />
        {open && (
          <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-md max-h-52 overflow-y-auto">
            {filtered.map(group => (
              <div key={group.manufacturer}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0">{group.manufacturer}</div>
                {group.types.map(type => (
                  <button
                    key={type}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent ${selected.includes(type) ? 'text-primary font-medium' : ''}`}
                    onMouseDown={e => { e.preventDefault(); onToggle(type); setSearch(''); setOpen(false); }}
                  >
                    {type} {selected.includes(type) && '✓'}
                  </button>
                ))}
              </div>
            ))}
            <div className="border-t px-3 py-2">
              <div className="flex items-center gap-1">
                <Input
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom()}
                  placeholder="+ Add Custom"
                  className="h-6 text-xs flex-1"
                  onClick={e => e.stopPropagation()}
                />
                {customInput && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onMouseDown={e => { e.preventDefault(); addCustom(); }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Grouped Lounge Selector ─────────────────────────────────────────────────

function GroupedLoungeSelector({ loungeGroups, selected, onToggle }: {
  loungeGroups: LoungeGroup[]; selected: string[]; onToggle: (v: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const filtered = loungeGroups.map(g => ({
    ...g,
    lounges: search ? g.lounges.filter(l => l.toLowerCase().includes(search.toLowerCase())) : g.lounges,
  })).filter(g => g.lounges.length > 0);

  const addCustom = () => {
    if (customInput.trim() && !selected.includes(customInput.trim())) {
      onToggle(customInput.trim());
      setCustomInput('');
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Lounge</label>
      <div className="flex flex-wrap gap-1 mb-1">
        {selected.map(s => (
          <Badge key={s} variant="secondary" className="text-xs gap-1 pr-1">
            {s}
            <button onClick={() => onToggle(s)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search lounges..."
          className="h-8 text-xs"
        />
        {open && (
          <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-md max-h-52 overflow-y-auto">
            {filtered.map(group => (
              <div key={group.category}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 sticky top-0">{group.category}</div>
                {group.lounges.map(lounge => (
                  <button
                    key={lounge}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent ${selected.includes(lounge) ? 'text-primary font-medium' : ''}`}
                    onMouseDown={e => { e.preventDefault(); onToggle(lounge); setSearch(''); setOpen(false); }}
                  >
                    {lounge} {selected.includes(lounge) && '✓'}
                  </button>
                ))}
              </div>
            ))}
            <div className="border-t px-3 py-2">
              <div className="flex items-center gap-1">
                <Input
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom()}
                  placeholder="+ Add Custom"
                  className="h-6 text-xs flex-1"
                  onClick={e => e.stopPropagation()}
                />
                {customInput && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onMouseDown={e => { e.preventDefault(); addCustom(); }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ContentTagsSection ─────────────────────────────────────────────────

export function ContentTagsSection({
  taxonomy,
  onChange,
  freeTags,
  onFreeTagsChange,
  compact,
  assetId,
  description,
}: ContentTagsSectionProps) {
  const taxonomyData = useTaxonomyData();
  const [open, setOpen] = useState(!compact);
  const [newFreeTag, setNewFreeTag] = useState('');
  const [smartTagLoading, setSmartTagLoading] = useState(false);

  const update = (patch: Partial<AssetTaxonomy>) => onChange({ ...taxonomy, ...patch });

  const toggleInArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const handleSmartTag = async () => {
    if (assetId) {
      // Cloud Function analyzes the image with Claude vision and returns
      // AI suggestions — apply them into the form for the user to verify.
      setSmartTagLoading(true);
      try {
        const suggestions = await startAIIntake({ assetId });
        if (suggestions) {
          const t = suggestions.taxonomy || {};
          const merged: AssetTaxonomy = { ...taxonomy };
          const arrayFields = ['airlines', 'hotels', 'aircraftTypes', 'lounges', 'creditCards', 'experienceTypes'] as const;
          for (const field of arrayFields) {
            const vals = t[field];
            if (Array.isArray(vals) && vals.length > 0) {
              merged[field] = [...new Set([...taxonomy[field], ...vals])];
            }
          }
          if (!taxonomy.cabinClass && t.cabinClass) merged.cabinClass = t.cabinClass;
          if (!taxonomy.tripComponent && t.tripComponent) merged.tripComponent = t.tripComponent;
          if (Array.isArray(t.destinations) && t.destinations.length > 0) {
            const existing = new Set(taxonomy.destinations.map(d => `${d.city}|${d.country}`));
            merged.destinations = [
              ...taxonomy.destinations,
              ...t.destinations.filter(d => !existing.has(`${d.city}|${d.country}`)),
            ];
          }
          onChange(merged);
          if (suggestions.tags?.length) {
            onFreeTagsChange([...new Set([...freeTags, ...suggestions.tags])]);
          }
          toast.success('AI-suggested tags applied — please verify before saving.');
        } else {
          toast.success('AI auto-tagging started — tags will update when analysis completes');
        }
      } catch (err) {
        toast.error('Smart Tag failed', { description: describeSmartTagError(err) });
        console.error('Smart tag error:', err);
      } finally {
        setSmartTagLoading(false);
      }
    } else {
      // Fallback: apply sensible defaults when no assetId
      update({
        airlines: taxonomy.airlines.length === 0 ? ['JAL'] : taxonomy.airlines,
        cabinClass: taxonomy.cabinClass || 'Business',
        experienceTypes: taxonomy.experienceTypes.length === 0 ? ['Seat'] : taxonomy.experienceTypes,
        aircraftTypes: taxonomy.aircraftTypes.length === 0 ? ['777-300ER'] : taxonomy.aircraftTypes,
        tripComponent: taxonomy.tripComponent || 'In-Flight',
      });
      toast.success('AI-suggested tags applied');
    }
  };

  const addFreeTag = () => {
    if (newFreeTag.trim() && !freeTags.includes(newFreeTag.trim())) {
      onFreeTagsChange([...freeTags, newFreeTag.trim()]);
      setNewFreeTag('');
    }
  };

  const tagCount = taxonomy.airlines.length + taxonomy.hotels.length + taxonomy.aircraftTypes.length +
    (taxonomy.cabinClass ? 1 : 0) + taxonomy.lounges.length + taxonomy.destinations.length +
    taxonomy.creditCards.length + taxonomy.experienceTypes.length + (taxonomy.tripComponent ? 1 : 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full">
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-semibold">Content Tags</span>
        {tagCount > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{tagCount} tags</Badge>}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs ml-auto"
          disabled={smartTagLoading}
          onClick={e => { e.stopPropagation(); handleSmartTag(); }}
        >
          <Sparkles className="h-3 w-3 mr-1" />{smartTagLoading ? 'Tagging...' : 'Smart Tag'}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4 pl-6">
        <p className="text-[10px] text-muted-foreground italic">AI-suggested tags — please verify before saving.</p>

        <MultiSelectPills label="Airline" options={taxonomyData.airlines} selected={taxonomy.airlines} onToggle={v => update({ airlines: toggleInArray(taxonomy.airlines, v) })} />
        <MultiSelectPills label="Hotel / Program" options={taxonomyData.hotels} selected={taxonomy.hotels} onToggle={v => update({ hotels: toggleInArray(taxonomy.hotels, v) })} />
        <GroupedAircraftSelector aircraftGroups={taxonomyData.aircraftGroups} selected={taxonomy.aircraftTypes} onToggle={v => update({ aircraftTypes: toggleInArray(taxonomy.aircraftTypes, v) })} />

        <PillSelector
          label="Cabin Class"
          options={taxonomyData.cabinClasses}
          selected={taxonomy.cabinClass}
          onToggle={v => update({ cabinClass: taxonomy.cabinClass === v ? null : v })}
          multi={false}
        />

        <GroupedLoungeSelector loungeGroups={taxonomyData.loungeGroups} selected={taxonomy.lounges} onToggle={v => update({ lounges: toggleInArray(taxonomy.lounges, v) })} />

        <DestinationFields
          destinations={taxonomy.destinations}
          onChange={dests => update({ destinations: dests })}
        />

        <GroupedCardSelector cardGroups={taxonomyData.cardGroups} selected={taxonomy.creditCards} onToggle={v => update({ creditCards: toggleInArray(taxonomy.creditCards, v) })} />

        <PillSelector
          label="Experience Type"
          options={taxonomyData.experienceTypes}
          selected={taxonomy.experienceTypes}
          onToggle={v => update({ experienceTypes: toggleInArray(taxonomy.experienceTypes, v) })}
        />

        <PillSelector
          label="Trip Component"
          options={taxonomyData.tripComponents}
          selected={taxonomy.tripComponent}
          onToggle={v => update({ tripComponent: taxonomy.tripComponent === v ? null : v })}
          multi={false}
        />

        {/* Free-form tags */}
        <div className="space-y-1.5 pt-2 border-t">
          <label className="text-xs font-medium text-muted-foreground">Free-form Tags</label>
          <div className="flex flex-wrap gap-1">
            {freeTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs gap-1 pr-1">
                {tag}
                <button onClick={() => onFreeTagsChange(freeTags.filter(t => t !== tag))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={newFreeTag}
                onChange={e => setNewFreeTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFreeTag()}
                placeholder="+ Add tag"
                className="h-6 w-24 text-xs"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
