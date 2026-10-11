import type { Timestamp } from '@/services/timestamp';
import type { FirestoreDocument } from '@/platform/types/firestore';

// ─── Enums / Union Types ──────────────────────────────────────────────────────

// Widened from a fixed union — categories are now managed at runtime via the
// settings/cardCategories document (see useCardCategories). The defaults below
// seed the list and act as the fallback while the settings doc loads.
export type CardCategory = string;

export const DEFAULT_CARD_CATEGORIES: CardCategory[] = [
  'Travel',
  'Cash Back',
  'Business',
  'Hotel',
  'Airline',
  'Student',
  'Secured',
];

export type CardStatus = 'current' | 'changed' | 'outdated' | 'new';

export type WebflowStatus = 'synced' | 'pending' | 'out-of-sync' | 'not-published';

export type ScrapeFrequency = 'daily' | 'twice-weekly' | 'weekly' | 'monthly';

export type ChangeSource = 'scraper' | 'manual' | 'webflow-sync';

export type AllianceGroup =
  | 'Star Alliance'
  | 'Oneworld'
  | 'SkyTeam'
  | 'Non-Alliance'
  | 'Hotels'
  /** Scraper-created partners land here until an editor assigns an alliance. */
  | '';

export type CardProgram =
  | 'chase-ur'
  | 'amex-mr'
  | 'capital-one'
  | 'bilt'
  | 'citi-ty'
  | 'wells-fargo';

// '3-plus-days' is the legacy bucket; new data uses the two finer buckets
export type TransferSpeed = 'instant' | '1-2-days' | '3-5-days' | 'up-to-7-days' | '3-plus-days';

// ─── Override Metadata ────────────────────────────────────────────────────────

export interface OverrideMetadata {
  isOverridden: boolean;
  overriddenValue: unknown;
  overriddenBy: string; // UID
  overriddenAt: Timestamp;
}

// ─── Change History ───────────────────────────────────────────────────────────

export interface ChangeHistoryEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: Timestamp;
  source: ChangeSource;
  changedBy: string; // UID or 'scraper-service'
}

// ─── Source Change History ─────────────────────────────────────────────────────

export interface SourceChangeHistoryEntry {
  date: string;
  bonusAmount: string;
  spendRequirement: string;
  details: string;
}

// ─── Card Document ────────────────────────────────────────────────────────────

export interface CardDocument extends FirestoreDocument {
  id: string;
  name: string;
  issuer: string;
  category: CardCategory;
  status: CardStatus;
  webflowStatus: WebflowStatus;
  /**
   * Editorial lifecycle. Cards are never deleted (iframe instances and article
   * tags reference them by stable document ID) — they are unpublished instead.
   * Absent on legacy documents = 'published'. Unpublished cards are hidden from
   * iframe rendering and the iframe card picker, and flagged in the CMS.
   */
  publishState?: 'published' | 'unpublished';
  scrapeFrequency: ScrapeFrequency;
  lastScraped: Timestamp;
  lastChanged: Timestamp;
  affiliateLink: string;
  issuerUrl: string;
  ratesTermsUrl: string;
  /** Live ETH review page URL — iframe embeds fall back to it for Read-more links. */
  reviewUrl?: string;
  cardImageUrl: string;
  notes: string;

  // Dynamic source URLs for multi-source scraping (replaces fixed tpgUrl/dailyDropUrl/omaatUrl)
  sourceUrls: Array<{ label: string; url: string }>;

  // @deprecated — use sourceUrls instead. Kept for backward compatibility with existing documents.
  tpgUrl: string;
  // @deprecated — use sourceUrls instead. Kept for backward compatibility with existing documents.
  dailyDropUrl: string;
  // @deprecated — use sourceUrls instead. Kept for backward compatibility with existing documents.
  omaatUrl: string;

  // Source-provided change history (scraped from review site history tables)
  sourceChangeHistory: SourceChangeHistoryEntry[];

