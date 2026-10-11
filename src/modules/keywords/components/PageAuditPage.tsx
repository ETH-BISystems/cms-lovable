import { useCallback } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { PageAuditResult } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { ChartCard } from './analytics/ChartCard';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { MetricCard } from './analytics/MetricCard';
import { ScoreRing } from './analytics/ScoreRing';
import { EmptyPrompt, ErrorState } from './analytics/StatusStates';
import { formatNumber } from './analytics/format';

function MetaRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={warn ? 'text-right font-medium text-amber-600' : 'max-w-[70%] truncate text-right font-medium'}>{value || '—'}</span>
    </div>
  );
}

/**
 * Instant Page Audit — paste any URL and get a technical SEO check (On-Page
 * API instant crawl, 50+ checks) plus a live Lighthouse run.
 */
export function PageAuditPage() {
  const query = useAnalyticsQuery(seoAnalyticsService.pageAudit);
  const { run } = query;

  // History-first: this page never auto-fetches; with saved history the query
  // never auto-runs and the HistoryGate below offers the last searches.
  const historyFirst = useHistoryFirst('page-audit');

  // Snapshot view — render a saved audit instead of the live query.
  const history = useHistorySnapshot<PageAuditResult>({
    // "Refresh live data" re-audits the snapshot's own URL.
    onRefreshLive: snapshot => {
      if (snapshot.payload.url) run({ url: snapshot.payload.url });
    },
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as PageAuditResult | null)?.issues)
      ? (history.snapshot.payload as PageAuditResult)
      : null;
  const onSubmit = useCallback((url: string) => { clearSnapshot(); run({ url }); }, [run, clearSnapshot]);

  const data: PageAuditResult | null = snapshotData ?? query.data;
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

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title="Page Audit"
        description="Instant technical SEO audit of any single page — 50+ on-page checks plus a live Lighthouse run. Takes 30–60 seconds."
        inputPlaceholder="Enter a page URL, e.g. elitetravelhackers.com/amex-transfer-partners"
        buttonLabel="Audit Page"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="page-audit" onLoad={history.loadSnapshot} />}
      />

      {history.banner}

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => history.loadSnapshot(snapshot, 'auto')}
        />
      ) : !started ? (
        <EmptyPrompt message="Enter a URL to run an instant on-page audit with Lighthouse scores." />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : (
        <>
          <ChartCard
            title="Scores"
            description={data ? `HTTP ${data.statusCode} · audited live` : undefined}
            loading={loading}
            skeletonHeight={140}
            actions={data ? (
              <a href={data.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
                {data.url.replace(/^https?:\/\//, '').slice(0, 48)}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : undefined}
          >
            <div className="flex flex-wrap items-center justify-around gap-4">
              <ScoreRing value={data?.onpageScore ?? null} label="On-Page Score" size={104} />
              <div className="h-16 w-px bg-border max-sm:hidden" />
              <ScoreRing value={data?.lighthouse?.performance ?? null} label="Performance" />
              <ScoreRing value={data?.lighthouse?.seo ?? null} label="SEO" />
              <ScoreRing value={data?.lighthouse?.accessibility ?? null} label="Accessibility" />
              <ScoreRing value={data?.lighthouse?.bestPractices ?? null} label="Best Practices" />
            </div>
            {data && !data.lighthouse && (
              <p className="mt-3 text-center text-xs text-muted-foreground">Lighthouse was unavailable for this run — on-page checks still completed.</p>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard label="Issues Found" value={formatNumber(data?.issues.length)} icon={AlertTriangle} loading={loading} />
            <MetricCard label="Checks Passed" value={formatNumber(data?.passed.length)} icon={CheckCircle2} loading={loading} />
            <MetricCard
              label="Time to Interactive"
              value={data ? `${(data.timing.timeToInteractive / 1000).toFixed(1)}s` : '—'}
              sub={data ? `DOM complete ${(data.timing.domComplete / 1000).toFixed(1)}s` : undefined}
              icon={Timer}
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Issues" description="Problems detected on this page" loading={loading} skeletonHeight={280}>
              <div className="space-y-1.5">
                {(data?.issues ?? []).map(check => (
                  <div key={check.key} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
                    {check.label}
                  </div>
                ))}
                {(data?.issues ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No issues detected — clean page.</p>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Passed Checks" loading={loading} skeletonHeight={280}>
              <div className="flex flex-wrap gap-1.5">
                {(data?.passed ?? []).map(check => (
                  <Badge key={check.key} variant="secondary" className="bg-green-50 text-green-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {check.label}
                  </Badge>
                ))}
                {(data?.passed ?? []).length === 0 && (
                  <p className="w-full py-6 text-center text-sm text-muted-foreground">No checks passed.</p>
                )}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Meta & Content" loading={loading} skeletonHeight={220}>
              <div className="space-y-2.5">
                <MetaRow label="Title" value={data?.meta.title ?? ''} />
                <MetaRow
                  label="Title length"
                  value={data ? `${data.meta.titleLength} chars` : ''}
                  warn={Boolean(data && (data.meta.titleLength < 30 || data.meta.titleLength > 65))}
                />
                <MetaRow label="Description" value={data?.meta.description ?? ''} />
                <MetaRow
                  label="Description length"
                  value={data ? `${data.meta.descriptionLength} chars` : ''}
                  warn={Boolean(data && (data.meta.descriptionLength < 70 || data.meta.descriptionLength > 165))}
                />
                <MetaRow label="Canonical" value={data?.meta.canonical ?? ''} />
                <MetaRow label="H1 tags" value={data ? String(data.meta.h1Count) : ''} warn={Boolean(data && data.meta.h1Count !== 1)} />
              </div>
            </ChartCard>

            <ChartCard title="Links & Media" loading={loading} skeletonHeight={220}>
              <div className="space-y-2.5">
                <MetaRow label="Internal links" value={data ? formatNumber(data.meta.internalLinks) : ''} />
                <MetaRow label="External links" value={data ? formatNumber(data.meta.externalLinks) : ''} />
                <MetaRow
                  label="Images without alt"
                  value={data?.meta.imagesWithoutAlt === null ? 'n/a' : formatNumber(data?.meta.imagesWithoutAlt)}
                  warn={Boolean(data?.meta.imagesWithoutAlt)}
                />
                <MetaRow label="Largest Contentful Paint" value={data ? `${(data.timing.largestContentfulPaint / 1000).toFixed(1)}s` : ''} />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0" />
                For a full-site crawl with per-page issues over time, use Site Health in the SEO Command Center.
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

