/**
 * Keyword Magic match-type + sort logic (CMS-156).
 *
 * The server (`keywordMagicSearch`) splits comma-separated seeds into phrase
 * terms and relevance-ranks results. The match tabs here must understand the
 * same comma-separated shape: previously the raw seed was split on whitespace
 * only, so a seed like "Qatar Airways, Q-Suite, Business Class" produced
 * tokens with trailing commas ("airways,") and the Broad/Phrase tabs could
 * never match anything.
 */

import type { MagicKeyword, MagicMatchType, MagicSortState } from '../types/magic';

const QUESTION_WORDS = [
  'how', 'what', 'why', 'when', 'where', 'who', 'which', 'can', 'do', 'does',
  'is', 'are', 'will', 'should', 'could', 'would', 'was', 'vs',
];

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'how',
  'i', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'vs', 'what', 'when',
  'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
]);

/** Mirror of the server: comma/semicolon/pipe-separated phrase terms. */
export function parseSeedTerms(seed: string): string[] {
  const terms = seed
    .toLowerCase()
    .split(/[,;|]/)
    .map(part => part.trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  if (terms.length > 0) return [...new Set(terms)];
  const fallback = seed.trim().toLowerCase().replace(/\s+/g, ' ');
  return fallback ? [fallback] : [];
}

function tokenize(phrase: string): string[] {
  return phrase.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Meaning-carrying tokens of a term (punctuation-stripped, ≥2 chars, not stopwords). */
export function significantTokens(term: string): string[] {
  const tokens = tokenize(term);
  const significant = tokens.filter(t => t.length >= 2 && !STOPWORDS.has(t));
  return significant.length > 0 ? significant : tokens;
}

function isQuestion(keyword: string): boolean {
  const first = keyword.split(/\s+/)[0];
  return QUESTION_WORDS.includes(first);
}

/** Broad match: every significant token of a term appears in the keyword. */
function matchesBroad(keyword: string, term: string): boolean {
  const keywordTokens = tokenize(keyword);
  return significantTokens(term).every(t =>
    keywordTokens.some(kt => kt === t || (t.length >= 4 && kt.includes(t))),
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Phrase match: the term appears in order as a whole-word phrase. */
function matchesPhrase(keyword: string, term: string): boolean {
  return new RegExp(`(^|\\s)${escapeRegExp(term)}($|\\s)`).test(keyword);
}

/**
 * Apply a match-type tab. Comma-separated seeds match per term: a keyword
 * qualifies when it matches ANY phrase term (AND semantics within a term).
 */
export function applyMatchType(
  keywords: MagicKeyword[],
  matchType: MagicMatchType,
  seed: string,
): MagicKeyword[] {
  const terms = parseSeedTerms(seed);

  switch (matchType) {
    case 'questions':
      return keywords.filter(k => isQuestion(k.keyword));
    case 'broad':
      return keywords.filter(k => terms.some(t => matchesBroad(k.keyword, t)));
    case 'phrase':
      return keywords.filter(k => terms.some(t => matchesPhrase(k.keyword, t)));
    case 'exact':
      return keywords.filter(k => terms.some(t => k.keyword === t || matchesPhrase(k.keyword, t)));
    case 'related':
      return keywords.filter(k => k.source === 'related');
    case 'all':
    default:
      return keywords;
  }
}

/**
 * Sort keywords by a column. 'relevance' is the passive default: it keeps the
 * server's relevance-ranked order (stable no-op) until the user picks a real
 * column — this is what keeps Qatar-matching keywords above volume-heavy
 * drift in the default view.
 */
export function sortKeywords(keywords: MagicKeyword[], sort: MagicSortState): MagicKeyword[] {
  if (sort.column === 'relevance') return keywords;
  const mul = sort.direction === 'asc' ? 1 : -1;
  return [...keywords].sort((a, b) => {
    switch (sort.column) {
      case 'keyword': return a.keyword.localeCompare(b.keyword) * mul;
      case 'volume': return (a.volume - b.volume) * mul;
      case 'kd': return (a.kd - b.kd) * mul;
      case 'cpc': return (a.cpc - b.cpc) * mul;
      case 'serpFeatures': return (a.serpFeatures.length - b.serpFeatures.length) * mul;
      default: return 0;
    }
  });
}