  /** CMS-126: scrape → Gemma prose humanisation state + ZeroGPT before/after
   * scores (written by the Gemma job after each scrape; see CardDetailData). */
  proseProcessing?: CardDetailData['proseProcessing'];

  /** CMS-129: scraped offer-history rows (newest first) — rendered by the
   * offer-history iframe embed. */
  offerHistory?: ScrapedOfferHistoryEntry[];

  /** CMS-162: snapshot of the last scraper-written offerHistory rows, taken
   * when the team first overrides the table manually (setOverride). Revert
   * restores these rows instantly — the dual-value pattern's no-network
   * revert. Not written by the scraper. */
  offerHistory_scraped?: ScrapedOfferHistoryEntry[];

  // Bonus prediction
  bonusDaysActive: number;
  bonusAvgChangeDays: number;

  // Overridable fields — scraped values (written by scraper only)
  annualFee_scraped: number;
  signupBonus_scraped: string;
  bonusSpendReq_scraped: string;
  aprRange_scraped: string;

  // Overridable fields — manual values (written by manual override only)
  // CMS-123: name_manual joins — the card name can be overridden like the
  // numeric fields. `name` itself stays the scraper/original value.
  name_manual?: string;
  annualFee_manual: number;
  signupBonus_manual: string;
  bonusSpendReq_manual: string;
  aprRange_manual: string;

  // Override metadata map — keyed by field name. CMS-162: keyed by the full
  // OverridableFieldName union (CMS-117 lock fields + offerHistory), not just
  // the dual-value five.
  overrides: Partial<Record<OverridableFieldName, OverrideMetadata>>;

  // Webflow CMS item ID — set after first successful publish, used for subsequent updates
  webflowItemId?: string;
}

// ─── Transfer Partner Document ────────────────────────────────────────────────

export interface ProgramEntry {
  ratio: string; // e.g. "1:1"
  /** Optional display override when the raw ratio needs annotation (e.g. "1:1.25") */
  ratioDisplay?: string;
  speed: TransferSpeed;
  bonusPercent: number | null;
  bonusEndDate: Timestamp | null;
  /** Whether the partnership is currently active (defaults to true when absent) */
  active?: boolean;
  /** When an editor last verified this ratio/speed */
  lastVerified?: Timestamp | null;
  /** Internal editorial notes for this program-partner relationship */
  notes?: string;
  /** Last ratio the TPG scrape saw for this cell ('' = no cell on TPG). */
  ratioScraped?: string;
  /** When true the scraper never rewrites this cell's ratio/active (dual-value override). */
  manualOverride?: boolean;
}

export interface SweetSpotRedemption {
  route: string;
  points: number;
  cabin: string;
  notes: string;
}

export interface TransferPartnerDocument extends FirestoreDocument {
  id: string;
  name: string;
  type: 'airline' | 'hotel';
  alliance: AllianceGroup;
  loyaltyProgram: string;
  /** IATA-style code rendered in the partner logo tile (e.g. "UA") */
  iataCode?: string;
  /** Brand hex colour for the logo tile (e.g. "#002244") */
  brandColor?: string;
  /** CMS-108: partner logo image (Asset Library CDN URL), rendered in the
   * transfer-partner table's name cell instead of the text tile when set. */
  logoUrl?: string;
  /** CMS-110: explicit hotel brand (IHG, Marriott, Hyatt, Wyndham, Accor,
   * Choice, Leading Hotels, Hilton, Preferred Hotels) — overrides the
   * name-derived brand the table renderer uses for hotel icon lookup. */
  hotelBrand?: string;
  awardReleaseDays: number | null;
  awardReleasePattern: string | null;
  awardReleaseVerifiedAt?: Timestamp | null;
  availabilityCheckedBy?: string;
  /** TPG valuation from the transfer-partners scrape (null = "Not valued"). */
  tpgValuationCents?: number | null;
  tpgValuationText?: string;
  /** The valuation month from the TPG column header (e.g. "March 2026"). */
  tpgValuationAsOf?: string;
  /** When true the scraper never rewrites this partner's TPG valuation. */
  tpgValuationOverride?: boolean;
  /** When this partner last had values refreshed by the TPG scrape. */
  lastScrapedAt?: Timestamp;
  /** Which other programs/portals can book this partner's awards */
  alsoBookable?: string;
  programs: Partial<Record<CardProgram, ProgramEntry>>;
  sweetSpots: SweetSpotRedemption[];
  awardNotes: string;
  isAvios: boolean;
  isMarriott: boolean;
}

