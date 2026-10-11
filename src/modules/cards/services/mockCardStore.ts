// MOCK-ONLY DATA STORE — cards module (ported from production Firestore).
//
// Simulates the production collections this module reads/writes:
//   - `card_data` (+ per-card `change_history` subcollection)
//   - `settings/cardCategories`, `settings/card-global-fields`
//   - `scraper_status/current`
//   - `articles` / `iframe_instances` (read-only usage feeds for the detail tabs)
//   - the `webflowAuthorsList` callable's Authors payload
//
// A tiny pub/sub mirrors `onSnapshot`: subscribers re-receive mapped data
// after every mocked mutation. Production callable/Firestore names are kept
// in comments at each seam. Delete this file when the real backend lands.

import { Timestamp } from '@/services/timestamp';
import { mockId } from '@/services/_delay';
import type {
  CardDocument,
  CardDetailData,
  ChangeHistoryEntry,
  OverridableFieldName,
  ScraperStatus,
} from '../types';
import { abbreviatedSlotFields } from '../utils/abbreviatedSlots';

// ─── Pub/sub ─────────────────────────────────────────────────────────────────

type StoreListener = () => void;
const listeners = new Set<StoreListener>();

export function onCardStoreChange(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange(): void {
  listeners.forEach((l) => l());
}

// ─── Time helpers ────────────────────────────────────────────────────────────

const daysAgo = (n: number) => Timestamp.fromMillis(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => Timestamp.fromMillis(Date.now() + n * 86_400_000);

/** Mock stand-in for the callable's `context.auth.uid`. */
const MOCK_UID = 'mock-admin';

// ─── Card factory ────────────────────────────────────────────────────────────

interface CardCore extends Omit<CardDocument, 'createdAt' | 'updatedAt'> {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function makeCard(core: CardCore, detail: Partial<CardDetailData> = {}): CardDocument {
  const withSlots = { ...detail } as Record<string, unknown>;
  // Production persists both the array and the discrete prosAbbreviated1..8 /
  // consAbbreviated1..8 slots on every save (CMS-45) — mirror that here.
  if (Array.isArray(detail.prosAbbreviated)) {
    Object.assign(withSlots, abbreviatedSlotFields('prosAbbreviated', detail.prosAbbreviated));
  }
  if (Array.isArray(detail.consAbbreviated)) {
    Object.assign(withSlots, abbreviatedSlotFields('consAbbreviated', detail.consAbbreviated));
  }
  return {
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2),
    ...core,
    ...withSlots,
  } as CardDocument;
}

function baseCore(partial: Partial<CardCore> & Pick<CardCore, 'id' | 'name' | 'issuer'>): CardCore {
  return {
    category: 'Travel',
    status: 'current',
    webflowStatus: 'synced',
    publishState: 'published',
    scrapeFrequency: 'weekly',
    lastScraped: daysAgo(1),
    lastChanged: daysAgo(4),
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
    bonusAvgChangeDays: 120,
    annualFee_scraped: 0,
    signupBonus_scraped: '',
    bonusSpendReq_scraped: '',
    aprRange_scraped: '',
    annualFee_manual: 0,
    signupBonus_manual: '',
    bonusSpendReq_manual: '',
    aprRange_manual: '',
    overrides: {},
    ...partial,
  };
}

// ─── Seed: cards ─────────────────────────────────────────────────────────────

const seedCards: CardDocument[] = [
  makeCard(
    baseCore({
      id: 'card-amex-platinum',
      name: 'The Platinum Card® from American Express',
      issuer: 'American Express',
      category: 'Travel',
      status: 'changed',
      webflowStatus: 'out-of-sync',
      scrapeFrequency: 'daily',
      lastScraped: daysAgo(0.5),
      lastChanged: daysAgo(0.5),
      affiliateLink: 'https://www.americanexpress.com/us/credit-cards/card/platinum/',
      issuerUrl: 'https://www.americanexpress.com/us/credit-cards/card/platinum/',
      ratesTermsUrl: 'https://www.americanexpress.com/us/credit-cards/card-application/apply/prospect/terms/platinum-card/',
      reviewUrl: 'https://elitetravelhackers.com/cards/amex-platinum-review',
      cardImageUrl: 'https://picsum.photos/seed/amex-platinum/480/300',
      notes: 'Fee hike to $895 scraped 2026-09 — editorial keeping $895 until the new benefits grid is confirmed.',
      sourceUrls: [
        { label: 'TPG Review', url: 'https://thepointsguy.com/credit-cards/reviews/amex-platinum/' },
        { label: 'Daily Drop', url: 'https://dailydrop.com/cards/amex-platinum' },
      ],
      tpgUrl: 'https://thepointsguy.com/credit-cards/reviews/amex-platinum/',
      bonusDaysActive: 46,
      bonusAvgChangeDays: 165,
      annualFee_scraped: 895,
      signupBonus_scraped: 'Earn 80,000 Membership Rewards® Points after you spend $8,000 on eligible purchases in your first 6 months',
      bonusSpendReq_scraped: '$8,000 in 6 months',
      aprRange_scraped: 'See Pay Over Time APR',
      // Dual-value override in force: editor pinned the old fee until confirmed.
      annualFee_manual: 695,
      overrides: {
        annualFee: {
          isOverridden: true,
          overriddenValue: 695,
          overriddenBy: MOCK_UID,
          overriddenAt: daysAgo(12),
        },
      },
      webflowItemId: 'wf-item-amex-plat',
      sourceChangeHistory: [
        { date: 'Sep 2026', bonusAmount: '80,000 points', spendRequirement: '$8,000 / 6 mo', details: 'Annual fee increased to $895' },
        { date: 'Mar 2024', bonusAmount: '80,000 points', spendRequirement: '$6,000 / 6 mo', details: 'Spend requirement raised' },
      ],
      offerHistory: [
        { dates: 'Sep 2026 – present', offer: '80,000 Membership Rewards® points', value: '$8,000 spend / 6 months' },
        { dates: 'Jan 2025 – Sep 2026', offer: '80,000 Membership Rewards® points', value: '$6,000 spend / 6 months' },
        { dates: 'May 2023 – Jan 2025', offer: '60,000 Membership Rewards® points', value: '$6,000 spend / 6 months' },
      ],
    }),
    {
      bestForLabel: 'Premium Travel Perks',
      topOffer: true,
      foreignTransactionFee: 'None',
      cardImageDisclaimer: 'Card art © American Express — shown for identification only.',
      slug: 'amex-platinum-review',
      blueHeader: 'Our current pick for luxury travel',
      offerFeatures: '80,000 Membership Rewards® points welcome offer',
      offerDuration: '6 months',
      recommendedCredit: 'Excellent (740–850)',
      whatYoullLove: 'Unmatched lounge access, $895 of annual credits and 5x on flights booked direct.',
      cardHeaderParagraph: 'The Platinum Card® is the flagship premium travel card from American Express.',
      cardOverview: 'A heavy-hitter for frequent flyers who can use the credits and lounge network.',
      prosAbbreviated: ['Unmatched lounge access', '5x on flights', 'Annual credits stack', 'Hotel elite status'],
      benefitsBullets: ['Centurion + Priority Pass lounges', '$200 airline fee credit', '$200 hotel credit', 'Global Entry / TSA PreCheck credit'],
      prosFull: ['The widest lounge network of any card', '5x Membership Rewards on flights booked directly with airlines', 'Annual statement credits can exceed the fee for the right traveller'],
      consAbbreviated: ['$895 annual fee', 'Credits require effort', 'Weak everyday earn'],
      consFull: ['The $895 annual fee is the highest of any mainstream card', 'Many credits are semi-annual or require enrolment'],
      whoShouldGet: 'Frequent flyers who will use the lounge network and can organically spend the credits.',
      whoShouldNot: 'Anyone who travels once or twice a year — the fee will not pay for itself.',
      earningRewardsSection: ['5x on flights booked directly with airlines or Amex Travel (up to $500k/yr)', '5x on prepaid hotels via Amex Travel', '1x on everything else'],
      earningRewardsRates: [
        { rate: '5x', category: 'Flights booked direct or via Amex Travel' },
        { rate: '5x', category: 'Prepaid hotels (Amex Travel)' },
        { rate: '1x', category: 'All other purchases' },
      ],
      whoCardGoodFor: 'Lounge-loving frequent flyers with $20k+ annual airfare spend.',
      favoriteHotels: 'Fine Hotels + Resorts properties',
      favoriteAirlines: 'Delta, ANA, Singapore (MR transfer partners)',
      starRating: 4.6,
      ourScore: 88,
      rewardsRateScore: 82,
      signupBonusScore: 84,
      annualFeeScore: 55,
      benefitsScore: 96,
      flexibilityScore: 90,
      overallValueScore: 86,
      scoreTravelProtections: 80,
      compositeScore: 8.8,
      alwaysRecommendText: 'You fly monthly and live in Centurion Lounge cities.',
      sometimesRecommendText: 'You can use most credits without manufactured spend.',
      dontRecommendText: 'You want simple cash-back value.',
      transferInstructions: 'Membership Rewards transfer 1:1 to 18+ airline partners including ANA, Air Canada and Singapore.',
      recommendedCreditParagraph: 'Approvals generally require a 740+ score with established Amex history helping.',
      faqs: [
        { id: 'faq-1', question: 'Is the $895 fee worth it?', answer: 'Only if you organically use the airline, hotel and entertainment credits.' },
        { id: 'faq-2', question: 'Does the Platinum have foreign transaction fees?', answer: 'No — none.' },
      ],
      complementaryCards: [
        { id: 'rel-1', cardId: 'card-amex-gold', name: 'American Express® Gold Card', compositeScore: 8.4 },
      ],
      comparableCards: [
        { id: 'rel-2', cardId: 'card-csr', name: 'Chase Sapphire Reserve®', compositeScore: 8.7 },
        { id: 'rel-3', cardId: 'card-venture-x', name: 'Capital One Venture X', compositeScore: 8.5 },
      ],
      authorProfile: 'Daynis Olman',
      authorWebflowItemId: 'wf-author-daynis',
      reviewCycle: 'Quarterly',
      lastEditorialReview: new Date(Date.now() - 21 * 86_400_000),
      lastPublishedToWebflow: new Date(Date.now() - 13 * 86_400_000),
      statementCredits: [
        { id: 'sc-1', name: 'Airline incidental fee credit', annualValue: 200, frequency: 'Annual', perPeriodValue: 200, category: 'Airline', autoApplied: false, isOverridden: false },
        { id: 'sc-2', name: 'Fine Hotels + Resorts credit', annualValue: 200, frequency: 'Annual', perPeriodValue: 200, category: 'Hotel', autoApplied: false, isOverridden: false },
        { id: 'sc-3', name: 'Digital entertainment credit', annualValue: 240, frequency: 'Monthly', perPeriodValue: 20, category: 'Lifestyle', autoApplied: false, isOverridden: false },
      ],
      travelBenefits: [
        { id: 'tb-1', name: 'Trip delay insurance', coverageDetail: 'Up to $500 per trip after 6h delay', coverageAmount: '$500', coverageType: 'Secondary', conditions: 'Round-trip fare charged to card', isOverridden: false },
      ],
      loungeAccess: [
        { id: 'la-1', loungeNetwork: 'Centurion Lounge', accessLevel: 'Unlimited', guestPolicy: '2 guests free ($50k spend) else $50/guest', annualVisitLimit: null, conditions: 'Same-day boarding pass' },
        { id: 'la-2', loungeNetwork: 'Priority Pass Select', accessLevel: 'Unlimited', guestPolicy: '2 guests', annualVisitLimit: null, conditions: 'Enrolment required' },
      ],
      earnRatesDetailed: [
        { id: 'er-1', category: 'Flights (direct / Amex Travel)', rate: '5x', capLimit: '$500,000/yr', notes: 'Then 1x', isOverridden: false },
        { id: 'er-2', category: 'Prepaid hotels (Amex Travel)', rate: '5x', capLimit: 'None', notes: '', isOverridden: false },
      ],
      cppValuation: { floor: 1.0, target: 2.0, ceiling: 3.5, flights: 2.0, hotels: 0.8, portalValue: 1.0, cashValue: 0.6, rationale: 'ANA/AC/SQ premium-cabin sweet spots drive the ceiling.', lastReviewed: 'Sep 2026', reviewedBy: 'Daynis' },
      proseProcessing: { status: 'complete', initialAiScore: 88, finalAiScore: 34, completedAt: daysAgo(0.4), updatedAt: daysAgo(0.4) },
    }
  ),

  makeCard(
    baseCore({
      id: 'card-amex-gold',
      name: 'American Express® Gold Card',
      issuer: 'American Express',
      category: 'Travel',
      webflowStatus: 'synced',
      affiliateLink: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
      issuerUrl: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
      cardImageUrl: 'https://picsum.photos/seed/amex-gold/480/300',
      annualFee_scraped: 325,
      signupBonus_scraped: 'Earn 60,000 Membership Rewards® Points after you spend $6,000 in your first 6 months',
      bonusSpendReq_scraped: '$6,000 in 6 months',
      aprRange_scraped: 'See Pay Over Time APR',
      bonusDaysActive: 210,
      bonusAvgChangeDays: 300,
      webflowItemId: 'wf-item-amex-gold',
      offerHistory: [
        { dates: 'Feb 2025 – present', offer: '60,000 Membership Rewards® points', value: '$6,000 spend / 6 months' },
      ],
    }),
    {
      bestForLabel: 'Dining & Groceries',
      foreignTransactionFee: 'None',
      slug: 'amex-gold-review',
      recommendedCredit: 'Good–Excellent (690–850)',
      cardOverview: 'The strongest supermarket + dining earner in the Membership Rewards family.',
      prosAbbreviated: ['4x dining worldwide', '4x US supermarkets', '$120 dining credit'],
      consAbbreviated: ['$325 fee', 'Credits are monthly'],
      starRating: 4.5,
      ourScore: 84,
      compositeScore: 8.4,
      recommendedCreditParagraph: 'Most approvals land at 690+.',
      proseProcessing: { status: 'complete', initialAiScore: 91, finalAiScore: 41, completedAt: daysAgo(2), updatedAt: daysAgo(2) },
    }
  ),

  makeCard(
    baseCore({
      id: 'card-csp',
      name: 'Chase Sapphire Preferred® Card',
      issuer: 'Chase',
      category: 'Travel',
      webflowStatus: 'synced',
      scrapeFrequency: 'daily',
      affiliateLink: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
      issuerUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
      cardImageUrl: 'https://picsum.photos/seed/chase-csp/480/300',
      annualFee_scraped: 95,
      signupBonus_scraped: 'Earn 75,000 bonus points after you spend $5,000 in the first 3 months',
      bonusSpendReq_scraped: '$5,000 in 3 months',
      aprRange_scraped: '20.49% – 27.49% variable',
      signupBonus_manual: 'Earn 60,000 bonus points after you spend $4,000 in the first 3 months',
      bonusDaysActive: 9,
      bonusAvgChangeDays: 240,
      overrides: {
        signupBonus: {
          isOverridden: true,
          overriddenValue: 'Earn 60,000 bonus points after you spend $4,000 in the first 3 months',
          overriddenBy: MOCK_UID,
          overriddenAt: daysAgo(3),
        },
      },
      webflowItemId: 'wf-item-csp',
      // CMS-162 dual-value offer history: the manual table is live; the scraped
      // snapshot restores instantly on revert.
      offerHistory: [
        { dates: 'Oct 2026 – present', offer: '75,000 bonus points', value: '$5,000 spend / 3 months (manual entry)' },
      ],
      offerHistory_scraped: [
        { dates: 'Oct 2026 – present', offer: '75,000 bonus points', value: '$5,000 spend / 3 months' },
        { dates: 'Apr 2025 – Oct 2026', offer: '60,000 bonus points', value: '$4,000 spend / 3 months' },
      ],
    }),
    {
      bestForLabel: 'First Travel Card',
      topOffer: true,
      foreignTransactionFee: 'None',
      slug: 'chase-sapphire-preferred-review',
      recommendedCredit: 'Good–Excellent (690–850)',
      cardOverview: 'The benchmark mid-tier travel card — flexible Ultimate Rewards for a $95 fee.',
      prosAbbreviated: ['75k welcome offer', '3x dining', '5x travel via Chase', 'Only $95'],
      consAbbreviated: ['No lounge access', '5/24 applies'],
      starRating: 4.7,
      ourScore: 90,
      compositeScore: 9.0,
      comparableCards: [
        { id: 'rel-4', cardId: 'card-venture', name: 'Capital One Venture Rewards', compositeScore: 8.2 },
        { id: 'rel-5', cardId: 'card-citi-strata', name: 'Citi Strata Premier℠ Card', compositeScore: 8.1 },
      ],
      authorProfile: 'Rasa K',
      authorWebflowItemId: 'wf-author-rasa',
      reviewCycle: 'Quarterly',
      lastEditorialReview: new Date(Date.now() - 9 * 86_400_000),
      proseProcessing: { status: 'processing', initialAiScore: 77, finalAiScore: null, updatedAt: daysAgo(0.1) },
    }
  ),

  makeCard(
    baseCore({
      id: 'card-csr',
      name: 'Chase Sapphire Reserve®',
      issuer: 'Chase',
      category: 'Travel',
      status: 'changed',
      webflowStatus: 'pending',
      scrapeFrequency: 'daily',
      lastScraped: daysAgo(0.2),
      lastChanged: daysAgo(0.2),
      affiliateLink: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
      issuerUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
      cardImageUrl: 'https://picsum.photos/seed/chase-csr/480/300',
      annualFee_scraped: 795,
      signupBonus_scraped: 'Earn 125,000 bonus points after you spend $6,000 in the first 3 months',
      bonusSpendReq_scraped: '$6,000 in 3 months',
      aprRange_scraped: '21.49% – 28.49% variable',
      bonusDaysActive: 115,
      bonusAvgChangeDays: 200,
      webflowItemId: 'wf-item-csr',
      notes: '2026 refresh: fee up to $795, new Points Boost redemptions. Awaiting editorial pass.',
      sourceChangeHistory: [
        { date: 'Oct 2026', bonusAmount: '125,000 points', spendRequirement: '$6,000 / 3 mo', details: 'Refresh: fee $550 → $795' },
      ],
      offerHistory: [
        { dates: 'Oct 2026 – present', offer: '125,000 bonus points', value: '$6,000 spend / 3 months' },
        { dates: 'Jun 2022 – Oct 2026', offer: '60,000 bonus points', value: '$4,000 spend / 3 months' },
      ],
    }),
    {
      bestForLabel: 'Premium Chase Ecosystem',
      foreignTransactionFee: 'None',
      slug: 'chase-sapphire-reserve-review',
      recommendedCredit: 'Excellent (740–850)',
      cardOverview: 'Chase’s premium travel card — $300 travel credit, lounges and boosted portal redemptions.',
      prosAbbreviated: ['$300 travel credit', '3x travel & dining', 'Sapphire Lounges', '125k offer'],
      consAbbreviated: ['$795 fee', 'Portal devaluation risk'],
      starRating: 4.6,
      ourScore: 87,
      compositeScore: 8.7,
      complementaryCards: [
        { id: 'rel-6', cardId: 'card-csp', name: 'Chase Sapphire Preferred® Card', compositeScore: 9.0 },
      ],
      comparableCards: [
        { id: 'rel-7', cardId: 'card-amex-platinum', name: 'The Platinum Card® from American Express', compositeScore: 8.8 },
        { id: 'rel-8', cardId: 'card-venture-x', name: 'Capital One Venture X', compositeScore: 8.5 },
      ],
      authorProfile: 'Daynis Olman',
      authorWebflowItemId: 'wf-author-daynis',
      reviewCycle: 'Monthly',
      lastEditorialReview: new Date(Date.now() - 5 * 86_400_000),
      loungeAccess: [
        { id: 'la-3', loungeNetwork: 'Chase Sapphire Lounge', accessLevel: 'Unlimited', guestPolicy: '2 guests', annualVisitLimit: null, conditions: 'Boarding pass required' },
        { id: 'la-4', loungeNetwork: 'Priority Pass Select', accessLevel: 'Unlimited', guestPolicy: '2 guests', annualVisitLimit: null, conditions: 'Enrolment required' },
      ],
      proseProcessing: { status: 'failed', initialAiScore: 83, finalAiScore: null, failureReason: 'ZeroGPT credits exhausted', updatedAt: daysAgo(0.2) },
    }
  ),

  makeCard(
    baseCore({
      id: 'card-venture-x',
      name: 'Capital One Venture X Rewards Credit Card',
      issuer: 'Capital One',
      category: 'Travel',
      webflowStatus: 'synced',
      affiliateLink: 'https://www.capitalone.com/credit-cards/venture-x/',
      issuerUrl: 'https://www.capitalone.com/credit-cards/venture-x/',
      cardImageUrl: 'https://picsum.photos/seed/venture-x/480/300',
      annualFee_scraped: 395,
      signupBonus_scraped: 'Earn 75,000 bonus miles after spending $4,000 in the first 3 months',
      bonusSpendReq_scraped: '$4,000 in 3 months',
      aprRange_scraped: '19.99% – 29.99% variable',
      bonusDaysActive: 320,
      bonusAvgChangeDays: 400,
      webflowItemId: 'wf-item-venture-x',
      offerHistory: [
        { dates: 'Nov 2025 – present', offer: '75,000 bonus miles', value: '$4,000 spend / 3 months' },
      ],
    }),
    {
      bestForLabel: 'Simple Premium Travel',
      foreignTransactionFee: 'None',
      slug: 'capital-one-venture-x-review',
      recommendedCredit: 'Excellent (720–850)',
      cardOverview: 'Premium perks with a net-negative effective fee thanks to the $300 travel credit + 10k anniversary miles.',
      prosAbbreviated: ['2x everywhere', '$300 travel credit', '10k anniversary miles', 'Capital One + Priority Pass lounges'],
      consAbbreviated: ['Fewer premium transfer sweet spots', 'Capital One pulls all 3 bureaus'],
      starRating: 4.5,
      ourScore: 85,
      compositeScore: 8.5,
      proseProcessing: { status: 'queued', updatedAt: daysAgo(0.6) },
    }
  ),

  makeCard(
    baseCore({
      id: 'card-venture',
      name: 'Capital One Venture Rewards Credit Card',
      issuer: 'Capital One',
      category: 'Travel',
      webflowStatus: 'not-published',
      cardImageUrl: 'https://picsum.photos/seed/venture/480/300',
      annualFee_scraped: 95,
      signupBonus_scraped: 'Earn 75,000 bonus miles after spending $4,000 in the first 3 months',
      bonusSpendReq_scraped: '$4,000 in 3 months',
      aprRange_scraped: '19.99% – 29.99% variable',
      offerHistory: [],
    }),
    {
      foreignTransactionFee: 'None',
      recommendedCredit: 'Good–Excellent (690–850)',
      cardOverview: 'Flat 2x miles with simple redemptions — the no-fuss sibling of the Venture X.',
      prosAbbreviated: ['2x everywhere', 'Global Entry credit'],
      consAbbreviated: ['$95 fee for a 2x card'],
      starRating: 4.1,
      ourScore: 82,
      compositeScore: 8.2,
    }
  ),

  makeCard(
    baseCore({
      id: 'card-citi-strata',
      name: 'Citi Strata Premier℠ Card',
      name_manual: 'Citi Strata Premier',
      issuer: 'Citi',
      category: 'Travel',
      webflowStatus: 'synced',
      cardImageUrl: 'https://picsum.photos/seed/citi-strata/480/300',
      annualFee_scraped: 95,
      signupBonus_scraped: 'Earn 60,000 bonus ThankYou® Points after spending $4,000 in the first 3 months',
      bonusSpendReq_scraped: '$4,000 in 3 months',
      aprRange_scraped: '20.24% – 28.24% variable',
      overrides: {
        name: {
          isOverridden: true,
          overriddenValue: 'Citi Strata Premier',
          overriddenBy: MOCK_UID,
          overriddenAt: daysAgo(30),
        },
      },
      webflowItemId: 'wf-item-citi-strata',
      offerHistory: [
        { dates: 'Aug 2025 – present', offer: '60,000 ThankYou® Points', value: '$4,000 spend / 3 months' },
      ],
    }),
    {
      foreignTransactionFee: 'None',
      recommendedCredit: 'Good–Excellent (690–850)',
      cardOverview: '3x on air travel, hotels, supermarkets, gas and dining — the broadest mid-tier earner.',
      prosAbbreviated: ['3x across 5 categories', '$100 hotel credit'],
      consAbbreviated: ['ThankYou portal quirks', 'No lounge access'],
      starRating: 4.2,
      ourScore: 81,
      compositeScore: 8.1,
    }
  ),

  makeCard(
    baseCore({
      id: 'card-bilt',
      name: 'Bilt Mastercard®',
      issuer: 'Bilt (Wells Fargo)',
      category: 'Travel',
      status: 'new',
      webflowStatus: 'not-published',
      scrapeFrequency: 'monthly',
      cardImageUrl: 'https://picsum.photos/seed/bilt/480/300',
      annualFee_scraped: 0,
      signupBonus_scraped: 'No welcome offer — earn points on rent from day one',
      bonusSpendReq_scraped: 'N/A',
      aprRange_scraped: '20.74% – 28.74% variable',
      offerHistory: [],
      notes: 'Added 2026-10 — editorial page still being drafted.',
    }),
    {
      foreignTransactionFee: 'None',
      recommendedCredit: 'Good–Excellent (690–850)',
      cardOverview: 'The only mainstream card that earns transferable points on rent with no transaction fee.',
      prosAbbreviated: ['Points on rent', 'No annual fee', '1:1 to Hyatt & United'],
      consAbbreviated: ['5 transactions/month minimum', 'No welcome offer'],
      starRating: 4.0,
      ourScore: 79,
      compositeScore: 7.9,
    }
  ),

  makeCard(
    baseCore({
      id: 'card-anz-ff-black',
      name: 'ANZ Frequent Flyer Black',
      issuer: 'ANZ',
      category: 'Airline',
      status: 'outdated',
      webflowStatus: 'out-of-sync',
      scrapeFrequency: 'monthly',
      lastScraped: daysAgo(21),
      lastChanged: daysAgo(95),
      cardImageUrl: 'https://picsum.photos/seed/anz-black/480/300',
      annualFee_scraped: 370,
      signupBonus_scraped: 'Earn 130,000 bonus Qantas Points + $255 back when you spend $4,000 in the first 3 months',
      bonusSpendReq_scraped: '$4,000 in 3 months',
      aprRange_scraped: '20.99% p.a.',
      bonusDaysActive: 400,
      bonusAvgChangeDays: 380,
      offerHistory: [
        { dates: 'Mar 2026 – present', offer: '130,000 Qantas Points + $255 back', value: '$4,000 spend / 3 months' },
        { dates: 'Sep 2025 – Mar 2026', offer: '110,000 Qantas Points', value: '$4,000 spend / 3 months' },
      ],
      notes: 'AU-market card — scraper source moved; re-verify before next sync.',
    }),
    {
      foreignTransactionFee: '3%',
      recommendedCredit: 'Good–Excellent (AU Equifax 661+)',
      cardOverview: 'Australia’s highest-earning Qantas card — 1 Qantas Point per $1 up to $7,500/month.',
      prosAbbreviated: ['1 Qantas Point/$1', '75k offer typical', '2 Qantas Club invites'],
      consAbbreviated: ['$370 fee', '3% FX fee'],
      starRating: 4.3,
      ourScore: 83,
      compositeScore: 8.3,
    }
  ),

  makeCard(
    baseCore({
      id: 'card-qantas-premier',
      name: 'Qantas Premier Platinum',
      issuer: 'Qantas Money',
      category: 'Airline',
      publishState: 'unpublished',
      webflowStatus: 'not-published',
      scrapeFrequency: 'monthly',
      cardImageUrl: 'https://picsum.photos/seed/qantas-premier/480/300',
      annualFee_scraped: 349,
      signupBonus_scraped: 'Earn 80,000 bonus Qantas Points when you spend $4,000 in the first 3 months',
      bonusSpendReq_scraped: '$4,000 in 3 months',
      aprRange_scraped: '21.99% p.a.',
      offerHistory: [
        { dates: 'Jun 2026 – present', offer: '80,000 Qantas Points', value: '$4,000 spend / 3 months' },
      ],
      notes: 'Unpublished 2026-09 — issuer page returns 404 intermittently.',
    }),
    {
      foreignTransactionFee: '3%',
      recommendedCredit: 'Good–Excellent (AU Equifax 661+)',
      cardOverview: 'Qantas Money’s mid-premium earner with discounted first-year fee promos.',
      prosAbbreviated: ['80k Qantas Points offer', 'First-year fee discounts'],
      consAbbreviated: ['Weak ongoing earn caps', '3% FX fee'],
      starRating: 3.8,
      ourScore: 74,
      compositeScore: 7.4,
    }
  ),
];

// ─── Seed: change history (card_data/{id}/change_history) ────────────────────

const seedChangeHistory: Record<string, ChangeHistoryEntry[]> = {
  'card-amex-platinum': [
    { field: 'annualFee_scraped', oldValue: 695, newValue: 895, changedAt: daysAgo(12), source: 'scraper', changedBy: 'scraper-service' },
    { field: 'annualFee', oldValue: 895, newValue: 695, changedAt: daysAgo(12), source: 'manual', changedBy: MOCK_UID },
    { field: 'signupBonus_scraped', oldValue: 'Earn 80,000 Membership Rewards® Points after you spend $6,000 in your first 6 months', newValue: 'Earn 80,000 Membership Rewards® Points after you spend $8,000 on eligible purchases in your first 6 months', changedAt: daysAgo(46), source: 'scraper', changedBy: 'scraper-service' },
    { field: 'cardOverview', oldValue: '', newValue: 'A heavy-hitter for frequent flyers who can use the credits and lounge network.', changedAt: daysAgo(21), source: 'manual', changedBy: MOCK_UID },
    { field: 'webflowItemId', oldValue: null, newValue: 'wf-item-amex-plat', changedAt: daysAgo(13), source: 'webflow-sync', changedBy: MOCK_UID },
  ],
  'card-csp': [
    { field: 'signupBonus_scraped', oldValue: 'Earn 60,000 bonus points after you spend $4,000 in the first 3 months', newValue: 'Earn 75,000 bonus points after you spend $5,000 in the first 3 months', changedAt: daysAgo(9), source: 'scraper', changedBy: 'scraper-service' },
    { field: 'signupBonus', oldValue: 'Earn 75,000 bonus points after you spend $5,000 in the first 3 months', newValue: 'Earn 60,000 bonus points after you spend $4,000 in the first 3 months', changedAt: daysAgo(3), source: 'manual', changedBy: MOCK_UID },
    { field: 'offerHistory', oldValue: '(scraped table)', newValue: '(manual table)', changedAt: daysAgo(3), source: 'manual', changedBy: MOCK_UID },
  ],
  'card-csr': [
    { field: 'annualFee_scraped', oldValue: 550, newValue: 795, changedAt: daysAgo(0.2), source: 'scraper', changedBy: 'scraper-service' },
    { field: 'signupBonus_scraped', oldValue: 'Earn 60,000 bonus points after you spend $4,000 in the first 3 months', newValue: 'Earn 125,000 bonus points after you spend $6,000 in the first 3 months', changedAt: daysAgo(0.2), source: 'scraper', changedBy: 'scraper-service' },
    { field: 'proseProcessing.status', oldValue: 'processing', newValue: 'failed', changedAt: daysAgo(0.2), source: 'scraper', changedBy: 'scraper-service' },
  ],
  'card-anz-ff-black': [
    { field: 'signupBonus_scraped', oldValue: 'Earn 110,000 bonus Qantas Points when you spend $4,000 in the first 3 months', newValue: 'Earn 130,000 bonus Qantas Points + $255 back when you spend $4,000 in the first 3 months', changedAt: daysAgo(95), source: 'scraper', changedBy: 'scraper-service' },
  ],
  'card-venture-x': [
    { field: 'signupBonus_scraped', oldValue: 'Earn 75,000 bonus miles after spending $4,000 in the first 3 months', newValue: 'Earn 75,000 bonus miles after spending $4,000 in the first 3 months', changedAt: daysAgo(320), source: 'scraper', changedBy: 'scraper-service' },
  ],
};

// ─── Seed: settings + scraper status + authors ───────────────────────────────

const DEFAULT_CATEGORIES = ['Travel', 'Cash Back', 'Business', 'Hotel', 'Airline', 'Student', 'Secured'];

const settingsStore = {
  // production: settings/cardCategories ({ list: string[] })
  cardCategories: { list: [...DEFAULT_CATEGORIES] },
  // production: settings/card-global-fields
  cardGlobalFields: {
    ourMission:
      'Elite Travel Hackers exists to help everyday travellers fly better for less. We independently research every card we review, score it against the same rubric, and tell you plainly when a card is NOT worth your wallet.',
    ratingMethodology:
      'Every card is scored across seven weighted dimensions — welcome offer, earn rates, annual fee, benefits, flexibility, travel protections and overall value — on a 10-point scale. Scores are re-reviewed quarterly and after any issuer change detected by our scrapers.',
  },
};

// production: scraper_status/current
let scraperStatusDoc: ScraperStatus = {
  lastScrapedAt: daysAgo(0.5),
  nextScheduledAt: daysAhead(0.5),
  health: 'healthy',
  recentErrors: [
    {
      cardId: 'card-qantas-premier',
      cardName: 'Qantas Premier Platinum',
      errorMessage: 'Issuer page returned 404 — source URL may have moved',
      severity: 'warning',
      occurredAt: daysAgo(3),
    },
  ],
  isRunning: false,
};

// production: webflowAuthorsList callable payload (live Webflow Authors items)
const webflowAuthors = [
  { id: 'wf-author-daynis', name: 'Daynis Olman', slug: 'daynis-olman' },
  { id: 'wf-author-rasa', name: 'Rasa K', slug: 'rasa-k' },
  { id: 'wf-author-mel', name: 'Mel Tan', slug: 'mel-tan' },
  { id: 'wf-author-josh', name: 'Josh Whelan', slug: 'josh-whelan' },
];

// ─── Seed: usage collections (articles / iframe_instances) ───────────────────
// Raw document-shaped rows so the hook's pure filters see production-shaped
// data. Only docs referencing seeded cards are needed.

const seedArticles: Array<{ id: string; data: Record<string, unknown> }> = [
  {
    id: 'article-best-premium-cards',
    data: {
      title: 'The Best Premium Travel Cards of 2026',
      stage: 'published',
      publishedUrl: 'https://elitetravelhackers.com/articles/best-premium-travel-cards-2026',
      updatedAt: daysAgo(2),
      cardTags: [
        { cardId: 'card-amex-platinum', name: 'The Platinum Card® from American Express' },
        { cardId: 'card-csr', name: 'Chase Sapphire Reserve®' },
      ],
    },
  },
  {
    id: 'article-amex-platinum-review',
    data: {
      title: 'Amex Platinum Review: Still Worth $895?',
      stage: 'draft',
      updatedAt: daysAgo(0.8),
      cardTags: [{ cardId: 'card-amex-platinum', name: 'The Platinum Card® from American Express' }],
    },
  },
  {
    id: 'article-csp-vs-venture',
    data: {
      title: 'Sapphire Preferred vs Capital One Venture: Which $95 Card Wins?',
      stage: 'ready_to_publish',
      updatedAt: daysAgo(1.4),
      cardTags: [
        { cardId: 'card-csp', name: 'Chase Sapphire Preferred® Card' },
        { cardId: 'card-venture', name: 'Capital One Venture Rewards Credit Card' },
      ],
    },
  },
];

const seedIframeInstances: Array<{ id: string; data: Record<string, unknown> }> = [
  {
    id: 'iframe-premium-comparison',
    data: {
      type: 'card-comparison',
      cards: [
        { cardId: 'card-amex-platinum', name: 'The Platinum Card® from American Express' },
        { cardId: 'card-csr', name: 'Chase Sapphire Reserve®' },
      ],
      hosts: [
        { collection: 'articles', docId: 'article-best-premium-cards', field: 'body', title: 'The Best Premium Travel Cards of 2026' },
      ],
      updatedAt: daysAgo(2),
    },
  },
  {
    id: 'iframe-csp-offer-history',
    data: {
      type: 'offer-history',
      cards: [{ cardId: 'card-csp', name: 'Chase Sapphire Preferred® Card' }],
      hosts: [
        { collection: 'articles', docId: 'article-csp-vs-venture', field: 'body', title: 'Sapphire Preferred vs Capital One Venture' },
      ],
      updatedAt: daysAgo(1.4),
    },
  },
];

// ─── Live store state (cloned from seeds) ────────────────────────────────────

const cards: CardDocument[] = seedCards.map((c) => ({ ...c }));
const changeHistory: Record<string, ChangeHistoryEntry[]> = Object.fromEntries(
  Object.entries(seedChangeHistory).map(([k, v]) => [k, [...v]])
);
const articles = seedArticles.map((d) => ({ ...d }));
const iframeInstances = seedIframeInstances.map((d) => ({ ...d }));

// ─── Read accessors (used by the mock services) ──────────────────────────────

export function getCards(): CardDocument[] {
  return cards.map((c) => ({ ...c, id: c.id }));
}

export function getCard(cardId: string): CardDocument | null {
  const found = cards.find((c) => c.id === cardId);
  return found ? { ...found, id: found.id } : null;
}

/** Newest first, capped at 100 — mirrors the production query. */
export function getChangeHistory(cardId: string): ChangeHistoryEntry[] {
  return [...(changeHistory[cardId] ?? [])]
    .sort((a, b) => (b.changedAt?.toMillis?.() ?? 0) - (a.changedAt?.toMillis?.() ?? 0))
    .slice(0, 100);
}

export function getArticlesUsingCardDocs(): Array<{ id: string; data: Record<string, unknown> }> {
  return articles.map((d) => ({ ...d }));
}

export function getIframeInstancesDocs(): Array<{ id: string; data: Record<string, unknown> }> {
  return iframeInstances.map((d) => ({ ...d }));
}

export function getCardCategories(): string[] {
  return [...settingsStore.cardCategories.list];
}

export function getCardGlobalFields(): { ourMission: string; ratingMethodology: string } {
  return { ...settingsStore.cardGlobalFields };
}

export function getScraperStatus(): ScraperStatus {
  return { ...scraperStatusDoc };
}

export function getWebflowAuthors(): Array<{ id: string; name: string; slug: string }> {
  return webflowAuthors.map((a) => ({ ...a }));
}

// ─── Mutations (called by the mock services only) ────────────────────────────

function appendHistory(cardId: string, entry: ChangeHistoryEntry): void {
  if (!changeHistory[cardId]) changeHistory[cardId] = [];
  changeHistory[cardId].push(entry);
}

function touchCard(cardId: string): void {
  const card = cards.find((c) => c.id === cardId);
  if (card) card.updatedAt = Timestamp.now();
}

/** production: addCard callable — creates the card_data document. */
export function storeAddCard(fields: Partial<CardDocument> & Record<string, unknown>): string {
  const id = mockId('card');
  const now = Timestamp.now();
  const doc = {
    ...baseCore({ id, name: String(fields.name ?? 'Untitled Card'), issuer: String(fields.issuer ?? '') }),
    ...fields,
    id,
    status: 'new',
    webflowStatus: 'not-published',
    lastScraped: now,
    lastChanged: now,
    createdAt: now,
    updatedAt: now,
  } as CardDocument;
  cards.push(doc);
  appendHistory(id, {
    field: '(card created)',
    oldValue: null,
    newValue: doc.name,
    changedAt: now,
    source: 'manual',
    changedBy: MOCK_UID,
  });
  emitChange();
  return id;
}

/**
 * production: updateCard callable — merges fields and logs every changed
 * field to change_history (source 'manual').
 */
export function storeUpdateCard(cardId: string, fields: Record<string, unknown>): void {
  const card = cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);
  const now = Timestamp.now();
  const target = card as unknown as Record<string, unknown>;

  // CMS-45: keep discrete abbreviated slots in step when the arrays change.
  const merged = { ...fields };
  if (Array.isArray(fields.prosAbbreviated)) {
    Object.assign(merged, abbreviatedSlotFields('prosAbbreviated', fields.prosAbbreviated as string[]));
  }
  if (Array.isArray(fields.consAbbreviated)) {
    Object.assign(merged, abbreviatedSlotFields('consAbbreviated', fields.consAbbreviated as string[]));
  }

  for (const [key, newValue] of Object.entries(merged)) {
    const oldValue = target[key];
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    target[key] = newValue;
    appendHistory(cardId, {
      field: key,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
      changedAt: now,
      source: 'manual',
      changedBy: MOCK_UID,
    });
  }
  card.updatedAt = now;
  card.lastChanged = now;
  emitChange();
}

/** Fields that carry `<field>_manual` dual-value storage (CMS-117/CMS-123). */
const DUAL_VALUE_MANUAL_KEY: Partial<Record<OverridableFieldName, string>> = {
  name: 'name_manual',
  annualFee: 'annualFee_manual',
  signupBonus: 'signupBonus_manual',
  bonusSpendReq: 'bonusSpendReq_manual',
  aprRange: 'aprRange_manual',
};

/**
 * production: setOverride callable — the dual-value override pattern.
 * Set: dual-value fields write `<field>_manual` + mark the overrides map;
 * offerHistory snapshots the scraped table to `offerHistory_scraped` (CMS-162)
 * before the manual table goes live; lock-only fields write the field itself.
 * Revert: clears isOverridden — the UI falls back to the scraped value with
 * no further writes.
 */
export function storeSetOverride(
  cardId: string,
  field: OverridableFieldName,
  value: unknown,
  isOverriding: boolean
): void {
  const card = cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);
  const now = Timestamp.now();
  const target = card as unknown as Record<string, unknown>;
  const previous = card.overrides?.[field];

  if (isOverriding) {
    if (field === 'offerHistory') {
      // First manual takeover snapshots the scraper's table for instant revert.
      if (!card.offerHistory_scraped && card.offerHistory) {
        card.offerHistory_scraped = card.offerHistory;
      }
      target.offerHistory = value;
    } else if (DUAL_VALUE_MANUAL_KEY[field]) {
      target[DUAL_VALUE_MANUAL_KEY[field]!] = value;
    } else {
      target[field] = value;
    }
    card.overrides = {
      ...card.overrides,
      [field]: { isOverridden: true, overriddenValue: value, overriddenBy: MOCK_UID, overriddenAt: now },
    };
  } else {
    card.overrides = {
      ...card.overrides,
      [field]: {
        isOverridden: false,
        overriddenValue: previous?.overriddenValue ?? null,
        overriddenBy: previous?.overriddenBy ?? MOCK_UID,
        overriddenAt: now,
      },
    };
    // CMS-162: revert clears the lock AND restores the last scraped rows
    // server-side (the snapshot taken on first manual takeover).
    if (field === 'offerHistory' && card.offerHistory_scraped) {
      target.offerHistory = card.offerHistory_scraped;
    }
  }

  appendHistory(cardId, {
    field,
    oldValue: previous?.overriddenValue ?? null,
    newValue: isOverriding ? value : '(reverted to scraped)',
    changedAt: now,
    source: 'manual',
    changedBy: MOCK_UID,
  });
  card.updatedAt = now;
  emitChange();
}

