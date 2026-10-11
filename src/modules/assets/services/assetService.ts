/**
 * Asset Service (MOCK)
 *
 * In-memory rewrite of the production service. Same exported names and
 * signatures; every Cloud Function call is simulated with delay() and the
 * production callable name is kept in a comment above each mock.
 *
 * production: Firestore `assets` collection + `assets/{id}/upload_history`
 *             and `assets/{id}/usage` subcollections.
 */

import { delay, mockId } from '@/services/_delay';
import { Timestamp } from '@/services/timestamp';
import type {
  AssetDocument,
  AssetFilters,
  AssetTaxonomy,
  AISuggestions,
  UploadAssetInput,
  UploadAssetResult,
  CompleteUploadInput,
  StartAIIntakeInput,
  CompleteAIIntakeInput,
  UpdateAssetInput,
  DeleteAssetInput,
  DeleteAssetResult,
  AddAssetToArticleInput,
  RemoveAssetFromArticleInput,
  SyncToWebflowInput,
  SyncToWebflowResult,
  BulkSyncToWebflowInput,
  BulkSyncToWebflowResult,
  GenerateAIImageInput,
  GenerateAIImageResult,
  EditAIImageInput,
  EditAIImageResult,
  UploadFromURLInput,
  UploadFromURLResult,
  BulkAddTagsInput,
  BulkAddTagsResult,
  BatchApplyAssetMetadataInput,
  BatchApplyAssetMetadataResult,
  GenerateExportZIPInput,
  GenerateExportZIPResult,
  CheckDuplicateInput,
  CheckDuplicateResult,
  UploadHistoryEntry,
  UsageEntry,
} from '../types';

type Unsubscribe = () => void;

// ─── Seed Data ────────────────────────────────────────────────────────────────

const EMPTY_TAXONOMY: AssetTaxonomy = {
  airlines: [],
  hotels: [],
  cabinClass: null,
  experienceTypes: [],
  lounges: [],
  destinations: [],
  creditCards: [],
  aircraftTypes: [],
  tripComponent: null,
};

const now = Date.now();
const daysAgo = (n: number) => Timestamp.fromMillis(now - n * 864e5);

function seedAsset(partial: Partial<AssetDocument> & Pick<AssetDocument, 'id' | 'filename' | 'category' | 'cdnUrl'>): AssetDocument {
  return {
    description: '',
    source: 'Upload',
    format: 'WebP',
    width: 1024,
    height: 768,
    sizeBytes: 240_000,
    uploadedBy: 'mock-admin',
    uploadedAt: daysAgo(10),
    lastUpdated: daysAgo(3),
    altText: '',
    titleAttribute: '',
    tags: [],
    thumbnailUrl: partial.cdnUrl,
    status: 'active',
    webflowSync: 'N/A',
    lastSynced: null,
    association: null,
    darkVariantUrl: null,
    isBrandAsset: false,
    seoScore: 70,
    taxonomy: { ...EMPTY_TAXONOMY },
    webflowItemId: null,
    aiSuggestions: null,
    provenance: null,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(3),
    ...partial,
  };
}

const picsum = (slug: string, w = 1024, h = 768) => `https://picsum.photos/seed/${slug}/${w}/${h}`;