// ─── Point Sales ─────────────────────────────────────────────────────────────

export interface PointSaleDocument extends FirestoreDocument {
  id: string;
  program: string; // e.g. "United MileagePlus"
  description: string; // e.g. "Buy miles at 40% off"
  costPerPoint: string; // e.g. "1.2¢/point"
  endDate: Timestamp;
}

export interface ManagePointSaleInput {
  action: 'create' | 'update' | 'delete';
  saleId?: string;
  fields?: {
    program?: string;
    description?: string;
    costPerPoint?: string;
    endDate?: string; // ISO date string
  };
}

// ─── Cloud Function Input / Output Types ──────────────────────────────────────

export interface AddCardInput {
  name: string;
  issuer: string;
  annualFee: number;
  signupBonus: string;
  bonusSpendReq: string;
  category: CardCategory;
  scrapeFrequency: ScrapeFrequency;
  issuerUrl: string;
  ratesTermsUrl: string;
  affiliateLink: string;
  notes: string;

  // Dynamic source URLs array (new format)
  sourceUrls?: Array<{ label: string; url: string }>;

  // New wizard fields (all optional to avoid breaking existing addCard calls)
  timeframe?: string;
  cardImageUrl?: string;
  cardRatingsUrl?: string;
  tpgUrl?: string;
  dailyDropUrl?: string;
  omaatUrl?: string;
  upgradedPointsUrl?: string;
  competitorUrls?: Array<{ label: string; url: string }>;
}

export interface AddCardResult {
  id: string;
}

export interface CardDetailData {
  // Core Identity
  category?: CardCategory;
  bestForLabel?: string;
  topOffer?: boolean;
  foreignTransactionFee?: string;
  cardImageUrl?: string;
  cardImageDisclaimer?: string;
  reviewUrl?: string;
  /** URL slug of the card page in Webflow (blank = auto-generated from name). */
  slug?: string;

  // Welcome Offer content (Webflow: blue-header, offer-features, offer-duration)
  blueHeader?: string;
  offerFeatures?: string;
  offerDuration?: string;

  // Recommended credit (Webflow: recommended-credit — scraped, manually editable)
  recommendedCredit?: string;

  // Editorial highlights (Webflow Editorial collection: what-you-ll-love)
  whatYoullLove?: string;

  // Editorial Content
  cardHeaderParagraph?: string;
  cardOverview?: string;
  prosAbbreviated?: string[];
  /**
   * Pros — Full — edited as a bullet list (CMS-72). New saves persist a
   * string[]; legacy documents (and AI generator output) hold a paragraph
   * string that is displayed as initial bullet items via toBulletItems().
   */
  prosFull?: string | string[];
  /** Simple editorial benefits bullet list (Webflow: benefits rich text). */
  benefitsBullets?: string[];
  consAbbreviated?: string[];
  /** Cons — Full — bullet list, same string|string[] migration (CMS-72). */
  consFull?: string | string[];

