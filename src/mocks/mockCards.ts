// MOCK-ONLY DATA STORE — Phase 2 (cards module). See CLAUDE_HANDOVER.md §7.
//
// Simulates the Firestore collections `card_data`, `transfer_partner_matrix`,
// `point_sales`, `scraper_status`, and `settings/cardCategories`. Uses a
// small in-memory pub/sub so subscribers receive updates when mocked
// mutations mutate the store, mirroring the `onSnapshot` behaviour of the
// real SDK. When the real backend is wired, this file can be deleted.

import { Timestamp } from '@/services/timestamp';
import { mockId } from '@/services/_delay';
import type {
  CardDocument,
  ChangeHistoryEntry,
  TransferPartnerDocument,
  PointSaleDocument,
  ScraperStatus,
} from '@/modules/cards/types';

// ─── Sample cards ──────────────────────────────────────────────────────────

const now = () => Timestamp.now();
const daysAgo = (n: number) => Timestamp.fromMillis(Date.now() - n * 86_400_000);

function baseCard(overrides: Partial<CardDocument>): CardDocument {
  return {
    id: mockId('card'),
    name: 'Placeholder Card',
    issuer: 'Chase',
    category: 'Travel',
    status: 'current',
    webflowStatus: 'synced',
    scrapeFrequency: 'weekly',
    lastScraped: daysAgo(1),
    lastChanged: daysAgo(3),
    affiliateLink: '',
    issuerUrl: '',
    ratesTermsUrl: '',
    cardImageUrl: '',
    notes: '',
    sourceUrls: [],
    tpgUrl: '',
    dailyDropUrl: '',
    omaatUrl: '',
    sourceChangeHistory: [],
    bonusDaysActive: 30,
    bonusAvgChangeDays: 90,
    annualFee_scraped: 0,
    signupBonus_scraped: '',
    bonusSpendReq_scraped: '',
    aprRange_scraped: '',
    annualFee_manual: 0,
    signupBonus_manual: '',
    bonusSpendReq_manual: '',
    aprRange_manual: '',
    overrides: {},
    createdAt: daysAgo(120),
    updatedAt: daysAgo(1),
    ...overrides,
  };
}

const cards: CardDocument[] = [
  baseCard({
    id: 'card-csr',
    name: 'Chase Sapphire Reserve',
    issuer: 'Chase',
    category: 'Travel',
    annualFee_scraped: 550,
    signupBonus_scraped: '60,000 points after $4,000 spend in 3 months',
    bonusSpendReq_scraped: '$4,000 in 3 months',
    aprRange_scraped: '21.49% - 28.49%',
  }),
  baseCard({
    id: 'card-amex-plat',
    name: 'The Platinum Card',
    issuer: 'American Express',
    category: 'Travel',
    annualFee_scraped: 695,
    signupBonus_scraped: '80,000 Membership Rewards after $8,000 spend in 6 months',
    bonusSpendReq_scraped: '$8,000 in 6 months',
    aprRange_scraped: 'See terms',
    status: 'changed',
  }),
  baseCard({
    id: 'card-venture-x',
    name: 'Capital One Venture X',
    issuer: 'Capital One',
    category: 'Travel',
    annualFee_scraped: 395,
    signupBonus_scraped: '75,000 miles after $4,000 spend in 3 months',
    bonusSpendReq_scraped: '$4,000 in 3 months',
    aprRange_scraped: '19.99% - 29.99%',
  }),
];

// history keyed by card id
const changeHistory: Record<string, ChangeHistoryEntry[]> = {
  'card-csr': [
    {
      field: 'signupBonus',
      oldValue: '50,000 points',
      newValue: '60,000 points after $4,000 spend in 3 months',
      changedAt: daysAgo(30),
      source: 'scraper',
      changedBy: 'scraper-service',
    },
  ],
  'card-amex-plat': [
    {
      field: 'annualFee',
      oldValue: 695,
      newValue: 695,
      changedAt: daysAgo(10),
      source: 'scraper',
      changedBy: 'scraper-service',
    },
  ],
  'card-venture-x': [],
};

// ─── Sample transfer partners ──────────────────────────────────────────────

