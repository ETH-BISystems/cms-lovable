// MOCK-ONLY DATA STORE — transfer-partner matrix (ported from production).
//
// Simulates the production collections/docs this module reads/writes:
//   - `transfer_partner_matrix`
//   - `point_sales`
//   - `settings/tpMatrixScrape` ("last scraped" status line)
//
// Same pub/sub pattern as mockCardStore. Production callable names are kept
// in comments at each seam. Delete when the real backend lands.

import { Timestamp } from '@/services/timestamp';
import { mockId } from '@/services/_delay';
import type {
  TransferPartnerDocument,
  PointSaleDocument,
  ProgramEntry,
  CardProgram,
} from '../types';

// ─── Pub/sub ─────────────────────────────────────────────────────────────────

type StoreListener = () => void;
const listeners = new Set<StoreListener>();

export function onTransferPartnerStoreChange(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange(): void {
  listeners.forEach((l) => l());
}

const daysAgo = (n: number) => Timestamp.fromMillis(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => Timestamp.fromMillis(Date.now() + n * 86_400_000);

// ─── Seed helpers ────────────────────────────────────────────────────────────

type ProgramMap = Partial<Record<CardProgram, ProgramEntry>>;

/** Shorthand for a plain 1:1 instant cell. */
function p11(overrides: Partial<ProgramEntry> = {}): ProgramEntry {
  return {
    ratio: '1:1',
    speed: 'instant',
    bonusPercent: null,
    bonusEndDate: null,
    active: true,
    lastVerified: daysAgo(14),
    ...overrides,
  };
}

function basePartner(
  partial: Partial<TransferPartnerDocument> &
    Pick<TransferPartnerDocument, 'id' | 'name' | 'type' | 'alliance' | 'loyaltyProgram'>
): TransferPartnerDocument {
  return {
    awardReleaseDays: null,
    awardReleasePattern: null,
    programs: {},
    sweetSpots: [],
    awardNotes: '',
    isAvios: false,
    isMarriott: false,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(10),
    ...partial,
  };
}

// ─── Seed: partners ──────────────────────────────────────────────────────────

const partners: TransferPartnerDocument[] = [
  basePartner({
    id: 'tp-united',
    name: 'United Airlines',
    type: 'airline',
    alliance: 'Star Alliance',
    loyaltyProgram: 'MileagePlus',
    iataCode: 'UA',
    brandColor: '#002244',
    awardReleaseDays: 337,
    awardReleasePattern: 'Rolling',
    awardReleaseVerifiedAt: daysAgo(14),
    availabilityCheckedBy: 'Daynis',
    tpgValuationCents: 1.21,
    tpgValuationText: '1.21¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'chase-ur': p11(),
      bilt: p11({ lastVerified: daysAgo(30) }),
    },
    sweetSpots: [
      { route: 'SYD → SFO (Polaris business)', points: 100000, cabin: 'Business', notes: 'Excursionist perk can add a free one-way' },
    ],
  }),
  basePartner({
    id: 'tp-aeroplan',
    name: 'Air Canada',
    type: 'airline',
    alliance: 'Star Alliance',
    loyaltyProgram: 'Aeroplan',
    iataCode: 'AC',
    brandColor: '#D82F2E',
    awardReleaseDays: 355,
    awardReleasePattern: 'Rolling',
    tpgValuationCents: 1.42,
    tpgValuationText: '1.42¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'chase-ur': p11(),
      'amex-mr': p11(),
      'capital-one': p11(),
      bilt: p11(),
    },
    sweetSpots: [
      { route: 'MEL → YVR (business)', points: 87500, cabin: 'Business', notes: 'No fuel surcharges' },
    ],
  }),
  basePartner({
    id: 'tp-ana',
    name: 'All Nippon Airways',
    type: 'airline',
    alliance: 'Star Alliance',
    loyaltyProgram: 'ANA Mileage Club',
    iataCode: 'NH',
    brandColor: '#1B4C8C',
    awardReleaseDays: 355,
    awardReleasePattern: 'Rolling',
    tpgValuationCents: 1.5,
    tpgValuationText: '1.5¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    alsoBookable: 'United, Aeroplan, Virgin Atlantic',
    programs: {
      'amex-mr': p11({ speed: '3-5-days' }),
    },
    sweetSpots: [
      { route: 'US West Coast → Tokyo (round trip, business)', points: 105000, cabin: 'Business', notes: 'Round-trip bookings only' },
    ],
    awardNotes: 'Round-trip awards only; low rates but heavy fuel surcharges on some partners.',
  }),
  basePartner({
    id: 'tp-singapore',
    name: 'Singapore Airlines',
    type: 'airline',
    alliance: 'Star Alliance',
    loyaltyProgram: 'KrisFlyer',
    iataCode: 'SQ',
    brandColor: '#1D3660',
    awardReleaseDays: 355,
    awardReleasePattern: 'Rolling',
    tpgValuationCents: 1.34,
    tpgValuationText: '1.34¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'chase-ur': p11({ speed: '1-2-days' }),
      'amex-mr': p11({ speed: '1-2-days' }),
      'capital-one': p11({ speed: '1-2-days' }),
      'citi-ty': p11({ speed: '1-2-days' }),
    },
    sweetSpots: [
      { route: 'SIN → SYD (Suites, saver)', points: 97000, cabin: 'First/Suites', notes: 'Only bookable with KrisFlyer miles' },
    ],
  }),
  basePartner({
    id: 'tp-ba',
    name: 'British Airways',
    type: 'airline',
    alliance: 'Oneworld',
    loyaltyProgram: 'Executive Club (Avios)',
    iataCode: 'BA',
    brandColor: '#2E5C99',
    isAvios: true,
    awardReleaseDays: 355,
    awardReleasePattern: 'Rolling',
    tpgValuationCents: 1.25,
    tpgValuationText: '1.25¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    alsoBookable: 'Qatar Privilege Club, Iberia Plus, Finnair Plus (Avios move 1:1)',
    programs: {
      'chase-ur': p11(),
      'amex-mr': p11(),
      'capital-one': p11(),
      bilt: p11(),
      'wells-fargo': p11(),
    },
    sweetSpots: [
      { route: 'SYD → BNE (Qantas domestic)', points: 11000, cabin: 'Business', notes: 'Distance-based pricing sweet spot' },
    ],
  }),
  basePartner({
    id: 'tp-qantas',
    name: 'Qantas',
    type: 'airline',
    alliance: 'Oneworld',
    loyaltyProgram: 'Qantas Frequent Flyer',
    iataCode: 'QF',
    brandColor: '#E40000',
    awardReleaseDays: 353,
    awardReleasePattern: 'Rolling',
    awardReleaseVerifiedAt: daysAgo(7),
    availabilityCheckedBy: 'Rasa',
    tpgValuationCents: 1.18,
    tpgValuationText: '1.18¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'amex-mr': p11({ speed: '1-2-days' }),
      'capital-one': p11({ speed: '1-2-days' }),
      'citi-ty': p11({ speed: '1-2-days' }),
    },
    sweetSpots: [
      { route: 'SYD → SIN (business)', points: 68400, cabin: 'Business', notes: 'Classic Reward, carrier charges apply' },
    ],
  }),
  basePartner({
    id: 'tp-cathay',
    name: 'Cathay Pacific',
    type: 'airline',
    alliance: 'Oneworld',
    loyaltyProgram: 'Asia Miles',
    iataCode: 'CX',
    brandColor: '#005D63',
    awardReleaseDays: 360,
    awardReleasePattern: 'Rolling',
    tpgValuationCents: 1.27,
    tpgValuationText: '1.27¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'amex-mr': p11({ speed: '1-2-days' }),
      'capital-one': p11({ speed: '1-2-days' }),
      'citi-ty': p11({ speed: '1-2-days' }),
      bilt: p11({ speed: '1-2-days' }),
    },
  }),
  basePartner({
    id: 'tp-flyingblue',
    name: 'Air France-KLM',
    type: 'airline',
    alliance: 'SkyTeam',
    loyaltyProgram: 'Flying Blue',
    iataCode: 'AF',
    brandColor: '#051039',
    awardReleaseDays: 359,
    awardReleasePattern: 'Rolling',
    tpgValuationCents: 1.31,
    tpgValuationText: '1.31¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'chase-ur': p11({ bonusPercent: 25, bonusEndDate: daysAhead(20) }),
      'amex-mr': p11(),
      'capital-one': p11(),
      bilt: p11(),
      'citi-ty': p11(),
      'wells-fargo': p11(),
    },
    sweetSpots: [
      { route: 'US East Coast → Paris (Promo Rewards)', points: 37500, cabin: 'Business', notes: 'Monthly Promo Rewards rotation' },
    ],
    awardNotes: 'Monthly Promo Rewards can halve select routes.',
  }),
  basePartner({
    id: 'tp-delta',
    name: 'Delta Air Lines',
    type: 'airline',
    alliance: 'SkyTeam',
    loyaltyProgram: 'SkyMiles',
    iataCode: 'DL',
    brandColor: '#003366',
    awardReleaseDays: 331,
    awardReleasePattern: 'Rolling',
    tpgValuationCents: 1.12,
    tpgValuationText: '1.12¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'amex-mr': p11(),
    },
    awardNotes: 'Dynamic pricing — flash sales are the only real value.',
  }),
  basePartner({
    id: 'tp-emirates',
    name: 'Emirates',
    type: 'airline',
    alliance: 'Non-Alliance',
    loyaltyProgram: 'Skywards',
    iataCode: 'EK',
    brandColor: '#D71920',
    awardReleaseDays: 340,
    awardReleasePattern: 'Rolling',
    tpgValuationCents: 1.0,
    tpgValuationText: '1.0¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'chase-ur': p11(),
      'amex-mr': p11(),
      'capital-one': p11(),
      bilt: p11(),
      'citi-ty': p11(),
    },
    sweetSpots: [
      { route: 'SYD → CHC (fifth freedom, business)', points: 62500, cabin: 'Business', notes: 'A380 with bar' },
    ],
  }),
  basePartner({
    id: 'tp-virgin-atlantic',
    name: 'Virgin Atlantic',
    type: 'airline',
    // Scraper-created partner — lands in Ungrouped until an editor assigns one.
    alliance: '',
    loyaltyProgram: 'Flying Club',
    iataCode: 'VS',
    brandColor: '#E10A0A',
    awardReleaseDays: 331,
    awardReleasePattern: 'Rolling',
    lastScrapedAt: daysAgo(1),
    programs: {
      'chase-ur': p11(),
      'amex-mr': p11(),
      'capital-one': p11(),
      bilt: p11(),
      'citi-ty': p11(),
    },
    awardNotes: 'New on the matrix — alliance grouping pending editorial review.',
  }),
  basePartner({
    id: 'tp-hyatt',
    name: 'World of Hyatt',
    type: 'hotel',
    alliance: 'Hotels',
    loyaltyProgram: 'World of Hyatt',
    hotelBrand: 'Hyatt',
    awardReleaseDays: null,
    awardReleasePattern: 'Award chart (Cat 1–8)',
    tpgValuationCents: 1.7,
    tpgValuationText: '1.7¢',
    tpgValuationAsOf: 'October 2026',
    tpgValuationOverride: true,
    lastScrapedAt: daysAgo(3),
    programs: {
      'chase-ur': p11(),
      bilt: p11(),
    },
    sweetSpots: [
      { route: 'Park Hyatt Sydney (off-peak night)', points: 35000, cabin: 'Standard room', notes: 'Cash rates often exceed $1,400' },
    ],
  }),
  basePartner({
    id: 'tp-marriott',
    name: 'Marriott Bonvoy',
    type: 'hotel',
    alliance: 'Hotels',
    loyaltyProgram: 'Marriott Bonvoy',
    hotelBrand: 'Marriott',
    isMarriott: true,
    awardReleaseDays: null,
    awardReleasePattern: 'Dynamic',
    tpgValuationCents: 0.84,
    tpgValuationText: '0.84¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'chase-ur': p11({ speed: '1-2-days' }),
      'amex-mr': p11({ speed: '1-2-days' }),
    },
    awardNotes: '5th night free on award stays of 4+ nights.',
  }),
  basePartner({
    id: 'tp-hilton',
    name: 'Hilton Honors',
    type: 'hotel',
    alliance: 'Hotels',
    loyaltyProgram: 'Hilton Honors',
    hotelBrand: 'Hilton',
    awardReleaseDays: null,
    awardReleasePattern: 'Dynamic',
    tpgValuationCents: 0.5,
    tpgValuationText: '0.5¢',
    tpgValuationAsOf: 'October 2026',
    lastScrapedAt: daysAgo(3),
    programs: {
      'amex-mr': {
        ratio: '1:2',
        ratioDisplay: '1:2',
        speed: '1-2-days',
        bonusPercent: null,
        bonusEndDate: null,
        active: true,
        lastVerified: daysAgo(20),
      },
    },
    awardNotes: '5th night free for elites on award stays.',
  }),
];