  // Discrete abbreviated slots (CMS-45) — derived from the arrays above on
  // every save; map 1:1 to the Webflow pros-abbreviated-N / cons-abbreviated-N
  // bullet fields. The arrays remain the canonical editing store.
  prosAbbreviated1?: string;
  prosAbbreviated2?: string;
  prosAbbreviated3?: string;
  prosAbbreviated4?: string;
  prosAbbreviated5?: string;
  prosAbbreviated6?: string;
  prosAbbreviated7?: string;
  prosAbbreviated8?: string;
  consAbbreviated1?: string;
  consAbbreviated2?: string;
  consAbbreviated3?: string;
  consAbbreviated4?: string;
  consAbbreviated5?: string;
  consAbbreviated6?: string;
  consAbbreviated7?: string;
  consAbbreviated8?: string;
  whoShouldGet?: string;
  whoShouldNot?: string;
  /**
   * Earning Rewards — edited as a bullet list (CMS-55). New saves persist a
   * string[]; legacy documents (and scraper output) hold a rich-text string
   * that is displayed as initial bullet items via toBulletItems().
   */
  earningRewardsSection?: string | string[];
  /**
   * Earning Rewards rate/category pairs (CMS-74) — each pair renders as the
   * rate chip plus its category line, and feeds BOTH the "At a glance →
   * Rewards Rate" block and the "Rewards Summary" block in Webflow
   * (`earning-rewards` and `earn-rates` carry identical content).
   */
  earningRewardsRates?: EarningRewardRate[];
  /**
   * Special Reward Conditions (CMS-76) — the red conditions table shown next
   * to Rewards Summary (e.g. "Use the card 5 times each statement period…").
   * Maps to ETH Cards `special-reward-conditions`.
   */
  specialRewardConditions?: string;
  /**
   * Who Is This Card Good For? (CMS-75) — maps to ETH Editorial Contents
   * `who-card-good-for`. Distinct from whoShouldGet (ETH Cards who-should-get).
   */
  whoCardGoodFor?: string;
  /**
   * iFrame embed slots (CMS-97) — WYSIWYG RichText fields on ETH Cards that
   * host iFrame Manager / Transfer Partner Table embeds on the card page:
   * Complimentary Cards (before "who this card is good for"),
   * Comparable Cards (after "Rating Methodology"),
   * Transfer Partners (after "favourite airlines").
   * Stored as HTML end-to-end (same as RichTextField, CMS-90).
   */
  complimentaryCardsEmbed?: string;
  comparableCardsEmbed?: string;
  transferPartnersEmbed?: string;
  /**
   * CMS-129: 4th embed slot — the Offer History iframe, bound in the Webflow
   * card page template directly under transfer-partners-embed. Stored as
   * HTML end-to-end like the other embed slots.
   */
  offerHistoryEmbed?: string;
  /**
   * CMS-129: the card's scraped Offer History table (the review source's
   * dated list of past/current welcome offers), newest row first. Rendered
   * by the offer-history iframe type; distinct from `OfferHistoryEntry`
   * (the bonus-change history derived from change_history for the History
   * tab) and from `sourceChangeHistory` (raw scraper change log).
   */
  offerHistory?: ScrapedOfferHistoryEntry[];
  /**
   * CMS-126: scrape → Gemma prose humanisation state (written by the Gemma
   * job after each scrape). ZeroGPT scans the card's prose before and after
   * the humanise pass; scores land here for the UI to show.
   */
  proseProcessing?: {
    status: 'queued' | 'processing' | 'complete' | 'failed';
    fields?: string[];
    fieldsNormalized?: string[];
    fieldsKeptOriginal?: string[];
    /** ZeroGPT fakePercentage on the scraped prose before humanising (0-100). */
    initialAiScore?: number | null;
    /** ZeroGPT score after the Gemma humanise pass. */
    finalAiScore?: number | null;
    failureReason?: string | null;
    completedAt?: unknown;
    updatedAt?: unknown;
  };
  /** Additional Benefits — bullet list, same string|string[] migration (CMS-56). */
  additionalBenefitsSection?: string | string[];
  /** More Details — bullet list, same string|string[] migration (CMS-57). */
  moreDetailsSection?: string | string[];

