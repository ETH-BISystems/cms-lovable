import type { IframeInstanceCard, IframeTableRow } from '../types';

/**
 * Client-side mirror of the server registry (functions/src/iframes/registry.ts).
 * The functions bundle can't be imported from the client, so display metadata
 * and client-side pre-validation live here. The server re-validates everything.
 */
export interface IframeTypeInfo {
  id: string;
  label: string;
  description: string;
  /** 'cards' → card slots payload; 'table' → custom rows payload. */
  kind: 'cards' | 'table';
  minCards: number;
  maxCards: number;
  /** Exactly this many slots (no add/remove in the configurator). */
  fixedCards?: number;
  /** Per-card custom-text input. */
  allowCustomText: boolean;
  /** Per-card Read-more URL override input. */
  allowReadMore: boolean;
  maxCustomTextLength: number;
  /** Table kind: max rows. */
  maxRows: number;
  /** Hidden from the insert picker; existing instances keep working. */
  legacy?: boolean;
}

export const IFRAME_TYPES: IframeTypeInfo[] = [
  {
    id: 'complementary-cards',
    label: 'Complementary cards',
    description:
      'Vertical card list — choose as many cards as needed (1–12) from the Card Data Manager, each with per-card custom text (up to 250 characters, shown over 4 lines) and a Read more link to the card review page. Card image and title update live.',
    kind: 'cards',
    minCards: 1,
    maxCards: 12,
    allowCustomText: true,
    allowReadMore: true,
    // CMS-173: matches the renderer's 4-line clamp (was 500 — text past
    // ~180 chars was silently truncated at 3 lines).
    maxCustomTextLength: 250,
    maxRows: 0,
  },
  {
    id: 'comparable-cards',
    label: 'Comparable cards',
    description:
      'Fixed 3-card comparison — every field pulls live from the Card Data Manager (image, name, annual fee, welcome offer, Our Score); Read our review links to each card review page. No custom text.',
    kind: 'cards',
    minCards: 3,
    maxCards: 3,
    fixedCards: 3,
    allowCustomText: false,
    allowReadMore: false,
    maxCustomTextLength: 0,
    maxRows: 0,
  },
  {
    id: 'deals',
    label: 'Deals',
    description:
      'Fixed 3-card strip — card image and name live from the Card Data Manager, with a custom text line per card. No links (per Figma design).',
    kind: 'cards',
    minCards: 3,
    maxCards: 3,
    fixedCards: 3,
    allowCustomText: true,
    allowReadMore: false,
    maxCustomTextLength: 500,
    maxRows: 0,
  },
  {
    id: 'custom-table',
    label: 'Table',
    description:
      'Custom label/value table — every line is custom text; add as many rows as needed (up to 30).',
    kind: 'table',
    minCards: 0,
    maxCards: 0,
    allowCustomText: false,
    allowReadMore: false,
    maxCustomTextLength: 0,
    maxRows: 30,
  },
  {
    id: 'offer-history',
    label: 'Offer History',
    description:
      'The card\'s welcome-offer history table (Offer Dates / Offer Details), scraped from the review sources and rendered live — pick exactly ONE card (the card the page is about). No custom text; rows update on every scrape.',
    kind: 'cards',
    minCards: 1,
    maxCards: 1,
    fixedCards: 1,
    allowCustomText: false,
    allowReadMore: false,
    maxCustomTextLength: 0,
    maxRows: 0,
  },
  {
    id: 'iframe-a',
    label: 'iFrame A',
    description:
      'Legacy card list (2–6 cards) — superseded by Complementary cards. Existing embeds keep working.',
    kind: 'cards',
    minCards: 2,
    maxCards: 6,
    allowCustomText: true,
    allowReadMore: true,
    maxCustomTextLength: 500,
    maxRows: 0,
    legacy: true,
  },
];

/** Types offered when creating a NEW instance (legacy types are edit-only). */
export const INSERTABLE_IFRAME_TYPES = IFRAME_TYPES.filter((t) => !t.legacy);

export function getIframeTypeInfo(type: string): IframeTypeInfo | undefined {
  return IFRAME_TYPES.find((t) => t.id === type);
}

/** Instance ID from an embed src like `https://host/iframe/abc123`. */
export function extractInstanceIdFromSrc(src: string): string | null {
  const m = src.match(/\/iframe\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

/** All instance IDs referenced in an HTML string (deduped). */
export function extractIframeIdsFromHtml(html: string): string[] {
  const ids: string[] = [];
  const re = /\/iframe\/([A-Za-z0-9_-]{6,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

/** Move the item at `from` to `to`, returning a new array (original untouched). */
export function reorderCards<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

const HTTP_URL = /^https?:\/\/\S+$/i;

/**
 * Client-side pre-validation mirroring the server registry. Returns an error
 * message or null when valid. Table types validate rows; card types validate
 * cards (bounds/flags come from the type info).
 */
export function validateIframeConfig(
  info: IframeTypeInfo,
  cards: IframeInstanceCard[],
  rows?: IframeTableRow[]
): string | null {
  if (info.kind === 'table') {
    const list = rows ?? [];
    if (list.length < 1) return 'Add at least one row.';
    if (list.length > info.maxRows) return `At most ${info.maxRows} rows.`;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r.label.trim() && !r.value.trim()) return `Row ${i + 1} is empty.`;
      if (r.label.length > 120) return `Row ${i + 1} label exceeds 120 characters.`;
      if (r.value.length > 300) return `Row ${i + 1} value exceeds 300 characters.`;
    }
    return null;
  }

  if (info.fixedCards !== undefined && cards.length !== info.fixedCards) {
    return `This element needs exactly ${info.fixedCards} cards.`;
  }
  if (cards.length < info.minCards) return `Select at least ${info.minCards} card${info.minCards === 1 ? '' : 's'}.`;
  if (cards.length > info.maxCards) return `Select at most ${info.maxCards} cards.`;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!c.cardId) return `Card slot ${i + 1} is empty — pick a card or remove the slot.`;
    if (info.allowCustomText && c.customText.length > info.maxCustomTextLength) {
      return `Custom text on card ${i + 1} exceeds ${info.maxCustomTextLength} characters.`;
    }
    if (info.allowReadMore && c.readMoreUrl && !HTTP_URL.test(c.readMoreUrl)) {
      return `Read more URL on card ${i + 1} must start with http:// or https://.`;
    }
  }
  return null;
}