const assetStore: AssetDocument[] = [
  seedAsset({
    id: 'asset-emirates-a380-bar',
    filename: 'emirates-a380-onboard-bar-lounge.webp',
    description: 'Emirates A380 onboard bar and lounge in Business Class with ambient lighting',
    category: 'Photo',
    width: 1024, height: 768, sizeBytes: 312_400,
    cdnUrl: picsum('emirates-a380-bar'),
    thumbnailUrl: picsum('emirates-a380-bar', 300, 200),
    altText: 'Emirates A380 onboard bar and lounge with bartender preparing drinks',
    titleAttribute: 'Emirates A380 Onboard Bar — Business Class',
    tags: ['emirates', 'a380', 'bar', 'business-class'],
    status: 'active',
    webflowSync: 'Synced',
    lastSynced: daysAgo(2),
    webflowItemId: 'wf-item-1001',
    seoScore: 100,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      airlines: ['Emirates'],
      cabinClass: 'Business',
      experienceTypes: ['Lounge Interior', 'Cabin Overview'],
      aircraftTypes: ['Airbus A380'],
      tripComponent: 'In-Flight',
    },
    uploadedAt: daysAgo(45),
    createdAt: daysAgo(45),
  }),
  seedAsset({
    id: 'asset-united-polaris-seat',
    filename: 'united-polaris-business-seat-787.webp',
    description: 'United Polaris lie-flat business class seat on the Boeing 787-9 Dreamliner',
    category: 'Photo',
    cdnUrl: picsum('united-polaris-seat'),
    thumbnailUrl: picsum('united-polaris-seat', 300, 200),
    altText: 'United Polaris business class lie-flat seat with bedding on Boeing 787',
    titleAttribute: 'United Polaris Business Seat — 787-9',
    tags: ['united', 'polaris', '787', 'seat'],
    webflowSync: 'Synced',
    lastSynced: daysAgo(5),
    webflowItemId: 'wf-item-1002',
    seoScore: 100,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      airlines: ['United Airlines'],
      cabinClass: 'Business',
      experienceTypes: ['Seat'],
      aircraftTypes: ['Boeing 787-9 Dreamliner'],
      tripComponent: 'In-Flight',
    },
    uploadedAt: daysAgo(30),
    createdAt: daysAgo(30),
  }),
  seedAsset({
    id: 'asset-centurion-lounge-dfw',
    filename: 'amex-centurion-lounge-dfw-food.jpg',
    description: 'Amex Centurion Lounge DFW buffet spread and seating area',
    category: 'Photo',
    format: 'JPG',
    sizeBytes: 486_200,
    cdnUrl: picsum('centurion-lounge-dfw'),
    thumbnailUrl: picsum('centurion-lounge-dfw', 300, 200),
    altText: 'American Express Centurion Lounge at DFW with buffet and dining seating',
    titleAttribute: 'Amex Centurion Lounge DFW',
    tags: ['amex', 'centurion', 'lounge', 'dfw'],
    webflowSync: 'Pending',
    seoScore: 100,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      experienceTypes: ['Lounge Interior', 'Lounge Food'],
      lounges: ['Amex Centurion Lounge'],
      destinations: [{ city: 'Dallas', country: 'United States' }],
      tripComponent: 'Pre-Departure',
    },
    uploadedAt: daysAgo(14),
    createdAt: daysAgo(14),
  }),
  seedAsset({
    id: 'asset-csr-card-art',
    filename: 'chase-sapphire-reserve-card-art.png',
    description: 'Chase Sapphire Reserve card art on dark background',
    category: 'Card Art',
    format: 'PNG',
    width: 1024, height: 640, sizeBytes: 198_500,
    cdnUrl: picsum('csr-card-art', 1024, 640),
    thumbnailUrl: picsum('csr-card-art', 300, 188),
    altText: 'Chase Sapphire Reserve credit card face on dark background',
    titleAttribute: 'Chase Sapphire Reserve Card Art',
    tags: ['chase', 'sapphire', 'reserve', 'credit-card'],
    association: { type: 'Card', name: 'Chase Sapphire Reserve' },
    webflowSync: 'Synced',
    lastSynced: daysAgo(8),
    webflowItemId: 'wf-item-1003',
    seoScore: 100,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      creditCards: ['Chase Sapphire Reserve'],
    },
    uploadedAt: daysAgo(60),
    createdAt: daysAgo(60),
  }),
  seedAsset({
    id: 'asset-maldives-overwater',
    filename: 'maldives-overwater-villa-sunset.webp',
    description: 'Overwater villa at sunset in the Maldives with seaplane docked nearby',
    category: 'Photo',
    sizeBytes: 402_800,
    cdnUrl: picsum('maldives-overwater'),
    thumbnailUrl: picsum('maldives-overwater', 300, 200),
    altText: 'Maldives overwater villa at sunset with seaplane on turquoise lagoon',
    titleAttribute: 'Maldives Overwater Villa at Sunset',
    tags: ['maldives', 'overwater-villa', 'sunset', 'resort'],
    webflowSync: 'Not Published',
    seoScore: 100,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      experienceTypes: ['Hotel Room', 'Exterior'],
      destinations: [{ city: 'Maldives', country: 'Maldives' }],
      tripComponent: 'Hotel Stay',
    },
    uploadedAt: daysAgo(21),
    createdAt: daysAgo(21),
  }),
  seedAsset({
    id: 'asset-award-chart-infographic',
    filename: 'ana-award-chart-2026-infographic.png',
    description: 'ANA mileage award chart infographic for 2026 sweet spots',
    category: 'Infographic',
    format: 'PNG',
    width: 1024, height: 1024, sizeBytes: 528_100,
    cdnUrl: picsum('ana-award-chart', 1024, 1024),
    thumbnailUrl: picsum('ana-award-chart', 300, 300),
    altText: 'ANA award chart infographic showing zone-based redemption pricing',
    titleAttribute: 'ANA Award Chart 2026',
    tags: ['ana', 'award-chart', 'infographic', 'miles'],
    seoScore: 100,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      airlines: ['ANA'],
    },
    uploadedAt: daysAgo(12),
    createdAt: daysAgo(12),
  }),
  seedAsset({
    id: 'asset-screenshot-award-search',
    filename: 'united-award-search-results-screenshot.png',
    description: 'Screenshot of United award search results showing saver availability to Tokyo',
    category: 'Screenshot',
    format: 'PNG',
    sizeBytes: 356_700,
    cdnUrl: picsum('award-search-screenshot'),
    thumbnailUrl: picsum('award-search-screenshot', 300, 200),
    altText: '',
    titleAttribute: '',
    tags: ['screenshot', 'united', 'award-search'],
    status: 'draft',
    webflowSync: 'N/A',
    seoScore: 30,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      airlines: ['United Airlines'],
      destinations: [{ city: 'Tokyo', country: 'Japan' }],
    },
    uploadedAt: daysAgo(2),
    lastUpdated: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  }),
  seedAsset({
    id: 'asset-qantas-first-dining',
    filename: 'qantas-first-lounge-dining-sydney.webp',
    description: 'Qantas First Lounge à la carte dining room in Sydney',
    category: 'Photo',
    sizeBytes: 298_300,
    cdnUrl: picsum('qantas-first-dining'),
    thumbnailUrl: picsum('qantas-first-dining', 300, 200),
    altText: 'Qantas First Lounge Sydney dining room with table settings',
    titleAttribute: 'Qantas First Lounge Dining — Sydney',
    tags: ['qantas', 'first-class', 'lounge', 'sydney', 'dining'],
    webflowSync: 'Synced',
    lastSynced: daysAgo(1),
    webflowItemId: 'wf-item-1004',
    seoScore: 100,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      airlines: ['Qantas'],
      cabinClass: 'First',
      experienceTypes: ['Lounge Food', 'Lounge Interior'],
      lounges: ['Qantas First Lounge'],
      destinations: [{ city: 'Sydney', country: 'Australia' }],
      tripComponent: 'Pre-Departure',
    },
    uploadedAt: daysAgo(9),
    createdAt: daysAgo(9),
  }),
  seedAsset({
    id: 'asset-ai-tokyo-neon',
    filename: 'ai-generated-tokyo-neon-shibuya.webp',
    description: 'AI generated editorial image of Shibuya crossing at night with neon signs',
    category: 'Photo',
    source: 'AI Generated',
    sizeBytes: 444_000,
    cdnUrl: picsum('ai-tokyo-neon'),
    thumbnailUrl: picsum('ai-tokyo-neon', 300, 200),
    altText: 'Shibuya crossing in Tokyo at night illuminated by neon billboards',
    titleAttribute: 'Tokyo Shibuya Crossing at Night',
    tags: ['tokyo', 'japan', 'night', 'editorial', 'ai-generated'],
    seoScore: 100,
    generationMetadata: {
      qualityTier: 'standard',
      modelName: 'gemini-3-pro-image-preview',
      stylePreset: 'editorial',
      resolution: '1K',
      aspectRatio: '4:3',
      numImages: 4,
      costPerImage: 0.02,
    },
    generationCost: 0.08,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      destinations: [{ city: 'Tokyo', country: 'Japan' }],
      experienceTypes: ['Exterior'],
    },
    uploadedAt: daysAgo(6),
    createdAt: daysAgo(6),
  }),
  seedAsset({
    id: 'asset-chase-logo',
    filename: 'chase-logo-white.svg',
    description: 'Chase issuer logo (white variant for dark backgrounds)',
    category: 'Issuer Logo',
    format: 'SVG',
    width: 512, height: 512, sizeBytes: 8_400,
    cdnUrl: picsum('chase-logo', 512, 512),
    thumbnailUrl: picsum('chase-logo', 300, 300),
    darkVariantUrl: picsum('chase-logo-dark', 512, 512),
    altText: 'Chase bank logo',
    titleAttribute: 'Chase Logo',
    tags: ['chase', 'issuer', 'logo'],
    isBrandAsset: true,
    webflowSync: 'Synced',
    lastSynced: daysAgo(20),
    webflowItemId: 'wf-item-1005',
    seoScore: 100,
    taxonomy: { ...EMPTY_TAXONOMY },
    uploadedAt: daysAgo(90),
    createdAt: daysAgo(90),
  }),
  seedAsset({
    id: 'asset-singapore-airlines-logo',
    filename: 'singapore-airlines-logo.png',
    description: 'Singapore Airlines logo with silver Kris bird',
    category: 'Airline Logo',
    format: 'PNG',
    width: 800, height: 400, sizeBytes: 42_100,
    cdnUrl: picsum('sq-logo', 800, 400),
    thumbnailUrl: picsum('sq-logo', 300, 150),
    darkVariantUrl: picsum('sq-logo-dark', 800, 400),
    altText: 'Singapore Airlines logo',
    titleAttribute: 'Singapore Airlines Logo',
    tags: ['singapore-airlines', 'logo'],
    isBrandAsset: true,
    webflowSync: 'Synced',
    lastSynced: daysAgo(15),
    webflowItemId: 'wf-item-1006',
    seoScore: 100,
    taxonomy: {
      ...EMPTY_TAXONOMY,
      airlines: ['Singapore Airlines'],
    },
    uploadedAt: daysAgo(75),
    createdAt: daysAgo(75),
  }),
  seedAsset({
    id: 'asset-draft-hotel-pool',
    filename: 'park_hyatt_pool_raw.jpg',
    description: '',
    category: 'Photo',
    format: 'JPG',
    sizeBytes: 612_900,
    cdnUrl: picsum('park-hyatt-pool'),
    thumbnailUrl: picsum('park-hyatt-pool', 300, 200),
    altText: '',
    titleAttribute: '',
    tags: [],
    status: 'draft',
    seoScore: 15,
    taxonomy: { ...EMPTY_TAXONOMY },
    uploadedAt: daysAgo(1),
    lastUpdated: daysAgo(1),
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  }),
];

