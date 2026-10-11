import { useCallback, useState } from 'react';
import { Bot, CheckCircle2, Link2, Loader2, MessageSquareText, Sparkles, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { AiProvider, AiPromptResponse, AiVisibilityResult } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { MiniSparkline } from './shared/MiniSparkline';
import { ChartCard } from './analytics/ChartCard';
import { PageHero } from './analytics/PageHero';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { TrackedPromptsPanel } from './intel/TrackedPromptsPanel';
import { MetricCard } from './analytics/MetricCard';
import { EmptyPrompt, ErrorState } from './analytics/StatusStates';
import { DEFAULT_DOMAIN } from './analytics/constants';
import { formatCompact, formatNumber } from './analytics/format';

const PROVIDERS: Array<{ id: AiProvider; label: string }> = [
  { id: 'chat_gpt', label: 'ChatGPT' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'perplexity', label: 'Perplexity' },
  { id: 'claude', label: 'Claude' },
];

const PROVIDER_LABELS = Object.fromEntries(PROVIDERS.map(p => [p.id, p.label])) as Record<AiProvider, string>;

const DEFAULT_PROMPTS = [
  'What are the best websites for learning travel hacking with credit card points?',
  'How do I get business class flights cheap using points and miles?',
].join('\n');

function ResponseRow({ response, target }: { response: AiPromptResponse; target: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-medium">{PROVIDER_LABELS[response.provider]}</Badge>
        <span className="text-xs text-muted-foreground">{response.model}</span>
        {response.status === 'error' ? (
          <Badge variant="secondary" className="ml-auto text-xs">No response</Badge>
        ) : response.mentioned ? (
          <Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {response.cited ? 'Cited' : 'Mentioned'}
          </Badge>
        ) : (
          <Badge variant="secondary" className="ml-auto text-muted-foreground">
            <XCircle className="mr-1 h-3 w-3" />
            Not mentioned
          </Badge>
        )}
      </div>
      {response.snippet && (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{response.snippet}</p>
      )}
      {response.citations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {response.citations.slice(0, 10).map(citation => (
            <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] hover:bg-muted',
                  (citation.domain === target || citation.domain.endsWith(`.${target}`)) &&
                    'border-accent bg-accent/10 text-accent',
                )}
              >
                {citation.domain}
              </Badge>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * AI Visibility — how the brand shows up in AI assistant answers, powered by
 * the DataForSEO AI Optimization API (LLM responses + AI keyword data).
 */
export function AiVisibilityPage() {
  const query = useAnalyticsQuery(seoAnalyticsService.aiVisibility);
  const { run } = query;

  const [target, setTarget] = useState(DEFAULT_DOMAIN);
  const [promptsText, setPromptsText] = useState(DEFAULT_PROMPTS);
  const [keywordsText, setKeywordsText] = useState('travel hacking, credit card points');
  const [providers, setProviders] = useState<AiProvider[]>(['chat_gpt', 'gemini', 'perplexity']);

  const toggleProvider = (id: AiProvider) => {
    setProviders(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const prompts = promptsText.split('\n').map(p => p.trim()).filter(Boolean).slice(0, 5);
  const canRun = !query.loading && target.trim().length > 0 && prompts.length > 0 && providers.length > 0;

  // History-first: this page never auto-fetches; with saved history the query
  // never auto-runs and the HistoryGate below offers the last searches.
  const historyFirst = useHistoryFirst('ai-visibility');

  // Snapshot view — render a saved run instead of the live query.
  const history = useHistorySnapshot<AiVisibilityResult>({
    // "Refresh live data" re-runs the exact analysis the snapshot captured.
    onRefreshLive: snapshot => {
      const p = snapshot.payload as Partial<AiVisibilityResult> | null;
      const responses = p && Array.isArray(p.responses) ? p.responses : [];
      const prompts = [...new Set(responses.map(r => r.prompt))].filter(Boolean).slice(0, 5);
      if (!p?.target || prompts.length === 0) return;
      run({
        target: p.target,
        prompts,
        providers: [...new Set(responses.map(r => r.provider))],
        keywords: Array.isArray(p.aiVolume) ? p.aiVolume.map(v => v.keyword) : [],
      });
    },
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as AiVisibilityResult | null)?.responses)
      ? (history.snapshot.payload as AiVisibilityResult)
      : null;

  const onRun = useCallback(() => {
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(Boolean);
    clearSnapshot();
    run({
      target: target.trim(),
      prompts: promptsText.split('\n').map(p => p.trim()).filter(Boolean).slice(0, 5),
      providers,
      keywords,
    });
  }, [run, target, promptsText, providers, keywordsText, clearSnapshot]);

  const data: AiVisibilityResult | null = snapshotData ?? query.data;
  const loading = snapshotData ? false : historyFirst.checking || query.loading;
  const started = historyFirst.checking || query.loading || query.error !== null || data !== null;

  // History-first gate: shown instead of content until the user re-opens a
  // saved search or starts a new one — no API call is made while it shows.
  const showHistoryGate =
    !historyFirst.checking &&
    historyFirst.hasHistory &&
    !history.snapshot &&
    !query.data &&
    !query.loading &&
    !query.error;

  const okResponses = data?.responses.filter(r => r.status === 'ok') ?? [];
  const mentionedCount = okResponses.filter(r => r.mentioned).length;
  const visibilityPct = okResponses.length > 0 ? Math.round((mentionedCount / okResponses.length) * 100) : 0;
  const totalCitations = data?.responses.reduce((sum, r) => sum + r.citations.length, 0) ?? 0;
  const uniquePrompts = [...new Set((data?.responses ?? []).map(r => r.prompt))];
  const maxCited = Math.max(1, ...(data?.citedDomains ?? []).map(d => d.count));

  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="SEO Research · Intelligence"
        title="AI Visibility"
        icon={Bot}
        description="See whether AI assistants mention or cite your site when answering the questions your audience asks — powered by the DataForSEO AI Optimization API."
        actions={<HistoryPanel page="ai-visibility" onLoad={history.loadSnapshot} />}
      />

      {history.banner}

      <TrackedPromptsPanel />

      <ChartCard title="Run a one-off check" description="Each prompt is asked to every selected AI model with web search enabled. Runs can take a minute or two. For ongoing monitoring, add prompts to the tracked portfolio above.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your domain</label>
              <Input value={target} onChange={e => setTarget(e.target.value)} placeholder="elitetravelhackers.com" data-hero-search-input="" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Keywords for AI search volume (comma separated, optional)</label>
              <Input value={keywordsText} onChange={e => setKeywordsText(e.target.value)} placeholder="travel hacking, credit card points" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Prompts (one per line, up to 5)</label>
            <Textarea
              value={promptsText}
              onChange={e => setPromptsText(e.target.value)}
              rows={4}
              placeholder="What are the best websites for learning travel hacking?"
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {PROVIDERS.map(provider => (
              <label key={provider.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={providers.includes(provider.id)}
                  onCheckedChange={() => toggleProvider(provider.id)}
                />
                {provider.label}
              </label>
            ))}
            <Button onClick={onRun} disabled={!canRun} className="ml-auto">
              {query.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {query.loading ? 'Asking AI models…' : 'Run Analysis'}
            </Button>
          </div>
        </div>
      </ChartCard>

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => history.loadSnapshot(snapshot, 'auto')}
        />
      ) : !started ? (
        <EmptyPrompt message="Run an analysis to see how AI assistants talk about your site." />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="AI Visibility"
              value={loading ? '' : `${visibilityPct}%`}
              sub={data ? `${mentionedCount} of ${okResponses.length} answers mention ${data.target}` : undefined}
              icon={Sparkles}
              loading={loading}
            />
            <MetricCard
              label="Answers Analyzed"
              value={formatNumber(data?.responses.length)}
              sub={data ? `${uniquePrompts.length} prompts` : undefined}
              icon={MessageSquareText}
              loading={loading}
            />
            <MetricCard label="Citations Collected" value={formatNumber(loading ? null : totalCitations)} icon={Link2} loading={loading} />
            <MetricCard
              label="AI Models"
              value={formatNumber(data ? new Set(data.responses.map(r => r.provider)).size : null)}
              icon={Bot}
              loading={loading}
            />
          </div>

          {uniquePrompts.map(prompt => (
            <ChartCard key={prompt} title={prompt} description="Responses per AI model" loading={loading} skeletonHeight={200}>
              <div className="space-y-3">
                {(data?.responses ?? [])
                  .filter(r => r.prompt === prompt)
                  .map(r => <ResponseRow key={`${r.prompt}-${r.provider}`} response={r} target={data?.target ?? ''} />)}
              </div>
            </ChartCard>
          ))}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Top Cited Domains"
              description="Who AI assistants cite for these prompts — your competition for AI answers"
              loading={loading}
              skeletonHeight={320}
            >
              <div className="space-y-2">
                {(data?.citedDomains ?? []).map(row => (
                  <div key={row.domain} className="flex items-center gap-2 text-sm">
                    <span className={cn('w-44 truncate text-xs font-medium', row.isTarget ? 'text-accent' : 'text-muted-foreground')}>
                      {row.domain}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', row.isTarget ? 'bg-accent' : 'bg-muted-foreground/40')}
                        style={{ width: `${(row.count / maxCited) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums">{row.count}</span>
                  </div>
                ))}
                {(data?.citedDomains ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No citations were returned for these prompts.</p>
                )}
              </div>
            </ChartCard>

            <ChartCard
              title="AI Search Volume"
              description="How often keywords appear in AI assistant conversations"
              loading={loading}
              skeletonHeight={320}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="w-32 text-right">AI Volume</TableHead>
                    <TableHead className="w-28">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.aiVolume ?? []).map(row => (
                    <TableRow key={row.keyword}>
                      <TableCell className="font-medium">{row.keyword}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCompact(row.aiSearchVolume)}</TableCell>
                      <TableCell><MiniSparkline data={row.trend.map(t => t.volume)} /></TableCell>
                    </TableRow>
                  ))}
                  {(data?.aiVolume ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        Add keywords above to see AI search volume.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
