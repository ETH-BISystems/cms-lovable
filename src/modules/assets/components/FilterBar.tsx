/**
 * FilterBar Component
 *
 * Comprehensive filter controls for assets matching Lovable prototype:
 * - Primary filters: Asset Type, Airline, Hotel, Cabin Class, Aircraft Type, Destination, Experience Type
 * - Expandable "More" filters: Source, Usage (Used/Unused), Date Range (From/To)
 * - Sort options: Newest, Oldest, Name A-Z, Name Z-A, Largest, Smallest, Most Used, Destination A-Z, Aircraft Type
 * - Active filter pill badges with remove buttons
 * - "Clear" button to reset all filters
 * - Grid/List view toggle buttons
 */

import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  X,
  Grid3X3,
  List,
  ArrowUpDown,
  CalendarDays,
} from 'lucide-react';
import { useTaxonomyData, searchLocations, AIRCRAFT_GROUPS, EXPERIENCE_TYPES } from '../hooks/useTaxonomyData';
import type { AssetFilters, AssetCategory, AssetSource, SortOption } from '../types';

const ASSET_CATEGORIES: AssetCategory[] = [
  'Photo', 'Screenshot', 'Infographic', 'Card Art',
  'Issuer Logo', 'Airline Logo', 'Hotel Logo', 'Alliance Logo',
  'Program Logo', 'Team Photo',
];

const ASSET_SOURCES: AssetSource[] = ['Upload', 'Stock', 'AI Generated'];

const CABIN_CLASSES = ['First', 'Business', 'Premium Economy', 'Economy'];