const transferPartners: TransferPartnerDocument[] = [
  {
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
    programs: {
      'chase-ur': { ratio: '1:1', speed: 'instant', bonusPercent: null, bonusEndDate: null, active: true, lastVerified: daysAgo(20) },
      'bilt': { ratio: '1:1', speed: 'instant', bonusPercent: null, bonusEndDate: null, active: true, lastVerified: daysAgo(30) },
    },
    sweetSpots: [],
    awardNotes: '',
    isAvios: false,
    isMarriott: false,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(14),
  },
  {
    id: 'tp-aircanada',
    name: 'Air Canada Aeroplan',
    type: 'airline',
    alliance: 'Star Alliance',
    loyaltyProgram: 'Aeroplan',
    iataCode: 'AC',
    brandColor: '#D22630',
    awardReleaseDays: 355,
    awardReleasePattern: 'Rolling',
    programs: {
      'chase-ur': { ratio: '1:1', speed: 'instant', bonusPercent: null, bonusEndDate: null, active: true, lastVerified: daysAgo(10) },
      'amex-mr': { ratio: '1:1', speed: 'instant', bonusPercent: 30, bonusEndDate: Timestamp.fromMillis(Date.now() + 20 * 86_400_000), active: true, lastVerified: daysAgo(5) },
      'capital-one': { ratio: '1:1', speed: '1-2-days', bonusPercent: null, bonusEndDate: null, active: true, lastVerified: daysAgo(25) },
    },
    sweetSpots: [],
    awardNotes: '',
    isAvios: false,
    isMarriott: false,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(5),
  },
  {
    id: 'tp-hyatt',
    name: 'World of Hyatt',
    type: 'hotel',
    alliance: 'Hotels',
    loyaltyProgram: 'World of Hyatt',
    iataCode: 'WH',
    brandColor: '#1C355E',
    awardReleaseDays: null,
    awardReleasePattern: null,
    programs: {
      'chase-ur': { ratio: '1:1', speed: 'instant', bonusPercent: null, bonusEndDate: null, active: true, lastVerified: daysAgo(45) },
    },
    sweetSpots: [],
    awardNotes: '',
    isAvios: false,
    isMarriott: false,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(45),
  },
];

// ─── Sample point sales ────────────────────────────────────────────────────

const pointSales: PointSaleDocument[] = [
  {
    id: 'ps-1',
    program: 'Alaska Mileage Plan',
    description: 'Buy miles at 40% bonus',
    costPerPoint: '1.42¢/mile',
    endDate: Timestamp.fromMillis(Date.now() + 15 * 86_400_000),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(2),
  },
];

// ─── Scraper status ────────────────────────────────────────────────────────

const scraperStatus: ScraperStatus = {
  lastScrapedAt: daysAgo(0.02),
  nextScheduledAt: Timestamp.fromMillis(Date.now() + 6 * 3_600_000),
  health: 'healthy',
  recentErrors: [],
  isRunning: false,
};

// ─── Category settings ─────────────────────────────────────────────────────

let categoryList: string[] = ['Travel', 'Cash Back', 'Business', 'Hotel', 'Airline', 'Student', 'Secured'];

// ─── Pub/Sub ───────────────────────────────────────────────────────────────

type Listener<T> = (value: T) => void;
function makeBus<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    subscribe(fn: Listener<T>, initial: T) {
      listeners.add(fn);
      queueMicrotask(() => fn(initial));
      return () => { listeners.delete(fn); };
    },
    emit(value: T) {
      for (const fn of listeners) fn(value);
    },
  };
}

const cardsBus = makeBus<CardDocument[]>();
const cardBusByCard: Record<string, ReturnType<typeof makeBus<CardDocument | null>>> = {};
const historyBusByCard: Record<string, ReturnType<typeof makeBus<ChangeHistoryEntry[]>>> = {};
const partnersBus = makeBus<TransferPartnerDocument[]>();
const pointSalesBus = makeBus<PointSaleDocument[]>();
const scraperBus = makeBus<ScraperStatus>();
const categoriesBus = makeBus<string[]>();

function cardBus(id: string) {
  if (!cardBusByCard[id]) cardBusByCard[id] = makeBus<CardDocument | null>();
  return cardBusByCard[id];
}
function historyBus(id: string) {
  if (!historyBusByCard[id]) historyBusByCard[id] = makeBus<ChangeHistoryEntry[]>();
  return historyBusByCard[id];
}

function broadcastCard(id: string) {
  const card = cards.find((c) => c.id === id) ?? null;
  cardBus(id).emit(card);
}

// ─── Public API ────────────────────────────────────────────────────────────

