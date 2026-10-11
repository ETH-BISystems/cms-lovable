/**
 * useTaxonomyData Hook
 *
 * Fetches taxonomy options from Firestore collections for use in
 * ContentTagsSection and AIIntakeFlow. Provides airlines, hotels,
 * aircraft types, lounges, cabin classes, experience types, trip
 * components, credit cards, and destination search.
 *
 * Data sources:
 * - transfer-partners collection → airlines & hotels
 * - cards collection → credit card groups
 * - Static constants for aircraft, lounges, cabin classes, experience types
 *
 * Falls back to comprehensive static data when Firestore collections
 * are not yet populated.
 */

import { useState, useEffect } from 'react';
import {
  subscribeToTaxonomy,
  fetchLegacyPartners,
  fetchLegacyCards,
} from '../services/taxonomyService';

// ─── Static Taxonomy Data (production defaults) ──────────────────────────────

export const CABIN_CLASSES = ['First', 'Business', 'Premium Economy', 'Economy'] as const;

export const EXPERIENCE_TYPES = [
  'Seat', 'Meal', 'Amenity Kit', 'Lounge Interior', 'Lounge Food',
  'Hotel Room', 'Hotel Pool', 'Hotel Spa', 'Hotel Lobby',
  'Check-in', 'Boarding', 'Arrival', 'Ground Transport',
  'Exterior', 'Cabin Overview', 'Bathroom/Lavatory',
  'IFE/Entertainment', 'Turndown Service',
] as const;

export const TRIP_COMPONENTS = [
  'Pre-Departure', 'In-Flight', 'On-Ground', 'Hotel Stay', 'Transfer',
] as const;

export interface AircraftGroup {
  manufacturer: string;
  types: string[];
}

export const AIRCRAFT_GROUPS: AircraftGroup[] = [
  { manufacturer: 'Boeing', types: ['737-800', '737 MAX 8', '747-400', '757-200', '767-300ER', '777-200ER', '777-300ER', '777X', '787-8 Dreamliner', '787-9 Dreamliner', '787-10 Dreamliner'] },
  { manufacturer: 'Airbus', types: ['A220-300', 'A319', 'A320neo', 'A321neo', 'A321XLR', 'A330-300', 'A330-900neo', 'A340-600', 'A350-900', 'A350-1000', 'A380'] },
  { manufacturer: 'Embraer', types: ['E175', 'E190-E2', 'E195-E2'] },
];

export interface LoungeGroup {
  category: string;
  lounges: string[];
}

export const LOUNGE_GROUPS: LoungeGroup[] = [
  { category: 'Amex', lounges: ['Amex Centurion Lounge', 'Amex Centurion Studio'] },
  { category: 'Chase', lounges: ['Chase Sapphire Lounge by The Club'] },
  { category: 'Capital One', lounges: ['Capital One Lounge'] },
  { category: 'United', lounges: ['United Polaris Lounge', 'United Club'] },
  { category: 'Delta', lounges: ['Delta Sky Club', 'Delta ONE Lounge'] },
  { category: 'American', lounges: ['American Admirals Club', 'American Flagship Lounge', 'American Flagship First Dining'] },
  { category: 'International', lounges: [
    'Singapore Airlines SilverKris Lounge', 'JAL Sakura Lounge', 'JAL First Class Lounge',
    'ANA Lounge', 'ANA Suite Lounge', 'Cathay Pacific The Pier Business', 'Cathay Pacific The Wing First',
    'Qatar Al Mourjan Business Lounge', 'Qatar Al Safwa First Lounge',
    'Emirates Business Class Lounge', 'Emirates First Class Lounge',
    'Qantas First Lounge', 'Qantas Business Lounge',
  ]},
  { category: 'Network', lounges: ['Priority Pass', 'Plaza Premium Lounge', 'The Club'] },
];

export interface CardGroup {
  issuer: string;
  cards: string[];
}

export const DEFAULT_CARD_GROUPS: CardGroup[] = [
  { issuer: 'Chase', cards: ['Chase Sapphire Reserve', 'Chase Sapphire Preferred', 'Chase Freedom Unlimited', 'Chase Freedom Flex', 'Ink Business Preferred', 'Ink Business Cash', 'Ink Business Unlimited', 'United Explorer Card', 'United Quest Card', 'United Club Infinite Card', 'IHG One Rewards Premier', 'Marriott Bonvoy Boundless', 'Southwest Rapid Rewards Priority'] },
  { issuer: 'American Express', cards: ['The Platinum Card® from American Express', 'American Express® Gold Card', 'American Express® Green Card', 'Blue Business Plus', 'Delta SkyMiles® Reserve', 'Delta SkyMiles® Platinum', 'Delta SkyMiles® Gold', 'Hilton Honors Aspire', 'Hilton Honors Surpass', 'Marriott Bonvoy Brilliant'] },
  { issuer: 'Capital One', cards: ['Capital One Venture X', 'Capital One Venture', 'Capital One SavorOne'] },
  { issuer: 'Citi', cards: ['Citi Strata Premier', 'Citi Custom Cash', 'Citi AAdvantage Executive World Elite'] },
  { issuer: 'US Bank', cards: ['US Bank Altitude Reserve'] },
  { issuer: 'Bilt', cards: ['Bilt Mastercard'] },
];