  // Recommendation Tier
  dontRecommendText?: string;
  sometimesRecommendText?: string;
  alwaysRecommendText?: string;

  // Transfer & Credit Info
  transferInstructions?: string;
  recommendedCreditParagraph?: string;

  // Mission & Methodology
  ourMissionSection?: string;
  ratingMethodologySection?: string;

  // ETH Scoring
  rewardsRateScore?: number;
  signupBonusScore?: number;
  annualFeeScore?: number;
  benefitsScore?: number;
  flexibilityScore?: number;
  overallValueScore?: number;
  scoreTravelProtections?: number;
  compositeScore?: number;

  // Editorial (Webflow: favorite-hotels, favorite-airlines, complementary-cards-intro, star-rating, our-score)
  favoriteHotels?: string;
  favoriteAirlines?: string;
  complementaryCardsIntro?: string;
  starRating?: number;
  ourScore?: number;

  // FAQs
  faqs?: FAQEntry[];

  // Card Relationships
  complementaryCards?: LinkedCard[];
  comparableCards?: LinkedCard[];

  // Author & Metadata
  authorProfile?: string;
  /** Webflow Authors collection item ID behind authorProfile — synced to the
   * Cards item's `author` reference. Empty = no author assigned by the CMS
   * (sync leaves any Webflow-side assignment untouched). */
  authorWebflowItemId?: string;


  lastEditorialReview?: Date | null;
  reviewCycle?: 'Monthly' | 'Quarterly' | 'As Needed';
  lastPublishedToWebflow?: Date | null;
  internalNotes?: string;

  // Benefits
  statementCredits?: StatementCredit[];
  travelBenefits?: TravelBenefit[];
  loungeAccess?: LoungeAccessEntry[];
  purchaseProtection?: Record<string, string>;
  insuranceCoverage?: Record<string, string>;
  customBenefitCategories?: Array<{ id: string; name: string; items: string[] }>;

  // Rewards
  earnRatesDetailed?: EarnRate[];
  bonusCategories?: BonusCategoryRow[];
  cppValuation?: CppValuation;
}

export interface UpdateCardInput {
  cardId: string;
  fields: Partial<Pick<CardDocument,
    'name' | 'issuer' | 'category' | 'scrapeFrequency' |
    'affiliateLink' | 'issuerUrl' | 'ratesTermsUrl' | 'notes' | 'cardImageUrl' |
    'tpgUrl' | 'dailyDropUrl' | 'omaatUrl' | 'sourceUrls'
  >> & Partial<CardDetailData>;
}

/**
 * CMS-117: every scraper-writable field can be overridden (locked).
 * Dual-value fields use `<field>_manual` storage; the rest lock the field
 * itself and the scraper skips them centrally.
 */
export type OverridableFieldName =
  | 'name' | 'annualFee' | 'signupBonus' | 'bonusSpendReq' | 'aprRange'
  | 'cardHeaderParagraph' | 'cardOverview' | 'blueHeader' | 'offerFeatures' | 'offerDuration'
  | 'foreignTransactionFee' | 'recommendedCredit' | 'recommendedCreditParagraph' | 'bestForLabel'
  | 'cardImageDisclaimer' | 'reviewUrl'
  | 'prosFull' | 'consFull' | 'whoShouldGet' | 'whoShouldNot' | 'whoCardGoodFor'
  | 'earningRewardsSection' | 'additionalBenefitsSection' | 'moreDetailsSection' | 'whatYoullLove'
  | 'specialRewardConditions' | 'alwaysRecommendText' | 'sometimesRecommendText' | 'dontRecommendText'
  | 'favoriteHotels' | 'favoriteAirlines' | 'transferInstructions'
  | 'ourMissionSection' | 'ratingMethodologySection'
  | 'annualFeeScore' | 'signupBonusScore' | 'rewardsRateScore' | 'benefitsScore'
  | 'flexibilityScore' | 'overallValueScore' | 'scoreTravelProtections'
  | 'starRating' | 'ourScore'
  | 'offerHistory';

