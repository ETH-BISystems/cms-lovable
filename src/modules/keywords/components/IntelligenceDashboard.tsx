import { useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import {
  ArrowDown, ArrowUp, BrainCircuit, CheckCircle2, FileSearch, Globe2, Link2, Loader2,
  Play, Settings2, Sparkles, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { seoIntelService } from '../services/seoIntelService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Recommendation, RecommendationType, SeoSnapshot } from '../types/intel';
import { useSeoIntel } from '../hooks/useSeoIntel';
import { RecommendationCard } from './intel/RecommendationCard';
import { ACTIONED_DEEP_LINK, RECOMMENDATION_META } from './intel/recommendationMeta';
import { PageHero } from './analytics/PageHero';
import { formatCompact } from './analytics/format';

type QueueFilter = 'all' | 'content' | 'optimize' | 'backlinks';

const FILTER_TYPES: Record<Exclude<QueueFilter, 'all'>, RecommendationType[]> = {
  content: ['new_content', 'ai_gap', 'linkable_asset', 'brand_reputation'],
  optimize: ['keyword_striking_distance', 'refresh', 'cannibalization_merge', 'internal_link_cluster', 'ai_refresh', 'ai_overview_gap'],
  backlinks: ['backlink_reclaim', 'backlink_gap', 'backlink_fix'],
};

/** CMS-32: per-queue empty states explaining what feeds each tab. */
const EMPTY_QUEUE_COPY: Record<QueueFilter, string> = {
  all: 'No open recommendations — run a snapshot to refresh the queue.',
  content: 'No open content recommendations. These come from competitor keyword gaps, AI answer gaps, and brand-mention signals in the weekly snapshot.',
  optimize: 'No open optimize recommendations. These come from striking-distance keywords (positions 4–15), declining pages, cannibalized topics, and AI Overview gaps — a young domain with few page-1/2 rankings may genuinely have none yet. Run a live snapshot after new content ships to repopulate this queue.',
  backlinks: 'No open backlink recommendations. These come from lost or broken backlinks and domains linking to competitors but not to you — if DataForSEO’s backlink endpoints report nothing for this domain yet, the queue stays empty. Run a live snapshot to retry.',
};

interface HealthTileProps {
  label: string;
  value: string;
  delta: number | undefined;
  deltaSuffix?: string;
  icon: typeof TrendingUp;
  loading: boolean;
  index?: number;
}

function HealthTile({ label, value, delta, deltaSuffix = '', icon: Icon, loading, index = 0 }: HealthTileProps) {
  const hasDelta = typeof delta === 'number' && delta !== 0;
  return (
    <Card
      className="group animate-fade-up rounded-2xl border-0 ring-1 ring-black/[0.06] shadow-[0_2px_6px_rgba(3,43,52,0.1),0_16px_40px_-16px_rgba(3,43,52,0.25)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(3,43,52,0.08),0_24px_56px_-16px_rgba(0,147,167,0.4)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <>
            <p className="mt-1.5 font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
            <p className={cn(
              'mt-0.5 flex items-center gap-1 text-xs',
              hasDelta ? (delta! > 0 ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground',
            )}>
              {hasDelta && (delta! > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              {hasDelta
                ? `${delta! > 0 ? '+' : ''}${formatCompact(delta)}${deltaSuffix} vs last week`
                : 'No change vs last week'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ActionedRow({ rec }: { rec: Recommendation }) {
  const meta = RECOMMENDATION_META[rec.type];
  const linkKey = (Object.keys(ACTIONED_DEEP_LINK) as Array<keyof typeof rec.actionedAs>)
    .find(key => rec.actionedAs?.[key]);
  const link = linkKey ? ACTIONED_DEEP_LINK[linkKey] : null;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.stripeClass)} />
      <Link to={`/keywords/intelligence/${rec.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-accent hover:underline">
        {rec.title}
      </Link>
      {rec.realizedImpact && rec.realizedImpact.estTrafficDelta !== 0 && (
        <span className={cn('text-xs font-medium tabular-nums', rec.realizedImpact.estTrafficDelta > 0 ? 'text-green-600' : 'text-red-600')}>
          {rec.realizedImpact.estTrafficDelta > 0 ? '+' : ''}{formatCompact(rec.realizedImpact.estTrafficDelta)} visits/mo
        </span>
      )}
      <Badge variant="secondary" className="text-[10px]">
        {rec.status === 'done' ? 'Completed' : 'In progress'}
      </Badge>
      {link && (
        <Link to={link.path(rec.id)} className="text-xs text-accent hover:underline">
          {link.label}
        </Link>
      )}
    </div>
  );
}

function EmptyEngineState({ running, onRun }: { running: boolean; onRun: (mock: boolean) => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <BrainCircuit className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-semibold">The intelligence engine hasn't run yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            A snapshot pulls rankings, keyword gaps, and backlink data from DataForSEO, scores every
            opportunity, and builds your priority queue. It re-runs automatically every Monday.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onRun(false)} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run first snapshot
          </Button>
          <Button variant="outline" onClick={() => onRun(true)} disabled={running}>
            <Sparkles className="mr-2 h-4 w-4" />
            Load demo data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function weekSummary(snapshot: SeoSnapshot): string {
  const parts: string[] = [];
  const { segments } = snapshot;
  if (segments.strikingDistance > 0) parts.push(`${segments.strikingDistance} keywords within striking distance of page-1 top`);
  if (segments.gaps > 0) parts.push(`${segments.gaps} competitor content gaps`);
  if (segments.declining > 0) parts.push(`${segments.declining} declining keywords`);
  if (segments.cannibalized > 0) parts.push(`${segments.cannibalized} cannibalized topics`);
  return parts.length > 0 ? `This week the engine found ${parts.join(', ')}.` : 'No notable movements detected this week.';
}

/**
 * SEO Intelligence Command Dashboard — the action layer over all DataForSEO
 * data: weekly health, and a scored queue of things to do next.
 */
export function IntelligenceDashboard() {
  const { snapshot, recommendations, actioned, loading, error, running, runSnapshot } = useSeoIntel();
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configDomain, setConfigDomain] = useState('');
  const [configBrand, setConfigBrand] = useState('');
  const [configCompetitors, setConfigCompetitors] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const openConfig = () => {
    setConfigDomain(snapshot?.domain ?? '');
    setConfigBrand(snapshot?.brand?.phrase ?? '');
    setConfigCompetitors((snapshot?.competitors ?? []).join(', '));
    setConfigOpen(true);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await seoIntelService.updateConfig({
        domain: configDomain.trim() || undefined,
        brandPhrase: configBrand.trim() || undefined,
        competitors: configCompetitors.split(',').map(c => c.trim()).filter(Boolean),
      });
      toast.success('Engine configuration saved — run a live snapshot to apply it');
      setConfigOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return recommendations;
    const types = new Set<RecommendationType>(FILTER_TYPES[filter]);
    return recommendations.filter(r => types.has(r.type));
  }, [recommendations, filter]);
  const visible = showAll ? filtered : filtered.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="SEO Research · Intelligence"
        title="SEO Intelligence"
        icon={BrainCircuit}
        overlap={Boolean(snapshot) || loading}
        description={snapshot
          ? <>Snapshot <span className="font-semibold text-white">{snapshot.week}</span> · {snapshot.domain}
              {snapshot.mock && <Badge variant="outline" className="ml-2 border-white/25 text-[10px] text-cyan-100">demo data</Badge>}</>
          : 'Every DataForSEO signal, scored and turned into a queue of things to do next. Refreshed automatically every Monday.'}
        actions={
          <>
          <Button
            variant="outline"
            onClick={openConfig}
            className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            title="Engine settings — domain, brand, competitors"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={running} className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {running ? 'Running…' : 'Run snapshot'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => runSnapshot(false)}>Run live snapshot (DataForSEO)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runSnapshot(true)}>Load demo data</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </>
        }
      />

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Engine configuration</DialogTitle>
            <DialogDescription>
              The domain, brand phrase, and competitor set every weekly snapshot analyzes.
              Changes apply from the next snapshot run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Domain</label>
              <Input value={configDomain} onChange={e => setConfigDomain(e.target.value)} placeholder="elitetravelhackers.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Brand phrase (web-mention monitoring)</label>
              <Input value={configBrand} onChange={e => setConfigBrand(e.target.value)} placeholder="elite travel hackers" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Competitors (comma separated, up to 5)</label>
              <Input value={configCompetitors} onChange={e => setConfigCompetitors(e.target.value)} placeholder="thepointsguy.com, 10xtravel.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={saveConfig} disabled={savingConfig || !configDomain.trim()}>
              {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !snapshot ? (
        <EmptyEngineState running={running} onRun={runSnapshot} />
      ) : (
        <>
          <div className="relative z-[1] !-mt-14 grid grid-cols-1 gap-4 px-1 sm:grid-cols-2 lg:grid-cols-4">
            <HealthTile label="Organic Traffic" value={formatCompact(snapshot?.metrics.organicTraffic)} delta={snapshot?.deltas.organicTraffic} icon={TrendingUp} loading={loading} index={0} />
            <HealthTile label="Organic Keywords" value={formatCompact(snapshot?.metrics.organicKeywords)} delta={snapshot?.deltas.organicKeywords} icon={FileSearch} loading={loading} index={1} />
            <HealthTile label="Top-10 Rankings" value={formatCompact(snapshot?.metrics.top10)} delta={snapshot?.deltas.top10} icon={Globe2} loading={loading} index={2} />
            <HealthTile label="Referring Domains" value={formatCompact(snapshot?.metrics.referringDomains)} delta={snapshot?.deltas.referringDomains} icon={Link2} loading={loading} index={3} />
          </div>

          {snapshot && (
            <p className="text-sm text-muted-foreground">{weekSummary(snapshot)}</p>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold tracking-tight">Priority Queue</h2>
              <Tabs value={filter} onValueChange={v => { setFilter(v as QueueFilter); setShowAll(false); }}>
                <TabsList>
                  <TabsTrigger value="all">All ({recommendations.length})</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="optimize">Optimize</TabsTrigger>
                  <TabsTrigger value="backlinks">Backlinks</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {visible.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {recommendations.length === 0 ? EMPTY_QUEUE_COPY.all : EMPTY_QUEUE_COPY[filter]}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visible.map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
              </div>
            )}
            {filtered.length > visible.length && (
              <Button variant="ghost" className="w-full" onClick={() => setShowAll(true)}>
                Show {filtered.length - visible.length} more
              </Button>
            )}
          </div>

          {actioned.length > 0 && (
            <div className="space-y-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Actioned
              </h2>
              <Card>
                <CardContent className="divide-y py-2">
                  {actioned.slice(0, 8).map(rec => <ActionedRow key={rec.id} rec={rec} />)}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