// ─── Location Search ─────────────────────────────────────────────────────────

interface LocationResult {
  city: string;
  country: string;
  label: string;
}

const MAJOR_CITIES: Array<{ city: string; country: string }> = [
  { city: 'Tokyo', country: 'Japan' }, { city: 'New York', country: 'United States' },
  { city: 'London', country: 'United Kingdom' }, { city: 'Paris', country: 'France' },
  { city: 'Singapore', country: 'Singapore' }, { city: 'Hong Kong', country: 'China' },
  { city: 'Dubai', country: 'UAE' }, { city: 'Sydney', country: 'Australia' },
  { city: 'Los Angeles', country: 'United States' }, { city: 'San Francisco', country: 'United States' },
  { city: 'Chicago', country: 'United States' }, { city: 'Dallas', country: 'United States' },
  { city: 'Miami', country: 'United States' }, { city: 'Seattle', country: 'United States' },
  { city: 'Doha', country: 'Qatar' }, { city: 'Abu Dhabi', country: 'UAE' },
  { city: 'Bangkok', country: 'Thailand' }, { city: 'Seoul', country: 'South Korea' },
  { city: 'Taipei', country: 'Taiwan' }, { city: 'Bali', country: 'Indonesia' },
  { city: 'Maldives', country: 'Maldives' }, { city: 'Rome', country: 'Italy' },
  { city: 'Barcelona', country: 'Spain' }, { city: 'Amsterdam', country: 'Netherlands' },
  { city: 'Frankfurt', country: 'Germany' }, { city: 'Munich', country: 'Germany' },
  { city: 'Zurich', country: 'Switzerland' }, { city: 'Istanbul', country: 'Turkey' },
  { city: 'Auckland', country: 'New Zealand' }, { city: 'Fiji', country: 'Fiji' },
];

const COUNTRIES = [
  'United States', 'Japan', 'United Kingdom', 'France', 'Singapore', 'China',
  'UAE', 'Australia', 'Qatar', 'Thailand', 'South Korea', 'Taiwan', 'Indonesia',
  'Maldives', 'Italy', 'Spain', 'Netherlands', 'Germany', 'Switzerland', 'Turkey',
  'New Zealand', 'Fiji', 'Canada', 'Mexico', 'Brazil', 'India', 'Philippines',
  'Vietnam', 'Malaysia', 'Portugal', 'Greece', 'Croatia', 'Iceland', 'Norway',
  'Sweden', 'Denmark', 'Finland', 'Ireland', 'Scotland', 'South Africa', 'Kenya',
  'Morocco', 'Egypt', 'Peru', 'Chile', 'Argentina', 'Colombia', 'Costa Rica',
];

export function searchLocations(searchTerm: string): LocationResult[] {
  const lower = searchTerm.toLowerCase();
  const results: LocationResult[] = [];

  // Search cities
  MAJOR_CITIES.forEach(({ city, country }) => {
    if (city.toLowerCase().includes(lower) || country.toLowerCase().includes(lower)) {
      results.push({ city, country, label: `${city}, ${country}` });
    }
  });

  // Search countries (without city)
  COUNTRIES.forEach((country) => {
    if (country.toLowerCase().includes(lower) && !results.some(r => r.country === country && r.city)) {
      results.push({ city: '', country, label: country });
    }
  });

  return results.slice(0, 10);
}

// ─── Taxonomy Data Interface ─────────────────────────────────────────────────

export interface TaxonomyData {
  airlines: string[];
  hotels: string[];
  aircraftGroups: AircraftGroup[];
  loungeGroups: LoungeGroup[];
  cardGroups: CardGroup[];
  cabinClasses: readonly string[];
  experienceTypes: readonly string[];
  tripComponents: readonly string[];
  loading: boolean;
  error: Error | null;
}

// ─── Default Airlines & Hotels (fallback when Firestore is empty) ────────────

const DEFAULT_AIRLINES = [
  'ANA', 'Air Canada', 'Air France-KLM', 'American Airlines', 'British Airways',
  'Cathay Pacific', 'Delta Air Lines', 'Emirates', 'Etihad Airways', 'EVA Air',
  'Iberia', 'JAL', 'JetBlue', 'Korean Air', 'Lufthansa', 'Qantas',
  'Qatar Airways', 'Singapore Airlines', 'Southwest Airlines', 'Thai Airways',
  'Turkish Airlines', 'United Airlines', 'Virgin Atlantic',
].sort();

const DEFAULT_HOTELS = [
  'Hilton Honors', 'IHG One Rewards', 'Marriott Bonvoy', 'World of Hyatt',
  'Accor Live Limitless', 'Choice Privileges', 'Wyndham Rewards',
].sort();