export interface SetOverrideInput {
  cardId: string;
  field: OverridableFieldName;
  value: unknown; // null to clear the override
  isOverriding: boolean;
}

export interface SyncToWebflowInput {
  cardId: string;
}

export interface SyncToWebflowResult {
  webflowItemId: string;
}

/** One item of the Webflow Authors collection, as returned by webflowAuthorsList. */
export interface WebflowAuthor {
  id: string;
  name: string;
  slug: string;
}

export interface BulkSyncToWebflowInput {
  cardIds: string[];
}

export interface BulkSyncToWebflowResult {
  synced: string[];
  failed: Array<{ cardId: string; error: string }>;
}

export interface ScrapeCardInput {
  cardId: string;
}

export interface ScrapeCardResult {
  success?: boolean;
  error?: string;
  changesDetected?: boolean;
  fieldsChanged?: string[];
  fieldsUpdated?: string[];
  editorialFieldsFilled?: string[];
  historyRowsScraped?: number;
}

export interface ScrapeAllCardsResult {
  processed: number;
  updated: number;
  changed: number;
  errors: number;
}

export interface ScanCardUrlInput {
  issuerUrl: string;
  tpgUrl?: string;
  dailyDropUrl?: string;
  omaatUrl?: string;
}

export interface ScanCardUrlResult {
  cardName: string;
  issuer: string;
  annualFee: string;
  signupBonus: string;
  spendReq: string;
  timeframe: string;
  apr: string;
  benefitsCount: number;
  earnCategoriesCount: number;
  foreignTransactionFee: string;
  cardPros: string[];
  cardCons: string[];
  recommendedCredit: string;
}

export interface SetCardPublishStateInput {
  cardId: string;
  publishState: 'published' | 'unpublished';
}

export interface SetCardPublishStateResult {
  success: boolean;
}

// ─── Card usage (Articles / Iframes tabs + delete guard) ─────────────────────

/** An article that tags the card (articles.cardTags[]). */
export interface CardUsageArticle {
  id: string;
  title: string;
  /** Pipeline stage key ('idea', 'draft', 'published', …) when known. */
  stage?: string;
  /** Live URL once published — external "view" link in the Articles tab. */
  publishedUrl?: string;
  updatedAt?: Date | null;
}

/** An iframe instance embedding the card (iframe_instances.cards[]). */
export interface CardUsageIframe {
  id: string;
  type: string;
  hosts: Array<{ collection: string; docId: string; field: string; title: string }>;
  updatedAt?: Date | null;
}

/** failed-precondition `details` payload thrown by the deleteCard callable. */
export interface CardUsageDetails {
  iframes: Array<Pick<CardUsageIframe, 'id' | 'type' | 'hosts'>>;
  articles: Array<Pick<CardUsageArticle, 'id' | 'title'>>;
}

export interface DeleteCardInput {
  cardId: string;
}

export interface DeleteCardResult {
  success: boolean;
  deletedWebflowItems: number;
}


export interface UpdateTransferPartnerInput {
  partnerId: string;
  fields: Partial<Omit<TransferPartnerDocument, 'id' | 'createdAt' | 'updatedAt'>>;
}

export interface AddTransferPartnerInput {
  name: string;
  type: 'airline' | 'hotel';
  alliance: AllianceGroup;
  loyaltyProgram: string;
  awardReleaseDays?: number;
  awardReleasePattern?: string;
  programs?: Partial<Record<CardProgram, ProgramEntry>>;
  sweetSpots?: SweetSpotRedemption[];
  awardNotes?: string;
  isAvios?: boolean;
  isMarriott?: boolean;
  iataCode?: string;
  brandColor?: string;
  alsoBookable?: string;
}

