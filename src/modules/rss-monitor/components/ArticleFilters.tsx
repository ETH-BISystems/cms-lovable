import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import type { ArticleTab } from '../hooks/useArticles';
import type {
  ArticleFilters as ArticleFiltersType,
  AiScoreRange,
  DateRange,
} from '../hooks/useArticleFilters';
import type { RSSFeed, RSSArticle, ContentType } from '../types';

// Match the values the enrichment function actually writes so the filter
// can hit real documents
const CONTENT_TYPES: ContentType[] = [
  'News',
  'Deal',
  'Guide',
  'Review',
];

const AI_SCORE_OPTIONS: { value: AiScoreRange; label: string }[] = [
  { value: 'high', label: 'High (≥70)' },
  { value: 'medium', label: 'Medium (40–69)' },
  { value: 'low', label: 'Low (<40)' },
];

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

export interface ArticleFiltersProps {
  tab: ArticleTab;
  filters: ArticleFiltersType;
  feeds: RSSFeed[];
  /** Currently loaded articles — topic filter options are derived from their tags. */
  articles: RSSArticle[];
  setSearch: (value: string | null) => void;
  setSource: (value: string | null) => void;
  setTopics: (value: string[] | null) => void;
  setAiScore: (value: AiScoreRange | null) => void;
  setDateRange: (value: DateRange | null) => void;
  setContentType: (value: ContentType | null) => void;
  setStatus: (value: string | null) => void;
  setDismissedBy: (value: string | null) => void;
  setResearchedBy: (value: string | null) => void;
  clearFilters: () => void;
}

/**
 * The topic taxonomy the enrichment function writes to articles.
 * Mirrors TOPIC_KEYWORDS in functions/src/rss-monitor/enrich.ts — keep 1:1.
 */
export const ENRICHMENT_TOPICS: string[] = [
  'Credit Cards',
  'Airlines',
  'Hotels',
  'Award Travel',
  'Loyalty Programs',
  'Deals & Alerts',
  'Lounges',
  'Destinations',
];

/**
 * Topic filter options = enrichment taxonomy ∪ tags actually present on the
 * loaded articles (covers legacy documents with older tag values) ∪ the
 * currently selected topics (so an active selection never disappears from the
 * dropdown while it is filtering the list). Extra tags sort after the taxonomy.
 */
export function getTopicOptions(
  articles: RSSArticle[],
  selectedTopics?: string[] | null,
): string[] {
  const extras = new Set<string>();
  for (const article of articles) {
    for (const topic of article.topics) extras.add(topic);
  }
  for (const topic of selectedTopics ?? []) extras.add(topic);
  for (const topic of ENRICHMENT_TOPICS) extras.delete(topic);
  return [...ENRICHMENT_TOPICS, ...[...extras].sort((a, b) => a.localeCompare(b))];
}

function hasActiveFilters(filters: ArticleFiltersType): boolean {
  return !!(
    filters.search ||
    filters.source ||
    (filters.topics && filters.topics.length > 0) ||
    filters.aiScore ||
    filters.dateRange ||
    filters.contentType ||
    filters.status ||
    filters.dismissedBy ||
    filters.researchedBy
  );
}

export function ArticleFiltersComponent({
  tab,
  filters,
  feeds,
  articles,
  setSearch,
  setSource,
  setTopics,
  setAiScore,
  setDateRange,
  setContentType,
  setStatus,
  setDismissedBy,
  setResearchedBy,
  clearFilters,
}: ArticleFiltersProps) {
  const topics = getTopicOptions(articles, filters.topics);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Keyword search — all tabs */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={filters.search ?? ''}
          onChange={(e) => setSearch(e.target.value || null)}
          placeholder="Search articles..."
          aria-label="Search articles"
          className="h-9 w-[220px] pl-8 text-xs"
        />
      </div>

      {/* Source filter — all tabs */}
      <Select
        value={filters.source ?? ''}
        onValueChange={(v) => setSource(v || null)}
      >
        <SelectTrigger className="w-[160px] h-9 text-xs">
          <SelectValue placeholder="All Sources" />
        </SelectTrigger>
        <SelectContent>
          {feeds.map((feed) => (
            <SelectItem key={feed.id} value={feed.id}>
              {feed.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Feed tab filters */}
      {tab === 'feed' && (
        <>
          {/* Topics multi-select (simplified as single-select for now) */}
          <Select
            value={filters.topics?.[0] ?? ''}
            onValueChange={(v) => setTopics(v ? [v] : null)}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* AI Score */}
          <Select
            value={filters.aiScore ?? ''}
            onValueChange={(v) => setAiScore((v as AiScoreRange) || null)}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="AI Score" />
            </SelectTrigger>
            <SelectContent>
              {AI_SCORE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Select
            value={filters.dateRange ?? ''}
            onValueChange={(v) => setDateRange((v as DateRange) || null)}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Content Type */}
          <Select
            value={filters.contentType ?? ''}
            onValueChange={(v) => setContentType((v as ContentType) || null)}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((ct) => (
                <SelectItem key={ct} value={ct}>
                  {ct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Researching tab filters */}
      {tab === 'researching' && (
        <>
          <Select
            value={filters.status ?? ''}
            onValueChange={(v) => setStatus(v || null)}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="researching">Researching</SelectItem>
              <SelectItem value="in-pipeline">In Pipeline</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.researchedBy ?? ''}
            onValueChange={(v) => setResearchedBy(v || null)}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Researched By" />
            </SelectTrigger>
            <SelectContent>
              {/* Populated dynamically from article data in practice */}
              <SelectItem value="__placeholder" disabled>
                No researchers yet
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {/* Dismissed tab filters */}
      {tab === 'dismissed' && (
        <>
          <Select
            value={filters.topics?.[0] ?? ''}
            onValueChange={(v) => setTopics(v ? [v] : null)}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="All Topics" />
            </SelectTrigger>
            <SelectContent>
              {topics.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.contentType ?? ''}
            onValueChange={(v) => setContentType((v as ContentType) || null)}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((ct) => (
                <SelectItem key={ct} value={ct}>
                  {ct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.dismissedBy ?? ''}
            onValueChange={(v) => setDismissedBy(v || null)}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="Dismissed By" />
            </SelectTrigger>
            <SelectContent>
              {/* Populated dynamically from article data in practice */}
              <SelectItem value="__placeholder" disabled>
                No dismissals yet
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {/* Clear filters */}
      {hasActiveFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs"
          onClick={clearFilters}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