/**
 * Hook that provides taxonomy data for ContentTagsSection and AIIntakeFlow.
 *
 * Loads from three sources (in priority order):
 * 1. asset-taxonomy Firestore collection (Tag Manager custom/managed tags)
 * 2. transfer_partner_matrix + card_data collections (legacy sources)
 * 3. Static hardcoded defaults (always available as fallback)
 *
 * All sources are merged — custom tags from Tag Manager appear alongside defaults.
 */
export function useTaxonomyData(): TaxonomyData {
  const [airlines, setAirlines] = useState<string[]>(DEFAULT_AIRLINES);
  const [hotels, setHotels] = useState<string[]>(DEFAULT_HOTELS);
  const [cardGroups, setCardGroups] = useState<CardGroup[]>(DEFAULT_CARD_GROUPS);
  const [aircraftGroups, setAircraftGroups] = useState<AircraftGroup[]>(AIRCRAFT_GROUPS);
  const [cabinClasses, setCabinClasses] = useState<readonly string[]>(CABIN_CLASSES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Real-time listener on taxonomy store — updates dropdowns instantly
  // (production: onSnapshot(collection(db, 'asset-taxonomy')))
  useEffect(() => {
    const unsub = subscribeToTaxonomy((byCategory) => {
      const activeNames = (key: 'airlines' | 'hotels' | 'cabins' | 'aircraft') =>
        (byCategory[key] || []).filter(t => !t.archived).map(t => t.name);

      const tagManagerAirlines = activeNames('airlines');
      const tagManagerHotels = activeNames('hotels');
      const tagManagerCabins = activeNames('cabins');
      const tagManagerAircraft = activeNames('aircraft');

      // Merge with defaults (deduplicate by lowercase)
      const mergeUnique = (sources: string[][]): string[] => {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const source of sources) {
          for (const item of source) {
            const key = item.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              result.push(item);
            }
          }
        }
        return result.sort();
      };

      setAirlines(mergeUnique([tagManagerAirlines, DEFAULT_AIRLINES]));
      setHotels(mergeUnique([tagManagerHotels, DEFAULT_HOTELS]));

      if (tagManagerCabins.length > 0) {
        setCabinClasses(mergeUnique([tagManagerCabins, [...CABIN_CLASSES]]));
      }

      if (tagManagerAircraft.length > 0) {
        const defaultAircraftFlat = AIRCRAFT_GROUPS.flatMap(g => g.types);
        const customAircraft = tagManagerAircraft.filter(
          a => !defaultAircraftFlat.some(d => d.toLowerCase() === a.toLowerCase())
        );
        if (customAircraft.length > 0) {
          setAircraftGroups([...AIRCRAFT_GROUPS, { manufacturer: 'Custom', types: customAircraft.sort() }]);
        }
      }

      setLoading(false);
    }, (err) => {
      // Collection might not exist yet — use defaults
      console.warn('asset-taxonomy listener error (using defaults):', err.message);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // One-time fetch for legacy collections (transfer partners, cards)
  useEffect(() => {
    let cancelled = false;

    async function fetchLegacyData() {
      try {
        const partners = await fetchLegacyPartners();

        if (!cancelled && partners.length > 0) {
          const legacyAirlines: string[] = [];
          const legacyHotels: string[] = [];

          partners.forEach((partner) => {
            if (partner.type === 'airline' && partner.name) legacyAirlines.push(partner.name);
            else if (partner.type === 'hotel' && partner.name) legacyHotels.push(partner.name);
          });

          if (legacyAirlines.length > 0) {
            setAirlines(prev => {
              const seen = new Set(prev.map(a => a.toLowerCase()));
              const additions = legacyAirlines.filter(a => !seen.has(a.toLowerCase()));
              return additions.length > 0 ? [...prev, ...additions].sort() : prev;
            });
          }
          if (legacyHotels.length > 0) {
            setHotels(prev => {
              const seen = new Set(prev.map(h => h.toLowerCase()));
              const additions = legacyHotels.filter(h => !seen.has(h.toLowerCase()));
              return additions.length > 0 ? [...prev, ...additions].sort() : prev;
            });
          }
        }
      } catch {
        // Legacy collection may not exist — fine
      }

      try {
        const cards = await fetchLegacyCards();

        if (!cancelled && cards.length > 0) {
          const groupMap = new Map<string, string[]>();
          cards.forEach((card) => {
            if (card.issuer && card.name) {
              const existing = groupMap.get(card.issuer) || [];
              existing.push(card.name);
              groupMap.set(card.issuer, existing);
            }
          });

          if (groupMap.size > 0) {
            const groups: CardGroup[] = Array.from(groupMap.entries()).map(
              ([issuer, cards]) => ({ issuer, cards: cards.sort() })
            );
            setCardGroups(groups);
          }
        }
      } catch {
        // card_data collection may not exist — fine
      }
    }

    fetchLegacyData();
    return () => { cancelled = true; };
  }, []);

  return {
    airlines,
    hotels,
    aircraftGroups,
    loungeGroups: LOUNGE_GROUPS,
    cardGroups,
    cabinClasses,
    experienceTypes: EXPERIENCE_TYPES,
    tripComponents: TRIP_COMPONENTS,
    loading,
    error,
  };
}
