import type { Timestamp } from '@/services/timestamp';

// ─── iFrame Instance (Firestore: iframe_instances) ───────────────────────────

export interface IframeInstanceCard {
  cardId: string;
  /** Per-instance text shown under the card title. '' = none. Never stored on the card. */
  customText: string;
  /** Per-instance Read-more URL. '' = inherit the card's reviewUrl live at render time. */
  readMoreUrl: string;
}

export interface IframeHostRef {
  collection: 'articles' | 'card_data';
  docId: string;
  /** HTML field on the host document containing the embed ('content', 'whoShouldGet', …). */
  field: string;
  /** Denormalized article title / card name at last reconcile, for the audit screen. */
  title: string;
}

/** One custom label/value line of the `custom-table` blog element. */
export interface IframeTableRow {
  label: string;
  value: string;
}

/**
 * Per-instance filter config of the `tp-table` Transfer Partner Table embed:
 * which card-program columns and which alliance row groups render.
 */
export interface IframeTpTableConfig {
  programs: string[];
  alliances: string[];
  description: string;
  /** CMS-128: compact card-review mode (no search/chips toolbar, no Award
   * Seats Open column — just logo + brand name + transfer ratio). */
  hideFilters?: boolean;
  /** CMS-145: airline filter — transfer_partner_matrix doc ids. When
   * non-empty the table renders ONLY these rows (overrides alliance rows). */
  partners?: string[];
  /** CMS-145: partner names denormalized at save time (server-maintained) —
   * display/search only; rendering keys off `partners` ids. */
  partnerNames?: string[];
}

export interface IframeInstanceDoc {
  id: string;
  type: string;
  cards: IframeInstanceCard[];
  /** Only set for table-kind instances (cards is [] for those). */
  rows?: IframeTableRow[];
  /** Only set for tp-table instances (cards/rows are [] for those). */
  tpConfig?: IframeTpTableConfig;
  /** tp-table: partner-row count at last save — drives the embed height. */
  rowCount?: number;
  hasCustomText: boolean;
  hosts: IframeHostRef[];
  hostKeys: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Where the embed is being inserted — supplied by the hosting editor. */
export interface IframeHost {
  collection: 'articles' | 'card_data';
  docId: string;
  field: string;
}

// ─── Callable inputs / results ────────────────────────────────────────────────

export interface CreateIframeInstanceInput {
  type: string;
  cards?: IframeInstanceCard[];
  /** Table types only. */
  rows?: IframeTableRow[];
  /** tp-table only. */
  tpConfig?: Partial<IframeTpTableConfig>;
  host?: IframeHost;
  origin: string;
}

export interface CreateIframeInstanceResult {
  id: string;
  embedHtml: string;
  height: number;
}

export interface UpdateIframeInstanceInput {
  instanceId: string;
  cards?: IframeInstanceCard[];
  /** Table types only. */
  rows?: IframeTableRow[];
  /** tp-table only. */
  tpConfig?: Partial<IframeTpTableConfig>;
  origin: string;
}

export interface UpdateIframeInstanceResult {
  embedHtml: string;
  height: number;
}

export interface DeleteIframeInstanceInput {
  instanceId: string;
  stripFromHosts?: boolean;
}

export interface DeleteIframeInstanceResult {
  success: boolean;
  removedFromHosts: number;
}

/** CMS-94 — reuse an existing instance's embed in another host. */
export interface GetIframeEmbedInput {
  instanceId: string;
  origin: string;
}

export interface GetIframeEmbedResult {
  id: string;
  embedHtml: string;
  height: number;
}
