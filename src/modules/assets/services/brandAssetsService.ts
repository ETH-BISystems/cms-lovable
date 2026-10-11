/**
 * Brand Assets Service (MOCK)
 *
 * In-memory rewrite of the production service. Same exported names and
 * signatures; the `brand-assets` Firestore collection is replaced by a
 * seeded slot list and the mutation callables update it in place.
 */

import { delay } from '@/services/_delay';
import { Timestamp } from '@/services/timestamp';
import type {
  BrandAssetSlot,
  UpdateBrandAssetUrlInput,
  UpdateBrandAssetUrlResult,
  BulkImportBrandUrlsInput,
  BulkImportBrandUrlsResult,
} from '../types';

type Unsubscribe = () => void;

const now = Date.now();
const logo = (slug: string) => `https://picsum.photos/seed/${slug}/512/512`;

// production: Firestore `brand-assets` collection (ordered by category, entityName)
const brandSlotStore: BrandAssetSlot[] = [
  { id: 'slot-chase', entityName: 'Chase', category: 'Issuer Logo', cdnUrl: logo('brand-chase'), darkVariantUrl: logo('brand-chase-dark'), updatedAt: Timestamp.fromMillis(now - 20 * 864e5), updatedBy: 'mock-admin' },
  { id: 'slot-amex', entityName: 'American Express', category: 'Issuer Logo', cdnUrl: logo('brand-amex'), darkVariantUrl: logo('brand-amex-dark'), updatedAt: Timestamp.fromMillis(now - 20 * 864e5), updatedBy: 'mock-admin' },
  { id: 'slot-capital-one', entityName: 'Capital One', category: 'Issuer Logo', cdnUrl: logo('brand-capone'), darkVariantUrl: null, updatedAt: Timestamp.fromMillis(now - 18 * 864e5), updatedBy: 'mock-admin' },
  { id: 'slot-citi', entityName: 'Citi', category: 'Issuer Logo', cdnUrl: null, darkVariantUrl: null, updatedAt: Timestamp.fromMillis(now - 18 * 864e5), updatedBy: 'mock-admin' },
  { id: 'slot-united', entityName: 'United Airlines', category: 'Airline Logo', cdnUrl: logo('brand-united'), darkVariantUrl: logo('brand-united-dark'), updatedAt: Timestamp.fromMillis(now - 15 * 864e5), updatedBy: 'mock-editor' },
  { id: 'slot-delta', entityName: 'Delta Air Lines', category: 'Airline Logo', cdnUrl: logo('brand-delta'), darkVariantUrl: null, updatedAt: Timestamp.fromMillis(now - 15 * 864e5), updatedBy: 'mock-editor' },
  { id: 'slot-emirates', entityName: 'Emirates', category: 'Airline Logo', cdnUrl: logo('brand-emirates'), darkVariantUrl: logo('brand-emirates-dark'), updatedAt: Timestamp.fromMillis(now - 12 * 864e5), updatedBy: 'mock-admin' },
  { id: 'slot-singapore', entityName: 'Singapore Airlines', category: 'Airline Logo', cdnUrl: logo('brand-sq'), darkVariantUrl: null, updatedAt: Timestamp.fromMillis(now - 10 * 864e5), updatedBy: 'mock-admin' },
  { id: 'slot-marriott', entityName: 'Marriott Bonvoy', category: 'Hotel Logo', cdnUrl: logo('brand-marriott'), darkVariantUrl: logo('brand-marriott-dark'), updatedAt: Timestamp.fromMillis(now - 9 * 864e5), updatedBy: 'mock-editor' },
  { id: 'slot-hyatt', entityName: 'World of Hyatt', category: 'Hotel Logo', cdnUrl: logo('brand-hyatt'), darkVariantUrl: null, updatedAt: Timestamp.fromMillis(now - 9 * 864e5), updatedBy: 'mock-editor' },
  { id: 'slot-hilton', entityName: 'Hilton Honors', category: 'Hotel Logo', cdnUrl: logo('brand-hilton'), darkVariantUrl: null, updatedAt: Timestamp.fromMillis(now - 8 * 864e5), updatedBy: 'mock-editor' },
  { id: 'slot-star-alliance', entityName: 'Star Alliance', category: 'Alliance Logo', cdnUrl: logo('brand-star-alliance'), darkVariantUrl: logo('brand-star-alliance-dark'), updatedAt: Timestamp.fromMillis(now - 6 * 864e5), updatedBy: 'mock-admin' },
  { id: 'slot-oneworld', entityName: 'oneworld', category: 'Alliance Logo', cdnUrl: logo('brand-oneworld'), darkVariantUrl: null, updatedAt: Timestamp.fromMillis(now - 6 * 864e5), updatedBy: 'mock-admin' },
  { id: 'slot-skyteam', entityName: 'SkyTeam', category: 'Alliance Logo', cdnUrl: logo('brand-skyteam'), darkVariantUrl: null, updatedAt: Timestamp.fromMillis(now - 6 * 864e5), updatedBy: 'mock-admin' },
];

const listeners = new Set<() => void>();

function sorted(): BrandAssetSlot[] {
  return [...brandSlotStore].sort(
    (a, b) => a.category.localeCompare(b.category) || a.entityName.localeCompare(b.entityName)
  );
}

function notify(): void {
  listeners.forEach((cb) => cb());
}

/**
 * Subscribe to real-time brand asset slot updates.
 * production: onSnapshot(query(collection(db, 'brand-assets'), orderBy...))
 */
export function subscribeToBrandAssets(
  onData: (slots: BrandAssetSlot[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const emit = () => {
    try {
      onData(sorted());
    } catch (err) {
      onError(err as Error);
    }
  };
  const timer = setTimeout(emit, 200);
  listeners.add(emit);
  return () => {
    clearTimeout(timer);
    listeners.delete(emit);
  };
}

/**
 * production: httpsCallable(functions, 'updateBrandAssetUrl')
 */
export async function updateBrandAssetUrl(
  input: UpdateBrandAssetUrlInput
): Promise<UpdateBrandAssetUrlResult> {
  await delay(300);
  const slot = brandSlotStore.find((s) => s.id === input.slotId);
  if (slot) {
    slot.cdnUrl = input.cdnUrl;
    slot.updatedAt = Timestamp.now();
    slot.updatedBy = 'mock-admin';
    notify();
  }
  return { success: true };
}

/**
 * production: httpsCallable(functions, 'bulkImportBrandUrls')
 */
export async function bulkImportBrandUrls(
  input: BulkImportBrandUrlsInput
): Promise<BulkImportBrandUrlsResult> {
  await delay(500);
  let matched = 0;
  for (const row of input.rows) {
    const slot = brandSlotStore.find(
      (s) => s.entityName.toLowerCase() === row.entityName.toLowerCase()
    );
    if (slot) {
      slot.cdnUrl = row.cdnUrl;
      slot.updatedAt = Timestamp.now();
      slot.updatedBy = 'mock-admin';
      matched++;
    }
  }
  notify();
  return { matched, total: input.rows.length };
}
