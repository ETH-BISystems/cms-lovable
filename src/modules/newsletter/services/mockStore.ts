/**
 * MOCK-ONLY in-memory store for the Newsletter Command Center.
 *
 * Replaces the production Firestore collections:
 *   - newsletter-editions            (+ tasks subcollection per edition)
 *   - subscriber-profiles
 *   - competitor-newsletters         (+ debriefs subcollection)
 *   - newsletters                    (publication config)
 *
 * Both service files (firestoreSubscriptions, newsletterService) share this
 * store so mutations re-emit to active subscribers, mirroring onSnapshot.
 */

import type {
  NewsletterEdition,
  EditionTask,
  SubscriberProfile,
  CompetitorNewsletter,
  CompetitorDebrief,
  NewsletterConfig,
  ContentBlock,
} from '../types/index';

const DAY = 864e5;
const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * DAY);
const daysAhead = (n: number) => new Date(now + n * DAY);

// ─── Beehiiv publication (production: pub linked via beehiivPublicationId) ───

export const MOCK_PUBLICATION = {
  id: 'pub_eth_weekly',
  name: 'Elite Travel Hackers Weekly',
} as const;

// ─── Listener registry ───────────────────────────────────────────────────────

type Listener<T> = (data: T) => void;

const editionListeners = new Set<Listener<NewsletterEdition[]>>();
const editionDetailListeners = new Map<string, Set<Listener<NewsletterEdition | null>>>();
const taskListeners = new Map<string, Set<Listener<EditionTask[]>>>();
const subscriberListeners = new Set<Listener<SubscriberProfile[]>>();
const competitorListeners = new Set<Listener<CompetitorNewsletter[]>>();
const debriefListeners = new Set<Listener<CompetitorDebrief[]>>();
const configListeners = new Set<Listener<NewsletterConfig[]>>();