export const mockCards = {
  listCards(): CardDocument[] {
    return [...cards];
  },
  subscribeCards(fn: Listener<CardDocument[]>) {
    return cardsBus.subscribe(fn, [...cards]);
  },
  subscribeCard(id: string, fn: Listener<CardDocument | null>) {
    const bus = cardBus(id);
    return bus.subscribe(fn, cards.find((c) => c.id === id) ?? null);
  },
  subscribeChangeHistory(id: string, fn: Listener<ChangeHistoryEntry[]>) {
    return historyBus(id).subscribe(fn, changeHistory[id] ?? []);
  },
  addCard(input: Partial<CardDocument> & { name: string; issuer: string }): string {
    const card = baseCard({ ...input, status: 'new' });
    cards.unshift(card);
    changeHistory[card.id] = [];
    cardsBus.emit([...cards]);
    return card.id;
  },
  updateCard(cardId: string, fields: Record<string, unknown>) {
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error(`updateCard: no card with id ${cardId}`);
    cards[idx] = { ...cards[idx], ...fields, updatedAt: Timestamp.now() } as CardDocument;
    cardsBus.emit([...cards]);
    broadcastCard(cardId);
  },
  setOverride(cardId: string, field: 'annualFee' | 'signupBonus' | 'bonusSpendReq' | 'aprRange', value: unknown, isOverriding: boolean) {
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const card = { ...cards[idx] };
    card.overrides = { ...card.overrides };
    if (isOverriding) {
      card.overrides[field] = {
        isOverridden: true,
        overriddenValue: value,
        overriddenBy: 'mock-user',
        overriddenAt: Timestamp.now(),
      };
      const manualKey = `${field}_manual` as keyof CardDocument;
      (card as Record<string, unknown>)[manualKey] = value;
    } else {
      delete card.overrides[field];
    }
    card.updatedAt = Timestamp.now();
    cards[idx] = card;
    cardsBus.emit([...cards]);
    broadcastCard(cardId);
  },
  deleteCard(cardId: string) {
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    cards.splice(idx, 1);
    delete changeHistory[cardId];
    cardsBus.emit([...cards]);
    broadcastCard(cardId);
  },
  // Transfer partners
  listPartners() { return [...transferPartners]; },
  subscribePartners(fn: Listener<TransferPartnerDocument[]>) {
    return partnersBus.subscribe(fn, [...transferPartners]);
  },
  updatePartner(partnerId: string, fields: Record<string, unknown>) {
    const idx = transferPartners.findIndex((p) => p.id === partnerId);
    if (idx === -1) throw new Error(`updatePartner: no partner with id ${partnerId}`);
    transferPartners[idx] = { ...transferPartners[idx], ...fields, updatedAt: Timestamp.now() } as TransferPartnerDocument;
    partnersBus.emit([...transferPartners]);
  },
  addPartner(input: Partial<TransferPartnerDocument> & { name: string; type: 'airline' | 'hotel'; alliance: TransferPartnerDocument['alliance']; loyaltyProgram: string }): string {
    const id = mockId('tp');
    const partner: TransferPartnerDocument = {
      id,
      name: input.name,
      type: input.type,
      alliance: input.alliance,
      loyaltyProgram: input.loyaltyProgram,
      iataCode: input.iataCode,
      brandColor: input.brandColor,
      awardReleaseDays: input.awardReleaseDays ?? null,
      awardReleasePattern: input.awardReleasePattern ?? null,
      programs: input.programs ?? {},
      sweetSpots: input.sweetSpots ?? [],
      awardNotes: input.awardNotes ?? '',
      isAvios: !!input.isAvios,
      isMarriott: !!input.isMarriott,
      alsoBookable: input.alsoBookable,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    transferPartners.push(partner);
    partnersBus.emit([...transferPartners]);
    return id;
  },
  // Point sales
  subscribePointSales(fn: Listener<PointSaleDocument[]>) {
    return pointSalesBus.subscribe(fn, [...pointSales]);
  },
  managePointSale(input: { action: 'create' | 'update' | 'delete'; saleId?: string; fields?: Record<string, unknown> }): string {
    if (input.action === 'create') {
      const id = mockId('ps');
      const endMs = typeof input.fields?.endDate === 'string' ? new Date(input.fields.endDate as string).getTime() : Date.now();
      pointSales.push({
        id,
        program: String(input.fields?.program ?? ''),
        description: String(input.fields?.description ?? ''),
        costPerPoint: String(input.fields?.costPerPoint ?? ''),
        endDate: Timestamp.fromMillis(endMs),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      pointSalesBus.emit([...pointSales]);
      return id;
    }
    if (input.action === 'update' && input.saleId) {
      const idx = pointSales.findIndex((s) => s.id === input.saleId);
      if (idx !== -1) {
        pointSales[idx] = { ...pointSales[idx], ...(input.fields ?? {}), updatedAt: Timestamp.now() } as PointSaleDocument;
        pointSalesBus.emit([...pointSales]);
      }
      return input.saleId;
    }
    if (input.action === 'delete' && input.saleId) {
      const idx = pointSales.findIndex((s) => s.id === input.saleId);
      if (idx !== -1) {
        pointSales.splice(idx, 1);
        pointSalesBus.emit([...pointSales]);
      }
      return input.saleId;
    }
    return '';
  },
  // Scraper status
  subscribeScraperStatus(fn: Listener<ScraperStatus>) {
    return scraperBus.subscribe(fn, scraperStatus);
  },
  // Categories
  subscribeCategories(fn: Listener<string[]>) {
    return categoriesBus.subscribe(fn, [...categoryList]);
  },
  setCategories(list: string[]) {
    categoryList = [...list];
    categoriesBus.emit([...categoryList]);
  },
};