/** production: setCardPublishState callable. */
export function storeSetPublishState(cardId: string, publishState: 'published' | 'unpublished'): void {
  const card = cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);
  card.publishState = publishState;
  appendHistory(cardId, {
    field: 'publishState',
    oldValue: publishState === 'published' ? 'unpublished' : 'published',
    newValue: publishState,
    changedAt: Timestamp.now(),
    source: 'manual',
    changedBy: MOCK_UID,
  });
  card.updatedAt = Timestamp.now();
  emitChange();
}

/**
 * production: deleteCard callable — refuses (failed-precondition) while any
 * iframe instance or article still references the card.
 */
export function storeDeleteCard(cardId: string): void {
  const iframes = iframeInstances.filter((d) =>
    (Array.isArray(d.data.cards) ? d.data.cards : []).some(
      (c: { cardId?: string }) => c?.cardId === cardId
    )
  );
  const usedByArticles = articles.filter((d) =>
    (Array.isArray(d.data.cardTags) ? d.data.cardTags : []).some(
      (t: { cardId?: string }) => t?.cardId === cardId
    )
  );
  if (iframes.length > 0 || usedByArticles.length > 0) {
    const err = new Error(
      `Card is still in use by ${iframes.length} iframe(s) and ${usedByArticles.length} article(s) — remove those references first.`
    );
    (err as { details?: unknown }).details = {
      iframes: iframes.map((d) => ({ id: d.id, type: d.data.type, hosts: d.data.hosts })),
      articles: usedByArticles.map((d) => ({ id: d.id, title: d.data.title })),
    };
    throw err;
  }
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error(`Card ${cardId} not found`);
  cards.splice(idx, 1);
  delete changeHistory[cardId];
  emitChange();
}

