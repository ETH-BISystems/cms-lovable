/**
 * Taxonomy Service (MOCK)
 *
 * Backs the `asset-taxonomy` Firestore documents consumed by the Tag Manager
 * and useTaxonomyData, plus the legacy lookup collections
 * (`transfer_partner_matrix`, `card_data`) that feed airline/hotel/card
 * autocomplete. In-memory store with the same subscribe/save semantics.
 */

import { delay } from '@/services/_delay';

type Unsubscribe = () => void;

export interface TaxonomyTagItem {
  name: string;
  archived: boolean;
  createdAt?: string;
  renamedFrom?: string;
}

export interface TaxonomyCategoryData {
  tags: TaxonomyTagItem[];
  updatedAt?: string;
}

export type TaxonomyCategory = 'airlines' | 'hotels' | 'cabins' | 'aircraft' | 'assetTypes';

// production: Firestore docs asset-taxonomy/{category} { tags[], updatedAt }
const taxonomyStore: Record<TaxonomyCategory, TaxonomyCategoryData> = {
  airlines: {
    tags: [
      { name: 'Air New Zealand', archived: false, createdAt: new Date(Date.now() - 12 * 864e5).toISOString() },
      { name: 'Aer Lingus', archived: true, createdAt: new Date(Date.now() - 90 * 864e5).toISOString() },
    ],
  },
  hotels: {
    tags: [
      { name: 'IHG Hotels & Resorts', archived: false, createdAt: new Date(Date.now() - 30 * 864e5).toISOString() },
    ],
  },
  cabins: { tags: [] },
  aircraft: {
    tags: [
      { name: 'COMAC C919', archived: false, createdAt: new Date(Date.now() - 5 * 864e5).toISOString() },
    ],
  },
  assetTypes: {
    tags: [
      { name: 'Reel Cover', archived: false, createdAt: new Date(Date.now() - 8 * 864e5).toISOString() },
      { name: 'Boarding Pass', archived: true, createdAt: new Date(Date.now() - 60 * 864e5).toISOString() },
    ],
  },
};

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((cb) => cb());
}

/**
 * Subscribe to one taxonomy category document.
 * production: onSnapshot(doc(db, 'asset-taxonomy', category)) in TagManager
 */
export function subscribeToTaxonomyCategory(
  category: TaxonomyCategory,
  onData: (data: TaxonomyCategoryData) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const emit = () => {
    try {
      onData({ tags: [...taxonomyStore[category].tags], updatedAt: taxonomyStore[category].updatedAt });
    } catch (err) {
      onError?.(err as Error);
    }
  };
  const timer = setTimeout(emit, 120);
  listeners.add(emit);
  return () => {
    clearTimeout(timer);
    listeners.delete(emit);
  };
}

/**
 * Subscribe to the whole taxonomy collection.
 * production: onSnapshot(collection(db, 'asset-taxonomy')) in useTaxonomyData
 */
export function subscribeToTaxonomy(
  onData: (byCategory: Record<TaxonomyCategory, TaxonomyTagItem[]>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const emit = () => {
    try {
      const snapshot = Object.fromEntries(
        (Object.keys(taxonomyStore) as TaxonomyCategory[]).map((c) => [
          c,
          [...taxonomyStore[c].tags],
        ])
      ) as Record<TaxonomyCategory, TaxonomyTagItem[]>;
      onData(snapshot);
    } catch (err) {
      onError?.(err as Error);
    }
  };
  const timer = setTimeout(emit, 120);
  listeners.add(emit);
  return () => {
    clearTimeout(timer);
    listeners.delete(emit);
  };
}

/**
 * Persist a category's tag list.
 * production: setDoc(doc(db, 'asset-taxonomy', category), { tags, updatedAt }) in TagManager
 */
export async function saveTaxonomyCategory(
  category: TaxonomyCategory,
  tags: TaxonomyTagItem[]
): Promise<void> {
  await delay(200);
  taxonomyStore[category] = { tags: [...tags], updatedAt: new Date().toISOString() };
  notify();
}

// ─── Legacy Lookup Collections ────────────────────────────────────────────────

export interface LegacyPartner {
  type: 'airline' | 'hotel';
  name: string;
}

export interface LegacyCard {
  issuer: string;
  name: string;
}

// production: getDocs(query(collection(db, 'transfer_partner_matrix'), orderBy('name')))
const legacyPartners: LegacyPartner[] = [
  { type: 'airline', name: 'Aeroplan (Air Canada)' },
  { type: 'airline', name: 'Flying Blue (Air France-KLM)' },
  { type: 'airline', name: 'Avios (British Airways)' },
  { type: 'airline', name: 'KrisFlyer (Singapore Airlines)' },
  { type: 'airline', name: 'Velocity (Virgin Australia)' },
  { type: 'hotel', name: 'ALL — Accor Live Limitless' },
];

// production: getDocs(query(collection(db, 'card_data'), orderBy('issuer')))
const legacyCards: LegacyCard[] = [
  { issuer: 'Chase', name: 'Chase Sapphire Reserve' },
  { issuer: 'Chase', name: 'Chase Sapphire Preferred' },
  { issuer: 'American Express', name: 'The Platinum Card® from American Express' },
  { issuer: 'American Express', name: 'American Express® Gold Card' },
  { issuer: 'Capital One', name: 'Capital One Venture X' },
  { issuer: 'Citi', name: 'Citi Strata Premier' },
];

/** production: getDocs(query(collection(db, 'transfer_partner_matrix'), orderBy('name', 'asc'))) */
export async function fetchLegacyPartners(): Promise<LegacyPartner[]> {
  await delay(150);
  return [...legacyPartners];
}

/** production: getDocs(query(collection(db, 'card_data'), orderBy('issuer', 'asc'))) */
export async function fetchLegacyCards(): Promise<LegacyCard[]> {
  await delay(150);
  return [...legacyCards];
}
