import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PageAuditDoc, AuditFilters } from '../../types';
import { AuditComponentGrid } from './AuditComponentGrid';
import { BulkActionBar } from '../shared/BulkActionBar';

const SCORE_RANGES = [
  { label: '90-100', value: '90-100' },
  { label: '80-89', value: '80-89' },
  { label: '70-79', value: '70-79' },
  { label: '60-69', value: '60-69' },
  { label: 'Below 60', value: 'below-60' },
];

const SEVERITY_OPTIONS = ['Critical', 'Warning', 'Info'];

interface AuditResultsTabProps {
  audits: PageAuditDoc[];
  filters: AuditFilters;
  onFiltersChange: (filters: AuditFilters) => void;
  onAuditPage: (articleId: string) => void;
  onRunFullAudit: () => void;
  onViewArticle: (audit: PageAuditDoc) => void;
  auditing: boolean;
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-warning';
  return 'text-destructive';
}

function scoreBg(s: number) {
  if (s >= 80) return 'bg-[#86EFAC]/20 border-[#86EFAC]/40';
  if (s >= 60) return 'bg-[#FDE68A]/20 border-[#FDE68A]/40';
  return 'bg-[#FCA5A5]/20 border-[#FCA5A5]/40';
}

function posColor(p: number | null) {
  if (p === null) return 'text-muted-foreground';
  if (p <= 10) return 'text-success';
  if (p <= 20) return 'text-warning';
  return 'text-destructive';
}

function AuditedByBadge({ by }: { by: string }) {
  if (by === 'Auto')
    return (
      <span className="inline-flex items-center h-6 text-xs font-medium rounded-xl px-2.5 py-0.5 bg-muted text-muted-foreground">
        Auto
      </span>
    );
  if (by === 'Publish')
    return (
      <span className="inline-flex items-center h-6 text-xs font-medium rounded-xl px-2.5 py-0.5 bg-muted text-success">
        Publish
      </span>
    );
  return (
    <span className="inline-flex items-center h-6 text-xs font-medium rounded-xl px-2.5 py-0.5 bg-muted text-foreground">
      {by}
    </span>
  );
}

export function AuditResultsTab({
  audits,
  filters,
  onFiltersChange,
  onAuditPage,
  onRunFullAudit,
  onViewArticle,
  auditing,
}: AuditResultsTabProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [auditingRow, setAuditingRow] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<'seoScore' | 'traffic'>('seoScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const sorted = useMemo(() => {
    const rows = [...audits];
    rows.sort((a, b) => {
      const av = sortCol === 'seoScore' ? a.seoScore : a.traffic;
      const bv = sortCol === 'seoScore' ? b.seoScore : b.traffic;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return rows;
  }, [audits, sortCol, sortDir]);

  const paged = sorted.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortCol(col);
      setSortDir(col === 'seoScore' ? 'asc' : 'desc');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAuditSingle = (articleId: string) => {
    setAuditingRow(articleId);
    onAuditPage(articleId);
    // Reset after a delay (the real callback would handle this)
    setTimeout(() => setAuditingRow(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Score Range
          </label>
          <Select
            value={filters.scoreRange}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, scoreRange: v })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {SCORE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Issue Severity
          </label>
          <Select
            value={filters.severity}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                severity: v as AuditFilters['severity'],
              })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Topic Cluster
          </label>
          <Input
            placeholder="Filter by cluster..."
            value={filters.topicCluster}
            onChange={(e) =>
              onFiltersChange({ ...filters, topicCluster: e.target.value })
            }
            className="w-40"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Author
          </label>
          <Input
            placeholder="Filter by author..."
            value={filters.author}
            onChange={(e) =>
              onFiltersChange({ ...filters, author: e.target.value })
            }
            className="w-40"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Search
          </label>
          <Input
            placeholder="Article title or keyword..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="w-48"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground min-w-[200px]">
                  ARTICLE
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  PUBLISHED
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                  onClick={() => toggleSort('seoScore')}
                >
                  SEO SCORE{' '}
                  {sortCol === 'seoScore'
                    ? sortDir === 'asc'
                      ? '↑'
                      : '↓'
                    : ''}
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ISSUES
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  TOP ISSUE
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                  onClick={() => toggleSort('traffic')}
                >
                  TRAFFIC{' '}
                  {sortCol === 'traffic'
                    ? sortDir === 'desc'
                      ? '↓'
                      : '↑'
                    : ''}
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  KEYWORD
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  POSITION
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  LAST AUDITED
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  AUDITED BY
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a, i) => (
                <AuditRow
                  key={a.articleId}
                  audit={a}
                  index={i}
                  isExpanded={expandedRow === a.articleId}
                  isSelected={selectedIds.has(a.articleId)}
                  isAuditing={auditingRow === a.articleId}
                  onToggleExpand={() =>
                    setExpandedRow(
                      expandedRow === a.articleId ? null : a.articleId
                    )
                  }
                  onToggleSelect={() => toggleSelect(a.articleId)}
                  onAuditNow={() => handleAuditSingle(a.articleId)}
                  onViewArticle={() => onViewArticle(a)}
                />
              ))}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-8 text-center text-muted-foreground text-sm"
                  >
                    No audit results match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * perPage + 1}–
            {Math.min(page * perPage, sorted.length)} of {sorted.length}
          </p>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={[
          {
            label: 'Re-audit Selected',
            onClick: () => {
              selectedIds.forEach((id) => onAuditPage(id));
              setSelectedIds(new Set());
            },
          },
          {
            label: 'Export Audit Report',
            onClick: () => setSelectedIds(new Set()),
          },
        ]}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}