// ─── Subcollection Seeds ──────────────────────────────────────────────────────

/** production: assets/{assetId}/usage subcollection (Admin SDK write-only) */
const usageStore = new Map<string, Array<UsageEntry & { id: string }>>([
  ['asset-emirates-a380-bar', [
    {
      id: 'usage-1',
      articleId: 'article-emirates-a380-review',
      articleTitle: 'Emirates A380 Business Class Review: Worth the Hype?',
      context: 'featured',
      status: 'Published',
      addedBy: 'mock-admin',
      addedAt: daysAgo(40),
    },
    {
      id: 'usage-2',
      articleId: 'article-best-onboard-bars',
      articleTitle: 'The 5 Best Onboard Bars in the Sky',
      context: 'inline',
      status: 'Published',
      addedBy: 'mock-admin',
      addedAt: daysAgo(25),
    },
  ]],
  ['asset-united-polaris-seat', [
    {
      id: 'usage-3',
      articleId: 'article-polaris-review',
      articleTitle: 'United Polaris 787-9 Review: SFO to Tokyo',
      context: 'featured',
      status: 'Draft',
      addedBy: 'mock-editor',
      addedAt: daysAgo(7),
    },
  ]],
  ['asset-csr-card-art', [
    {
      id: 'usage-4',
      articleId: 'article-csr-review-2026',
      articleTitle: 'Chase Sapphire Reserve Review 2026',
      context: 'card-art',
      status: 'In Review',
      addedBy: 'mock-admin',
      addedAt: daysAgo(55),
    },
  ]],
]);

