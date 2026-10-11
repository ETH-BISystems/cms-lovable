import type { CardDocument, CardDetailData } from '../types';
import { fromDiscreteFields } from './abbreviatedSlots';

/** Convert a Firestore Timestamp | Date | null-ish to a Date | null. */
function toDate(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value;
  const maybeTs = value as { toDate?: () => Date };
  if (typeof maybeTs.toDate === 'function') return maybeTs.toDate();
  return null;
}

/**
 * Extract CardDetailData fields from a card document.
 * Detail data fields are stored directly on the card document;
 * this function picks only the CardDetailData keys.
 *
 * Lives outside useCardDetail so components (and tests that mock the hook
 * module) can use it directly.
 */
export function extractDetailData(card: CardDocument | null): CardDetailData {
  if (!card) return {};

  const doc = card as unknown as Record<string, unknown>;
  const detail: CardDetailData = {};

  // Core Identity
  if (doc.bestForLabel !== undefined) detail.bestForLabel = doc.bestForLabel as string;
  if (doc.topOffer !== undefined) detail.topOffer = doc.topOffer as boolean;
  if (doc.foreignTransactionFee !== undefined) detail.foreignTransactionFee = doc.foreignTransactionFee as string;
  if (doc.cardImageUrl !== undefined) detail.cardImageUrl = doc.cardImageUrl as string;
  if (doc.cardImageDisclaimer !== undefined) detail.cardImageDisclaimer = doc.cardImageDisclaimer as string;
  if (doc.reviewUrl !== undefined) detail.reviewUrl = doc.reviewUrl as string;
  if (doc.slug !== undefined) detail.slug = doc.slug as string;

  // Welcome Offer content
  if (doc.blueHeader !== undefined) detail.blueHeader = doc.blueHeader as string;
  if (doc.offerFeatures !== undefined) detail.offerFeatures = doc.offerFeatures as string;
  if (doc.offerDuration !== undefined) detail.offerDuration = doc.offerDuration as string;

  // Recommended credit
  if (doc.recommendedCredit !== undefined) detail.recommendedCredit = doc.recommendedCredit as string;

  // Editorial highlights
  if (doc.whatYoullLove !== undefined) detail.whatYoullLove = doc.whatYoullLove as string;

  // Editorial Content
  if (doc.cardHeaderParagraph !== undefined) detail.cardHeaderParagraph = doc.cardHeaderParagraph as string;
  if (doc.cardOverview !== undefined) detail.cardOverview = doc.cardOverview as string;
  // Abbreviated pros/cons: the array is canonical; documents that only have
  // the discrete prosAbbreviated1..8 fields (CMS-45) reconstruct from those.
  if (doc.prosAbbreviated !== undefined) detail.prosAbbreviated = doc.prosAbbreviated as string[];
  else {
    const discretePros = fromDiscreteFields(doc, 'prosAbbreviated');
    if (discretePros) detail.prosAbbreviated = discretePros;
  }
  if (doc.benefitsBullets !== undefined) detail.benefitsBullets = doc.benefitsBullets as string[];
  if (doc.prosFull !== undefined) detail.prosFull = doc.prosFull as string | string[];
  if (doc.consAbbreviated !== undefined) detail.consAbbreviated = doc.consAbbreviated as string[];
  else {
    const discreteCons = fromDiscreteFields(doc, 'consAbbreviated');
    if (discreteCons) detail.consAbbreviated = discreteCons;
  }
  if (doc.consFull !== undefined) detail.consFull = doc.consFull as string | string[];
  if (doc.whoShouldGet !== undefined) detail.whoShouldGet = doc.whoShouldGet as string;
  if (doc.whoShouldNot !== undefined) detail.whoShouldNot = doc.whoShouldNot as string;
  // Bullet-list sections (CMS-55/56/57): string[] on new saves, legacy string
  // on older documents/scraper output — both shapes flow through unchanged.
  if (doc.earningRewardsSection !== undefined) detail.earningRewardsSection = doc.earningRewardsSection as string | string[];
  if (doc.earningRewardsRates !== undefined) detail.earningRewardsRates = doc.earningRewardsRates as CardDetailData['earningRewardsRates'];
  if (doc.specialRewardConditions !== undefined) detail.specialRewardConditions = doc.specialRewardConditions as string;
  if (doc.whoCardGoodFor !== undefined) detail.whoCardGoodFor = doc.whoCardGoodFor as string;
  // iFrame embed slots (CMS-97) — HTML strings end-to-end
  if (doc.complimentaryCardsEmbed !== undefined) detail.complimentaryCardsEmbed = doc.complimentaryCardsEmbed as string;
  if (doc.comparableCardsEmbed !== undefined) detail.comparableCardsEmbed = doc.comparableCardsEmbed as string;
  if (doc.transferPartnersEmbed !== undefined) detail.transferPartnersEmbed = doc.transferPartnersEmbed as string;
  // CMS-129: Offer History embed slot (under Transfer Partners on the card page)
  if (doc.offerHistoryEmbed !== undefined) detail.offerHistoryEmbed = doc.offerHistoryEmbed as string;
  // CMS-129: scraped offer-history table rows (read-only display / iframe data)
  if (doc.offerHistory !== undefined) detail.offerHistory = doc.offerHistory as CardDetailData['offerHistory'];
  // CMS-126: scrape → Gemma prose humanisation state + ZeroGPT scores
  if (doc.proseProcessing !== undefined) detail.proseProcessing = doc.proseProcessing as CardDetailData['proseProcessing'];
  if (doc.additionalBenefitsSection !== undefined) detail.additionalBenefitsSection = doc.additionalBenefitsSection as string | string[];
  if (doc.moreDetailsSection !== undefined) detail.moreDetailsSection = doc.moreDetailsSection as string | string[];

  // Recommendation Tier
  if (doc.dontRecommendText !== undefined) detail.dontRecommendText = doc.dontRecommendText as string;
  if (doc.sometimesRecommendText !== undefined) detail.sometimesRecommendText = doc.sometimesRecommendText as string;
  if (doc.alwaysRecommendText !== undefined) detail.alwaysRecommendText = doc.alwaysRecommendText as string;

  // Transfer & Credit Info
  if (doc.transferInstructions !== undefined) detail.transferInstructions = doc.transferInstructions as string;
  if (doc.recommendedCreditParagraph !== undefined) detail.recommendedCreditParagraph = doc.recommendedCreditParagraph as string;

  // Mission & Methodology
  if (doc.ourMissionSection !== undefined) detail.ourMissionSection = doc.ourMissionSection as string;
  if (doc.ratingMethodologySection !== undefined) detail.ratingMethodologySection = doc.ratingMethodologySection as string;

  // ETH Scoring
  if (doc.rewardsRateScore !== undefined) detail.rewardsRateScore = doc.rewardsRateScore as number;
  if (doc.signupBonusScore !== undefined) detail.signupBonusScore = doc.signupBonusScore as number;
  if (doc.annualFeeScore !== undefined) detail.annualFeeScore = doc.annualFeeScore as number;
  if (doc.benefitsScore !== undefined) detail.benefitsScore = doc.benefitsScore as number;
  if (doc.flexibilityScore !== undefined) detail.flexibilityScore = doc.flexibilityScore as number;
  if (doc.overallValueScore !== undefined) detail.overallValueScore = doc.overallValueScore as number;
  if (doc.scoreTravelProtections !== undefined) detail.scoreTravelProtections = doc.scoreTravelProtections as number;
  if (doc.compositeScore !== undefined) detail.compositeScore = doc.compositeScore as number;

  // Editorial
  if (doc.favoriteHotels !== undefined) detail.favoriteHotels = doc.favoriteHotels as string;
  if (doc.favoriteAirlines !== undefined) detail.favoriteAirlines = doc.favoriteAirlines as string;
  if (doc.complementaryCardsIntro !== undefined) detail.complementaryCardsIntro = doc.complementaryCardsIntro as string;
  if (doc.starRating !== undefined) detail.starRating = doc.starRating as number;
  if (doc.ourScore !== undefined) detail.ourScore = doc.ourScore as number;

  // FAQs
  if (doc.faqs !== undefined) detail.faqs = doc.faqs as CardDetailData['faqs'];

  // Card Relationships
  if (doc.complementaryCards !== undefined) detail.complementaryCards = doc.complementaryCards as CardDetailData['complementaryCards'];
  if (doc.comparableCards !== undefined) detail.comparableCards = doc.comparableCards as CardDetailData['comparableCards'];

  // Author & Metadata
  if (doc.authorProfile !== undefined) detail.authorProfile = doc.authorProfile as string;
  if (doc.authorWebflowItemId !== undefined) detail.authorWebflowItemId = doc.authorWebflowItemId as string;
  if (doc.lastEditorialReview !== undefined) detail.lastEditorialReview = toDate(doc.lastEditorialReview);
  if (doc.reviewCycle !== undefined) detail.reviewCycle = doc.reviewCycle as CardDetailData['reviewCycle'];
  if (doc.lastPublishedToWebflow !== undefined) detail.lastPublishedToWebflow = toDate(doc.lastPublishedToWebflow);
  if (doc.internalNotes !== undefined) detail.internalNotes = doc.internalNotes as string;

  // Benefits
  if (doc.statementCredits !== undefined) detail.statementCredits = doc.statementCredits as CardDetailData['statementCredits'];
  if (doc.travelBenefits !== undefined) detail.travelBenefits = doc.travelBenefits as CardDetailData['travelBenefits'];
  if (doc.loungeAccess !== undefined) detail.loungeAccess = doc.loungeAccess as CardDetailData['loungeAccess'];
  if (doc.purchaseProtection !== undefined) detail.purchaseProtection = doc.purchaseProtection as CardDetailData['purchaseProtection'];
  if (doc.insuranceCoverage !== undefined) detail.insuranceCoverage = doc.insuranceCoverage as CardDetailData['insuranceCoverage'];
  if (doc.customBenefitCategories !== undefined) detail.customBenefitCategories = doc.customBenefitCategories as CardDetailData['customBenefitCategories'];

  // Rewards
  if (doc.earnRatesDetailed !== undefined) detail.earnRatesDetailed = doc.earnRatesDetailed as CardDetailData['earnRatesDetailed'];
  if (doc.bonusCategories !== undefined) detail.bonusCategories = doc.bonusCategories as CardDetailData['bonusCategories'];
  if (doc.cppValuation !== undefined) detail.cppValuation = doc.cppValuation as CardDetailData['cppValuation'];

  return detail;
}
