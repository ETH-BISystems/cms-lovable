/**
 * MOCK-ONLY — shared deterministic seed helpers for the keywords module's
 * in-memory services. A tiny PRNG keeps every service's generated data stable
 * across re-renders for the same input (same seed keyword → same numbers),
 * which is what makes the history/snapshot UX believable.
 */

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small fast deterministic PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function int(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function float(rand: () => number, min: number, max: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((rand() * (max - min) + min) * f) / f;
}

export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

export function pickN<T>(rand: () => number, items: readonly T[], n: number): T[] {
  const copy = [...items];
  const out: T[] = [];
  while (copy.length > 0 && out.length < n) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
}

/** YYYY-MM labels for the trailing `count` months, ascending. */
export function trailingMonths(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** YYYY-MM-DD labels for the trailing `count` days, ascending. */
export function trailingDays(count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  }
  return out;
}

/** A gently wandering 12-point trend series that ends near `current`. */
export function trendSeries(rand: () => number, current: number, points = 12): number[] {
  const out: number[] = [];
  let v = current * (0.55 + rand() * 0.5);
  for (let i = 0; i < points - 1; i++) {
    out.push(Math.max(0, Math.round(v)));
    v *= 0.94 + rand() * 0.18;
  }
  out.push(Math.max(0, Math.round(current)));
  return out;
}

export const ETH_DOMAIN = 'elitetravelhackers.com';

export const COMPETITOR_DOMAINS = [
  'thepointsguy.com',
  'onemileatatime.com',
  'viewfromthewing.com',
  'upgradedpoints.com',
  'nerdwallet.com',
  'frequentmiler.com',
] as const;

/** Travel-hacking vocabulary for generated keywords. */
export const KW = {
  cards: [
    'amex platinum', 'chase sapphire preferred', 'chase sapphire reserve', 'capital one venture x',
    'amex gold card', 'chase freedom unlimited', 'capital one savor', 'citi strata premier',
    'bilt mastercard', 'wells fargo autograph', 'amex business platinum', 'ink business preferred',
    'chase aeroplan card', 'united quest card', 'delta skymiles reserve',
  ],
  travel: [
    'transfer partners', 'airport lounge access', 'priority pass lounges', 'centurion lounge',
    'hotel elite status', 'marriott bonvoy platinum', 'hilton diamond status', 'hyatt globalist',
    'award flights to europe', 'business class awards', 'first class to asia', 'stopover rules',
    'open jaw flights', 'fifth freedom routes', 'airline alliance guide',
  ],
  strategy: [
    'credit card churning', '5/24 rule', 'sign up bonus strategy', 'manufactured spending',
    'points vs cash back', 'best travel credit card', 'how to start travel hacking',
    'credit card application rules', 'annual fee worth it', 'retention offer',
    'product change credit card', 'refer a friend bonus', 'shopping portal bonus',
  ],
  questions: [
    'how to transfer amex points', 'what is the 5/24 rule', 'is priority pass worth it',
    'how do airline transfer partners work', 'can you have two sapphire cards',
    'when does marriott status reset', 'how to use chase points for travel',
    'which credit card has lounge access', 'does amex gold have foreign transaction fees',
    'how to get hotel status fast', 'what credit score for amex platinum',
    'is the venture x worth it', 'how to book ana first class with points',
  ],
} as const;

export const SERP_FEATURE_POOL = [
  'Featured Snippet', 'PAA', 'Image Pack', 'Video', 'Top Stories', 'Knowledge Panel',
] as const;

export const DFS_FEATURE_POOL = [
  'featured_snippet', 'people_also_ask', 'video', 'images', 'top_stories', 'knowledge_panel',
  'sitelinks', 'reviews', 'ai_overview',
] as const;

export const INTENTS = ['informational', 'commercial', 'transactional', 'navigational'] as const;