// ─── Filter / UI State Types ──────────────────────────────────────────────────

export interface CardFilters {
  issuer: string;
  category: CardCategory | '';
  status: CardStatus | '';
  search: string;
}

export interface TransferPartnerFilters {
  search: string;
  type: 'all' | 'airline' | 'hotel';
  alliance: AllianceGroup | 'all';
  speed: TransferSpeed | 'all';
  bonusesOnly: boolean;
  visiblePrograms: CardProgram[];
}

export interface ScraperStatus {
  lastScrapedAt: Timestamp | null;
  nextScheduledAt: Timestamp | null;
  health: 'healthy' | 'warning' | 'error';
  recentErrors: Array<{
    cardId: string;
    cardName: string;
    errorMessage: string;
    severity: 'critical' | 'warning';
    occurredAt: Timestamp;
  }>;
  isRunning: boolean;
}

// ─── Detail Tab Data Types ────────────────────────────────────────────────────

export interface StatementCredit {
  id: string;
  name: string;
  annualValue: number;
  frequency: 'Annual' | 'Semi-Annual' | 'Monthly' | 'Quarterly' | 'One-Time';
  perPeriodValue: number;
  category: string;
  autoApplied: boolean;
  expirationDate?: string;
  isOverridden: boolean;
}

export interface TravelBenefit {
  id: string;
  name: string;
  coverageDetail: string;
  coverageAmount: string;
  coverageType: 'Primary' | 'Secondary' | 'Not Applicable';
  conditions: string;
  isOverridden: boolean;
}

export interface LoungeAccessEntry {
  id: string;
  loungeNetwork: string;
  accessLevel: 'Unlimited' | 'Limited Visits' | 'Pay-Per-Visit' | 'When Flying Carrier';
  guestPolicy: string;
  annualVisitLimit: number | null;
  conditions: string;
}

export interface EarnRate {
  id: string;
  category: string;
  rate: string;
  capLimit: string;
  notes: string;
  isOverridden: boolean;
}

/** CMS-74 — Earning Rewards pair: earn rate chip + reward category line. */
export interface EarningRewardRate {
  rate: string;
  category: string;
}

export interface BonusCategoryRow {
  id: string;
  category: string;
  rate: string;
  period: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface CppValuation {
  floor: number;
  target: number;
  ceiling: number;
  flights: number;
  hotels: number;
  portalValue: number;
  cashValue: number;
  rationale: string;
  lastReviewed?: string;
  reviewedBy?: string;
}

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
}

export interface LinkedCard {
  id: string;
  cardId: string;
  name: string;
  compositeScore: number;
}

export interface OfferHistoryEntry {
  id: string;
  bonusAmount: string;
  spendRequirement: string;
  timeframe: string;
  startDate: Date;
  endDate: Date | null;
  durationDays: number;
}

/** CMS-129: one row of the scraped Offer History table (see CardData.offerHistory). */
export interface ScrapedOfferHistoryEntry {
  dates: string;
  offer: string;
  value?: string;
}

export interface TransferBonusHistoryEntry {
  id: string;
  partnerName: string;
  partnerCode: string;
  partnerColor: string;
  bonusPercent: number;
  effectiveRatio: string;
  startDate: Date;
  endDate: Date | null;
  durationDays: number;
  status: 'Active' | 'Expired' | 'Upcoming';
}

export interface ArticleUsingCard {
  id: string;
  title: string;
  publishedDate: Date;
  lastUpdated: Date;
  matchStatus: 'current' | 'discrepancy';
  discrepancyCount: number;
  discrepancies: Array<{ field: string; articleValue: string; currentValue: string }>;
}

export interface SectionMeta {
  source: string;
  lastScraped: Date | null;
  syncStatus: 'synced' | 'pending' | 'stale' | 'error';
  confidence: 'high' | 'medium' | 'low';
  staleOverrideAlert?: boolean;
}