/** production: syncToWebflow / bulkSyncToWebflow callables. */
export function storeSyncCardToWebflow(cardId: string): string {
  const card = cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);
  const webflowItemId = card.webflowItemId ?? mockId('wf-item');
  card.webflowItemId = webflowItemId;
  card.webflowStatus = 'synced';
  (card as unknown as Record<string, unknown>).lastPublishedToWebflow = new Date();
  appendHistory(cardId, {
    field: 'webflowStatus',
    oldValue: 'pending',
    newValue: 'synced',
    changedAt: Timestamp.now(),
    source: 'webflow-sync',
    changedBy: MOCK_UID,
  });
  card.updatedAt = Timestamp.now();
  emitChange();
  return card.webflowItemId;
}

/**
 * production: scrapeCard callable — simulates a scrape pass: refreshes
 * lastScraped, settles new cards to current, and logs a no-change entry.
 */
export function storeScrapeCard(cardId: string): { changesDetected: boolean; fieldsChanged: string[]; fieldsUpdated: string[] } {
  const card = cards.find((c) => c.id === cardId);
  if (!card) throw new Error(`Card ${cardId} not found`);
  const now = Timestamp.now();
  card.lastScraped = now;
  const wasNew = card.status === 'new';
  if (wasNew) card.status = 'current';
  appendHistory(cardId, {
    field: '(scrape run)',
    oldValue: null,
    newValue: wasNew ? 'first scrape complete' : 'no changes detected',
    changedAt: now,
    source: 'scraper',
    changedBy: 'scraper-service',
  });
  touchCard(cardId);
  scraperStatusDoc = { ...scraperStatusDoc, lastScrapedAt: now };
  emitChange();
  return { changesDetected: wasNew, fieldsChanged: [], fieldsUpdated: wasNew ? ['status'] : [] };
}

