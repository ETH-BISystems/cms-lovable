import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Loader2, Network, Play, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { seoIntelService } from '../services/seoIntelService';
import type { LinkSuggestion } from '../types/intel';
import { ChartCard } from './analytics/ChartCard';
import { PageHero } from './analytics/PageHero';
import { EmptyPrompt, ErrorState } from './analytics/StatusStates';

function useLinkSuggestions() {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => seoIntelService.subscribeToLinkSuggestions(
    data => { setSuggestions(data); setLoading(false); },
    err => { setError(err.message); setLoading(false); },
  ), []);
  return { suggestions, loading, error };
}

function EdgeRow({ suggestion }: { suggestion: LinkSuggestion }) {
  const [pending, setPending] = useState<string | null>(null);

  const act = async (action: 'accept' | 'dismiss') => {
    setPending(action);
    try {
      await seoIntelService.actionLinkSuggestion(suggestion.id, action);
      toast.success(action === 'accept' ? 'Linking task created — see My Tasks' : 'Suggestion dismissed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors hover:border-accent/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="truncate font-medium">{suggestion.sourceTitle}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Badge variant="secondary" className="bg-accent/10 font-mono text-[11px] text-accent">
            {suggestion.anchorText}
          </Badge>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{suggestion.targetTitle}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
      </div>
      {suggestion.status === 'accepted' ? (
        <Badge variant="secondary" className="text-[11px]">
          <Check className="mr-1 h-3 w-3" />
          Task created
        </Badge>
      ) : (
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" disabled={pending !== null} onClick={() => act('accept')}>
            {pending === 'accept' ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
            Accept
          </Button>
          <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => act('dismiss')}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Internal Linking Intelligence — clusters of published articles that should
 * link together, with a concrete anchor and reason per suggested link.
 */
export function InternalLinksPage() {
  const { suggestions, loading, error } = useLinkSuggestions();
  const [running, setRunning] = useState(false);

  const clusters = useMemo(() => {
    const byCluster = new Map<string, LinkSuggestion[]>();
    for (const suggestion of suggestions) {
      if (!byCluster.has(suggestion.clusterId)) byCluster.set(suggestion.clusterId, []);
      byCluster.get(suggestion.clusterId)!.push(suggestion);
    }
    return [...byCluster.entries()]
      .map(([clusterId, edges]) => {
        const articles = new Set(edges.flatMap(e => [e.sourceArticleId, e.targetArticleId]));
        return { clusterId, clusterName: edges[0].clusterName, edges, articleCount: articles.size };
      })
      .sort((a, b) => b.edges.length - a.edges.length);
  }, [suggestions]);

  const runAudit = async (mock: boolean) => {
    setRunning(true);
    try {
      const result = await seoIntelService.runLinkAudit(mock);
      toast.success(result.suggestions > 0
        ? `Link audit complete — ${result.suggestions} suggestions in ${result.clusters} cluster${result.clusters === 1 ? '' : 's'}`
        : 'Link audit complete — no new linking opportunities found');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Link audit failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="SEO Research · Intelligence"
        title="Internal Links"
        icon={Network}
        description="Articles that share ranking keywords but don't link to each other yet. Accepting a suggestion creates an edit task with the exact anchor text. Re-audited every Monday."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={running} className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {running ? 'Auditing…' : 'Run link audit'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => runAudit(false)}>Audit published articles</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runAudit(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Load demo data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : loading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading suggestions…</CardContent></Card>
      ) : clusters.length === 0 ? (
        <EmptyPrompt message="No link suggestions yet. Run a link audit — it analyzes your published articles' shared ranking keywords and existing links." />
      ) : (
        clusters.map(cluster => (
          <ChartCard
            key={cluster.clusterId}
            title={`Link together ${cluster.articleCount} "${cluster.clusterName}" articles`}
            description={`${cluster.edges.length} suggested link${cluster.edges.length === 1 ? '' : 's'} in this cluster`}
            actions={
              <Badge variant="outline" className={cn('text-xs', cluster.edges.some(e => e.status === 'open') ? 'border-accent text-accent' : '')}>
                {cluster.edges.filter(e => e.status === 'open').length} open
              </Badge>
            }
          >
            <div className="space-y-2">
              {cluster.edges.map(edge => <EdgeRow key={edge.id} suggestion={edge} />)}
            </div>
          </ChartCard>
        ))
      )}
    </div>
  );
}