export const storeEmit = {
  editions() {
    const all = getAllEditions();
    editionListeners.forEach((l) => l(all));
    editionDetailListeners.forEach((listeners, id) => {
      const edition = editions.find((e) => e.id === id) ?? null;
      listeners.forEach((l) => l(edition ? { ...edition } : null));
    });
  },
  tasks(editionId: string) {
    const listeners = taskListeners.get(editionId);
    if (!listeners) return;
    const tasks = getTasks(editionId);
    listeners.forEach((l) => l(tasks));
  },
  subscribers() {
    const all = [...subscribers].sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
    subscriberListeners.forEach((l) => l(all));
  },
  competitors() {
    const all = [...competitorNewsletters].sort(
      (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
    );
    competitorListeners.forEach((l) => l(all));
  },
  debriefs() {
    const all = [...debriefs].sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    debriefListeners.forEach((l) => l(all));
  },
  config() {
    configListeners.forEach((l) => l([...configs]));
  },
};

export const storeOn = {
  editions(l: Listener<NewsletterEdition[]>) {
    editionListeners.add(l);
    return () => editionListeners.delete(l);
  },
  editionDetail(id: string, l: Listener<NewsletterEdition | null>) {
    if (!editionDetailListeners.has(id)) editionDetailListeners.set(id, new Set());
    editionDetailListeners.get(id)!.add(l);
    return () => editionDetailListeners.get(id)?.delete(l);
  },
  tasks(id: string, l: Listener<EditionTask[]>) {
    if (!taskListeners.has(id)) taskListeners.set(id, new Set());
    taskListeners.get(id)!.add(l);
    return () => taskListeners.get(id)?.delete(l);
  },
  subscribers(l: Listener<SubscriberProfile[]>) {
    subscriberListeners.add(l);
    return () => subscriberListeners.delete(l);
  },
  competitors(l: Listener<CompetitorNewsletter[]>) {
    competitorListeners.add(l);
    return () => competitorListeners.delete(l);
  },
  debriefs(l: Listener<CompetitorDebrief[]>) {
    debriefListeners.add(l);
    return () => debriefListeners.delete(l);
  },
  config(l: Listener<NewsletterConfig[]>) {
    configListeners.add(l);
    return () => configListeners.delete(l);
  },
};

// ─── Accessors used by the service files ─────────────────────────────────────

export function getAllEditions(): NewsletterEdition[] {
  return [...editions].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getEditionById(id: string): NewsletterEdition | null {
  return editions.find((e) => e.id === id) ?? null;
}

export function putEdition(edition: NewsletterEdition): void {
  const idx = editions.findIndex((e) => e.id === edition.id);
  if (idx >= 0) editions[idx] = edition;
  else editions.push(edition);
}

export function nextEditionNumber(): number {
  return editions.reduce((max, e) => Math.max(max, e.number), 0) + 1;
}

export function getTasks(editionId: string): EditionTask[] {
  return [...(tasksByEdition.get(editionId) ?? [])].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export function putTask(editionId: string, task: EditionTask): void {
  const list = tasksByEdition.get(editionId) ?? [];
  const idx = list.findIndex((t) => t.id === task.id);
  if (idx >= 0) list[idx] = task;
  else list.push(task);
  tasksByEdition.set(editionId, list);
}

export function deleteTask(editionId: string, taskId: string): void {
  const list = (tasksByEdition.get(editionId) ?? []).filter((t) => t.id !== taskId);
  tasksByEdition.set(editionId, list);
}

export function getSubscribers(): SubscriberProfile[] {
  return subscribers;
}

export function getCompetitorNewsletters(): CompetitorNewsletter[] {
  return competitorNewsletters;
}

export function getDebriefs(): CompetitorDebrief[] {
  return debriefs;
}

export function putDebrief(debrief: CompetitorDebrief): void {
  debriefs.unshift(debrief);
}

export function getConfigs(): NewsletterConfig[] {
  return configs;
}

// ─── Subscriber growth series (MOCK-ONLY: for the Subscribers growth chart) ──
// 90 days of growth ending at ~24,300 total subscribers.

export interface SubscriberGrowthPoint {
  date: Date;
  total: number;
  newSubscribers: number;
  unsubscribes: number;
}

export const subscriberGrowthSeries: SubscriberGrowthPoint[] = (() => {
  const points: SubscriberGrowthPoint[] = [];
  let total = 22100;
  for (let i = 89; i >= 0; i--) {
    // gentle deterministic wave + steady upward drift → lands near 24,300
    const wave = Math.round(28 * Math.sin(i / 4.7) + 14 * Math.sin(i / 2.3));
    const newSubs = Math.max(6, 26 + wave + (i % 3) * 4);
    const unsubs = Math.max(1, Math.round(newSubs * 0.12) + (i % 5 === 0 ? 3 : 0));
    total += newSubs - unsubs;
    points.push({ date: daysAgo(i), total, newSubscribers: newSubs, unsubscribes: unsubs });
  }
  // Pin the final point to the headline number
  points[points.length - 1].total = 24300;
  return points;
})();

// ─── Seed: content blocks ────────────────────────────────────────────────────

let blockSeq = 0;
function block(
  type: ContentBlock['type'],
  title: string,
  previewText: string,
  body: string,
  sourceRef?: ContentBlock['sourceRef'],
): ContentBlock {
  blockSeq += 1;
  return { id: `blk_${blockSeq.toString().padStart(3, '0')}`, type, title, previewText, body, sourceRef };
}

function dailyBlocks(leadTitle: string, leadBody: string): ContentBlock[] {
  return [
    block('Lead Story', leadTitle, leadBody.slice(0, 110), leadBody, {
      label: 'ETH Pipeline',
      articleId: 'art_lead_story',
    }),
    block(
      'Quick Hits',
      'Quick Hits: 3 Stories Worth Your Points',
      'Roundup of the week\'s smaller wins',
      '<ul><li>Qantas adds 2 weekly Sydney–Dallas frequencies for summer.</li><li>Accor ALL offering 3x points on Asia-Pacific stays booked by Sunday.</li><li>Revolut adds Singapore Airlines KrisFlyer as a transfer partner.</li></ul>',
    ),
    block(
      'Card Alert',
      'Amex Platinum Edge: 60,000 MR Points (Up from 40,000)',
      'Elevated offer ends in 9 days',
      '<p>The Platinum Edge is back to its best offer of the year — 60,000 Membership Rewards points after $3,000 spend in 3 months. At a 2:1 Velocity transfer that\'s 30,000 Velocity points, enough for a one-way business seat to Bali.</p>',
      { label: 'Card Data Manager', articleId: 'card_amex_platinum_edge' },
    ),
    block(
      'Article Spotlight',
      'From the Blog: How to Stack Portal Bonuses with Card Offers',
      'Our most-read guide this week',
      '<p>Our step-by-step stacking guide walked 4,100 readers through combining shopping-portal bonuses with new-card minimum spend. If you haven\'t read it, this is the one to bookmark.</p>',
      { label: 'elitetravelhackers.com', url: 'https://elitetravelhackers.com/stack-portal-bonuses' },
    ),
    block(
      'Transfer Bonus Watch',
      'Transfer Bonus Watch: Amex → Velocity 30% (Ends Tonight)',
      'Last call on the month\'s best transfer bonus',
      '<p>The 30% Amex-to-Velocity bonus closes at midnight AEST. 1,000 MR becomes 650 Velocity points. If you\'re within striking distance of a reward seat, transfer now — speculatively transferring is rarely worth it otherwise.</p>',
    ),
    block(
      'Tip of the Day',
      'Tip of the Day: Book Virgin Australia Awards via United',
      'Same seats, fewer points',
      '<p>Virgin Australia domestic business awards price at 35,500 Velocity points — but the exact same seat is 25,000 United miles. Transfer from Amex MR to United via a Marriott workaround or buy miles during a promo.</p>',
    ),
  ];
}

// ─── Seed: editions ──────────────────────────────────────────────────────────

let editionSeq = 0;
function edition(partial: Omit<NewsletterEdition, 'id' | 'createdAt' | 'updatedAt' | 'voiceNotes' | 'comments' | 'activityLog'> & {
  voiceNotes?: NewsletterEdition['voiceNotes'];
  comments?: NewsletterEdition['comments'];
  activityLog?: NewsletterEdition['activityLog'];
}): NewsletterEdition {
  editionSeq += 1;
  const id = `ed_${partial.number}`;
  return {
    voiceNotes: [],
    comments: [],
    activityLog: [
      {
        id: `act_${id}_1`,
        actor: 'Daynis Olman',
        action: partial.status === 'Sent' ? 'Edition sent' : 'Edition created',
        timestamp: partial.date,
      },
    ],
    createdAt: daysAgo(20 - editionSeq),
    updatedAt: daysAgo(1),
    ...partial,
    id,
  };
}

const editions: NewsletterEdition[] = [
  edition({
    number: 251,
    subject: '75,000 Points: The Amex Platinum Offer You Can\'t Ignore',
    previewText: 'Plus: Qantas quietly opens business award seats to Tokyo for February',
    date: daysAgo(1),
    status: 'Sent',
    templateId: 'tpl_daily',
    audience: 'All Subscribers',
    subscriberCount: 24280,
    blocks: dailyBlocks(
      'Amex Platinum: 75,000 MR Points (Best Offer Since 2024)',
      '<p>The Amex Platinum just jumped to 75,000 Membership Rewards points after $5,000 spend in 3 months — the highest public offer in two years. Transferred 2:1 to Velocity, that\'s 37,500 points: a return business-class trip to New Zealand with change.</p>',
    ),
    beehiivPostId: 'bh_post_251',
    editionType: 'Daily',
    autoGenerated: false,
    openRate: 47.2,
    clickRate: 6.8,
    unsubscribes: 14,
    revenue: 412.5,
    createdBy: 'Daynis Olman',
  }),
  edition({
    number: 250,
    subject: 'Qantas Drops Rare Business Class Award Seats to Tokyo',
    previewText: 'Classic Rewards wide open for cherry-blossom season — move fast',
    date: daysAgo(2),
    status: 'Sent',
    templateId: 'tpl_daily',
    audience: 'All Subscribers',
    subscriberCount: 24110,
    blocks: dailyBlocks(
      'Qantas Opens Tokyo Business Awards for March',
      '<p>Qantas has released a tranche of Classic Reward business seats on Sydney–Tokyo Haneda for March — cherry-blossom season. 82,000 points one-way, and availability is genuinely wide open for the first time since 2019.</p>',
    ),
    beehiivPostId: 'bh_post_250',
    editionType: 'Daily',
    autoGenerated: false,
    openRate: 45.8,
    clickRate: 6.1,
    unsubscribes: 11,
    revenue: 388.0,
    createdBy: 'Daynis Olman',
  }),
  edition({
    number: 249,
    subject: 'ERROR FARE: Sydney to Honolulu $287 Return',
    previewText: 'Jetstar glitch pricing — booking window likely under 12 hours',
    date: daysAgo(3),
    status: 'Sent',
    templateId: 'tpl_deal_alert',
    audience: 'All Subscribers',
    subscriberCount: 23960,
    blocks: [
      block(
        'Deal Alert',
        'ERROR FARE: Sydney → Honolulu $287 Return',
        'Jetstar glitch fare, travel Feb–Apr',
        '<p>A misfiled Jetstar fare is pricing Sydney–Honolulu returns at $287 for February–April travel. These fares are usually honoured but book direct, skip the extras, and don\'t call the airline. Full dates and booking links inside.</p>',
        { label: 'Deal scanner', url: 'https://elitetravelhackers.com/deals/syd-hnl-287' },
      ),
      block(
        'Card Alert',
        'Pair It With: 28 Degrees for Zero FX Fees',
        'Save another ~$25 on the fare',
        '<p>Book the fare in USD with the 28 Degrees Mastercard to dodge the 3% foreign-transaction fee other cards will slug you.</p>',
      ),
    ],
    beehiivPostId: 'bh_post_249',
    editionType: 'Deal Alert',
    autoGenerated: true,
    openRate: 52.4,
    clickRate: 9.3,
    unsubscribes: 9,
    revenue: 531.2,
    abWinner: 'A',
    createdBy: 'Auto-curate',
  }),
  edition({
    number: 248,
    subject: 'The 5 Cards I\'d Get If I Started Over Today',
    previewText: 'A clean-slate wallet strategy for maximum points in 2026',
    date: daysAgo(5),
    status: 'Sent',
    templateId: 'tpl_daily',
    audience: 'All Subscribers',
    subscriberCount: 23840,
    blocks: dailyBlocks(
      'The 5 Cards I\'d Get If I Started Over Today',
      '<p>Reader question we get weekly: "If you had to build your points wallet from scratch, what would you get?" Here\'s the definitive 2026 answer — the five cards, the exact order, and the signup-bonus sequence that banks 420,000 points in year one.</p>',
    ),
    beehiivPostId: 'bh_post_248',
    editionType: 'Daily',
    autoGenerated: false,
    openRate: 44.1,
    clickRate: 5.7,
    unsubscribes: 17,
    revenue: 355.8,
    createdBy: 'Sarah Chen',
  }),
  edition({
    number: 247,
    subject: '30% Transfer Bonus: Amex → Velocity Ends Tonight',
    previewText: 'Plus the three redemptions worth transferring for (and two to skip)',
    date: daysAgo(7),
    status: 'Sent',
    templateId: 'tpl_deal_alert',
    audience: 'All Subscribers',
    subscriberCount: 23620,
    blocks: [
      block(
        'Deal Alert',
        'Amex → Velocity 30% Bonus: Final Hours',
        '1,000 MR = 650 Velocity until midnight',
        '<p>The best Velocity transfer bonus of the year ends at midnight AEST. We ran the numbers on every redemption — here are the three where transferring makes sense, and the two traps that waste your points.</p>',
      ),
      block(
        'Transfer Bonus',
        'The Math: Which Redemptions Win at 30%',
        'Sydney–London business drops to 108k effective',
        '<p>With the bonus, Sydney–London business via Singapore drops to an effective 108,000 MR points return — cheaper than any cash fare this decade. Economy redemptions under 40k still lose to cash fares.</p>',
      ),
    ],
    beehiivPostId: 'bh_post_247',
    editionType: 'Transfer Bonus',
    autoGenerated: false,
    openRate: 48.9,
    clickRate: 7.4,
    unsubscribes: 12,
    revenue: 467.3,
    createdBy: 'Daynis Olman',
  }),
  edition({
    number: 246,
    subject: 'How I Flew First Class to Europe for $84',
    previewText: 'The full trip report: taxes, transfers, and the one risky move',
    date: daysAgo(9),
    status: 'Sent',
    templateId: 'tpl_daily',
    audience: 'All Subscribers',
    subscriberCount: 23480,
    blocks: dailyBlocks(
      'Trip Report: First Class to Europe for $84 All-In',
      '<p>Last month I flew Sydney–Singapore–Frankfurt in Singapore Airlines First for 148,500 KrisFlyer miles plus $84 in taxes. This is the complete breakdown: where the miles came from, the transfer timing, and the one risky connection I\'d never repeat.</p>',
    ),
    beehiivPostId: 'bh_post_246',
    editionType: 'Daily',
    autoGenerated: false,
    openRate: 49.6,
    clickRate: 7.9,
    unsubscribes: 8,
    revenue: 502.6,
    createdBy: 'Daynis Olman',
  }),
  edition({
    number: 245,
    subject: 'Virgin Australia\'s Double Status Credits Are Back',
    previewText: 'Register before you book — the fine print that trips everyone up',
    date: daysAgo(12),
    status: 'Sent',
    templateId: 'tpl_daily',
    audience: 'All Subscribers',
    subscriberCount: 23150,
    blocks: dailyBlocks(
      'Double Status Credits: Virgin Australia Returns',
      '<p>Virgin\'s double-status-credit promo is live for bookings made this week. It\'s the fastest path to Velocity Gold all year — but only if you register <em>before</em> booking. The registration gotcha and the best mileage-run routes inside.</p>',
    ),
    beehiivPostId: 'bh_post_245',
    editionType: 'Daily',
    autoGenerated: false,
    openRate: 43.2,
    clickRate: 5.2,
    unsubscribes: 15,
    revenue: 341.9,
    createdBy: 'Sarah Chen',
  }),
  edition({
    number: 244,
    subject: 'The Ultimate Guide to Airline Alliances in 2026',
    previewText: 'Oneworld vs Star vs SkyTeam — where your points work hardest',
    date: daysAgo(15),
    status: 'Sent',
    templateId: 'tpl_weekly',
    audience: 'All Subscribers',
    subscriberCount: 22900,
    blocks: [
      block(
        'Lead Story',
        'Airline Alliances in 2026: The Definitive Guide',
        'Where to park your points this year',
        '<p>Alliance dynamics shifted hard this year. Our 6,000-word guide maps every sweet spot: which program to credit which flight to, and the three partner redemptions that still price like it\'s 2019.</p>',
        { label: 'elitetravelhackers.com', url: 'https://elitetravelhackers.com/alliance-guide-2026' },
      ),
      block(
        'Article Spotlight',
        'Deep Dive: The Oneworld Sweet Spots Nobody Uses',
        'Including the 55k transpacific trick',
        '<p>The standout: Qantas points on Fiji Airways Sydney–Nadi–Los Angeles prices at 55,300 in business — half the Qantas-metal rate to the same city.</p>',
      ),
      block(
        'Personal Note',
        'A Note From Daynis',
        'Why I\'m all-in on Star Alliance this year',
        '<p>Quick personal note: after eight years loyal to Oneworld, I\'m moving my flying to Star Alliance in 2026. Here\'s the math that changed my mind — and what it means for the guides coming this quarter.</p>',
      ),
    ],
    beehiivPostId: 'bh_post_244',
    editionType: 'Special',
    autoGenerated: false,
    openRate: 46.7,
    clickRate: 6.4,
    unsubscribes: 13,
    revenue: 428.1,
    createdBy: 'Daynis Olman',
  }),
  edition({
    number: 243,
    subject: 'We Miss You: 3 Deals That\'ll Bring You Back',
    previewText: 'Hand-picked for readers who haven\'t opened in a while',
    date: daysAgo(18),
    status: 'Sent',
    templateId: 'tpl_weekly',
    audience: 'Win-Back Segment',
    subscriberCount: 21920,
    blocks: [
      block(
        'Lead Story',
        '3 Deals Worth Reopening Your Inbox For',
        'Our best finds since you last opened',
        '<p>You haven\'t opened in a while — fair enough, inboxes are brutal. Here are the three best deals you missed, still live: a $599 return to Tokyo, a 90k card bonus, and a status shortcut that takes one weekend.</p>',
      ),
      block(
        'Deal Alert',
        'Still Live: Sydney → Tokyo $599 Return',
        'Full-service, bags included',
        '<p>The ANA sale from two weeks ago is still ticketing for select March dates. Full-service with 46kg of bags — beats every LCC once you add luggage.</p>',
      ),
      block(
        'Personal Note',
        'Tell Us What You Want More Of',
        'One-click poll inside',
        '<p>Hit the poll and tell us what to send you: more error fares, more card offers, or more trip reports. We read every vote.</p>',
      ),
    ],
    beehiivPostId: 'bh_post_243',
    editionType: 'Win-Back',
    autoGenerated: false,
    openRate: 38.5,
    clickRate: 4.1,
    unsubscribes: 62,
    revenue: 189.4,
    createdBy: 'Sarah Chen',
  }),
  // ── Current drafts / queued ──
  edition({
    number: 252,
    subject: 'Singapore Airlines\' New A380 Suites Come to Sydney',
    previewText: 'First look at the new cabin — and the award space to book it',
    date: new Date(now),
    status: 'Writing',
    templateId: 'tpl_daily',
    audience: 'All Subscribers',
    subscriberCount: 24300,
    blocks: dailyBlocks(
      'Singapore Airlines\' New A380 Suites Land in Sydney',
      '<p>Singapore Airlines has confirmed the refurbished A380 — with the new six-suite first class cabin — begins Sydney service in November. We\'ve tracked down the award-space calendar and the exact KrisFlyer rates before they inevitably rise.</p>',
    ),
    editionType: 'Daily',
    autoGenerated: false,
    voiceNotes: [
      {
        id: 'vn_252_1',
        type: 'direction',
        mode: 'typed',
        transcript: 'Lead with the award-space angle — everyone will cover the cabin, nobody will have the availability calendar.',
        contributor: 'Daynis Olman',
        timestamp: daysAgo(0.2),
      },
      {
        id: 'vn_252_2',
        type: 'tip',
        mode: 'recorded',
        transcript: 'Mention the KrisFlyer waitlist trick for Suites — readers always ask.',
        contributor: 'Sarah Chen',
        timestamp: daysAgo(0.1),
        duration: 47,
      },
    ],
    comments: [
      {
        id: 'cmt_252_1',
        author: 'Sarah Chen',
        authorInitials: 'SC',
        text: 'Award calendar screenshot is in the shared drive — added to the Lead Story block.',
        mentions: [],
        createdAt: daysAgo(0.15),
      },
    ],
    activityLog: [
      { id: 'act_252_1', actor: 'Daynis Olman', action: 'Edition created', timestamp: daysAgo(1.2) },
      { id: 'act_252_2', actor: 'Sarah Chen', action: 'Status changed: Curating → Writing', timestamp: daysAgo(0.5) },
    ],
    createdBy: 'Daynis Olman',
  }),
  edition({
    number: 253,
    subject: 'Weekend Deal Alert: Bali from $199, Tokyo $599',
    previewText: 'Three weekend fares worth your annual leave',
    date: daysAhead(1),
    status: 'Scheduled',
    templateId: 'tpl_deal_alert',
    audience: 'All Subscribers',
    subscriberCount: 24300,
    scheduledAt: daysAhead(1),
    blocks: [
      block(
        'Deal Alert',
        'Weekend Fares: Bali $199, Tokyo $599, Queenstown $249',
        'All return, all this weekend\'s booking window',
        '<p>Three fares worth booking before Monday: Jetstar\'s Bali sale at $199 return, the still-ticketing ANA Tokyo fare at $599, and a rare Virgin Queenstown deal at $249 for ski season.</p>',
      ),
      block(
        'Tip of the Day',
        'Tip: Stack the Bali Fare With the Amex Travel Credit',
        'Net $49 flights if your credit is unused',
        '<p>Explorer and Platinum Edge holders: book the Bali fare through Amex Travel to burn this year\'s $150–$200 travel credit. Net cost on the $199 fare drops to under $50.</p>',
      ),
    ],
    editionType: 'Deal Alert',
    autoGenerated: true,
    activityLog: [
      { id: 'act_253_1', actor: 'Auto-curate', action: 'Edition auto-generated', timestamp: daysAgo(0.8) },
      { id: 'act_253_2', actor: 'Daynis Olman', action: 'Scheduled for send', timestamp: daysAgo(0.3) },
    ],
    createdBy: 'Auto-curate',
  }),
];

// ─── Seed: edition tasks ─────────────────────────────────────────────────────

const tasksByEdition = new Map<string, EditionTask[]>();

function task(
  editionNumber: number,
  seq: number,
  partial: Omit<EditionTask, 'id' | 'createdAt' | 'updatedAt' | 'subtasks' | 'comments'> & {
    subtasks?: EditionTask['subtasks'];
    comments?: EditionTask['comments'];
  },
): EditionTask {
  return {
    subtasks: [],
    comments: [],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0.2),
    ...partial,
    id: `task_${editionNumber}_${seq}`,
  };
}

tasksByEdition.set('ed_252', [
  task(252, 1, {
    title: 'Source award-space screenshots for SIN Suites calendar',
    type: 'Research',
    priority: 'High',
    status: 'Complete',
    assignees: ['Sarah Chen'],
    due: 'Today',
    subtasks: [
      { id: 'st_252_1a', title: 'KrisFlyer availability grid Nov–Dec', completed: true },
      { id: 'st_252_1b', title: 'Screenshot suite cabin renders', completed: true },
    ],
    comments: [
      { id: 'tc_252_1', author: 'Sarah Chen', text: 'Screenshots uploaded to shared drive, linked in Lead Story.', createdAt: daysAgo(0.15) },
    ],
  }),
  task(252, 2, {
    title: 'Write Lead Story draft (900 words)',
    type: 'Writing',
    priority: 'High',
    status: 'In Progress',
    assignees: ['Daynis Olman'],
    due: 'Today',
    subtasks: [
      { id: 'st_252_2a', title: 'Award rates table', completed: true },
      { id: 'st_252_2b', title: 'Waitlist trick section', completed: false },
    ],
  }),
  task(252, 3, {
    title: 'Verify KrisFlyer waitlist rules still current',
    type: 'Fact-check',
    priority: 'Medium',
    status: 'Blocked',
    assignees: ['Sarah Chen'],
    due: 'Tomorrow',
    blockReason: 'Waiting on SQ press office confirmation',
  }),
  task(252, 4, {
    title: 'Subject line A/B variants',
    type: 'Review',
    priority: 'Medium',
    status: 'Pending',
    assignees: ['Daynis Olman'],
    due: 'Tomorrow',
  }),
  task(252, 5, {
    title: 'Schedule social posts for send day',
    type: 'Distribution',
    priority: 'Low',
    status: 'Pending',
    assignees: ['Sarah Chen'],
    due: 'Send day',
  }),
]);

tasksByEdition.set('ed_253', [
  task(253, 1, {
    title: 'Confirm all three fares still ticketing',
    type: 'Fact-check',
    priority: 'High',
    status: 'Complete',
    assignees: ['Daynis Olman'],
    due: 'Yesterday',
  }),
  task(253, 2, {
    title: 'Pre-send test to seed list',
    type: 'QA',
    priority: 'Medium',
    status: 'Complete',
    assignees: ['Sarah Chen'],
    due: 'Yesterday',
  }),
  task(253, 3, {
    title: 'Monitor error-fare chatter for honour/deny signals',
    type: 'Monitoring',
    priority: 'Low',
    status: 'Pending',
    assignees: ['Daynis Olman'],
    due: 'Send day',
  }),
]);

// ─── Seed: subscribers ───────────────────────────────────────────────────────

const FIRST = ['liam','olivia','noah','emma','oliver','ava','elijah','sophia','lucas','mia','ethan','isabella','mason','amelia','logan','harper','james','evelyn','benjamin','abigail','henry','ella','jack','scarlett','owen','grace','leo','chloe','daniel','victoria','ryan','aria','nathan','lily','adam','zoe','luke','hannah','sam','ruby','tom','ivy'];
const LAST = ['walker','nguyen','patel','smith','jones','brown','taylor','wilson','evans','thomas','roberts','johnson','lewis','lee','martin','clark','rodriguez','hall','young','king','wright','scott','green','baker','adams','nelson','hill','campbell','mitchell','carter'];
const SOURCES: [string, number][] = [
  ['Organic', 0.34],
  ['Referral', 0.22],
  ['Twitter/X', 0.14],
  ['Instagram', 0.11],
  ['Podcast', 0.09],
  ['Partner', 0.06],
  ['Paid', 0.04],
];
const LIFECYCLE: SubscriberProfile['lifecycleStage'][] = ['new', 'active', 'active', 'engaged', 'engaged', 'engaged', 'active', 'at-risk', 'active', 'engaged'];

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRand(42);

function pickSource(): string {
  const r = rand();
  let acc = 0;
  for (const [src, weight] of SOURCES) {
    acc += weight;
    if (r <= acc) return src;
  }
  return 'Organic';
}

const subscribers: SubscriberProfile[] = (() => {
  const list: SubscriberProfile[] = [];
  // 140 representative active profiles (sample of the 24.3k list) +
  // a few unsubscribed/bounced so the funnel and churn numbers render.
  for (let i = 0; i < 148; i++) {
    const first = FIRST[Math.floor(rand() * FIRST.length)];
    const last = LAST[Math.floor(rand() * LAST.length)];
    const joinedDaysAgo = Math.floor(rand() * 89); // spread across the 90-day window
    const status: SubscriberProfile['status'] =
      i >= 144 ? 'unsubscribed' : i >= 141 ? 'bounced' : 'active';
    const stage = LIFECYCLE[Math.floor(rand() * LIFECYCLE.length)];
    const source = pickSource();
    const tags = [`source:${source}`];
    if (rand() > 0.55) tags.push('premium-curious');
    if (rand() > 0.7) tags.push('deal-alerts-only');
    if (stage === 'engaged') tags.push('high-intent');
    list.push({
      id: `sub_${(i + 1).toString().padStart(3, '0')}`,
      email: `${first}.${last}${i % 7 === 0 ? Math.floor(rand() * 90 + 10) : ''}@example.com`,
      beehiivSubscriberId: `bh_sub_${(100000 + i).toString(36)}`,
      status,
      tags,
      segments: stage === 'new' ? ['New Subscribers'] : ['All Subscribers', 'Engaged Only'].slice(0, rand() > 0.5 ? 2 : 1),
      lifecycleStage: status === 'unsubscribed' ? 'churned' : stage,
      engagementScore: Math.round(rand() * 100),
      referralCount: rand() > 0.8 ? Math.floor(rand() * 12) : 0,
      joinedAt: daysAgo(joinedDaysAgo),
      // recent unsubscribes must look recent for netGrowth math
      lastSyncedAt: status === 'unsubscribed' ? daysAgo(Math.floor(rand() * 20)) : daysAgo(0.5),
      customFields:
        rand() > 0.6
          ? { home_airport: ['SYD', 'MEL', 'BNE', 'PER'][Math.floor(rand() * 4)] }
          : {},
    });
  }
  return list;
})();

// ─── Seed: competitor newsletters ────────────────────────────────────────────

function competitorNl(partial: Omit<CompetitorNewsletter, 'id'>): CompetitorNewsletter {
  return { ...partial, id: `cn_${partial.competitor.replace(/\W+/g, '_').toLowerCase()}_${partial.receivedAt.getTime().toString(36)}` };
}

const competitorNewsletters: CompetitorNewsletter[] = [
  competitorNl({
    competitor: 'The Points Guy',
    competitorFavicon: 'https://picsum.photos/seed/tpg/32/32',
    subject: 'Last chance: 100k Chase Sapphire bonus ends tonight',
    receivedAt: daysAgo(0.4),
    topics: ['Card Signup Bonus', 'Chase', 'Transfer Partners'],
    coverageOverlap: 'covered',
    coveredArticleId: 'art_sapphire_100k',
    isRead: true,
    summary: [
      'Pushes the 100k Sapphire Preferred bonus with a same-day expiry hook.',
      'Three affiliate links above the fold, all Chase.',
      'Includes a weak "what to book" section — no AU angles.',
    ],
    cardsMentioned: [
      { name: 'Chase Sapphire Preferred', hasAffiliate: true },
      { name: 'Amex Gold', hasAffiliate: true },
    ],
    dealsPromoted: ['100k Sapphire Preferred signup bonus'],
    contentStructure: 'Hero card offer → 3 card comparisons → transfer partner list → deals footer',
    originalUrl: 'https://thepointsguy.com/newsletter/',
    links: [
      { url: 'https://thepointsguy.com/cards/chase-sapphire-preferred/', text: 'Apply: 100k Sapphire Preferred', type: 'affiliate', product: 'Chase Sapphire Preferred', network: 'Bankrate', position: 1 },
      { url: 'https://thepointsguy.com/guide/chase-transfer-partners/', text: 'Chase transfer partners guide', type: 'article', position: 2 },
      { url: 'https://thepointsguy.com/deals/', text: 'This week\'s deals', type: 'article', position: 3 },
    ],
    sections: [
      { type: 'Card Offer', wordCount: 420, color: '#2563eb' },
      { type: 'Comparison', wordCount: 310, color: '#7c3aed' },
      { type: 'Deals', wordCount: 180, color: '#059669' },
    ],
    aiScores: { overall: 7.8, contentQuality: 7.2, affiliateStrategy: 8.9, engagement: 7.6, design: 8.1, subjectLine: 7.4 },
    ads: [{ brand: 'Chase', type: 'Card affiliate', position: 1, adCopy: '100k bonus after $4k spend', url: 'https://thepointsguy.com/cards/chase-sapphire-preferred/', isAd: true }],
  }),
  competitorNl({
    competitor: 'One Mile at a Time',
    competitorFavicon: 'https://picsum.photos/seed/omaat/32/32',
    subject: 'Singapore A380 new Suites: award space wide open',
    receivedAt: daysAgo(1.1),
    topics: ['Award Availability', 'Singapore Airlines', 'First Class'],
    coverageOverlap: 'pipeline',
    pipelineArticleId: 'art_sq_a380_suites',
    isRead: true,
    summary: [
      'Covers the same SQ A380 Suites news as our draft #252.',
      'Focuses on cabin review; only two paragraphs on award space.',
      'Our angle (availability calendar) is the differentiator.',
    ],
    cardsMentioned: [{ name: 'Citi Premier', hasAffiliate: true }],
    dealsPromoted: ['KrisFlyer Suites award availability'],
    contentStructure: 'Trip report style → cabin details → booking advice',
    originalUrl: 'https://onemileatatime.com/',
    links: [
      { url: 'https://onemileatatime.com/guides/singapore-krisflyer/', text: 'KrisFlyer guide', type: 'article', position: 1 },
      { url: 'https://onemileatatime.com/credit-cards/', text: 'Best cards for Singapore miles', type: 'affiliate', product: 'Citi Premier', network: 'Direct', position: 2 },
    ],
    sections: [
      { type: 'Trip Report', wordCount: 680, color: '#0891b2' },
      { type: 'Booking Advice', wordCount: 240, color: '#059669' },
    ],
    aiScores: { overall: 8.6, contentQuality: 9.2, affiliateStrategy: 6.8, engagement: 8.4, design: 7.9, subjectLine: 8.8 },
    ads: [],
  }),
  competitorNl({
    competitor: 'Point Hacks',
    competitorFavicon: 'https://picsum.photos/seed/pointhacks/32/32',
    subject: 'Velocity 30% transfer bonus: our verdict',
    receivedAt: daysAgo(2.3),
    topics: ['Transfer Bonus', 'Velocity', 'Amex'],
    coverageOverlap: 'covered',
    coveredArticleId: 'art_velocity_transfer_30',
    isRead: false,
    summary: [
      'Same Velocity transfer bonus we covered in #247.',
      'Their math table is better than ours — worth borrowing the format.',
      'No mention of the Singapore routing sweet spot we flagged.',
    ],
    cardsMentioned: [
      { name: 'Amex Platinum Edge', hasAffiliate: true },
      { name: 'Velocity High Flyer', hasAffiliate: true },
    ],
    dealsPromoted: ['Amex → Velocity 30% transfer bonus'],
    contentStructure: 'Offer summary → math tables → card pitch → FAQ',
    originalUrl: 'https://pointhacks.com.au/',
    links: [
      { url: 'https://pointhacks.com.au/credit-cards/american-express-platinum-edge/', text: 'Platinum Edge review', type: 'affiliate', product: 'Amex Platinum Edge', network: 'Direct AU', position: 1 },
      { url: 'https://pointhacks.com.au/velocity-transfer-bonus/', text: 'Transfer bonus tracker', type: 'article', position: 2 },
    ],
    sections: [
      { type: 'Offer Analysis', wordCount: 540, color: '#dc2626' },
      { type: 'Card Pitch', wordCount: 260, color: '#2563eb' },
    ],
    aiScores: { overall: 8.1, contentQuality: 8.6, affiliateStrategy: 7.9, engagement: 7.7, design: 8.0, subjectLine: 7.9 },
    ads: [{ brand: 'American Express', type: 'Card affiliate', position: 1, adCopy: '60k MR points with Platinum Edge', url: 'https://pointhacks.com.au/credit-cards/american-express-platinum-edge/', isAd: true }],
  }),
  competitorNl({
    competitor: 'Frequent Miler',
    competitorFavicon: 'https://picsum.photos/seed/fm/32/32',
    subject: 'How I manufactured $12k of spend last month',
    receivedAt: daysAgo(4.2),
    topics: ['Manufactured Spend', 'Card Strategy', 'Minimum Spend'],
    coverageOverlap: 'gap',
    isRead: true,
    summary: [
      'Deep MS playbook content we don\'t cover (AU banking rules differ).',
      'Heavy on gift-card reselling — not applicable to AU readers.',
      'Their "last chance" section format is worth stealing.',
    ],
    cardsMentioned: [{ name: 'Chase Ink Business Preferred', hasAffiliate: true }],
    dealsPromoted: [],
    contentStructure: 'Personal playbook → techniques → last-chance offers',
    originalUrl: 'https://frequentmiler.com/',
    links: [
      { url: 'https://frequentmiler.com/best-credit-card-offers/', text: 'Best card offers', type: 'affiliate', product: 'Chase Ink Business Preferred', network: 'Direct', position: 1 },
    ],
    sections: [
      { type: 'Playbook', wordCount: 890, color: '#7c3aed' },
      { type: 'Offers', wordCount: 200, color: '#2563eb' },
    ],
    aiScores: { overall: 8.9, contentQuality: 9.4, affiliateStrategy: 7.2, engagement: 9.1, design: 8.2, subjectLine: 9.0 },
    ads: [],
  }),
  competitorNl({
    competitor: 'Australian Frequent Flyer',
    competitorFavicon: 'https://picsum.photos/seed/aff/32/32',
    subject: 'Qantas double status credits + new Tokyo route',
    receivedAt: daysAgo(5.6),
    topics: ['Status Credits', 'Qantas', 'Route News'],
    coverageOverlap: 'covered',
    coveredArticleId: 'art_qf_double_status',
    isRead: false,
    summary: [
      'Combines two stories we ran separately.',
      'Forum-sourced angle — quotes member experiences heavily.',
      'Weaker on the booking math than our #245.',
    ],
    cardsMentioned: [{ name: 'Qantas Premier Platinum', hasAffiliate: true }],
    dealsPromoted: ['Qantas double status credits'],
    contentStructure: 'News brief → forum roundup → card footer',
    originalUrl: 'https://www.australianfrequentflyer.com.au/',
    links: [
      { url: 'https://www.australianfrequentflyer.com.au/credit-cards/', text: 'Qantas card offers', type: 'affiliate', product: 'Qantas Premier Platinum', network: 'Direct AU', position: 1 },
    ],
    sections: [
      { type: 'News', wordCount: 380, color: '#dc2626' },
      { type: 'Forum Roundup', wordCount: 420, color: '#059669' },
    ],
    aiScores: { overall: 7.2, contentQuality: 7.6, affiliateStrategy: 6.4, engagement: 7.8, design: 6.8, subjectLine: 7.0 },
    ads: [{ brand: 'Qantas Money', type: 'Card affiliate', position: 1, adCopy: 'Premier Platinum: 90k Qantas Points', url: 'https://www.australianfrequentflyer.com.au/credit-cards/', isAd: true }],
  }),
  competitorNl({
    competitor: 'View from the Wing',
    competitorFavicon: 'https://picsum.photos/seed/vftw/32/32',
    subject: 'United quietly devalues partner awards again',
    receivedAt: daysAgo(7.8),
    topics: ['Devaluation', 'United', 'Award Charts'],
    coverageOverlap: 'gap',
    isRead: false,
    summary: [
      'Breaking coverage of a United partner devaluation.',
      'AU impact is minimal but KrisFlyer readers should know the pattern.',
      'Strong outrage-driven engagement — 400+ comments referenced.',
    ],
    cardsMentioned: [],
    dealsPromoted: [],
    contentStructure: 'Breaking news → analysis → what to do now',
    originalUrl: 'https://viewfromthewing.com/',
    links: [
      { url: 'https://viewfromthewing.com/united-devaluation/', text: 'Full devaluation analysis', type: 'article', position: 1 },
    ],
    sections: [
      { type: 'Breaking News', wordCount: 460, color: '#dc2626' },
      { type: 'Analysis', wordCount: 520, color: '#0891b2' },
    ],
    aiScores: { overall: 7.9, contentQuality: 8.8, affiliateStrategy: 5.2, engagement: 8.9, design: 7.1, subjectLine: 8.5 },
    ads: [],
  }),
  competitorNl({
    competitor: 'The Points Guy',
    competitorFavicon: 'https://picsum.photos/seed/tpg/32/32',
    subject: 'Best business-class sweet spots to Asia right now',
    receivedAt: daysAgo(9.4),
    topics: ['Sweet Spots', 'Business Class', 'Asia'],
    coverageOverlap: 'pipeline',
    pipelineArticleId: 'art_asia_sweet_spots',
    isRead: true,
    summary: [
      'Listicle of 8 Asia sweet spots — 3 overlap with our alliance guide.',
      'Their ANA-via-Virgin trick is one we haven\'t covered. Gap!',
      'Affiliate density high: 6 card links in one email.',
    ],
    cardsMentioned: [
      { name: 'Amex Platinum', hasAffiliate: true },
      { name: 'Capital One Venture X', hasAffiliate: true },
    ],
    dealsPromoted: ['ANA business via Virgin Atlantic miles'],
    contentStructure: 'Listicle (8 items) → card wall → deals footer',
    originalUrl: 'https://thepointsguy.com/newsletter/',
    links: [
      { url: 'https://thepointsguy.com/cards/amex-platinum/', text: 'Amex Platinum 175k offer', type: 'affiliate', product: 'Amex Platinum', network: 'Bankrate', position: 1 },
      { url: 'https://thepointsguy.com/guide/ana-virgin-sweet-spot/', text: 'ANA via Virgin explained', type: 'article', position: 2 },
    ],
    sections: [
      { type: 'Listicle', wordCount: 760, color: '#7c3aed' },
      { type: 'Card Wall', wordCount: 290, color: '#2563eb' },
    ],
    aiScores: { overall: 7.5, contentQuality: 7.0, affiliateStrategy: 9.1, engagement: 7.3, design: 8.3, subjectLine: 6.9 },
    ads: [
      { brand: 'American Express', type: 'Card affiliate', position: 1, adCopy: '175k MR points welcome offer', url: 'https://thepointsguy.com/cards/amex-platinum/', isAd: true },
      { brand: 'Capital One', type: 'Card affiliate', position: 2, adCopy: 'Venture X: 75k miles', url: 'https://thepointsguy.com/cards/venture-x/', isAd: true },
    ],
  }),
  competitorNl({
    competitor: 'Point Hacks',
    competitorFavicon: 'https://picsum.photos/seed/pointhacks/32/32',
    subject: 'Endeavour awards: the hidden Qantas partner trick',
    receivedAt: daysAgo(12.5),
    topics: ['Qantas Partners', 'Award Hack', 'Regional Travel'],
    coverageOverlap: 'gap',
    isRead: false,
    summary: [
      'Niche AU-specific partner award trick we genuinely missed.',
      'Perfect Quick Brief candidate — save as topic.',
      'Low affiliate load, high utility. Their best email this month.',
    ],
    cardsMentioned: [],
    dealsPromoted: ['Qantas partner awards on Eastern Australia routes'],
    contentStructure: 'Single-topic deep dive → step-by-step → caveats',
    originalUrl: 'https://pointhacks.com.au/',
    links: [
      { url: 'https://pointhacks.com.au/qantas-partner-awards/', text: 'Partner award guide', type: 'article', position: 1 },
    ],
    sections: [{ type: 'Deep Dive', wordCount: 640, color: '#0891b2' }],
    aiScores: { overall: 8.4, contentQuality: 9.0, affiliateStrategy: 5.6, engagement: 8.2, design: 7.8, subjectLine: 8.1 },
    ads: [],
  }),
  competitorNl({
    competitor: 'One Mile at a Time',
    competitorFavicon: 'https://picsum.photos/seed/omaat/32/32',
    subject: 'Review: Emirates new premium economy A380',
    receivedAt: daysAgo(14.1),
    topics: ['Trip Report', 'Emirates', 'Premium Economy'],
    coverageOverlap: 'covered',
    coveredArticleId: 'art_ek_pe_review',
    isRead: true,
    summary: [
      'Standard OMAAT trip report, strong photography.',
      'Premium economy is a search-growth topic for us.',
      'No award booking angle — pure review.',
    ],
    cardsMentioned: [],
    dealsPromoted: [],
    contentStructure: 'Trip report → seat scoring → bottom line',
    originalUrl: 'https://onemileatatime.com/',
    links: [{ url: 'https://onemileatatime.com/emirates-premium-economy/', text: 'Full review', type: 'article', position: 1 }],
    sections: [{ type: 'Trip Report', wordCount: 980, color: '#059669' }],
    aiScores: { overall: 8.2, contentQuality: 9.1, affiliateStrategy: 4.8, engagement: 8.0, design: 8.9, subjectLine: 7.6 },
    ads: [],
  }),
  competitorNl({
    competitor: 'Frequent Miler',
    competitorFavicon: 'https://picsum.photos/seed/fm/32/32',
    subject: 'Which points are actually worth buying in 2026?',
    receivedAt: daysAgo(16.9),
    topics: ['Buying Points', 'Promotions', 'Valuations'],
    coverageOverlap: 'pipeline',
    pipelineArticleId: 'art_buying_points_2026',
    isRead: false,
    summary: [
      'Annual "buy points" valuation piece.',
      'Their per-program buy/don\'t-buy table format is excellent.',
      'We should publish our AU version before their next one.',
    ],
    cardsMentioned: [],
    dealsPromoted: ['United 100% buy-miles bonus', 'Hilton 100% buy-points bonus'],
    contentStructure: 'Valuation framework → per-program table → verdicts',
    originalUrl: 'https://frequentmiler.com/',
    links: [{ url: 'https://frequentmiler.com/buy-points-guide/', text: 'Buy-points master guide', type: 'article', position: 1 }],
    sections: [
      { type: 'Analysis', wordCount: 720, color: '#0891b2' },
      { type: 'Table', wordCount: 300, color: '#7c3aed' },
    ],
    aiScores: { overall: 8.7, contentQuality: 9.3, affiliateStrategy: 6.6, engagement: 8.8, design: 8.5, subjectLine: 8.7 },
    ads: [],
  }),
];

// ─── Seed: competitor debriefs ───────────────────────────────────────────────

const debriefs: CompetitorDebrief[] = [
  {
    id: 'dbf_1',
    date: new Date(now).toISOString().slice(0, 10),
    generatedAt: daysAgo(0.5),
    status: 'new',
    competitorsCovered: ['The Points Guy', 'One Mile at a Time', 'Point Hacks', 'Frequent Miler', 'Australian Frequent Flyer'],
    newslettersReceived: 6,
    subjectLines: [
      { competitor: 'The Points Guy', subject: 'Last chance: 100k Chase Sapphire bonus ends tonight' },
      { competitor: 'One Mile at a Time', subject: 'Singapore A380 new Suites: award space wide open' },
      { competitor: 'Point Hacks', subject: 'Velocity 30% transfer bonus: our verdict' },
    ],
    themes: [
      { theme: 'Card signup bonuses with urgency hooks', importance: 'high', competitorCount: 3, competitors: ['The Points Guy', 'Point Hacks', 'Australian Frequent Flyer'] },
      { theme: 'Premium cabin award availability', importance: 'high', competitorCount: 2, competitors: ['One Mile at a Time', 'The Points Guy'] },
      { theme: 'Transfer bonus coverage', importance: 'medium', competitorCount: 2, competitors: ['Point Hacks', 'Frequent Miler'] },
    ],
    promotions: [
      { cardName: 'Chase Sapphire Preferred', mentionedBy: ['The Points Guy'], position: 'Hero', ethStatus: 'N/A (US card)' },
      { cardName: 'Amex Platinum Edge', mentionedBy: ['Point Hacks'], position: 'Mid-email', ethStatus: 'Covered in #249' },
      { cardName: 'Qantas Premier Platinum', mentionedBy: ['Australian Frequent Flyer'], position: 'Footer', ethStatus: 'Not covered' },
    ],
    gaps: [
      { topic: 'ANA-via-Virgin sweet spot to Asia', competitors: ['The Points Guy'], opportunity: 'AU-adapted version of their sweet-spot listicle', priority: 'high' },
      { topic: 'Qantas partner awards on regional routes', competitors: ['Point Hacks'], opportunity: 'Deep-dive Quick Brief — they proved demand', priority: 'medium' },
    ],
    recommendations: [
      'Publish the ANA-via-Virgin guide this week — TPG validated the topic.',
      'Borrow Point Hacks\' transfer-math table format for bonus coverage.',
      'Lead #252 with the award calendar, not the cabin review (OMAAT already owns that angle).',
    ],
  },
  {
    id: 'dbf_2',
    date: daysAgo(1).toISOString().slice(0, 10),
    generatedAt: daysAgo(1.5),
    status: 'reviewed',
    competitorsCovered: ['The Points Guy', 'Frequent Miler', 'View from the Wing'],
    newslettersReceived: 4,
    subjectLines: [
      { competitor: 'Frequent Miler', subject: 'How I manufactured $12k of spend last month' },
      { competitor: 'View from the Wing', subject: 'United quietly devalues partner awards again' },
    ],
    themes: [
      { theme: 'Program devaluations', importance: 'high', competitorCount: 2, competitors: ['View from the Wing', 'Frequent Miler'] },
      { theme: 'Manufactured spend playbooks', importance: 'low', competitorCount: 1, competitors: ['Frequent Miler'] },
    ],
    promotions: [
      { cardName: 'Chase Ink Business Preferred', mentionedBy: ['Frequent Miler'], position: 'Mid-email', ethStatus: 'N/A (US card)' },
    ],
    gaps: [
      { topic: 'Devaluation early-warning pattern guide', competitors: ['View from the Wing'], opportunity: 'Evergreen "how to spot a coming devaluation" explainer', priority: 'low' },
    ],
    recommendations: [
      'Skip MS content — AU banking rules make it inapplicable.',
      'Add a "devaluation watch" note to the weekly template footer.',
    ],
  },
];

// ─── Seed: newsletter config ─────────────────────────────────────────────────

const configs: NewsletterConfig[] = [
  {
    id: MOCK_PUBLICATION.id,
    templates: [
      { id: 'tpl_daily', name: 'Daily Edition', beehiivTemplateId: 'bh_tpl_daily', lastUsed: daysAgo(1) },
      { id: 'tpl_deal_alert', name: 'Deal Alert', beehiivTemplateId: 'bh_tpl_deal', lastUsed: daysAgo(3) },
      { id: 'tpl_weekly', name: 'Weekly Roundup', beehiivTemplateId: 'bh_tpl_weekly', lastUsed: daysAgo(15) },
    ],
    audiences: ['All Subscribers', 'Engaged Only', 'New Subscribers', 'Win-Back Segment'],
    defaultSendTime: '07:00',
    beehiivPublicationId: MOCK_PUBLICATION.id,
    lastSyncedAt: daysAgo(0.5),
  },
];
