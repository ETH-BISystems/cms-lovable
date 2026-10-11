import { useEffect, useMemo, useState } from 'react';
import { Frame, LayoutList, Columns3, BadgePercent, Table2, History, Loader2, Repeat, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { iframeService } from '../services/iframeService';
import { useCardPicker } from '../hooks/useCardPicker';
import { useIframeInstances } from '../hooks/useIframeInstances';
import type { IframeHost, IframeInstanceCard, IframeTableRow } from '../types';
import {
  INSERTABLE_IFRAME_TYPES,
  getIframeTypeInfo,
  validateIframeConfig,
} from '../utils/iframeTypes';
import { CardsConfigurator } from './CardsConfigurator';
import { TableConfigurator } from './TableConfigurator';
import { searchIncludes } from '@/platform/utils/searchText';

interface IframeInsertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where the embed lives — recorded on the instance for the audit screen. */
  host?: IframeHost;
  /** Called after a successful insert with the server-built embed HTML. */
  onInserted?: (embedHtml: string) => void;
  /** Called after a successful edit with fresh embed HTML (height may change). */
  onUpdated?: (embedHtml: string) => void;
  /** When set, the modal opens in edit mode prefilled from this instance. */
  editInstanceId?: string | null;
}

/** Type-picker icons, keyed by type id. */
const TYPE_ICONS: Record<string, typeof Frame> = {
  'complementary-cards': LayoutList,
  'comparable-cards': Columns3,
  deals: BadgePercent,
  'custom-table': Table2,
  'offer-history': History,
};

/** One-line meta under the type description ("Exactly 3 cards", "Up to 30 rows"). */
function typeMeta(t: { kind: string; minCards: number; maxCards: number; fixedCards?: number; maxRows: number }): string {
  if (t.kind === 'table') return `Up to ${t.maxRows} rows`;
  if (t.fixedCards !== undefined) return `Exactly ${t.fixedCards} cards`;
  return `${t.minCards}–${t.maxCards} cards`;
}

/**
 * Insert-iFrame modal. Step 1: pick the iframe type (or reuse an existing
 * instance — CMS-94). Step 2: type-specific configuration (card slots for
 * card kinds, custom rows for the table kind). In edit mode (editInstanceId)
 * the type step is skipped.
 */