// ─── Seed: point sales + scrape status ───────────────────────────────────────

const pointSales: PointSaleDocument[] = [
  {
    id: 'ps-united-30',
    program: 'United MileagePlus',
    description: 'Buy miles with a 30% bonus',
    costPerPoint: '2.63¢/point',
    endDate: daysAhead(11),
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
  {
    id: 'ps-ihg-40',
    program: 'IHG One Rewards',
    description: 'Buy points at 40% off',
    costPerPoint: '0.5¢/point',
    endDate: daysAhead(6),
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },
];

// production: settings/tpMatrixScrape — written by the scrapeTransferPartners callable
let tpScrapeStatus: { lastRunAt?: Timestamp; valuationAsOf?: string } = {
  lastRunAt: daysAgo(3),
  valuationAsOf: 'October 2026',
};

// ─── Read accessors ──────────────────────────────────────────────────────────

export function getPartners(): TransferPartnerDocument[] {
  return partners.map((p) => ({ ...p, id: p.id }));
}

export function getPointSales(): PointSaleDocument[] {
  return pointSales.map((s) => ({ ...s }));
}

export function getTpScrapeStatus(): { lastRunAt?: Timestamp; valuationAsOf?: string } {
  return { ...tpScrapeStatus };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** production: updateTransferPartner callable — shallow merge with a deep merge for the programs map. */
export function storeUpdatePartner(partnerId: string, fields: Record<string, unknown>): void {
  const partner = partners.find((p) => p.id === partnerId);
  if (!partner) throw new Error(`Transfer partner ${partnerId} not found`);
  const { programs: incomingPrograms, ...rest } = fields;
  Object.assign(partner, rest);
  if (incomingPrograms && typeof incomingPrograms === 'object') {
    partner.programs = partner.programs ?? {};
    for (const [program, entry] of Object.entries(incomingPrograms as ProgramMap)) {
      const key = program as CardProgram;
      partner.programs[key] = { ...(partner.programs[key] ?? {}), ...(entry ?? {}) } as ProgramEntry;
    }
  }
  partner.updatedAt = Timestamp.now();
  emitChange();
}

/** production: deleteTransferPartner callable. */
export function storeDeletePartner(partnerId: string): void {
  const idx = partners.findIndex((p) => p.id === partnerId);
  if (idx === -1) throw new Error(`Transfer partner ${partnerId} not found`);
  partners.splice(idx, 1);
  emitChange();
}

/** production: addTransferPartner callable. */
export function storeAddPartner(fields: Partial<TransferPartnerDocument>): string {
  const id = mockId('tp');
  const now = Timestamp.now();
  partners.push(
    basePartner({
      awardReleaseDays: null,
      ...fields,
      id,
      name: String(fields.name ?? 'New Partner'),
      type: fields.type ?? 'airline',
      alliance: fields.alliance ?? '',
      loyaltyProgram: String(fields.loyaltyProgram ?? ''),
      createdAt: now,
      updatedAt: now,
    })
  );
  emitChange();
  return id;
}

/** production: scrapeTransferPartners callable (TPG matrix scrape). */
export function storeScrapePartners(): {
  matched: number;
  updated: number;
  cellsChanged: number;
  created: string[];
  missingFromTpg: string[];
  valuationAsOf: string;
} {
  const now = Timestamp.now();
  let updated = 0;
  for (const partner of partners) {
    // Per-cell manualOverride protection: the scraper never rewrites locked cells.
    const hasLockedCells = Object.values(partner.programs ?? {}).some((e) => e?.manualOverride);
    partner.lastScrapedAt = now;
    partner.updatedAt = now;
    if (!hasLockedCells) updated += 1;
  }
  tpScrapeStatus = { lastRunAt: now, valuationAsOf: 'October 2026' };
  emitChange();
  return {
    matched: partners.length,
    updated,
    cellsChanged: 2,
    created: [],
    missingFromTpg: [],
    valuationAsOf: 'October 2026',
  };
}

/** production: verifyTransferPartners callable. */
export function storeVerifyPartners(partnerId?: string): { verified: number; verifiedAt: string; checkedBy: string } {
  const now = Timestamp.now();
  const targets = partnerId ? partners.filter((p) => p.id === partnerId) : partners;
  for (const partner of targets) {
    partner.awardReleaseVerifiedAt = now;
    partner.availabilityCheckedBy = 'Daynis';
    for (const entry of Object.values(partner.programs ?? {})) {
      if (entry) entry.lastVerified = now;
    }
    partner.updatedAt = now;
  }
  emitChange();
  return { verified: targets.length, verifiedAt: now.toDate().toISOString(), checkedBy: 'Daynis' };
}

/** production: seedTransferPartnerMatrix callable. */
export function storeSeedMatrix(overwrite: boolean): { created: number; updated: number; skipped: number; total: number } {
  if (overwrite) emitChange();
  return { created: 0, updated: 0, skipped: partners.length, total: partners.length };
}

/** production: managePointSale callable. */
export function storeManagePointSale(input: {
  action: 'create' | 'update' | 'delete';
  saleId?: string;
  fields?: { program?: string; description?: string; costPerPoint?: string; endDate?: string };
}): string {
  if (input.action === 'create') {
    const id = mockId('ps');
    const now = Timestamp.now();
    pointSales.push({
      id,
      program: input.fields?.program ?? '',
      description: input.fields?.description ?? '',
      costPerPoint: input.fields?.costPerPoint ?? '',
      endDate: input.fields?.endDate ? Timestamp.fromDate(new Date(input.fields.endDate)) : daysAhead(14),
      createdAt: now,
      updatedAt: now,
    });
    emitChange();
    return id;
  }
  const sale = pointSales.find((s) => s.id === input.saleId);
  if (!sale) throw new Error(`Point sale ${input.saleId} not found`);
  if (input.action === 'delete') {
    pointSales.splice(pointSales.indexOf(sale), 1);
    emitChange();
    return input.saleId!;
  }
  if (input.fields?.program !== undefined) sale.program = input.fields.program;
  if (input.fields?.description !== undefined) sale.description = input.fields.description;
  if (input.fields?.costPerPoint !== undefined) sale.costPerPoint = input.fields.costPerPoint;
  if (input.fields?.endDate !== undefined) sale.endDate = Timestamp.fromDate(new Date(input.fields.endDate));
  sale.updatedAt = Timestamp.now();
  emitChange();
  return sale.id;
}