export interface FilterBarProps {
  filters: AssetFilters;
  onChange: (filters: AssetFilters) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function FilterBar({
  filters,
  onChange,
  sortOption,
  onSortChange,
  viewMode,
  onViewModeChange,
}: FilterBarProps) {
  const [moreFilters, setMoreFilters] = useState(false);
  const [destSearch, setDestSearch] = useState('');
  const [destAutocompleteOpen, setDestAutocompleteOpen] = useState(false);
  const { airlines, hotels } = useTaxonomyData();

  const updateFilter = <K extends keyof AssetFilters>(key: K, value: AssetFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  // Determine if any filters are active
  const hasFilters =
    filters.search ||
    !!filters.category ||
    !!filters.source ||
    filters.usage !== 'all' ||
    filters.airlines.length > 0 ||
    filters.hotels.length > 0 ||
    !!filters.cabinClass ||
    filters.experienceTypes.length > 0 ||
    filters.aircraftTypes.length > 0 ||
    filters.destinations.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.creditCardOnly;

  const clearFilters = () => {
    onChange({
      category: '',
      airlines: [],
      hotels: [],
      cabinClass: '',
      experienceTypes: [],
      aircraftTypes: [],
      destinations: [],
      source: '',
      usage: 'all',
      dateFrom: null,
      dateTo: null,
      search: filters.search, // preserve search
      aiIntakeOnly: false,
      creditCardOnly: false,
    });
  };

  // Build active filter pills
  const activeFilterPills: { label: string; onClear: () => void }[] = [];

  if (filters.category) {
    activeFilterPills.push({
      label: `Type: ${filters.category}`,
      onClear: () => updateFilter('category', ''),
    });
  }
  filters.airlines.forEach((a) =>
    activeFilterPills.push({
      label: `Airline: ${a}`,
      onClear: () =>
        updateFilter('airlines', filters.airlines.filter((x) => x !== a)),
    })
  );
  filters.hotels.forEach((h) =>
    activeFilterPills.push({
      label: `Hotel: ${h}`,
      onClear: () =>
        updateFilter('hotels', filters.hotels.filter((x) => x !== h)),
    })
  );
  if (filters.cabinClass) {
    activeFilterPills.push({
      label: `Cabin: ${filters.cabinClass}`,
      onClear: () => updateFilter('cabinClass', ''),
    });
  }
  filters.aircraftTypes.forEach((a) =>
    activeFilterPills.push({
      label: `Aircraft: ${a}`,
      onClear: () =>
        updateFilter('aircraftTypes', filters.aircraftTypes.filter((x) => x !== a)),
    })
  );
  filters.destinations.forEach((d) => {
    const label = d.city ? `${d.city}, ${d.country}` : d.country;
    activeFilterPills.push({
      label: `Destination: ${label}`,
      onClear: () =>
        updateFilter(
          'destinations',
          filters.destinations.filter(
            (x) => !(x.city === d.city && x.country === d.country)
          )
        ),
    });
  });
  filters.experienceTypes.forEach((e) =>
    activeFilterPills.push({
      label: `Experience: ${e}`,
      onClear: () =>
        updateFilter('experienceTypes', filters.experienceTypes.filter((x) => x !== e)),
    })
  );
  if (filters.source) {
    activeFilterPills.push({
      label: `Source: ${filters.source}`,
      onClear: () => updateFilter('source', ''),
    });
  }
  if (filters.usage !== 'all') {
    activeFilterPills.push({
      label: `Usage: ${filters.usage === 'used' ? 'Used' : 'Unused'}`,
      onClear: () => updateFilter('usage', 'all'),
    });
  }

  return (
    <div className="space-y-2.5">
      {/* Primary Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Asset Type */}
        <Select
          value={filters.category || 'all'}
          onValueChange={(v) => updateFilter('category', v === 'all' ? '' : v as AssetCategory)}
        >
          <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/70">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Asset Types</SelectItem>
            {ASSET_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Airline */}
        <Select
          value={filters.airlines.length > 0 ? filters.airlines[0] : 'all'}
          onValueChange={(v) =>
            updateFilter('airlines', v === 'all' ? [] : [v])
          }
        >
          <SelectTrigger className="w-[110px] h-8 text-[13px] border-border/70">
            <SelectValue placeholder="Airline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Airlines</SelectItem>
            {airlines.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Hotel */}
        <Select
          value={filters.hotels.length > 0 ? filters.hotels[0] : 'all'}
          onValueChange={(v) =>
            updateFilter('hotels', v === 'all' ? [] : [v])
          }
        >
          <SelectTrigger className="w-[100px] h-8 text-[13px] border-border/70">
            <SelectValue placeholder="Hotel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hotels</SelectItem>
            {hotels.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Cabin Class */}
        <Select
          value={filters.cabinClass || 'all'}
          onValueChange={(v) => updateFilter('cabinClass', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[100px] h-8 text-[13px] border-border/70">
            <SelectValue placeholder="Cabin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cabins</SelectItem>
            {CABIN_CLASSES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Aircraft Type */}
        <Select
          value={filters.aircraftTypes.length > 0 ? filters.aircraftTypes[0] : 'all'}
          onValueChange={(v) =>
            updateFilter('aircraftTypes', v === 'all' ? [] : [v])
          }
        >
          <SelectTrigger className="w-[110px] h-8 text-[13px] border-border/70">
            <SelectValue placeholder="Aircraft" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Aircraft</SelectItem>
            {AIRCRAFT_GROUPS.map((g) => (
              <SelectGroup key={g.manufacturer}>
                <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {g.manufacturer}
                </SelectLabel>
                {g.types.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {/* Destination text autocomplete */}
        <div className="relative">
          <Input
            value={destSearch}
            onChange={(e) => {
              setDestSearch(e.target.value);
              setDestAutocompleteOpen(true);
            }}
            onFocus={() => {
              if (destSearch.length >= 2) setDestAutocompleteOpen(true);
            }}
            onBlur={() => setTimeout(() => setDestAutocompleteOpen(false), 200)}
            placeholder="Destination..."
            className="w-[150px] focus:w-[250px] transition-all h-8 text-xs"
          />
          {destAutocompleteOpen && destSearch.length >= 2 && (() => {
            const results = searchLocations(destSearch);
            return results.length > 0 ? (
              <div className="absolute z-20 w-[250px] mt-1 bg-popover border border-border/70 rounded-lg shadow-raised max-h-[200px] overflow-y-auto">
                {results.map((r, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-muted/50 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const newDest = { city: r.city, country: r.country };
                      const alreadyExists = filters.destinations.some(
                        (d) => d.city === newDest.city && d.country === newDest.country
                      );
                      if (!alreadyExists) {
                        updateFilter('destinations', [...filters.destinations, newDest]);
                      }
                      setDestSearch('');
                      setDestAutocompleteOpen(false);
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            ) : null;
          })()}
        </div>

        {/* Experience Type */}
        <Select
          value={filters.experienceTypes.length > 0 ? filters.experienceTypes[0] : 'all'}
          onValueChange={(v) =>
            updateFilter('experienceTypes', v === 'all' ? [] : [v])
          }
        >
          <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/70">
            <SelectValue placeholder="Experience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Experiences</SelectItem>
            {EXPERIENCE_TYPES.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* More Filters Toggle */}
        <Collapsible open={moreFilters} onOpenChange={setMoreFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-[13px] px-2 text-muted-foreground hover:text-foreground">
              More{' '}
              <ChevronDown
                className={`h-3 w-3 ml-1 transition-transform duration-200 ease-out ${moreFilters ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Credit Card filter checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer h-8 px-2 rounded-md hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            checked={filters.creditCardOnly || false}
            onChange={(e) => updateFilter('creditCardOnly', e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-accent cursor-pointer"
          />
          <span className="text-[13px] font-medium whitespace-nowrap">Credit Cards</span>
        </label>

        {/* Clear Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-[13px] h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}

        {/* Sort */}
        <Select
          value={sortOption}
          onValueChange={(v) => onSortChange(v as SortOption)}
        >
          <SelectTrigger className="w-[130px] h-8 text-[13px] border-border/70 ml-auto">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest-first">Newest First</SelectItem>
            <SelectItem value="oldest-first">Oldest First</SelectItem>
            <SelectItem value="name-a-z">Name A-Z</SelectItem>
            <SelectItem value="name-z-a">Name Z-A</SelectItem>
            <SelectItem value="largest-first">Largest First</SelectItem>
            <SelectItem value="smallest-first">Smallest First</SelectItem>
            <SelectItem value="most-used">Most Used</SelectItem>
            <SelectItem value="destination-a-z">Destination A-Z</SelectItem>
            <SelectItem value="aircraft-type">Aircraft Type</SelectItem>
          </SelectContent>
        </Select>

        {/* Grid/List Toggle */}
        <div className="flex items-center border border-border/70 rounded-lg bg-card overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            aria-label="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeFilterPills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeFilterPills.map((p) => (
            <Badge key={p.label} variant="accent" className="text-[11px] gap-1 pr-1">
              {p.label}
              <button
                onClick={p.onClear}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* More Filters Expansion */}
      {moreFilters && (
        <div className="flex items-center gap-3 flex-wrap pl-1">
          {/* Source */}
          <Select
            value={filters.source || 'all'}
            onValueChange={(v) =>
              updateFilter('source', v === 'all' ? '' : v as AssetSource)
            }
          >
            <SelectTrigger className="w-[130px] h-8 text-[13px] border-border/70">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {ASSET_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Usage */}
          <Select
            value={filters.usage}
            onValueChange={(v) =>
              updateFilter('usage', v as 'all' | 'used' | 'unused')
            }
          >
            <SelectTrigger className="w-[120px] h-8 text-[13px] border-border/70">
              <SelectValue placeholder="Usage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="used">Used in Articles</SelectItem>
              <SelectItem value="unused">Unused</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={filters.dateFrom ? '' : ''}
              onChange={(e) => {
                // Store as a simple date string for client-side filtering
                // The actual Timestamp conversion happens in the hook
                updateFilter('dateFrom', e.target.value ? (e.target.value as any) : null);
              }}
              className="h-8 text-[13px] w-[130px] border-border/70"
              placeholder="From"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={filters.dateTo ? '' : ''}
              onChange={(e) => {
                updateFilter('dateTo', e.target.value ? (e.target.value as any) : null);
              }}
              className="h-8 text-[13px] w-[130px] border-border/70"
              placeholder="To"
            />
          </div>
        </div>
      )}
    </div>
  );
}