/** production: scrapeAllCards callable. */
export function storeScrapeAllCards(): { processed: number; updated: number; changed: number; errors: number } {
  const now = Timestamp.now();
  let updated = 0;
  for (const card of cards) {
    card.lastScraped = now;
    if (card.status === 'new') {
      card.status = 'current';
      updated += 1;
    }
    touchCard(card.id);
  }
  scraperStatusDoc = { ...scraperStatusDoc, lastScrapedAt: now, isRunning: false };
  emitChange();
  return { processed: cards.length, updated, changed: 0, errors: 0 };
}

export function storeSetScraperRunning(running: boolean): void {
  scraperStatusDoc = { ...scraperStatusDoc, isRunning: running };
  emitChange();
}

/** production: settingsUpdate callable ({ settingId: 'cardCategories' }). */
export function storeSaveCardCategories(list: string[]): void {
  settingsStore.cardCategories.list = [...list];
  emitChange();
}

/** production: updateCardGlobalFields callable. */
export function storeSaveCardGlobalFields(fields: { ourMission?: string; ratingMethodology?: string }): void {
  if (fields.ourMission !== undefined) settingsStore.cardGlobalFields.ourMission = fields.ourMission;
  if (fields.ratingMethodology !== undefined) settingsStore.cardGlobalFields.ratingMethodology = fields.ratingMethodology;
  emitChange();
}
