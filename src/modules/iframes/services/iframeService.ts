// MOCK iFrame Manager service — in-memory replacement for the production
// service (Firestore `iframe_instances` reads + callable mutations:
// iframeInstanceCreate / iframeInstanceUpdate / iframeInstanceDelete /
// iframeInstanceEmbed). Same exported name + signatures; mutations re-emit
// to subscribers like the production onSnapshot listener does.

import { delay, mockId } from '@/services/_delay';
import { Timestamp } from '@/services/timestamp';
import type {
  CreateIframeInstanceInput,
  CreateIframeInstanceResult,
  DeleteIframeInstanceInput,
  DeleteIframeInstanceResult,
  GetIframeEmbedInput,
  GetIframeEmbedResult,
  IframeInstanceDoc,
  UpdateIframeInstanceInput,
  UpdateIframeInstanceResult,
} from '../types';

// ─── Seed: iframe_instances (7 instances across every type family) ───────────
// Card ids reference the cards module seed (card-csr / card-amex-plat /
// card-venture-x); tp-table `partners` reference the transfer_partner_matrix
// seed ids. Hosts are article/card_data refs exactly as the production
// reconcileIframeHosts job denormalizes them.

const now = Date.now();
const daysAgo = (n: number) => Timestamp.fromMillis(now - n * 864e5);

const hostKeys = (hosts: IframeInstanceDoc['hosts']) =>
  hosts.map((h) => `${h.collection}/${h.docId}`);