export function IframeInsertModal({
  open,
  onOpenChange,
  host,
  onInserted,
  onUpdated,
  editInstanceId,
}: IframeInsertModalProps) {
  const isEdit = !!editInstanceId;
  const [step, setStep] = useState<1 | 2>(1);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [slots, setSlots] = useState<IframeInstanceCard[]>([]);
  const [rows, setRows] = useState<IframeTableRow[]>([]);
  const [loadingInstance, setLoadingInstance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { cardsById } = useCardPicker();

  // CMS-94 — reuse state: pick an existing instance to embed the same element
  // again (one instance, many hosts — edit once, updates everywhere).
  const { instances, loading: instancesLoading } = useIframeInstances();
  const [reuseSearch, setReuseSearch] = useState('');
  const [reusingId, setReusingId] = useState<string | null>(null);

  const reuseCandidates = useMemo(() => {
    // TP tables reuse through their own Insert TP Table modal.
    const tpFiltered = instances.filter((i) => i.type !== 'tp-table');
    const q = reuseSearch.trim().toLowerCase();
    if (!q) return tpFiltered;
    return tpFiltered.filter((inst) => {
      if (inst.hosts.some((h) => searchIncludes(h.title, q))) return true;
      if ((inst.rows ?? []).some((r) => searchIncludes(`${r.label} ${r.value}`, q))) return true;
      // Trademark-insensitive: "double cash" must find "Citi® Double Cash Card"
      return inst.cards.some((c) => searchIncludes(cardsById.get(c.cardId)?.name, q));
    });
  }, [instances, reuseSearch, cardsById]);

  // Reset/prefill whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setSlots([]);
    setRows([]);
    setTypeId(null);
    setStep(1);
    setReuseSearch('');
    setReusingId(null);
    if (!editInstanceId) return;
    setLoadingInstance(true);
    iframeService
      .getInstance(editInstanceId)
      .then((instance) => {
        if (!instance) {
          toast.error('This iFrame no longer exists.');
          onOpenChange(false);
          return;
        }
        setTypeId(instance.type);
        setSlots((instance.cards ?? []).map((c) => ({ ...c })));
        setRows((instance.rows ?? []).map((r) => ({ ...r })));
        setStep(2);
      })
      .catch(() => {
        toast.error('Failed to load the iFrame.');
        onOpenChange(false);
      })
      .finally(() => setLoadingInstance(false));
  }, [open, editInstanceId, onOpenChange]);

  const typeInfo = typeId ? getIframeTypeInfo(typeId) : undefined;
  const validationError = typeInfo ? validateIframeConfig(typeInfo, slots, rows) : 'Unknown iFrame type.';

  const pickType = (id: string) => {
    const info = getIframeTypeInfo(id);
    if (!info) return;
    setTypeId(id);
    if (info.kind === 'table') {
      setRows(Array.from({ length: 3 }, () => ({ label: '', value: '' })));
    } else {
      setSlots(
        Array.from({ length: info.fixedCards ?? info.minCards }, () => ({
          cardId: '',
          customText: '',
          readMoreUrl: '',
        }))
      );
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!typeId || !typeInfo || validationError) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        const result = await iframeService.updateInstance({
          instanceId: editInstanceId,
          cards: slots,
          rows,
          origin: window.location.origin,
        });
        toast.success('iFrame updated — the live embed updated everywhere it appears.');
        onUpdated?.(result.embedHtml);
      } else {
        const result = await iframeService.createInstance({
          type: typeId,
          cards: slots,
          rows,
          host,
          origin: window.location.origin,
        });
        toast.success('iFrame inserted.');
        onInserted?.(result.embedHtml);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the iFrame.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * CMS-94 — insert an existing instance's embed into this host too. The
   * server rebuilds the canonical embed tag; reconcileIframeHosts records the
   * new host when the article/card next saves its content.
   */
  const handleReuse = async (instanceId: string) => {
    setReusingId(instanceId);
    try {
      const result = await iframeService.getInstanceEmbed({
        instanceId,
        origin: window.location.origin,
      });
      toast.success('Reusable iFrame inserted — editing it later updates every page that uses it.');
      onInserted?.(result.embedHtml);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load the iFrame embed.');
    } finally {
      setReusingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Frame className="w-5 h-5" />
            {isEdit ? 'Edit iFrame' : step === 1 ? 'Insert iFrame' : `Insert ${typeInfo?.label ?? 'iFrame'}`}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Change the configuration — the live embed updates everywhere it appears.'
              : step === 1
                ? 'Create a new iFrame, or reuse an existing one across pages. Content loads dynamically from the Card Data Manager.'
                : typeInfo?.description}
          </DialogDescription>
        </DialogHeader>

        {loadingInstance ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : step === 1 && !isEdit ? (
          <div className="space-y-5">
            {/* Create new — one card per non-legacy registry type */}
            <div className="grid gap-3">
              {INSERTABLE_IFRAME_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t.id] ?? Frame;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickType(t.id)}
                    className="flex w-full min-w-0 items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/40"
                  >
                    <Icon className="w-5 h-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{t.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">{typeMeta(t)}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CMS-94 — reuse an existing element (same instance, many articles) */}
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5" /> Reuse an existing iFrame
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Insert the same element again — e.g. the same 3 cards across many articles.
                  Edit it once and every page updates.
                </p>
              </div>
              {instancesLoading ? (
                <div className="flex items-center justify-center h-16 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : instances.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic rounded-md border border-dashed p-3 text-center">
                  No existing iFrames yet — create one above, then reuse it anywhere.
                </p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={reuseSearch}
                      onChange={(e) => setReuseSearch(e.target.value)}
                      placeholder="Search by card or article name…"
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <div className="grid gap-2 max-h-[240px] overflow-y-auto pr-1">
                    {reuseCandidates.map((inst) => {
                      const uses = inst.hosts.length;
                      return (
                        <button
                          key={inst.id}
                          type="button"
                          disabled={reusingId !== null}
                          onClick={() => handleReuse(inst.id)}
                          className="flex w-full min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-muted/40 disabled:opacity-60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">
                              {inst.cards.length > 0
                                ? inst.cards
                                    .map((c) => cardsById.get(c.cardId)?.name ?? 'Unknown card')
                                    .join(' · ')
                                : `${(inst.rows ?? []).length} custom rows`}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="neutral" className="text-[9px]">
                                {getIframeTypeInfo(inst.type)?.label ?? inst.type}
                              </Badge>
                              {inst.hasCustomText && (
                                <Badge variant="info" className="text-[9px]">Custom text</Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {uses === 0
                                  ? 'Not embedded yet'
                                  : uses === 1
                                    ? 'One-off — used in 1 page'
                                    : `Reused in ${uses} pages`}
                              </span>
                            </div>
                          </div>
                          {reusingId === inst.id && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                    {reuseCandidates.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic text-center py-2">
                        No iFrames match "{reuseSearch}".
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          typeInfo && (
            <>
              {typeInfo.kind === 'table' ? (
                <TableConfigurator typeInfo={typeInfo} rows={rows} onChange={setRows} />
              ) : (
                <CardsConfigurator
                  typeInfo={typeInfo}
                  slots={slots}
                  onChange={setSlots}
                  cardsById={cardsById}
                />
              )}
              {validationError && (slots.some((s) => s.cardId) || rows.some((r) => r.label || r.value)) && (
                <p className="text-xs text-destructive mt-2">{validationError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                {!isEdit && (
                  <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    Back
                  </Button>
                )}
                <Button type="button" onClick={handleSubmit} disabled={!!validationError || submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  {isEdit ? 'Save iFrame' : 'Insert iFrame'}
                </Button>
              </div>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
