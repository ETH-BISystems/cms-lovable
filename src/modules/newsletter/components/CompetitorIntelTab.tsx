import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Eye,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Bookmark,
  Plus,
  Sparkles,
  BarChart3,
  AlertCircle,
  Star,
  Globe,
} from 'lucide-react';
import { useCompetitorIntel } from '../hooks/useCompetitorIntel';
import { useNewsletterFilters } from '../hooks/useNewsletterFilters';
import type {
  CompetitorNewsletter,
  CompetitorDebrief,
  SavedTopic,
  CompetitorFilters,
} from '../types/index';

interface CompetitorIntelTabProps {
  onResearchTopic?: (topic: string, competitors: string[]) => void;
  onAddToEdition?: (topic: string, competitorContext: { competitors: string[]; type: string }) => void;
  onSaveTopic?: (topic: string) => void;
}

/**
 * Full Competitor Intel tab with all sections.
 *
 * Requirements: 5.1–5.11, 5.16, 13.4
 */
export function CompetitorIntelTab({
  onResearchTopic,
  onAddToEdition,
  onSaveTopic,
}: CompetitorIntelTabProps) {
  const { competitorFilters, setCompetitorFilter } = useNewsletterFilters();
  const { newsletters, debriefs, savedTopics, trending, scorecards, loading } =
    useCompetitorIntel(competitorFilters);

  const [expandedNewsletter, setExpandedNewsletter] = useState<string | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveCompetitor, setArchiveCompetitor] = useState('');

  const latestDebrief = useMemo(
    () => (debriefs.length > 0 ? debriefs[0] : null),
    [debriefs],
  );

  const uniqueCompetitors = useMemo(
    () => Array.from(new Set(newsletters.map((n) => n.competitor))).sort(),
    [newsletters],
  );

  const filteredArchive = useMemo(() => {
    return newsletters.filter((nl) => {
      if (archiveCompetitor && nl.competitor !== archiveCompetitor) return false;
      if (archiveSearch) {
        const q = archiveSearch.toLowerCase();
        return (
          nl.subject.toLowerCase().includes(q) ||
          nl.competitor.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [newsletters, archiveSearch, archiveCompetitor]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Empty state
  if (newsletters.length === 0 && debriefs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Competitor monitoring pending</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No competitor newsletters have been received yet. Monitoring will begin once competitor feeds are configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* ── Daily Debrief Card ── */}
      {latestDebrief && (
        <DebriefCard
          debrief={latestDebrief}
          onAddToEdition={onAddToEdition}
        />
      )}

      {/* ── Saved Topics Strip ── */}
      {savedTopics.length > 0 && (
        <SavedTopicsStrip topics={savedTopics} onAddToEdition={onAddToEdition} />
      )}

      {/* ── Newsletter Scorecard ── */}
      {scorecards.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Newsletter Scorecard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Competitor</TableHead>
                  <TableHead className="text-xs">Avg Score</TableHead>
                  <TableHead className="text-xs">Frequency</TableHead>
                  <TableHead className="text-xs">Avg Affiliates</TableHead>
                  <TableHead className="text-xs">Ads/Edition</TableHead>
                  <TableHead className="text-xs">Top Topic</TableHead>
                  <TableHead className="text-xs">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scorecards.map((sc) => (
                  <TableRow key={sc.competitor}>
                    <TableCell className="text-xs font-medium">{sc.competitor}</TableCell>
                    <TableCell className="text-xs">{sc.avgScore}</TableCell>
                    <TableCell className="text-xs">{sc.frequency}</TableCell>
                    <TableCell className="text-xs">{sc.avgAffiliates}</TableCell>
                    <TableCell className="text-xs">{sc.adsPerEdition}</TableCell>
                    <TableCell className="text-xs">{sc.topTopic}</TableCell>
                    <TableCell>
                      <TrendIndicator trend={sc.trend} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Filters ── */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={competitorFilters.competitor || 'all'}
          onValueChange={(v) => setCompetitorFilter('competitor', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Competitor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Competitors</SelectItem>
            {uniqueCompetitors.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={competitorFilters.dateRange}
          onValueChange={(v) => setCompetitorFilter('dateRange', v as CompetitorFilters['dateRange'])}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by topic..."
          value={competitorFilters.topic}
          onChange={(e) => setCompetitorFilter('topic', e.target.value)}
          className="w-40 h-8 text-xs"
        />
      </div>

      {/* ── Competitor Newsletter Feed ── */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Newsletter Feed</h3>
        {newsletters.map((nl) => (
          <NewsletterFeedItem
            key={nl.id}
            newsletter={nl}
            isExpanded={expandedNewsletter === nl.id}
            onToggle={() =>
              setExpandedNewsletter(expandedNewsletter === nl.id ? null : nl.id)
            }
            onResearchTopic={onResearchTopic}
            onAddToEdition={onAddToEdition}
            onSaveTopic={onSaveTopic}
          />
        ))}
      </div>

      {/* ── Trending Across Competitors ── */}
      {trending.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trending Across Competitors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trending.slice(0, 10).map((t) => (
              <div key={t.topic} className="flex items-center gap-2">
                <span className="text-xs font-medium w-32 truncate">{t.topic}</span>
                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((t.mentionCount / (trending[0]?.mentionCount || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground w-6 text-right">
                  {t.mentionCount}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onResearchTopic?.(t.topic, t.competitors)}
                >
                  <Search className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Strategy Trends (collapsible) ── */}
      <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Strategy Trends
            </span>
            {strategyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <StrategyChartPlaceholder title="Affiliate Link Density Over Time" />
            <StrategyChartPlaceholder title="Most Promoted Cards This Month" />
            <StrategyChartPlaceholder title="Send Timing Heatmap" />
            <StrategyChartPlaceholder title="Advertiser Frequency This Month" />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Cards Competitors Push That You Don't ── */}
      <CompetitorCardsTable newsletters={newsletters} />

      {/* ── Competitor Newsletter Archive ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Newsletter Archive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search archive..."
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Select
              value={archiveCompetitor || 'all'}
              onValueChange={(v) => setArchiveCompetitor(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Competitor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {uniqueCompetitors.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Competitor</TableHead>
                <TableHead className="text-xs">Subject Line</TableHead>
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs">Topics</TableHead>
                <TableHead className="text-xs">Affiliates</TableHead>
                <TableHead className="text-xs">Ads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArchive.slice(0, 20).map((nl) => (
                <TableRow key={nl.id}>
                  <TableCell className="text-xs">
                    {nl.receivedAt instanceof Date
                      ? nl.receivedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : ''}
                  </TableCell>
                  <TableCell className="text-xs font-medium">{nl.competitor}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{nl.subject}</TableCell>
                  <TableCell className="text-xs">{nl.aiScores.overall}</TableCell>
                  <TableCell className="text-xs">{nl.topics.length}</TableCell>
                  <TableCell className="text-xs">
                    {nl.links.filter((l) => l.type === 'affiliate').length}
                  </TableCell>
                  <TableCell className="text-xs">{nl.ads.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


// ─── Sub-components ──────────────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function DebriefCard({
  debrief,
  onAddToEdition,
}: {
  debrief: CompetitorDebrief;
  onAddToEdition?: (topic: string, ctx: { competitors: string[]; type: string }) => void;
}) {
  const [reviewed, setReviewed] = useState(debrief.status === 'reviewed');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Daily Debrief — {debrief.date}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={reviewed ? 'secondary' : 'default'} className="text-[10px]">
              {reviewed ? 'Reviewed' : 'New'}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {debrief.newslettersReceived} newsletters
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject lines */}
        <div>
          <p className="text-xs font-medium mb-1">Subject Lines</p>
          <div className="space-y-1">
            {debrief.subjectLines.map((sl, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="font-medium text-muted-foreground w-24 truncate flex-shrink-0">
                  {sl.competitor}
                </span>
                <span className="truncate">{sl.subject}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key themes */}
        <div>
          <p className="text-xs font-medium mb-1">Key Themes</p>
          <div className="space-y-1">
            {debrief.themes.map((theme, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Badge
                  variant={theme.importance === 'high' ? 'destructive' : 'secondary'}
                  className="text-[10px]"
                >
                  {theme.importance}
                </Badge>
                <span className="flex-1">{theme.theme}</span>
                <span className="text-muted-foreground">{theme.competitorCount} competitors</span>
              </div>
            ))}
          </div>
        </div>

        {/* Promotions table */}
        {debrief.promotions.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Promotions</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px]">Card</TableHead>
                  <TableHead className="text-[10px]">Mentioned By</TableHead>
                  <TableHead className="text-[10px]">Position</TableHead>
                  <TableHead className="text-[10px]">ETH Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debrief.promotions.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{p.cardName}</TableCell>
                    <TableCell className="text-xs">{p.mentionedBy.join(', ')}</TableCell>
                    <TableCell className="text-xs">{p.position}</TableCell>
                    <TableCell className="text-xs">{p.ethStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Gaps and opportunities */}
        {debrief.gaps.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Gaps & Opportunities</p>
            <div className="space-y-1.5">
              {debrief.gaps.map((gap, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Badge
                    variant={gap.priority === 'high' ? 'destructive' : 'outline'}
                    className="text-[10px]"
                  >
                    {gap.priority}
                  </Badge>
                  <span className="flex-1">{gap.topic}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px]"
                    onClick={() =>
                      onAddToEdition?.(gap.topic, {
                        competitors: gap.competitors,
                        type: 'gap',
                      })
                    }
                  >
                    <Plus className="h-3 w-3 mr-0.5" /> Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations */}
        {debrief.recommendations.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI Recommendations
            </p>
            <ul className="space-y-1">
              {debrief.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <Star className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setReviewed(true)}
            disabled={reviewed}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {reviewed ? 'Reviewed' : 'Mark Reviewed'}
          </Button>
          <Button size="sm" className="text-xs">
            Apply to Today's Edition
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SavedTopicsStrip({
  topics,
  onAddToEdition,
}: {
  topics: SavedTopic[];
  onAddToEdition?: (topic: string, ctx: { competitors: string[]; type: string }) => void;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium">Saved Topics</h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {topics
          .filter((t) => !t.dismissed)
          .map((topic) => (
            <Popover key={topic.id}>
              <PopoverTrigger asChild>
                <Badge
                  variant="secondary"
                  className="cursor-pointer text-xs whitespace-nowrap hover:bg-accent"
                >
                  {topic.title}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3 space-y-2">
                <p className="text-xs font-medium">{topic.title}</p>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{topic.type}</Badge>
                  <Badge variant="outline" className="text-[10px]">{topic.source}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Saved by {topic.savedBy}
                </p>
                {topic.usedInEditions.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Used in {topic.usedInEditions.length} edition(s)
                  </p>
                )}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() =>
                      onAddToEdition?.(topic.title, {
                        competitors: [],
                        type: topic.type,
                      })
                    }
                  >
                    Add to Edition
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ))}
      </div>
    </div>
  );
}

function NewsletterFeedItem({
  newsletter: nl,
  isExpanded,
  onToggle,
  onResearchTopic,
  onAddToEdition,
  onSaveTopic,
}: {
  newsletter: CompetitorNewsletter;
  isExpanded: boolean;
  onToggle: () => void;
  onResearchTopic?: (topic: string, competitors: string[]) => void;
  onAddToEdition?: (topic: string, ctx: { competitors: string[]; type: string }) => void;
  onSaveTopic?: (topic: string) => void;
}) {
  const overlapColor =
    nl.coverageOverlap === 'covered'
      ? 'text-green-600'
      : nl.coverageOverlap === 'pipeline'
        ? 'text-blue-600'
        : 'text-amber-600';

  return (
    <Card>
      <CardContent className="p-3">
        {/* Feed item header */}
        <button
          type="button"
          className="w-full flex items-center gap-2 text-left"
          onClick={onToggle}
        >
          {!nl.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
          <span className="text-xs font-medium w-24 truncate flex-shrink-0">
            {nl.competitor}
          </span>
          <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
            {nl.receivedAt instanceof Date
              ? nl.receivedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : ''}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {nl.aiScores.overall}/100
          </Badge>
          <span className="text-xs flex-1 truncate">{nl.subject}</span>
          <div className="flex gap-1 flex-shrink-0">
            {nl.topics.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
          <span className={`text-[10px] ${overlapColor} flex-shrink-0`}>
            {nl.coverageOverlap === 'covered'
              ? 'Covered'
              : nl.coverageOverlap === 'pipeline'
                ? 'In Pipeline'
                : 'Gap'}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
          )}
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            {/* AI Summary */}
            <div>
              <p className="text-xs font-medium mb-1">AI Summary</p>
              <ul className="space-y-0.5">
                {nl.summary.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Content structure */}
            <div>
              <p className="text-xs font-medium mb-1">Content Structure</p>
              <div className="flex gap-0.5 h-4">
                {nl.sections.map((sec, i) => (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{
                      backgroundColor: sec.color,
                      flex: sec.wordCount,
                    }}
                    title={`${sec.type}: ${sec.wordCount} words`}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                {nl.sections.map((sec, i) => (
                  <span key={i} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: sec.color }} />
                    {sec.type} ({sec.wordCount}w)
                  </span>
                ))}
              </div>
            </div>

            {/* Links analysis */}
            {nl.links.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Links</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Type</TableHead>
                      <TableHead className="text-[10px]">Text</TableHead>
                      <TableHead className="text-[10px]">Product</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nl.links.slice(0, 5).map((link, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge
                            variant={link.type === 'affiliate' ? 'default' : 'outline'}
                            className="text-[10px]"
                          >
                            {link.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{link.text}</TableCell>
                        <TableCell className="text-xs">{link.product ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Ads table */}
            {nl.ads.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Advertisements</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Brand</TableHead>
                      <TableHead className="text-[10px]">Type</TableHead>
                      <TableHead className="text-[10px]">Position</TableHead>
                      <TableHead className="text-[10px]">Is Ad?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nl.ads.map((ad, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{ad.brand}</TableCell>
                        <TableCell className="text-xs">{ad.type}</TableCell>
                        <TableCell className="text-xs">{ad.position}</TableCell>
                        <TableCell>
                          <Switch checked={ad.isAd} className="scale-75" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* AI Score breakdown */}
            <div>
              <p className="text-xs font-medium mb-1">AI Score Breakdown</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries({
                  'Content Quality': nl.aiScores.contentQuality,
                  'Affiliate Strategy': nl.aiScores.affiliateStrategy,
                  Engagement: nl.aiScores.engagement,
                  Design: nl.aiScores.design,
                  'Subject Line': nl.aiScores.subjectLine,
                  Overall: nl.aiScores.overall,
                }).map(([label, score]) => (
                  <div key={label} className="space-y-0.5">
                    <div className="flex justify-between text-[10px]">
                      <span>{label}</span>
                      <span>{score}/100</span>
                    </div>
                    <Progress value={score} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>

            {/* Cards mentioned */}
            {nl.cardsMentioned.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Cards Mentioned</p>
                <div className="flex gap-1 flex-wrap">
                  {nl.cardsMentioned.map((card, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {card.name}
                      {card.hasAffiliate && (
                        <span className="ml-1 text-green-600">$</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => onResearchTopic?.(nl.subject, [nl.competitor])}
              >
                <Search className="h-3 w-3 mr-0.5" /> Research Topic
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() =>
                  onAddToEdition?.(nl.subject, {
                    competitors: [nl.competitor],
                    type: 'competitor',
                  })
                }
              >
                <Plus className="h-3 w-3 mr-0.5" /> Add to Edition
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => onSaveTopic?.(nl.subject)}
              >
                <Bookmark className="h-3 w-3 mr-0.5" /> Save for Later
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" asChild>
                <a href={nl.originalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-0.5" /> View Full
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompetitorCardsTable({ newsletters }: { newsletters: CompetitorNewsletter[] }) {
  const competitorCards = useMemo(() => {
    const cardMap = new Map<string, { mentions: number; competitors: Set<string> }>();
    for (const nl of newsletters) {
      for (const card of nl.cardsMentioned) {
        const existing = cardMap.get(card.name);
        if (existing) {
          existing.mentions += 1;
          existing.competitors.add(nl.competitor);
        } else {
          cardMap.set(card.name, { mentions: 1, competitors: new Set([nl.competitor]) });
        }
      }
    }
    return Array.from(cardMap.entries())
      .map(([name, data]) => ({
        name,
        mentions: data.mentions,
        competitors: Array.from(data.competitors),
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);
  }, [newsletters]);

  if (competitorCards.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Cards Competitors Push</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Card Name</TableHead>
              <TableHead className="text-xs">Mentions</TableHead>
              <TableHead className="text-xs">Competitors</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitorCards.map((card) => (
              <TableRow key={card.name}>
                <TableCell className="text-xs font-medium">{card.name}</TableCell>
                <TableCell className="text-xs">{card.mentions}</TableCell>
                <TableCell className="text-xs">{card.competitors.join(', ')}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px]">
                    Add Link
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StrategyChartPlaceholder({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium mb-2">{title}</p>
        <div className="h-32 bg-muted rounded flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Chart placeholder</span>
        </div>
      </CardContent>
    </Card>
  );
}