const seedInstances: IframeInstanceDoc[] = [
  {
    id: 'if-comp-premium-trio',
    type: 'complementary-cards',
    cards: [
      {
        cardId: 'card-csr',
        customText:
          'The Chase Sapphire Reserve is the strongest all-rounder here — 3x on travel and dining with a 50% portal redemption bonus.',
        readMoreUrl: '',
      },
      {
        cardId: 'card-amex-platinum',
        customText:
          'Pair it with The Platinum Card for lounge access and 5x on flights booked direct.',
        readMoreUrl: '',
      },
      {
        cardId: 'card-venture-x',
        customText: '',
        readMoreUrl: 'https://elitetravelhackers.com/reviews/capital-one-venture-x',
      },
    ],
    hasCustomText: true,
    hosts: [
      {
        collection: 'articles',
        docId: 'art-best-travel-cards-2026',
        field: 'content',
        title: 'Best Travel Credit Cards for 2026',
      },
      {
        collection: 'articles',
        docId: 'art-best-premium-cards',
        field: 'content',
        title: 'Best Premium Travel Cards Compared',
      },
    ],
    hostKeys: [],
    createdBy: 'admin@elitetravelhackers.com',
    createdAt: daysAgo(40),
    updatedAt: daysAgo(3),
  },
  {
    id: 'if-compare-premium',
    type: 'comparable-cards',
    cards: [
      { cardId: 'card-csr', customText: '', readMoreUrl: '' },
      { cardId: 'card-amex-platinum', customText: '', readMoreUrl: '' },
      { cardId: 'card-venture-x', customText: '', readMoreUrl: '' },
    ],
    hasCustomText: false,
    hosts: [
      {
        collection: 'articles',
        docId: 'art-csr-review',
        field: 'content',
        title: 'Chase Sapphire Reserve Review',
      },
    ],
    hostKeys: [],
    createdBy: 'editor@elitetravelhackers.com',
    createdAt: daysAgo(30),
    updatedAt: daysAgo(6),
  },
  {
    id: 'if-deals-october',
    type: 'deals',
    cards: [
      {
        cardId: 'card-csr',
        customText: 'Elevated 100k welcome offer — ends soon.',
        readMoreUrl: '',
      },
      {
        cardId: 'card-amex-platinum',
        customText: 'Targeted 150k Membership Rewards offer via CardMatch.',
        readMoreUrl: '',
      },
      {
        cardId: 'card-venture-x',
        customText: '75k miles + $300 travel credit in year one.',
        readMoreUrl: '',
      },
    ],
    hasCustomText: true,
    hosts: [
      {
        collection: 'articles',
        docId: 'art-october-deals',
        field: 'content',
        title: 'October Card Deals Roundup',
      },
    ],
    hostKeys: [],
    createdBy: 'admin@elitetravelhackers.com',
    createdAt: daysAgo(12),
    updatedAt: daysAgo(1),
  },
  {
    id: 'if-table-emirates-first',
    type: 'custom-table',
    cards: [],
    rows: [
      { label: 'Airline', value: 'Emirates' },
      { label: 'Route', value: 'Sydney (SYD) → Dubai (DXB)' },
      { label: 'Seat class', value: 'First Class — A380 suite' },
      { label: 'Travel time', value: '14h 20m nonstop' },
      { label: 'Points needed', value: 'From 102,500 Skywards miles + taxes' },
    ],
    hasCustomText: false,
    hosts: [
      {
        collection: 'articles',
        docId: 'art-emirates-first-worth-it',
        field: 'content',
        title: 'Emirates First Class: Is It Worth It?',
      },
    ],
    hostKeys: [],
    createdBy: 'editor@elitetravelhackers.com',
    createdAt: daysAgo(25),
    updatedAt: daysAgo(9),
  },
  {
    id: 'if-offerhist-csr',
    type: 'offer-history',
    cards: [{ cardId: 'card-csr', customText: '', readMoreUrl: '' }],
    hasCustomText: false,
    hosts: [
      {
        collection: 'card_data',
        docId: 'card-csr',
        field: 'content',
        title: 'Chase Sapphire Reserve',
      },
    ],
    hostKeys: [],
    createdBy: 'admin@elitetravelhackers.com',
    createdAt: daysAgo(45),
    updatedAt: daysAgo(14),
  },
  {
    id: 'if-tp-full-matrix',
    type: 'tp-table',
    cards: [],
    tpConfig: {
      programs: ['chase-ur', 'amex-mr', 'capital-one', 'bilt', 'citi-ty', 'wells-fargo'],
      alliances: ['Star Alliance', 'SkyTeam', 'Oneworld', 'Non-Alliance', 'Hotels'],
      description:
        'How the major bank programs line up across every alliance — ratios update live from the Transfer Partner matrix.',
      hideFilters: false,
      partners: [],
      partnerNames: [],
    },
    rowCount: 14,
    hasCustomText: false,
    hosts: [
      {
        collection: 'articles',
        docId: 'art-transfer-partners-guide',
        field: 'content',
        title: 'Ultimate Guide to Transfer Partners',
      },
      {
        collection: 'articles',
        docId: 'art-chase-points-redemptions',
        field: 'content',
        title: 'Best Ways to Redeem Chase Points',
      },
    ],
    hostKeys: [],
    createdBy: 'admin@elitetravelhackers.com',
    createdAt: daysAgo(50),
    updatedAt: daysAgo(2),
  },
  {
    id: 'if-tp-star-alliance-compact',
    type: 'tp-table',
    cards: [],
    tpConfig: {
      programs: ['chase-ur', 'amex-mr', 'capital-one', 'bilt', 'citi-ty'],
      alliances: ['Star Alliance', 'SkyTeam', 'Oneworld', 'Non-Alliance', 'Hotels'],
      description: '',
      hideFilters: true,
      partners: ['tp-united', 'tp-aeroplan'],
      partnerNames: ['United Airlines', 'Air Canada Aeroplan'],
    },
    rowCount: 2,
    hasCustomText: false,
    hosts: [
      {
        collection: 'articles',
        docId: 'art-csr-review',
        field: 'content',
        title: 'Chase Sapphire Reserve Review',
      },
    ],
    hostKeys: [],
    createdBy: 'editor@elitetravelhackers.com',
    createdAt: daysAgo(15),
    updatedAt: daysAgo(4),
  },
  {
    id: 'if-legacy-orphan',
    type: 'iframe-a',
    cards: [
      { cardId: 'card-csr', customText: 'Legacy embed — migrated to Complementary cards.', readMoreUrl: '' },
      { cardId: 'card-venture-x', customText: '', readMoreUrl: '' },
    ],
    hasCustomText: true,
    hosts: [],
    hostKeys: [],
    createdBy: 'admin@elitetravelhackers.com',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(60),
  },
].map((inst) => ({ ...inst, hostKeys: hostKeys(inst.hosts) }));

// ─── In-memory store + subscription bus ──────────────────────────────────────

let store: IframeInstanceDoc[] = seedInstances;

type Listener = (instances: IframeInstanceDoc[]) => void;
const listeners = new Set<Listener>();

/** Mirrors the production query: orderBy('updatedAt', 'desc'). */
function sortedInstances(): IframeInstanceDoc[] {
  return [...store].sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
}

function emit(): void {
  const snapshot = sortedInstances();
  listeners.forEach((fn) => fn(snapshot));
}

// ─── Server-side embed helpers (mirrors functions/src/iframes renderer) ──────

/** Rough server-side height model — the real renderer measures per type. */
function estimateHeight(inst: Pick<IframeInstanceDoc, 'type' | 'cards' | 'rows' | 'rowCount'>): number {
  if (inst.type === 'tp-table') return 140 + (inst.rowCount ?? 12) * 48;
  if (inst.type === 'custom-table') return 90 + (inst.rows?.length ?? 0) * 44;
  if (inst.type === 'offer-history') return 340;
  const n = inst.cards.length;
  if (inst.type === 'complementary-cards' || inst.type === 'iframe-a') return 120 + n * 156;
  return 300; // comparable-cards / deals fixed strips
}

