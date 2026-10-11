import { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Check,
  X,
  Wrench,
  Code,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { SchemaDoc, SchemaType } from '../../types';

const PAGE_SIZE = 25;

interface SchemaHealthTabProps {
  schemas: SchemaDoc[];
  siteDomain: string;
  onFixSchema?: (schema: SchemaDoc) => void;
  onViewArticle?: (title: string) => void;
}

function SchemaTypeBadge({ type }: { type: SchemaType }) {
  const colors: Record<SchemaType, string> = {
    Article: 'bg-accent/15 text-accent',
    FAQ: 'bg-purple-500/15 text-purple-500',
    Review: 'bg-orange-500/15 text-orange-500',
    HowTo: 'bg-green-500/15 text-green-600',
    None: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[type]}`}>
      {type === 'None' ? 'Missing' : type}
    </span>
  );
}

export function SchemaHealthTab({
  schemas,
  siteDomain,
  onFixSchema,
  onViewArticle,
}: SchemaHealthTabProps) {
  const [search, setSearch] = useState('');
  const [schemaTypeFilter, setSchemaTypeFilter] = useState<'All' | SchemaType>('All');
  const [validationFilter, setValidationFilter] = useState<'All' | 'Valid' | 'Invalid' | 'Missing'>('All');
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<'title' | 'schemaType' | 'lastChecked' | 'default'>('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Summary counts
  const summary = useMemo(() => {
    const valid = schemas.filter((s) => s.schemaValid && s.schemaType !== 'None').length;
    const invalid = schemas.filter((s) => !s.schemaValid && s.schemaType !== 'None').length;
    const missing = schemas.filter((s) => s.schemaType === 'None').length;
    const richResults = schemas.filter((s) => s.richResultsEligible).length;
    const richPercent = schemas.length > 0 ? Math.round((richResults / schemas.length) * 100) : 0;
    return { valid, invalid, missing, richPercent };
  }, [schemas]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...schemas];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.url.toLowerCase().includes(q));
    }
    if (schemaTypeFilter !== 'All') list = list.filter((a) => a.schemaType === schemaTypeFilter);
    if (validationFilter === 'Valid') list = list.filter((a) => a.schemaValid);
    else if (validationFilter === 'Invalid') list = list.filter((a) => !a.schemaValid && a.schemaType !== 'None');
    else if (validationFilter === 'Missing') list = list.filter((a) => a.schemaType === 'None');

    const schemaPriority = (a: SchemaDoc) => {
      if (a.schemaType === 'None') return 0;
      if (!a.schemaValid) return 1;
      return 2;
    };

    list.sort((a, b) => {
      if (sortCol === 'title') {
        const cmp = a.title.localeCompare(b.title);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortCol === 'schemaType') {
        const cmp = a.schemaType.localeCompare(b.schemaType);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortCol === 'lastChecked') {
        const cmp = a.lastChecked.getTime() - b.lastChecked.getTime();
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return schemaPriority(a) - schemaPriority(b);
    });
    return list;
  }, [schemas, search, schemaTypeFilter, validationFilter, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const toggleRow = (id: string) =>
    setSelectedRows((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAll = () => {
    if (selectedRows.size === paginated.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map((a) => a.articleId)));
  };

  const fixSchema = (schema: SchemaDoc) => {
    onFixSchema?.(schema);
    toast.success(`Schema generated for "${schema.title}"`);
  };

  const bulkFixSchema = () => {
    toast.success(`Schema generated for ${selectedRows.size} articles.`);
    setSelectedRows(new Set());
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary Row */}
      <div className="flex items-center gap-4 text-[12px] flex-wrap">
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> {summary.valid} valid
        </span>
        <span className="flex items-center gap-1 text-destructive font-medium">
          <XCircle className="w-3.5 h-3.5" /> {summary.invalid} invalid
        </span>
        <span className="flex items-center gap-1 text-warning-foreground font-medium">
          <AlertTriangle className="w-3.5 h-3.5" /> {summary.missing} missing
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-accent font-medium">{summary.richPercent}% rich results eligible</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search articles..."
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <select
          value={schemaTypeFilter}
          onChange={(e) => {
            setSchemaTypeFilter(e.target.value as any);
            setPage(1);
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
        >
          <option value="All">All Schema Types</option>
          <option value="Article">Article</option>
          <option value="FAQ">FAQ</option>
          <option value="Review">Review</option>
          <option value="HowTo">HowTo</option>
          <option value="None">Missing</option>
        </select>
        <select
          value={validationFilter}
          onChange={(e) => {
            setValidationFilter(e.target.value as any);
            setPage(1);
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
        >
          <option value="All">All Status</option>
          <option value="Valid">Valid</option>
          <option value="Invalid">Invalid</option>
          <option value="Missing">Missing</option>
        </select>
        {selectedRows.size > 0 && (
          <Button
            size="sm"
            className="h-8 text-[11px] gap-1 bg-accent text-accent-foreground"
            onClick={bulkFixSchema}
          >
            <Wrench className="w-3 h-3" /> Bulk Fix Schema ({selectedRows.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded"
                  />
                </th>
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('title')}
                >
                  Article Title {sortCol === 'title' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2.5 text-left font-medium text-muted-foreground">URL</th>
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('schemaType')}
                >
                  Schema Type {sortCol === 'schemaType' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2.5 text-center font-medium text-muted-foreground">Valid</th>
                <th className="p-2.5 text-center font-medium text-muted-foreground">Rich Results</th>
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('lastChecked')}
                >
                  Last Checked {sortCol === 'lastChecked' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2.5 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((article) => (
                <>
                  <tr
                    key={article.articleId}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                      !article.schemaValid || article.schemaType === 'None'
                        ? 'border-l-2 border-l-destructive'
                        : ''
                    }`}
                  >
                    <td className="p-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(article.articleId)}
                        onChange={() => toggleRow(article.articleId)}
                        className="w-3.5 h-3.5 rounded"
                      />
                    </td>
                    <td className="p-2.5 font-medium text-card-foreground max-w-[200px] truncate">
                      <button
                        className="text-left hover:text-accent hover:underline transition-colors"
                        onClick={() => onViewArticle?.(article.title)}
                      >
                        {article.title}
                      </button>
                    </td>
                    <td className="p-2.5 max-w-[120px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground truncate block">
                            {article.url.slice(0, 25)}…
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-[11px]">
                            {siteDomain}
                            {article.url}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-2.5">
                      <SchemaTypeBadge type={article.schemaType} />
                    </td>
                    <td className="p-2.5 text-center">
                      {article.schemaType === 'None' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : article.schemaValid ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-destructive mx-auto" />
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {article.richResultsEligible ? (
                        <Check className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      {article.lastChecked.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {(!article.schemaValid || article.schemaType === 'None') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] gap-1 text-accent hover:text-accent"
                            onClick={() => fixSchema(article)}
                          >
                            <Wrench className="w-3 h-3" /> Fix
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5"
                          onClick={() =>
                            setExpandedSchema(
                              expandedSchema === article.articleId ? null : article.articleId
                            )
                          }
                        >
                          <Code className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5"
                          onClick={() => onViewArticle?.(article.title)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedSchema === article.articleId && (
                    <tr key={`${article.articleId}-schema`}>
                      <td colSpan={8} className="p-0">
                        <div className="bg-muted/30 border-t border-border px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                              JSON-LD Schema
                            </p>
                            <button
                              onClick={() => setExpandedSchema(null)}
                              className="text-[10px] text-muted-foreground hover:text-card-foreground"
                            >
                              ▲ Collapse
                            </button>
                          </div>
                          {article.schemaType === 'None' ? (
                            <div className="flex items-center gap-2 py-4 px-3 rounded-md bg-card border border-border text-[12px] text-muted-foreground">
                              <AlertTriangle className="w-4 h-4 text-warning-foreground shrink-0" />
                              <span>
                                No schema markup found. Click{' '}
                                <strong className="text-accent">Fix</strong> to auto-generate.
                              </span>
                            </div>
                          ) : !article.schemaValid ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-[11px] text-destructive font-medium">
                                <XCircle className="w-3.5 h-3.5" /> Invalid schema — missing required
                                fields
                              </div>
                              <pre className="text-[11px] bg-card rounded-md p-3 border border-destructive/30 overflow-x-auto max-h-56 font-mono leading-relaxed whitespace-pre-wrap">
                                {article.jsonLd || '{}'}
                              </pre>
                              {article.validationErrors && article.validationErrors.length > 0 && (
                                <p className="text-[10px] text-destructive/80">
                                  ⚠ {article.validationErrors.join(', ')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <pre className="text-[11px] text-card-foreground bg-card rounded-md p-3 border border-border overflow-x-auto max-h-56 font-mono leading-relaxed whitespace-pre-wrap">
                              {article.jsonLd || '{}'}
                            </pre>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-[11px] text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? 'default' : 'outline'}
                  className={`h-7 w-7 p-0 text-[11px] ${p === page ? 'bg-accent text-accent-foreground' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