/** production: assets/{assetId}/upload_history subcollection (Admin SDK write-only) */
const uploadHistoryStore = new Map<string, UploadHistoryEntry[]>(
  assetStore.map((a) => [
    a.id,
    [
      {
        uploadedBy: a.uploadedBy,
        uploadedAt: a.uploadedAt,
        filename: a.filename,
        sizeBytes: a.sizeBytes,
        format: a.format,
        cdnUrl: a.cdnUrl,
        status: 'completed',
        errorMessage: null,
      },
    ],
  ])
);

// ─── Picker Articles (production: `articles` collection, read by ArticlePicker) ─

export interface PickerArticle {
  id: string;
  title: string;
  status: string;
  keyword: string;
  assignee: string;
  pipeline: 'new' | 'refresh';
}

const pickerArticles: PickerArticle[] = [
  { id: 'article-polaris-review', title: 'United Polaris 787-9 Review: SFO to Tokyo', status: 'Draft', keyword: 'united polaris review', assignee: 'Daynis', pipeline: 'new' },
  { id: 'article-best-onboard-bars', title: 'The 5 Best Onboard Bars in the Sky', status: 'Published', keyword: 'best onboard bars', assignee: 'Sarah', pipeline: 'new' },
  { id: 'article-csr-review-2026', title: 'Chase Sapphire Reserve Review 2026', status: 'In Review', keyword: 'chase sapphire reserve review', assignee: 'Mike', pipeline: 'new' },
  { id: 'article-maldives-guide', title: 'Maldives on Points: The Complete Guide', status: 'Draft', keyword: 'maldives on points', assignee: 'Daynis', pipeline: 'new' },
  { id: 'article-emirates-a380-review', title: 'Emirates A380 Business Class Review: Worth the Hype?', status: 'Published', keyword: 'emirates a380 business review', assignee: 'Sarah', pipeline: 'new' },
  { id: 'article-ana-sweet-spots', title: 'ANA Award Chart Sweet Spots for 2026', status: 'Draft', keyword: 'ana sweet spots', assignee: 'Mike', pipeline: 'refresh' },
  { id: 'article-centurion-vs-sapphire', title: 'Centurion Lounge vs Sapphire Lounge: Which Wins?', status: 'Published', keyword: 'centurion vs sapphire lounge', assignee: 'Daynis', pipeline: 'refresh' },
  { id: 'article-qantas-first-sydney', title: 'Qantas First Lounge Sydney: Still the Best?', status: 'In Review', keyword: 'qantas first lounge sydney', assignee: 'Sarah', pipeline: 'refresh' },
];

/** production: getDocs(query(collection(db, 'articles'), orderBy('updatedAt', 'desc'), limit(50))) in ArticlePicker */
export async function listPickerArticles(): Promise<PickerArticle[]> {
  await delay(200);
  return [...pickerArticles];
}

/** production: getDocs(collection(db, 'assets', assetId, 'usage')) in UsageTracker */
export async function listAssetUsage(
  assetId: string
): Promise<Array<UsageEntry & { id: string }>> {
  await delay(150);
  return [...(usageStore.get(assetId) ?? [])];
}

/** production: getDocs(collection(db, 'assets', assetId, 'upload_history')) */
export async function listUploadHistory(assetId: string): Promise<UploadHistoryEntry[]> {
  await delay(150);
  return [...(uploadHistoryStore.get(assetId) ?? [])];
}

// ─── Live Subscription Plumbing ───────────────────────────────────────────────

const assetsListeners = new Set<() => void>();

function notifyAssetsChanged(): void {
  assetsListeners.forEach((cb) => cb());
}

function matchesFilters(asset: AssetDocument, filters: AssetFilters): boolean {
  if (filters.status && asset.status !== filters.status) return false;
  if (filters.category && asset.category !== filters.category) return false;
  if (filters.source && asset.source !== filters.source) return false;
  if (filters.format && asset.format !== filters.format) return false;
  if (filters.webflowSync && asset.webflowSync !== filters.webflowSync) return false;
  if (filters.isBrandAsset !== undefined && asset.isBrandAsset !== filters.isBrandAsset) return false;
  if (filters.minSeoScore !== undefined && asset.seoScore < filters.minSeoScore) return false;
  if (filters.tags && filters.tags.length > 0 && !asset.tags.includes(filters.tags[0])) return false;
  return true;
}

