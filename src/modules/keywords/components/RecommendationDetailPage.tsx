import { useState } from 'react';
import { useParams, Link } from '@/lib/router-compat';
import { ArrowLeft, Clock, Loader2, RotateCcw, Sparkles, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { seoIntelService } from '../services/seoIntelService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useIntelAction, useRecommendation } from '../hooks/useSeoIntel';
import { KDBar } from './shared/KDBar';
import { ACTIONED_DEEP_LINK, RECOMMENDATION_META } from './intel/recommendationMeta';
import { ScoreBadge } from './intel/RecommendationCard';
import { formatNumber } from './analytics/format';

function Breakdown({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{Math.round(value * 100)}/100</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Full-page evidence + brief + actions view for one recommendation. */
export function RecommendationDetailPage() {
  const { recommendationId } = useParams<{ recommendationId: string }>();
  const { recommendation: rec, loading, error } = useRecommendation(recommendationId);
  const { act, pendingId } = useIntelAction();
  const pending = pendingId === rec?.id;
  const [briefing, setBriefing] = useState(false);

  const generateBrief = async () => {
    if (!rec) return;
    setBriefing(true);
    try {
      await seoIntelService.generateBrief(rec.id);
      toast.success('Brief generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Brief generation failed');
    } finally {
      setBriefing(false);
    }
  };

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-96" /><Skeleton className="h-48 w-full" /></div>;
  }
  if (error || !rec) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{error ?? 'Recommendation not found.'}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/keywords/intelligence"><ArrowLeft className="mr-2 h-4 w-4" />Back to SEO Intelligence</Link>
        </Button>
      </div>
    );
  }

  const meta = RECOMMENDATION_META[rec.type];
  const Icon = meta.icon;
  const actionedKey = (Object.keys(ACTIONED_DEEP_LINK) as Array<keyof typeof rec.actionedAs>)
    .find(key => rec.actionedAs?.[key]);
  const deepLink = actionedKey ? ACTIONED_DEEP_LINK[actionedKey] : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <Link to="/keywords/intelligence" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
          <ArrowLeft className="h-4 w-4" />
          SEO Intelligence
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn('gap-1', meta.chipClass)}>
                <Icon className="h-3 w-3" />
                {meta.label}
              </Badge>
              {rec.status !== 'open' && (
                <Badge variant="outline" className="capitalize">{rec.status.replace('_', ' ')}</Badge>
              )}
              <span className="text-xs text-muted-foreground">found in {rec.createdWeek}</span>
            </div>
            <h1 className="mt-2 font-display text-[26px] font-bold leading-tight tracking-tight [text-wrap:balance]">{rec.title}</h1>
            <p className="mt-2 text-muted-foreground">{rec.reason}</p>
            <p className="mt-1 text-sm font-medium text-accent">{rec.expectedBenefit}</p>
          </div>
          <ScoreBadge rec={rec} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Why this score</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Breakdown label="Impact" value={rec.impact} hint="Search volume, ranking headroom, link value, and AI-visibility upside combined." />
          <Breakdown label="Confidence" value={rec.confidence} hint="Data freshness, number of independent signals, and competitor proof." />
          <Breakdown label="Effort" value={rec.effort} hint="Estimated work — lower is better; effort discounts the final score." />
          <p className="text-xs text-muted-foreground">{rec.scoreExplanation}</p>
        </CardContent>
      </Card>

      {(rec.evidence.keywords?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Keyword evidence</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="w-24 text-right">Volume</TableHead>
                  <TableHead className="w-28">KD</TableHead>
                  <TableHead className="w-24">Our Pos.</TableHead>
                  <TableHead className="w-40">Best Competitor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rec.evidence.keywords!.map(k => (
                  <TableRow key={k.keyword}>
                    <TableCell className="font-medium">{k.keyword}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(k.volume)}</TableCell>
                    <TableCell>{k.kd > 0 ? <KDBar kd={k.kd} /> : '—'}</TableCell>
                    <TableCell className="tabular-nums">{k.position ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.bestCompetitorPosition ? `#${k.bestCompetitorPosition}${k.competitorDomain ? ` · ${k.competitorDomain}` : ''}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(rec.evidence.domains?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Domain evidence</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rec.evidence.domains!.map(d => (
              <div key={d.domain} className="flex items-center justify-between text-sm">
                <span className="font-medium">{d.domain}</span>
                <span className="text-xs text-muted-foreground">{d.rank ? `authority ${d.rank}` : ''}{d.note ? ` · ${d.note}` : ''}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(rec.evidence.urls?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Pages involved</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {rec.evidence.urls!.map(url => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block truncate text-sm text-muted-foreground hover:text-accent hover:underline">
                {url}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {rec.realizedImpact && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3"><CardTitle className="text-base">Measured impact ({rec.realizedImpact.measuredWeek})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-semibold tabular-nums">{rec.realizedImpact.keywordsImproved}</span> keywords improved
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="font-semibold tabular-nums">{rec.realizedImpact.keywordsDeclined}</span> declined
            </span>
            <span>
              <span className={`font-semibold tabular-nums ${rec.realizedImpact.estTrafficDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {rec.realizedImpact.estTrafficDelta >= 0 ? '+' : ''}{rec.realizedImpact.estTrafficDelta.toLocaleString()}
              </span>{' '}
              est. visits/mo since actioned
            </span>
          </CardContent>
        </Card>
      )}

      {(rec.type === 'new_content' || rec.type === 'ai_gap' || rec.type === 'linkable_asset') && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" disabled={briefing} onClick={generateBrief}>
            {briefing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {briefing ? 'Writing brief…' : rec.contentBrief?.outline.length ? 'Regenerate brief with AI' : 'Generate brief with AI'}
          </Button>
        </div>
      )}

      {rec.contentBrief && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Content brief</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Suggested title: </span><span className="font-medium">{rec.contentBrief.suggestedTitle}</span></div>
            <div><span className="text-muted-foreground">Target keyword: </span><span className="font-medium">{rec.contentBrief.targetKeyword}</span></div>
            {rec.contentBrief.secondaryKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">Secondary:</span>
                {rec.contentBrief.secondaryKeywords.map(k => <Badge key={k} variant="outline" className="text-xs">{k}</Badge>)}
              </div>
            )}
            {rec.contentBrief.outline.length > 0 && (
              <ol className="list-decimal space-y-1 pl-5">
                {rec.contentBrief.outline.map(section => <li key={section}>{section}</li>)}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        {rec.status === 'open' || rec.status === 'snoozed' ? (
          <>
            <Button disabled={pending} onClick={() => act(rec.id, meta.primaryAction)}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
              {meta.primaryLabel}
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => act(rec.id, 'snooze', { days: 30 })}>
              <Clock className="mr-2 h-4 w-4" />
              Snooze 30 days
            </Button>
            <Button variant="ghost" disabled={pending} className="text-destructive hover:text-destructive" onClick={() => act(rec.id, 'dismiss')}>
              <XCircle className="mr-2 h-4 w-4" />
              Dismiss
            </Button>
          </>
        ) : (
          <>
            {deepLink && (
              <Button asChild>
                <Link to={deepLink.path(rec.id)}>{deepLink.label}</Link>
              </Button>
            )}
            {rec.status === 'dismissed' && (
              <Button variant="outline" disabled={pending} onClick={() => act(rec.id, 'reopen')}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