/* ── Individual audit row ─────────────────────────────────────────────── */

interface AuditRowProps {
  audit: PageAuditDoc;
  index: number;
  isExpanded: boolean;
  isSelected: boolean;
  isAuditing: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onAuditNow: () => void;
  onViewArticle: () => void;
}

function AuditRow({
  audit: a,
  index: i,
  isExpanded,
  isSelected,
  isAuditing,
  onToggleExpand,
  onToggleSelect,
  onAuditNow,
  onViewArticle,
}: AuditRowProps) {
  const publishedStr =
    a.publishedDate instanceof Date
      ? a.publishedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : String(a.publishedDate);

  const lastAuditedStr =
    a.lastAuditedAt instanceof Date
      ? a.lastAuditedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : String(a.lastAuditedAt);

  return (
    <>
      <tr
        className={cn(
          'border-b border-border hover:bg-muted/30',
          i % 2 === 1 ? 'bg-muted/20' : ''
        )}
      >
        <td className="px-3 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded"
          />
        </td>
        <td className="px-3 py-3">
          <button
            onClick={onViewArticle}
            className="font-semibold text-foreground hover:text-accent text-left truncate max-w-[200px] block"
          >
            {a.title}
          </button>
        </td>
        <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
          {publishedStr}
        </td>
        <td className="px-3 py-3">
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full border-2 text-[15px] font-bold text-foreground',
              scoreBg(a.seoScore)
            )}
            style={{ width: 40, height: 40 }}
          >
            {a.seoScore}
          </span>
        </td>
        <td className="px-3 py-3">
          <button
            onClick={onToggleExpand}
            className="inline-flex items-center gap-2 hover:underline"
          >
            {a.criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full inline-block bg-destructive/60" />
                {a.criticalCount}
              </span>
            )}
            {a.warningCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full inline-block bg-warning/60" />
                {a.warningCount}
              </span>
            )}
            {a.criticalCount === 0 && a.warningCount === 0 && (
              <span className="text-[12px] font-medium text-success/70">
                ✓ Clean
              </span>
            )}
          </button>
        </td>
        <td className="px-3 py-3">
          {a.topIssue ? (
            <span
              className={cn(
                'inline-block max-w-[140px] truncate text-xs font-medium rounded-xl px-2.5 py-1',
                a.topIssue.severity === 'Critical'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-warning/10 text-warning-foreground'
              )}
              title={a.topIssue.text}
            >
              {a.topIssue.text}
            </span>
          ) : (
            <span className="inline-block text-xs font-medium rounded-xl px-2.5 py-1 bg-success/10 text-success">
              ✓ Clean
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-foreground">
          {a.traffic.toLocaleString()}
        </td>
        <td className="px-3 py-3 text-xs text-foreground">{a.keyword}</td>
        <td className={cn('px-3 py-3 font-bold', posColor(a.position))}>
          {a.position ? `#${a.position}` : '—'}
        </td>
        <td className="px-3 py-3 text-xs text-muted-foreground">
          {lastAuditedStr}
        </td>
        <td className="px-3 py-3">
          <AuditedByBadge by={a.auditedBy} />
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleExpand}
              className="text-xs text-accent hover:underline font-medium"
            >
              View Audit
            </button>
            <button
              onClick={onAuditNow}
              disabled={isAuditing}
              className="text-xs font-medium rounded-full border border-muted-foreground/40 text-muted-foreground px-3 py-1 hover:border-accent hover:text-accent inline-flex items-center gap-1"
            >
              {isAuditing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              Audit Now
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded audit component grid */}
      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={12} className="px-6 py-4">
            <AuditComponentGrid components={a.components} />
            <Button
              size="sm"
              className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={onViewArticle}
            >
              Fix in Article
            </Button>
          </td>
        </tr>
      )}
    </>
  );
}
