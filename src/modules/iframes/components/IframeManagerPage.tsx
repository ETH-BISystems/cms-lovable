import { useMemo, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Frame, Pencil, Search, Trash2, AlertTriangle, FileText, CreditCard, Loader2, Repeat, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIframeInstances } from '../hooks/useIframeInstances';
import { useCardPicker } from '../hooks/useCardPicker';
import { iframeService } from '../services/iframeService';
import type { IframeHostRef, IframeInstanceDoc } from '../types';
import { getIframeTypeInfo } from '../utils/iframeTypes';
import { IframeInsertModal } from './IframeInsertModal';
// CMS-141: TP tables list here too (bank labels + search) — helpers come via
// the transfer-partners barrel; usage is render-time only, so the
// iframes ↔ transfer-partners module cycle stays inert.
import { tpConfigSearchText, tpConfigSummary } from '@/modules/transfer-partners';
import { searchIncludes } from '@/platform/utils/searchText';

/** CMS-95 usage buckets: one-off (1 host) vs reusable (2+) vs not embedded (0). */
type UsageFilter = 'all' | 'one-off' | 'reused' | 'orphan';

const hostKeyOf = (h: IframeHostRef) => `${h.collection}/${h.docId}`;

/**
 * iFrame Manager — audit screen for embedded iframe instances. Answers "which
 * content currently contains iFrame A with custom text?" and lets editors jump
 * straight to editing (swap/reorder cards, edit custom text) or deleting
 * (with a warning) any instance.
 *
 * CMS-95: filterable by host article and by usage (one-off vs reusable), and
 * the "Embedded in" article badges deep-link into the Article pipeline.
 */