function sortForQuery(assets: AssetDocument[], filters: AssetFilters): AssetDocument[] {
  const field = filters.sortBy || 'uploadedAt';
  const dir = filters.sortOrder || 'desc';
  const sorted = [...assets];
  sorted.sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[field];
    const bv = (b as unknown as Record<string, unknown>)[field];
    let cmp = 0;
    if (av instanceof Timestamp && bv instanceof Timestamp) {
      cmp = av.toMillis() - bv.toMillis();
    } else if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv;
    } else {
      cmp = String(av ?? '').localeCompare(String(bv ?? ''));
    }
    return dir === 'desc' ? -cmp : cmp;
  });
  if (filters.limit) return sorted.slice(0, filters.limit);
  return sorted;
}

/**
 * Subscribe to assets collection with filters.
 * production: onSnapshot(query(collection(db, 'assets'), ...constraints))
 */
export function subscribeToAssets(
  filters: AssetFilters,
  onData: (assets: AssetDocument[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const emit = () => {
    try {
      const matched = assetStore.filter((a) => matchesFilters(a, filters));
      onData(sortForQuery(matched, filters));
    } catch (err) {
      onError(err as Error);
    }
  };

  const timer = setTimeout(emit, 200);

  const listener = () => emit();
  assetsListeners.add(listener);

  return () => {
    clearTimeout(timer);
    assetsListeners.delete(listener);
  };
}

/**
 * Subscribe to single asset by ID.
 * production: onSnapshot(doc(db, 'assets', assetId))
 */
export function subscribeToAsset(
  assetId: string,
  onData: (asset: AssetDocument | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const emit = () => {
    try {
      onData(assetStore.find((a) => a.id === assetId) ?? null);
    } catch (err) {
      onError(err as Error);
    }
  };

  const timer = setTimeout(emit, 150);
  const listener = () => emit();
  assetsListeners.add(listener);

  return () => {
    clearTimeout(timer);
    assetsListeners.delete(listener);
  };
}

/** production: getDoc(doc(db, 'assets', assetId)) */
export async function getAsset(assetId: string): Promise<AssetDocument | null> {
  await delay(120);
  return assetStore.find((a) => a.id === assetId) ?? null;
}

/**
 * Search assets by filename or description (client-side filtering).
 * production: getDocs(query(collection(db, 'assets'), orderBy('uploadedAt', 'desc')))
 * then substring match over filename/description/altText/tags (CMS-106/CMS-108).
 */
export async function searchAssets(searchTerm: string): Promise<AssetDocument[]> {
  await delay(150);
  const searchLower = searchTerm.toLowerCase();
  const sorted = [...assetStore].sort(
    (a, b) => (b.uploadedAt?.toMillis?.() ?? 0) - (a.uploadedAt?.toMillis?.() ?? 0)
  );
  return sorted.filter(
    (asset) =>
      asset.filename.toLowerCase().includes(searchLower) ||
      asset.description.toLowerCase().includes(searchLower) ||
      asset.altText.toLowerCase().includes(searchLower) ||
      asset.tags.some((tag) => tag.toLowerCase().includes(searchLower))
  );
}

/** One-time read of every non-draft asset (picker galleries, CMS-108). */
export async function listAllAssets(): Promise<AssetDocument[]> {
  return searchAssets('');
}

// ─── Callable Mocks ───────────────────────────────────────────────────────────

function touch(asset: AssetDocument): void {
  asset.lastUpdated = Timestamp.now();
  asset.updatedAt = Timestamp.now();
}

/** production: httpsCallable(functions, 'uploadAsset') */
export async function uploadAsset(input: UploadAssetInput): Promise<UploadAssetResult> {
  await delay(300);
  const assetId = mockId('asset');
  const slug = input.filename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'upload';
  const format = (input.format as AssetDocument['format']) || (input.contentType.includes('svg') ? 'SVG' : input.contentType.includes('png') ? 'PNG' : input.contentType.includes('webp') ? 'WebP' : 'JPG');
  const asset = seedAsset({
    id: assetId,
    filename: input.filename,
    description: input.description ?? '',
    category: input.category,
    source: input.source,
    format,
    sizeBytes: input.sizeBytes,
    cdnUrl: picsum(slug),
    thumbnailUrl: picsum(slug, 300, 200),
    status: 'draft',
    seoScore: 0,
    uploadedAt: Timestamp.now(),
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  assetStore.unshift(asset);
  uploadHistoryStore.set(assetId, [
    {
      uploadedBy: 'mock-admin',
      uploadedAt: Timestamp.now(),
      filename: input.filename,
      sizeBytes: input.sizeBytes,
      format,
      cdnUrl: asset.cdnUrl,
      status: 'pending',
      errorMessage: null,
    },
  ]);
  notifyAssetsChanged();
  return { assetId };
}

/** production: httpsCallable(functions, 'completeUpload') */
export async function completeUpload(input: CompleteUploadInput): Promise<void> {
  await delay(200);
  const asset = assetStore.find((a) => a.id === input.assetId);
  if (asset) {
    const history = uploadHistoryStore.get(input.assetId) ?? [];
    history.forEach((h) => { h.status = 'completed'; });
    uploadHistoryStore.set(input.assetId, history);
    touch(asset);
    notifyAssetsChanged();
  }
}

/** production: httpsCallable(functions, 'startAIIntake') — smart-tag mode (bare { assetId }) */
export async function startAIIntake(input: StartAIIntakeInput): Promise<AISuggestions | null> {
  await delay(1500);
  const asset = assetStore.find((a) => a.id === input.assetId);
  if (!asset) return null;

  const baseName = asset.filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  const suggestions: AISuggestions = {
    description: `${baseName.charAt(0).toUpperCase() + baseName.slice(1)} — travel photography from the ETH library`,
    altText: `${baseName} — ${asset.category.toLowerCase()} for Elite Travel Hackers`.slice(0, 120),
    titleAttribute: `${baseName.charAt(0).toUpperCase() + baseName.slice(1)} — ${asset.category}`.slice(0, 90),
    seoFilename: baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50),
    tags: baseName.split(' ').filter((w) => w.length > 3).slice(0, 6),
    taxonomy: {
      airlines: asset.taxonomy.airlines,
      hotels: asset.taxonomy.hotels,
      destinations: asset.taxonomy.destinations,
    },
  };
  asset.aiSuggestions = suggestions;
  touch(asset);
  notifyAssetsChanged();
  return suggestions;
}

/** production: httpsCallable(functions, 'completeAIIntake') */
export async function completeAIIntake(input: CompleteAIIntakeInput): Promise<void> {
  await delay(250);
  const asset = assetStore.find((a) => a.id === input.assetId);
  if (!asset) return;
  asset.description = input.approvedData.description;
  asset.altText = input.approvedData.altText;
  asset.titleAttribute = input.approvedData.titleAttribute;
  asset.filename = input.approvedData.filename;
  asset.tags = input.approvedData.tags;
  asset.taxonomy = { ...asset.taxonomy, ...input.approvedData.taxonomy };
  asset.status = 'active';
  asset.aiSuggestions = null;
  asset.seoScore = 100;
  touch(asset);
  notifyAssetsChanged();
}

/** production: httpsCallable(functions, 'updateAsset') */
export async function updateAsset(input: UpdateAssetInput): Promise<void> {
  await delay(200);
  const asset = assetStore.find((a) => a.id === input.assetId);
  if (!asset) return;
  Object.assign(asset, input.fields);
  if (input.fields.description && asset.status === 'draft') {
    asset.status = 'active';
  }
  touch(asset);
  notifyAssetsChanged();
}

/** production: httpsCallable(functions, 'deleteAsset') */
export async function deleteAsset(input: DeleteAssetInput): Promise<DeleteAssetResult> {
  await delay(300);
  const usage = usageStore.get(input.assetId) ?? [];
  const result: DeleteAssetResult = {
    usageCount: usage.length,
    usageWarnings: usage.map((u) => ({ articleId: u.articleId, articleTitle: u.articleTitle })),
  };
  const idx = assetStore.findIndex((a) => a.id === input.assetId);
  if (idx >= 0) {
    assetStore.splice(idx, 1);
    usageStore.delete(input.assetId);
    uploadHistoryStore.delete(input.assetId);
    notifyAssetsChanged();
  }
  return result;
}

/** production: httpsCallable(functions, 'addAssetToArticle') */
export async function addAssetToArticle(input: AddAssetToArticleInput): Promise<void> {
  await delay(200);
  const article = pickerArticles.find((a) => a.id === input.articleId);
  const entries = usageStore.get(input.assetId) ?? [];
  if (!entries.some((e) => e.articleId === input.articleId)) {
    entries.push({
      id: mockId('usage'),
      articleId: input.articleId,
      articleTitle: article?.title ?? 'Untitled',
      context: input.context,
      status: (article?.status as UsageEntry['status']) ?? 'Draft',
      addedBy: 'mock-admin',
      addedAt: Timestamp.now(),
    });
    usageStore.set(input.assetId, entries);
  }
}

/** production: httpsCallable(functions, 'removeAssetFromArticle') */
export async function removeAssetFromArticle(input: RemoveAssetFromArticleInput): Promise<void> {
  await delay(200);
  const entries = usageStore.get(input.assetId) ?? [];
  usageStore.set(
    input.assetId,
    entries.filter((e) => e.articleId !== input.articleId)
  );
}

/** production: httpsCallable(functions, 'syncAssetToWebflow') */
export async function syncToWebflow(input: SyncToWebflowInput): Promise<SyncToWebflowResult> {
  await delay(1200);
  const asset = assetStore.find((a) => a.id === input.assetId);
  if (!asset) throw new Error('Asset not found');
  asset.webflowSync = 'Synced';
  asset.lastSynced = Timestamp.now();
  asset.webflowItemId = asset.webflowItemId ?? mockId('wf-item');
  touch(asset);
  notifyAssetsChanged();
  return { webflowItemId: asset.webflowItemId, success: true, message: 'Synced to Webflow' };
}

/** production: httpsCallable(functions, 'bulkSyncAssetsToWebflow') */
export async function bulkSyncToWebflow(
  input: BulkSyncToWebflowInput
): Promise<BulkSyncToWebflowResult> {
  await delay(2000);
  const synced: string[] = [];
  const failed: Array<{ assetId: string; error: string }> = [];
  for (const assetId of input.assetIds) {
    const asset = assetStore.find((a) => a.id === assetId);
    if (!asset) {
      failed.push({ assetId, error: 'Asset not found' });
      continue;
    }
    if (asset.status !== 'active') {
      failed.push({ assetId, error: 'Asset must be active to sync' });
      continue;
    }
    asset.webflowSync = 'Synced';
    asset.lastSynced = Timestamp.now();
    asset.webflowItemId = asset.webflowItemId ?? mockId('wf-item');
    touch(asset);
    synced.push(assetId);
  }
  notifyAssetsChanged();
  return { synced, failed, successCount: synced.length, failureCount: failed.length };
}

function slugifyPrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'ai-image';
}

const TIER_COST: Record<string, number> = { fast: 0.05, standard: 0.02, pro: 0.13 };
const RES_MULT: Record<string, number> = { '1K': 1.0, '2K': 1.5, '4K': 3.0 };

/** production: httpsCallable(functions, 'generateAIImage') */
export async function generateAIImage(
  input: GenerateAIImageInput
): Promise<GenerateAIImageResult> {
  // Simulates the DALL-E/Gemini round-trip latency
  await delay(2000);
  const tier = input.resolution === '4K' ? 'pro' : input.qualityTier ?? 'fast';
  const costPerImage = (TIER_COST[tier] ?? 0.05) * (RES_MULT[input.resolution ?? '1K'] ?? 1);
  const numImages = input.numImages ?? 4;
  const slug = slugifyPrompt(input.prompt);

  const created: Array<{ assetId: string; cdnUrl: string }> = [];
  for (let i = 0; i < numImages; i++) {
    const assetId = mockId('asset-ai');
    const seed = numImages > 1 ? `${slug}-${i + 1}` : slug;
    const cdnUrl = picsum(seed);
    assetStore.unshift(
      seedAsset({
        id: assetId,
        filename: `ai-${seed}.webp`,
        description: input.prompt,
        category: input.category ?? 'Photo',
        source: 'AI Generated',
        cdnUrl,
        thumbnailUrl: picsum(seed, 300, 200),
        altText: input.prompt.slice(0, 120),
        titleAttribute: input.prompt.slice(0, 90),
        tags: input.tags ?? [],
        status: 'draft',
        seoScore: 70,
        generationMetadata: {
          qualityTier: tier as NonNullable<GenerateAIImageInput['qualityTier']>,
          modelName: 'gemini-3-pro-image-preview',
          stylePreset: input.stylePreset ?? 'none',
          resolution: input.resolution ?? '1K',
          aspectRatio: input.aspectRatio ?? '4:3',
          numImages,
          costPerImage,
        },
        generationCost: costPerImage,
        uploadedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
    created.push({ assetId, cdnUrl });
  }
  notifyAssetsChanged();
  const [first, ...rest] = created;
  return {
    assetId: first.assetId,
    cdnUrl: first.cdnUrl,
    message: `Generated ${numImages} image${numImages > 1 ? 's' : ''} — saved as draft`,
    generationCost: costPerImage * numImages,
    additionalAssets: rest,
  };
}

/** production: httpsCallable(functions, 'editAIImage', { timeout: 540000 }) */
export async function editAIImage(input: EditAIImageInput): Promise<EditAIImageResult> {
  await delay(2200);
  const original = assetStore.find((a) => a.id === input.assetId);
  const slug = slugifyPrompt(input.prompt);
  const count = Math.max(1, Math.min(4, input.instanceCount ?? 1));

  const created: Array<{ assetId: string; cdnUrl: string }> = [];
  for (let i = 0; i < count; i++) {
    const assetId = mockId('asset-edit');
    const seed = count > 1 ? `${slug}-edit-${i + 1}` : `${slug}-edit`;
    const width = input.width ?? original?.width ?? 1024;
    const height = input.height ?? original?.height ?? 1024;
    const cdnUrl = picsum(seed, width, height);
    assetStore.unshift(
      seedAsset({
        id: assetId,
        filename: `ai-edit-${seed}.webp`,
        description: original?.description ?? input.prompt,
        category: original?.category ?? 'Photo',
        source: 'AI Generated',
        width,
        height,
        cdnUrl,
        thumbnailUrl: picsum(seed, 300, 200),
        altText: original?.altText ?? input.prompt.slice(0, 120),
        titleAttribute: original?.titleAttribute ?? '',
        tags: original?.tags ?? [],
        status: 'draft',
        seoScore: original?.seoScore ?? 70,
        provenance: {
          ...(original?.provenance ?? {}),
          editedWithPrompt: input.prompt,
        },
        uploadedAt: Timestamp.now(),
        lastUpdated: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    );
    created.push({ assetId, cdnUrl });
  }
  notifyAssetsChanged();
  const [first, ...rest] = created;
  return {
    assetId: first.assetId,
    cdnUrl: first.cdnUrl,
    message: 'Edit applied — saved as a new draft asset',
    additionalAssets: rest,
  };
}

/** production: httpsCallable(functions, 'uploadAssetFromURL') */
export async function uploadAssetFromURL(input: UploadFromURLInput): Promise<UploadFromURLResult> {
  await delay(1200);
  const assetId = mockId('asset');
  const slug = input.url.split('/').pop()?.split('?')[0]?.replace(/\.[^.]+$/, '') || slugifyPrompt(input.url).slice(0, 40);
  const cdnUrl = picsum(slug);
  assetStore.unshift(
    seedAsset({
      id: assetId,
      filename: `${slug}.webp`,
      description: input.description ?? '',
      category: input.category,
      source: 'Upload',
      cdnUrl,
      thumbnailUrl: picsum(slug, 300, 200),
      tags: input.tags ?? [],
      status: 'active',
      provenance: {
        sourceUrl: input.sourceUrl,
        originalImageUrl: input.url,
      },
      uploadedAt: Timestamp.now(),
      lastUpdated: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
  );
  notifyAssetsChanged();
  return { assetId, cdnUrl, message: 'Imported from URL' };
}

/** production: httpsCallable(functions, 'bulkAddTags') */
export async function bulkAddTags(input: BulkAddTagsInput): Promise<BulkAddTagsResult> {
  await delay(400);
  let updated = 0;
  let failed = 0;
  for (const assetId of input.assetIds) {
    const asset = assetStore.find((a) => a.id === assetId);
    if (!asset) { failed++; continue; }
    const merged = new Set([...asset.tags, ...input.tags]);
    asset.tags = [...merged];
    touch(asset);
    updated++;
  }
  notifyAssetsChanged();
  return { updated, failed };
}

/**
 * production: httpsCallable(functions, 'batchApplyAssetMetadata')
 * CMS-158: same description/tags applied to every selected asset; blank
 * description omitted; tagMode replace (default) or append (deduped merge);
 * draft assets receiving a description are promoted to active.
 */
export async function batchApplyAssetMetadata(
  input: BatchApplyAssetMetadataInput
): Promise<BatchApplyAssetMetadataResult> {
  await delay(500);
  const failures: Array<{ assetId: string; error: string }> = [];
  let successCount = 0;

  const normalizedTags = input.fields.tags
    ? [...new Set(input.fields.tags.map((t) => t.trim()).filter(Boolean))]
    : undefined;
  const tagMode = input.fields.tagMode ?? 'replace';

  for (const assetId of input.assetIds) {
    const asset = assetStore.find((a) => a.id === assetId);
    if (!asset) {
      failures.push({ assetId, error: 'Asset not found' });
      continue;
    }
    if (input.fields.description?.trim()) {
      asset.description = input.fields.description.trim();
      if (asset.status === 'draft') asset.status = 'active';
    }
    if (normalizedTags && normalizedTags.length > 0) {
      asset.tags =
        tagMode === 'append'
          ? [...new Set([...asset.tags, ...normalizedTags])]
          : normalizedTags;
    }
    touch(asset);
    successCount++;
  }
  notifyAssetsChanged();
  return {
    totalProcessed: input.assetIds.length,
    successCount,
    failureCount: failures.length,
    failures,
  };
}

/** production: httpsCallable(functions, 'generateExportZIP') */
export async function generateExportZIP(
  input: GenerateExportZIPInput
): Promise<GenerateExportZIPResult> {
  await delay(1500);
  void input;
  return { downloadUrl: 'https://picsum.photos/seed/export-zip/1/1?download=assets-export.zip' };
}

/** production: httpsCallable(functions, 'checkDuplicate') */
export async function checkDuplicate(input: CheckDuplicateInput): Promise<CheckDuplicateResult> {
  await delay(250);
  void input;
  return { isDuplicate: false, existingAsset: null };
}

/**
 * Fetch an image from a URL and return it as a base64 data URI string.
 * (Unchanged from production — pure browser fetch, no Firebase involved.)
 */
export async function fetchImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || 'image/png';

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        if (!reader.result.startsWith(`data:${mimeType}`)) {
          const base64 = reader.result.split(',')[1];
          resolve(`data:${mimeType};base64,${base64}`);
        } else {
          resolve(reader.result);
        }
      } else {
        reject(new Error('Failed to convert image to data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image data'));
    reader.readAsDataURL(blob);
  });
}

// ─── AI Intake Metadata Mode (production callable 'startAIIntake', mode: 'metadata') ──

export interface IntakeMetadataInput {
  mode: string;
  description: string;
  category: string;
  filename: string;
}

export interface IntakeMetadataResult {
  seoFilename: string;
  altText: string;
  titleAttribute: string;
}

/**
 * production: httpsCallable(functions, 'startAIIntake') with
 * { mode: 'metadata', description, category, filename } — called directly
 * from AIIntakeFlow to draft SEO filename/alt/title from a description.
 */
export async function startAIIntakeMetadata(
  input: IntakeMetadataInput
): Promise<IntakeMetadataResult> {
  await delay(900);
  const slug = input.description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return {
    seoFilename: slug || 'untitled',
    altText: input.description.slice(0, 120),
    titleAttribute: `${input.description.slice(0, 60)} — ${input.category}`,
  };
}

// ─── Internal helpers for sibling mock services (not part of the public API) ──

/** Mock-only: lets googleDriveService register imported Drive files as assets. */
export function __insertAsset(asset: AssetDocument): void {
  assetStore.unshift(asset);
  notifyAssetsChanged();
}

/** Mock-only: timestamp helper re-exported for sibling seed builders. */
export { Timestamp as __Timestamp };
