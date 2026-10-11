import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Download,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { SiteHealthDoc, SiteId } from '../../types';

/* ── Mini Sparkline ─────────────────────────────────────────────────── */

function MiniSparkline({ data, color = 'hsl(var(--accent))' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="mt-1">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ── CWV Pill ───────────────────────────────────────────────────────── */

function CwvPill({
  label,
  value,
  unit,
  thresholds,
}: {
  label: string;
  value: number;
  unit: string;
  thresholds: [number, number];
}) {
  const color =
    value <= thresholds[0]
      ? 'bg-green-500/15 text-green-600'
      : value <= thresholds[1]
        ? 'bg-warning/15 text-warning-foreground'
        : 'bg-destructive/15 text-destructive';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
        {value}
        {unit}
      </span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Props ──────────────────────────────────────────────────────────── */

interface SiteHealthOverviewProps {
  siteHealth: SiteHealthDoc | null;
  loading: boolean;
  timeRange: string;
  selectedSite: SiteId;
  onRunFullAudit: () => void;
  onSyncGSC: () => void;
  onSyncSEOApi: () => void;
  onTabChange?: (tab: string) => void;
}

export function SiteHealthOverview({
  siteHealth,
  loading,
  timeRange,
  onRunFullAudit,
  onSyncGSC,
  onSyncSEOApi,
  onTabChange,
}: SiteHealthOverviewProps) {
  const [auditRunning, setAuditRunning] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const timeRangeLabel =
    timeRange === '7 days'
      ? 'this week'
      : timeRange === '30 days'
        ? 'this month'
        : timeRange === '90 days'
          ? 'this quarter'
          : timeRange.startsWith('Custom')
            ? 'in range'
            : 'this week';

  const handleRunAudit = async () => {
    setAuditRunning(true);
    try {
      await onRunFullAudit();
    } finally {
      setAuditRunning(false);
    }
  };

  const exportReport = (format: 'pdf' | 'csv') => {
    setExportDropdownOpen(false);
    toast.info(`Exporting ${format.toUpperCase()} audit report…`);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </Card>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!siteHealth) return null;

  const h = siteHealth;
  const drChange = h.domainRatingChange;
  const indexChange = h.indexedPagesChange;
  const crawlErrors = h.crawlErrors;

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleRunAudit}
          disabled={auditRunning}
          className="h-8 text-[12px] gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {auditRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running audit…
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" /> Run Full Audit
            </>
          )}
        </Button>
        <div className="relative">
          <Button
            variant="outline"
            className="h-8 text-[12px] gap-1.5"
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
          >
            <Download className="w-3.5 h-3.5" /> Export Audit Report{' '}
            <ChevronDown className="w-3 h-3" />
          </Button>
          {exportDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => exportReport('pdf')}
                className="w-full text-left px-3 py-2 text-[12px] hover:bg-muted/50 transition-colors text-card-foreground"
              >
                Export as PDF
              </button>
              <button
                onClick={() => exportReport('csv')}
                className="w-full text-left px-3 py-2 text-[12px] hover:bg-muted/50 transition-colors text-card-foreground"
              >
                Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Freshness */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
        <span>
          GSC data: {h.dataFreshness.gsc.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
          <button className="text-accent hover:underline" onClick={onSyncGSC}>
            Sync Now
          </button>
        </span>
        <span>
          SEO API (DataForSEO):{' '}
          {h.dataFreshness.seoApi.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
          <button className="text-accent hover:underline" onClick={onSyncSEOApi}>
            Sync Now
          </button>
        </span>
        <span>
          Last full audit:{' '}
          {h.dataFreshness.lastFullAudit.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {/* Domain Rating */}
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Domain Rating
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-card-foreground">{h.domainRating}</span>
            {drChange !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-[11px] font-medium ${drChange > 0 ? 'text-green-600' : 'text-destructive'}`}
              >
                {drChange > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {drChange > 0 ? '+' : ''}
                {drChange} {timeRangeLabel}
              </span>
            )}
          </div>
          <MiniSparkline data={h.drHistory} />
        </Card>

        {/* Total Indexed Pages */}
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Total Indexed Pages
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-card-foreground">{h.totalIndexedPages}</span>
            {indexChange !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-[11px] font-medium ${indexChange >= 0 ? 'text-green-600' : 'text-destructive'}`}
              >
                {indexChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {indexChange >= 0 ? '+' : ''}
                {indexChange} {timeRangeLabel}
              </span>
            )}
          </div>
          <Globe className="w-5 h-5 text-muted-foreground/30 mt-2" />
        </Card>

        {/* Core Web Vitals */}
        <Card className="p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Core Web Vitals
          </p>
          <Badge
            className={`text-[10px] border-0 mb-2 ${
              h.cwv.overall === 'Good'
                ? 'bg-green-500/15 text-green-600'
                : h.cwv.overall === 'Poor'
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-warning/15 text-warning-foreground'
            }`}
          >
            {h.cwv.overall}
          </Badge>
          <div className="flex items-center gap-3">
            <CwvPill label="LCP" value={h.cwv.lcp} unit="s" thresholds={[2.5, 4.0]} />
            <CwvPill label="INP" value={h.cwv.inp} unit="ms" thresholds={[200, 500]} />
            <CwvPill label="CLS" value={h.cwv.cls} unit="" thresholds={[0.1, 0.25]} />
          </div>
        </Card>

        {/* Crawl Errors */}
        <Card
          className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
            crawlErrors > 0
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-green-500/30 bg-green-500/5'
          }`}
          onClick={() => onTabChange?.('Technical Issues')}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
            Crawl Errors
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-bold ${crawlErrors > 0 ? 'text-destructive' : 'text-green-600'}`}
            >
              {crawlErrors}
            </span>
            <span className="text-[10px] text-muted-foreground">{timeRangeLabel}</span>
          </div>
          {crawlErrors > 0 ? (
            <AlertTriangle className="w-5 h-5 text-destructive/40 mt-2" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-500/40 mt-2" />
          )}
        </Card>
      </div>

      {/* Audit Summary Bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-[11px] flex-wrap">
        <span className="font-medium text-card-foreground">
          {h.auditSummary.pagesAudited} pages audited
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive" /> {h.auditSummary.critical} Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" /> {h.auditSummary.warnings} Warning
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-accent" /> {h.auditSummary.info} Info
        </span>
        <span className="text-muted-foreground ml-auto">
          Last audit:{' '}
          {h.auditSummary.lastAudit.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}
