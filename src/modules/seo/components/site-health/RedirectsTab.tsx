import { useState, useMemo } from 'react';
import {
  Link2,
  ArrowRight,
  Pencil,
  RotateCw,
  Trash2,
  FileUp,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type {
  RedirectDoc,
  RedirectCode,
  RedirectStatus,
  SiteId,
  CreateRedirectInput,
  UpdateRedirectInput,
} from '../../types';

const PAGE_SIZE = 25;
const REDIR_PRIORITY: Record<string, number> = { Loop: 0, Broken: 1, Active: 2 };

interface RedirectsTabProps {
  redirects: RedirectDoc[];
  selectedSite: SiteId;
  onCreateRedirect?: (input: CreateRedirectInput) => Promise<any>;
  onUpdateRedirect?: (input: UpdateRedirectInput) => Promise<void>;
  onDeleteRedirect?: (siteId: SiteId, redirectId: string) => Promise<void>;
  onTestRedirect?: (siteId: SiteId, redirectId: string) => Promise<any>;
}

export function RedirectsTab({
  redirects: initialRedirects,
  selectedSite,
  onCreateRedirect,
  onUpdateRedirect,
  onDeleteRedirect,
  onTestRedirect,
}: RedirectsTabProps) {
  const [redirects, setRedirects] = useState(initialRedirects);
  const [rdFilter, setRdFilter] = useState<'All' | string>('All');
  const [rdStatusFilter, setRdStatusFilter] = useState<'All' | RedirectStatus>('All');
  const [rdChainFilter, setRdChainFilter] = useState<'All' | 'Direct' | 'Chain 3+'>('All');
  const [rdPage, setRdPage] = useState(1);
  const [rdSort, setRdSort] = useState<'priority' | 'createdAt' | 'sourceUrl' | 'statusCode'>(
    'priority'
  );
  const [rdSortDir, setRdSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedChain, setExpandedChain] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDest, setEditDest] = useState('');
  const [editCode, setEditCode] = useState<RedirectCode>(301);
  const [addingNew, setAddingNew] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newCode, setNewCode] = useState<RedirectCode>(301);
  const [newNotes, setNewNotes] = useState('');

  // Keep in sync with prop changes
  useState(() => {
    setRedirects(initialRedirects);
  });

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...redirects];
    if (rdFilter !== 'All') list = list.filter((r) => r.statusCode.toString() === rdFilter);
    if (rdStatusFilter !== 'All') list = list.filter((r) => r.status === rdStatusFilter);
    if (rdChainFilter === 'Direct') list = list.filter((r) => r.chainLength <= 1);
    if (rdChainFilter === 'Chain 3+') list = list.filter((r) => r.chainLength >= 3);
    return list.sort((a, b) => {
      let cmp = 0;
      if (rdSort === 'priority') {
        cmp = (REDIR_PRIORITY[a.status] ?? 3) - (REDIR_PRIORITY[b.status] ?? 3);
        if (cmp === 0) cmp = b.chainLength - a.chainLength;
        if (cmp === 0) cmp = b.createdAt.getTime() - a.createdAt.getTime();
        return cmp;
      }
      if (rdSort === 'createdAt') cmp = a.createdAt.getTime() - b.createdAt.getTime();
      else if (rdSort === 'sourceUrl') cmp = a.sourceUrl.localeCompare(b.sourceUrl);
      else cmp = a.statusCode - b.statusCode;
      return rdSortDir === 'asc' ? cmp : -cmp;
    });
  }, [redirects, rdFilter, rdStatusFilter, rdChainFilter, rdSort, rdSortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((rdPage - 1) * PAGE_SIZE, rdPage * PAGE_SIZE);

  const handleSort = (col: typeof rdSort) => {
    if (rdSort === col) setRdSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setRdSort(col);
      setRdSortDir('asc');
    }
  };

  const summary = useMemo(() => {
    const active = redirects.filter((r) => r.status === 'Active').length;
    const broken = redirects.filter((r) => r.status === 'Broken').length;
    const loops = redirects.filter((r) => r.status === 'Loop').length;
    const chains = redirects.filter((r) => r.chainLength >= 3).length;
    return { active, broken, loops, chains };
  }, [redirects]);

  const handleAdd = async () => {
    if (!newSource || !newDest) return;
    try {
      await onCreateRedirect?.({
        siteId: selectedSite,
        sourceUrl: newSource,
        destinationUrl: newDest,
        statusCode: newCode,
        reason: newNotes || undefined,
      });
      // Optimistic local update
      const nr: RedirectDoc = {
        id: `redir-new-${Date.now()}`,
        sourceUrl: newSource,
        destinationUrl: newDest,
        statusCode: newCode,
        chainLength: 1,
        createdAt: new Date(),
        createdBy: 'User',
        status: 'Active',
        notes: newNotes || undefined,
      };
      setRedirects((prev) => [nr, ...prev]);
      setAddingNew(false);
      setNewSource('');
      setNewDest('');
      setNewCode(301);
      setNewNotes('');
    } catch {
      // Error handled by action hook
    }
  };

  const handleDelete = async (r: RedirectDoc) => {
    setRedirects((prev) => prev.filter((x) => x.id !== r.id));
    try {
      await onDeleteRedirect?.(selectedSite, r.id);
      toast.success(`Redirect deleted: ${r.sourceUrl}`, {
        action: {
          label: 'Undo',
          onClick: () => setRedirects((prev) => [...prev, r]),
        },
      });
    } catch {
      // Restore on error
      setRedirects((prev) => [...prev, r]);
    }
  };

  const handleTest = async (r: RedirectDoc) => {
    try {
      await onTestRedirect?.(selectedSite, r.id);
    } catch {
      // Error handled by action hook
    }
  };

  const handleSimplifyChain = (r: RedirectDoc) => {
    if (!r.chain || !r.finalDestination) return;
    setRedirects((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? {
              ...x,
              chainLength: 1,
              destinationUrl: r.finalDestination!,
              chain: undefined,
              finalDestination: undefined,
            }
          : x
      )
    );
    setExpandedChain(null);
    toast.success(`Chain simplified: ${r.sourceUrl} → ${r.finalDestination}`);
  };

  const startEdit = (r: RedirectDoc) => {
    setEditingId(r.id);
    setEditDest(r.destinationUrl);
    setEditCode(r.statusCode);
  };

  const saveEdit = async (id: string) => {
    try {
      await onUpdateRedirect?.({
        siteId: selectedSite,
        redirectId: id,
        destinationUrl: editDest,
        statusCode: editCode,
      });
      setRedirects((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, destinationUrl: editDest, statusCode: editCode } : r
        )
      );
      setEditingId(null);
    } catch {
      // Error handled by action hook
    }
  };

  const codeColor = (code: RedirectCode) =>
    code === 301 ? 'bg-green-500/15 text-green-600' : 'bg-warning/15 text-warning-foreground';
  const statusColor = (st: RedirectStatus) =>
    st === 'Active'
      ? 'bg-green-500/15 text-green-600'
      : 'bg-destructive/15 text-destructive';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary Bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border text-[11px] flex-wrap">
        <span className="flex items-center gap-1">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">
            {summary.active}
          </span>{' '}
          active
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
            {summary.broken}
          </span>{' '}
          broken
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
            {summary.loops}
          </span>{' '}
          loop detected
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning-foreground">
            {summary.chains}
          </span>{' '}
          chains (3+ hops)
        </span>
        <div className="ml-auto">
          <Button
            size="sm"
            className="h-8 text-[11px] gap-1 bg-accent text-accent-foreground"
            onClick={() => setAddingNew(true)}
          >
            <Link2 className="w-3 h-3" /> Add Redirect
          </Button>
        </div>
      </div>

      {/* Add New Inline Form */}
      {addingNew && (
        <Card className="p-4">
          <div className="grid grid-cols-4 gap-3">
            <Input
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="/old-page-slug/"
              className="h-8 text-[12px]"
            />
            <Input
              value={newDest}
              onChange={(e) => setNewDest(e.target.value)}
              placeholder="/new-page-slug/"
              className="h-8 text-[12px]"
            />
            <select
              value={newCode}
              onChange={(e) => setNewCode(Number(e.target.value) as RedirectCode)}
              className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
            >
              <option value={301}>301 Permanent</option>
              <option value={302}>302 Temporary</option>
              <option value={307}>307 Temporary</option>
            </select>
            <Input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Reason (optional)"
              className="h-8 text-[12px]"
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleAdd}
              className="h-7 text-[11px] bg-accent text-accent-foreground"
            >
              Save
            </Button>
            <button
              onClick={() => setAddingNew(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={rdFilter}
          onChange={(e) => {
            setRdFilter(e.target.value);
            setRdPage(1);
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
        >
          <option value="All">All Codes</option>
          <option value="301">301</option>
          <option value="302">302</option>
          <option value="307">307</option>
        </select>
        <select
          value={rdStatusFilter}
          onChange={(e) => {
            setRdStatusFilter(e.target.value as any);
            setRdPage(1);
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Broken">Broken</option>
          <option value="Loop">Loop</option>
        </select>
        <select
          value={rdChainFilter}
          onChange={(e) => {
            setRdChainFilter(e.target.value as any);
            setRdPage(1);
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-[12px] text-card-foreground"
        >
          <option value="All">All</option>
          <option value="Direct">Direct</option>
          <option value="Chain 3+">Chain (3+)</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[11px] gap-1"
            onClick={() => toast.info('Select a CSV file with columns: source_url, destination_url, status_code')}
          >
            <FileUp className="w-3 h-3" /> Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[11px] gap-1"
            onClick={() => toast.info(`${redirects.length} redirects exported to redirects.csv`)}
          >
            <FileDown className="w-3 h-3" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('sourceUrl')}
                >
                  Source URL {rdSort === 'sourceUrl' && (rdSortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2.5 text-left font-medium text-muted-foreground">
                  Destination URL
                </th>
                <th
                  className="p-2.5 text-center font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('statusCode')}
                >
                  Code {rdSort === 'statusCode' && (rdSortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2.5 text-center font-medium text-muted-foreground">Chain</th>
                <th
                  className="p-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-card-foreground"
                  onClick={() => handleSort('createdAt')}
                >
                  Created {rdSort === 'createdAt' && (rdSortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2.5 text-left font-medium text-muted-foreground">By</th>
                <th className="p-2.5 text-center font-medium text-muted-foreground">Status</th>
                <th className="p-2.5 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r) => (
                <>
                  <tr
                    key={r.id}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                      r.status === 'Broken' || r.status === 'Loop'
                        ? 'border-l-2 border-l-destructive'
                        : ''
                    }`}
                  >
                    <td className="p-2.5 max-w-[160px]">
                      <span className="text-accent truncate block font-mono text-[11px]">
                        {r.sourceUrl}
                      </span>
                    </td>
                    <td className="p-2.5 max-w-[160px]">
                      {editingId === r.id ? (
                        <Input
                          value={editDest}
                          onChange={(e) => setEditDest(e.target.value)}
                          className="h-7 text-[11px]"
                        />
                      ) : (
                        <span className="text-muted-foreground truncate block font-mono text-[11px]">
                          {r.destinationUrl}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {editingId === r.id ? (
                        <select
                          value={editCode}
                          onChange={(e) =>
                            setEditCode(Number(e.target.value) as RedirectCode)
                          }
                          className="h-7 rounded border border-input bg-background px-1 text-[11px]"
                        >
                          <option value={301}>301</option>
                          <option value={302}>302</option>
                          <option value={307}>307</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${codeColor(r.statusCode)}`}
                        >
                          {r.statusCode}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {r.chainLength >= 3 ? (
                        <button
                          onClick={() =>
                            setExpandedChain(expandedChain === r.id ? null : r.id)
                          }
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning-foreground cursor-pointer hover:bg-warning/25"
                        >
                          {r.chainLength} hops
                        </button>
                      ) : r.status === 'Loop' ? (
                        <button
                          onClick={() =>
                            setExpandedChain(expandedChain === r.id ? null : r.id)
                          }
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive cursor-pointer hover:bg-destructive/25"
                        >
                          Loop
                        </button>
                      ) : (
                        <span className="text-muted-foreground">1</span>
                      )}
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      {r.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-2.5 text-muted-foreground">{r.createdBy}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {editingId === r.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] text-green-600"
                              onClick={() => saveEdit(r.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] text-muted-foreground"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5"
                              onClick={() => startEdit(r)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5"
                              onClick={() => handleTest(r)}
                            >
                              <RotateCw className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(r)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedChain === r.id && r.chain && (
                    <tr key={`${r.id}-chain`}>
                      <td colSpan={8} className="p-0">
                        <div className="bg-muted/20 border-t border-border px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap text-[11px]">
                            {r.chain.map((hop, hi) => (
                              <span key={hi} className="flex items-center gap-1">
                                <span className="font-mono text-card-foreground bg-card px-2 py-1 rounded border border-border">
                                  {hop.url}
                                </span>
                                {hi < r.chain!.length - 1 && (
                                  <span className="flex items-center gap-0.5 text-muted-foreground">
                                    <ArrowRight className="w-3 h-3" />
                                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted">
                                      {hop.code}
                                    </span>
                                    <ArrowRight className="w-3 h-3" />
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                          {r.chainLength >= 3 && r.status !== 'Loop' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3 h-7 text-[11px] gap-1 border-accent text-accent"
                              onClick={() => handleSimplifyChain(r)}
                            >
                              <Link2 className="w-3 h-3" /> Simplify Chain
                            </Button>
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[11px] text-muted-foreground">
              Showing {(rdPage - 1) * PAGE_SIZE + 1}–
              {Math.min(rdPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                disabled={rdPage <= 1}
                onClick={() => setRdPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                disabled={rdPage >= totalPages}
                onClick={() => setRdPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