/** Server-built canonical embed tag (production builds this in the callable). */
function buildEmbedHtml(inst: IframeInstanceDoc, origin: string): string {
  const height = estimateHeight(inst);
  return `<iframe src="${origin}/iframe/${inst.id}" width="100%" height="${height}" frameborder="0" scrolling="no" style="border:0;overflow:hidden;" loading="lazy" title="${inst.type}"></iframe>`;
}

function applyTpRowCount(inst: IframeInstanceDoc): void {
  if (inst.type !== 'tp-table') return;
  // Airline picks win (CMS-145); otherwise approximate the alliance-group count.
  const picked = inst.tpConfig?.partners?.length ?? 0;
  inst.rowCount = picked > 0 ? picked : 14;
}

// ─── Mock service (production: services/iframeService.ts) ────────────────────

export const iframeService = {
  /** production: onSnapshot(query(collection(db, 'iframe_instances'), orderBy('updatedAt', 'desc'))) */
  subscribeToInstances(
    onData: (instances: IframeInstanceDoc[]) => void,
    _onError: (err: Error) => void
  ): () => void {
    listeners.add(onData);
    let cancelled = false;
    delay(300).then(() => {
      if (!cancelled) onData(sortedInstances());
    });
    return () => {
      cancelled = true;
      listeners.delete(onData);
    };
  },

  /** production: getDoc(doc(db, 'iframe_instances', instanceId)) */
  async getInstance(instanceId: string): Promise<IframeInstanceDoc | null> {
    await delay(200);
    return store.find((i) => i.id === instanceId) ?? null;
  },

  /** production: httpsCallable(functions, 'iframeInstanceCreate') */
  async createInstance(input: CreateIframeInstanceInput): Promise<CreateIframeInstanceResult> {
    await delay(450);
    const hosts = input.host
      ? [
          {
            collection: input.host.collection,
            docId: input.host.docId,
            field: input.host.field,
            title: '(this page)',
          },
        ]
      : [];
    const instance: IframeInstanceDoc = {
      id: mockId('if'),
      type: input.type,
      cards: (input.cards ?? []).map((c) => ({ ...c })),
      rows: input.rows?.map((r) => ({ ...r })),
      tpConfig: input.tpConfig ? { programs: [], alliances: [], description: '', ...input.tpConfig } : undefined,
      hasCustomText: (input.cards ?? []).some((c) => c.customText.trim() !== ''),
      hosts,
      hostKeys: hostKeys(hosts),
      createdBy: 'admin@elitetravelhackers.com',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    applyTpRowCount(instance);
    store = [instance, ...store];
    emit();
    return { id: instance.id, embedHtml: buildEmbedHtml(instance, input.origin), height: estimateHeight(instance) };
  },

  /** production: httpsCallable(functions, 'iframeInstanceUpdate') */
  async updateInstance(input: UpdateIframeInstanceInput): Promise<UpdateIframeInstanceResult> {
    await delay(400);
    const idx = store.findIndex((i) => i.id === input.instanceId);
    if (idx === -1) throw new Error('This iFrame no longer exists.');
    const prev = store[idx];
    const next: IframeInstanceDoc = {
      ...prev,
      cards: input.cards ? input.cards.map((c) => ({ ...c })) : prev.cards,
      rows: input.rows ? input.rows.map((r) => ({ ...r })) : prev.rows,
      tpConfig: input.tpConfig ? { programs: [], alliances: [], description: '', ...prev.tpConfig, ...input.tpConfig } : prev.tpConfig,
      updatedAt: Timestamp.now(),
    };
    next.hasCustomText = next.cards.some((c) => c.customText.trim() !== '');
    applyTpRowCount(next);
    store = store.map((i) => (i.id === next.id ? next : i));
    emit();
    return { embedHtml: buildEmbedHtml(next, input.origin), height: estimateHeight(next) };
  },

  /** production: httpsCallable(functions, 'iframeInstanceDelete') */
  async deleteInstance(input: DeleteIframeInstanceInput): Promise<DeleteIframeInstanceResult> {
    await delay(400);
    const target = store.find((i) => i.id === input.instanceId);
    if (!target) throw new Error('This iFrame no longer exists.');
    const removedFromHosts = input.stripFromHosts ? target.hosts.length : 0;
    store = store.filter((i) => i.id !== input.instanceId);
    emit();
    return { success: true, removedFromHosts };
  },

  /**
   * CMS-94 — fetch the server-built embed HTML for an EXISTING instance so it
   * can be reused in another article/card field (one instance, many hosts).
   * production: httpsCallable(functions, 'iframeInstanceEmbed')
   */
  async getInstanceEmbed(input: GetIframeEmbedInput): Promise<GetIframeEmbedResult> {
    await delay(250);
    const inst = store.find((i) => i.id === input.instanceId);
    if (!inst) throw new Error('This iFrame no longer exists.');
    return { id: inst.id, embedHtml: buildEmbedHtml(inst, input.origin), height: estimateHeight(inst) };
  },
};