export function IframeManagerPage() {
  const { instances, loading } = useIframeInstances();
  const { cardsById } = useCardPicker();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [articleFilter, setArticleFilter] = useState<string>('all');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IframeInstanceDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  // CMS-141: TP tables used to be hidden here — you couldn't see which bank a
  // saved table was filtered by, or where it was embedded, without opening
  // /transfer-partners. They now list like every other embed (their dedicated
  // section still exists for matrix/branding management).
  const iframeInstances = instances;

  // Distinct hosts across all instances, for the article filter dropdown.
  const hostOptions = useMemo(() => {
    const map = new Map<string, { key: string; title: string; isArticle: boolean }>();
    for (const inst of iframeInstances) {
      for (const h of inst.hosts) {
        const key = hostKeyOf(h);
        if (!map.has(key)) map.set(key, { key, title: h.title, isArticle: h.collection === 'articles' });
      }
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [iframeInstances]);

  const filtered = useMemo(() => {
    let list = iframeInstances;
    if (articleFilter !== 'all') {
      list = list.filter((inst) => inst.hosts.some((h) => hostKeyOf(h) === articleFilter));
    }
    if (usageFilter === 'one-off') list = list.filter((inst) => inst.hosts.length === 1);
    else if (usageFilter === 'reused') list = list.filter((inst) => inst.hosts.length >= 2);
    else if (usageFilter === 'orphan') list = list.filter((inst) => inst.hosts.length === 0);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((inst) => {
        if (inst.hosts.some((h) => searchIncludes(h.title, q))) return true;
        // CMS-141: bank labels/alliances/description are searchable for TP tables
        if (inst.type === 'tp-table' && tpConfigSearchText(inst.tpConfig).includes(q)) return true;
        // Trademark-insensitive card-name match (®/℠ live mid-name on many cards)
        return inst.cards.some((c) => searchIncludes(cardsById.get(c.cardId)?.name, q));
      });
    }
    return list;
  }, [iframeInstances, articleFilter, usageFilter, search, cardsById]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await iframeService.deleteInstance({
        instanceId: deleteTarget.id,
        stripFromHosts: true,
      });
      toast.success(
        result.removedFromHosts > 0
          ? `iFrame deleted and removed from ${result.removedFromHosts} page(s).`
          : 'iFrame deleted. Any page still referencing it will show a fallback message.'
      );
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete the iFrame.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Frame className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">iFrame Manager</h1>
          <p className="text-sm text-muted-foreground">
            {iframeInstances.length} embedded iFrame{iframeInstances.length === 1 ? '' : 's'} across your content
          </p>
        </div>
      </div>

      {/* Search + CMS-95 filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by page title, card name, or bank…"
            className="pl-9"
          />
        </div>
        <Select value={articleFilter} onValueChange={setArticleFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All articles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All articles / pages</SelectItem>
            {hostOptions.map((h) => (
              <SelectItem key={h.key} value={h.key}>
                <span className="flex items-center gap-1.5">
                  {h.isArticle ? (
                    <FileText className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <CreditCard className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className="truncate">{h.title}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={usageFilter} onValueChange={(v) => setUsageFilter(v as UsageFilter)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Any usage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any usage</SelectItem>
            <SelectItem value="one-off">One-off (1 page)</SelectItem>
            <SelectItem value="reused">Reusable element (2+ pages)</SelectItem>
            <SelectItem value="orphan">Not embedded anywhere</SelectItem>
          </SelectContent>
        </Select>
        {(articleFilter !== 'all' || usageFilter !== 'all') && (
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => {
              setArticleFilter('all');
              setUsageFilter('all');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Instance list */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Frame className="w-8 h-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">
            {iframeInstances.length === 0 ? 'No iFrames embedded yet' : 'No iFrames match these filters'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {iframeInstances.length === 0
              ? 'Open any article\'s Content Preview and use Insert iFrame to embed a live card list. Embedded iFrames appear here for auditing and editing.'
              : 'Try a different article, usage filter, or search term.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inst) => (
            <InstanceRow
              key={inst.id}
              instance={inst}
              cardsById={cardsById}
              onEdit={() => (inst.type === 'tp-table' ? navigate('/transfer-partners') : setEditId(inst.id))}
              onDelete={() => setDeleteTarget(inst)}
              onOpenArticle={(docId) => navigate(`/pipeline?article=${docId}`)}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      <IframeInsertModal
        open={editId !== null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
        editInstanceId={editId}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this iFrame?</AlertDialogTitle>
            <AlertDialogDescription>
              The embed will be removed from {deleteTarget?.hosts.length ?? 0} known page(s)
              {deleteTarget && deleteTarget.hosts.length > 0 && (
                <>
                  :
                  <span className="block mt-1 font-medium text-foreground">
                    {deleteTarget.hosts.map((h) => h.title).join(', ')}
                  </span>
                </>
              )}
              . Any other page still referencing it will show a fallback message. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete iFrame'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InstanceRow({
  instance,
  cardsById,
  onEdit,
  onDelete,
  onOpenArticle,
}: {
  instance: IframeInstanceDoc;
  cardsById: ReturnType<typeof useCardPicker>['cardsById'];
  onEdit: () => void;
  onDelete: () => void;
  onOpenArticle: (docId: string) => void;
}) {
  const typeInfo = getIframeTypeInfo(instance.type);
  const isTpTable = instance.type === 'tp-table';
  const unpublishedCards = instance.cards
    .map((c) => cardsById.get(c.cardId))
    .filter((c) => c && c.publishState === 'unpublished');
  const orphaned = instance.hosts.length === 0;
  const firstCard = instance.cards[0] ? cardsById.get(instance.cards[0].cardId) : undefined;
  const isTable = typeInfo?.kind === 'table' || isTpTable;
  const rowCount = isTpTable ? (instance.rowCount ?? 0) : (instance.rows ?? []).length;

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      {/* Preview thumbnail */}
      {firstCard?.cardImageUrl ? (
        <img
          src={firstCard.cardImageUrl}
          alt=""
          className="w-20 h-12 object-cover rounded bg-muted shrink-0"
        />
      ) : (
        <div className="w-20 h-12 rounded bg-muted shrink-0 flex items-center justify-center">
          {isTable ? (
            <Table2 className="w-5 h-5 text-muted-foreground/50" />
          ) : (
            <CreditCard className="w-5 h-5 text-muted-foreground/50" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="neutral">{isTpTable ? 'Transfer Partner Table' : (typeInfo?.label ?? instance.type)}</Badge>
          <span className="text-xs text-muted-foreground">
            {isTpTable
              ? `${rowCount} partner row${rowCount === 1 ? '' : 's'}`
              : isTable
                ? `${rowCount} row${rowCount === 1 ? '' : 's'}`
                : `${instance.cards.length} card${instance.cards.length === 1 ? '' : 's'}`}
          </span>
          {instance.hasCustomText && <Badge variant="info">Custom text</Badge>}
          {/* CMS-95 — one-off vs reusable at a glance */}
          {instance.hosts.length >= 2 && (
            <Badge variant="success">
              <Repeat className="w-3 h-3 mr-1" />
              Reusable ×{instance.hosts.length}
            </Badge>
          )}
          {orphaned && (
            <Badge variant="warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Not embedded anywhere
            </Badge>
          )}
          {unpublishedCards.length > 0 && (
            <Badge variant="warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {unpublishedCards.length} unpublished card{unpublishedCards.length === 1 ? '' : 's'} hidden
            </Badge>
          )}
        </div>

        <div className="text-sm font-medium truncate">
          {isTpTable
            // CMS-141: which banks/rows this table shows, at a glance
            ? tpConfigSummary(instance.tpConfig)
            : isTable
              ? (instance.rows ?? [])
                  .slice(0, 4)
                  .map((r) => r.label)
                  .filter(Boolean)
                  .join(' · ') || 'Custom table'
              : instance.cards
                  .map((c) => cardsById.get(c.cardId)?.name ?? 'Unknown card')
                  .join(' · ')}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
          <span>Embedded in:</span>
          {instance.hosts.length === 0 ? (
            <span className="italic">nowhere (orphaned)</span>
          ) : (
            instance.hosts.map((h) =>
              h.collection === 'articles' ? (
                // CMS-95 — click an article host to open it in the Article pipeline
                <button
                  key={hostKeyOf(h)}
                  onClick={() => onOpenArticle(h.docId)}
                  title={`Open "${h.title}" in the Article pipeline`}
                  className="inline-flex"
                >
                  <Badge
                    variant="neutral"
                    className="font-normal cursor-pointer hover:border-accent/60 hover:text-accent transition-colors"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    {h.title}
                  </Badge>
                </button>
              ) : (
                <Badge key={hostKeyOf(h)} variant="neutral" className="font-normal">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {h.title}
                </Badge>
              )
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          title="Edit this iFrame"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60"
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          title="Delete this iFrame"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}
