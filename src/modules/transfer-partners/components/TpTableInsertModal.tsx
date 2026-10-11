import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Loader2, Plane, Repeat, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { iframeService, useIframeInstances, type IframeHost } from '@/modules/iframes';
import { transferPartnerService, type TransferPartnerDocument } from '@/modules/cards';
import { TP_ALLIANCE_OPTIONS, TP_PROGRAM_OPTIONS, tpConfigSearchText, tpConfigSummary, validateTpConfig } from '../constants';

interface TpTableInsertModalProps {
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

/**
 * Transfer Partner Table insert/edit modal. Per-instance filters choose the
 * card-program columns (e.g. exclude Amex for a non-Amex article) and the
 * alliance row groups (e.g. only Star Alliance); an optional custom
 * description renders above the table. The "Reuse" section inserts an
 * existing table instance again — edit once, every article updates.
 */
export function TpTableInsertModal({
  open,
  onOpenChange,
  host,
  onInserted,
  onUpdated,
  editInstanceId,
}: TpTableInsertModalProps) {
  const isEdit = !!editInstanceId;
  const [programs, setPrograms] = useState<string[]>(TP_PROGRAM_OPTIONS.map((p) => p.id));
  const [alliances, setAlliances] = useState<string[]>([...TP_ALLIANCE_OPTIONS]);
  // CMS-145: airline filter — specific matrix partner ids; non-empty renders ONLY these rows.
  const [partnerPicks, setPartnerPicks] = useState<string[]>([]);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [description, setDescription] = useState('');
  /** CMS-128: compact card-review mode — no search/filters, just logo + name + ratio. */
  const [hideFilters, setHideFilters] = useState(false);
  const [loadingInstance, setLoadingInstance] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reuse list (existing tp-table instances) — create mode only.
  const { instances, loading: instancesLoading } = useIframeInstances();
  const [reuseSearch, setReuseSearch] = useState('');
  const [reusingId, setReusingId] = useState<string | null>(null);

  // Live matrix partner list — drives the airline picker + the row estimate.
  const [allPartners, setAllPartners] = useState<TransferPartnerDocument[] | null>(null);
  useEffect(() => {
    if (!open) return;
    const unsub = transferPartnerService.subscribeToPartners(
      (partners) => setAllPartners(partners),
      () => setAllPartners(null)
    );
    return unsub;
  }, [open]);

  // Live row estimate for the current filter: airline picks win (CMS-145),
  // otherwise it's the partners inside the selected alliance groups.
  const partnerCount = useMemo(() => {
    if (allPartners === null) return null;
    if (partnerPicks.length > 0) {
      const ids = new Set(allPartners.map((p) => p.id));
      return partnerPicks.filter((id) => ids.has(id)).length;
    }
    return allPartners.filter((p) => alliances.includes(p.alliance)).length;
  }, [allPartners, partnerPicks, alliances]);

  // Airline picker options, alliance-grouped then name-sorted, search-filtered.
  const partnerOptions = useMemo(() => {
    const list = (allPartners ?? [])
      .slice()
      .sort((a, b) => a.alliance.localeCompare(b.alliance) || a.name.localeCompare(b.name));
    const q = partnerSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      `${p.name} ${p.loyaltyProgram} ${p.alliance}`.toLowerCase().includes(q)
    );
  }, [allPartners, partnerSearch]);

  // Reset/prefill whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setPrograms(TP_PROGRAM_OPTIONS.map((p) => p.id));
    setAlliances([...TP_ALLIANCE_OPTIONS]);
    setPartnerPicks([]);
    setPartnerSearch('');
    setDescription('');
    setHideFilters(false);
    setReuseSearch('');
    setReusingId(null);
    if (!editInstanceId) return;
    setLoadingInstance(true);
    iframeService
      .getInstance(editInstanceId)
      .then((instance) => {
        if (!instance || instance.type !== 'tp-table') {
          toast.error('This table no longer exists.');
          onOpenChange(false);
          return;
        }
        setPrograms(instance.tpConfig?.programs ?? TP_PROGRAM_OPTIONS.map((p) => p.id));
        setAlliances(instance.tpConfig?.alliances ?? [...TP_ALLIANCE_OPTIONS]);
        setPartnerPicks(instance.tpConfig?.partners ?? []);
        setDescription(instance.tpConfig?.description ?? '');
        setHideFilters(instance.tpConfig?.hideFilters === true);
      })
      .catch(() => {
        toast.error('Failed to load the table.');
        onOpenChange(false);
      })
      .finally(() => setLoadingInstance(false));
  }, [open, editInstanceId, onOpenChange]);

  const validationError = validateTpConfig({ programs, alliances, description, partners: partnerPicks });

  const toggle = (list: string[], value: string, set: (next: string[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const tpInstances = useMemo(() => {
    const list = instances.filter((i) => i.type === 'tp-table');
    const q = reuseSearch.trim().toLowerCase();
    if (!q) return list;
    // CMS-141: match bank LABELS too (e.g. "chase" must find Chase UR tables) —
    // previously only raw program ids matched, so the bank was unfindable.
    return list.filter((i) => {
      if (i.hosts.some((h) => h.title.toLowerCase().includes(q))) return true;
      return tpConfigSearchText(i.tpConfig).includes(q);
    });
  }, [instances, reuseSearch]);

  const handleSubmit = async () => {
    if (validationError) return;
    setSubmitting(true);
    const tpConfig = { programs, alliances, description: description.trim(), hideFilters, partners: partnerPicks };
    try {
      if (isEdit) {
        const result = await iframeService.updateInstance({
          instanceId: editInstanceId,
          tpConfig,
          origin: window.location.origin,
        });
        toast.success('Table updated — the live embed updated everywhere it appears.');
        onUpdated?.(result.embedHtml);
      } else {
        const result = await iframeService.createInstance({
          type: 'tp-table',
          tpConfig,
          host,
          origin: window.location.origin,
        });
        toast.success('Transfer Partner Table inserted.');
        onInserted?.(result.embedHtml);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the table.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReuse = async (instanceId: string) => {
    setReusingId(instanceId);
    try {
      const result = await iframeService.getInstanceEmbed({
        instanceId,
        origin: window.location.origin,
      });
      toast.success('Reusable table inserted — editing it later updates every page that uses it.');
      onInserted?.(result.embedHtml);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load the table embed.');
    } finally {
      setReusingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            {isEdit ? 'Edit Transfer Partner Table' : 'Insert Transfer Partner Table'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Change the programs, alliances, or description — the live embed updates everywhere.'
              : 'Choose which card programs and alliances this table shows. Data always renders live from the Transfer Partner matrix.'}
          </DialogDescription>
        </DialogHeader>

        {loadingInstance ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Card programs = columns */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Card programs (columns)
                </p>
                <div className="flex gap-2">
                  <button className="text-[11px] text-primary hover:underline" onClick={() => setPrograms(TP_PROGRAM_OPTIONS.map((p) => p.id))}>
                    All
                  </button>
                  <button className="text-[11px] text-primary hover:underline" onClick={() => setPrograms([])}>
                    None
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TP_PROGRAM_OPTIONS.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={programs.includes(p.id)}
                      onCheckedChange={() => toggle(programs, p.id, setPrograms)}
                    />
                    <span className="text-xs">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Alliances = row groups */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Alliances (rows)
                </p>
                <div className="flex gap-2">
                  <button className="text-[11px] text-primary hover:underline" onClick={() => setAlliances([...TP_ALLIANCE_OPTIONS])}>
                    All
                  </button>
                  <button className="text-[11px] text-primary hover:underline" onClick={() => setAlliances([])}>
                    None
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {TP_ALLIANCE_OPTIONS.map((a) => (
                  <label key={a} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={alliances.includes(a)}
                      onCheckedChange={() => toggle(alliances, a, setAlliances)}
                    />
                    <span className="text-xs">{a}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {partnerCount === null
                  ? 'Counting partners…'
                  : partnerPicks.length > 0
                    ? `${partnerCount} picked airline${partnerCount === 1 ? '' : 's'} will render in this table.`
                    : `${partnerCount} partner${partnerCount === 1 ? '' : 's'} will render in this table.`}
              </p>
            </div>

            {/* CMS-145: airline filter — narrow the table to specific airlines
                (e.g. "which banks transfer to Japan Airlines"). Picks override
                the alliance row groups above. */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5" /> Filter by airline (optional)
                </p>
                {partnerPicks.length > 0 && (
                  <button className="text-[11px] text-primary hover:underline" onClick={() => setPartnerPicks([])}>
                    Clear ({partnerPicks.length})
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Show only specific airlines — e.g. which banks transfer to one airline. Picks override the alliance groups above.
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  placeholder="Search airlines — e.g. Japan Airlines…"
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="grid gap-1.5 max-h-[180px] overflow-y-auto rounded-md border p-2">
                {allPartners === null ? (
                  <div className="flex items-center justify-center h-12 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : partnerOptions.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">
                    No airlines match "{partnerSearch}".
                  </p>
                ) : (
                  partnerOptions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={partnerPicks.includes(p.id)}
                        onCheckedChange={() => toggle(partnerPicks, p.id, setPartnerPicks)}
                      />
                      <span className="text-xs font-medium truncate">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{p.loyaltyProgram}</span>
                      <Badge variant="outline" className="ml-auto text-[9px] shrink-0">{p.alliance}</Badge>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Custom description */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Table description (optional)
              </p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. How Chase Ultimate Rewards transfers line up for Star Alliance airlines…"
                rows={2}
                maxLength={500}
                className="text-sm"
              />
            </div>

            {/* CMS-128: compact card-review mode */}
            <label className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
              <Checkbox
                checked={hideFilters}
                onCheckedChange={(v) => setHideFilters(v === true)}
                className="mt-0.5"
              />
              <span>
                <span className="text-xs font-medium block">Hide search &amp; filters (card review pages)</span>
                <span className="text-[11px] text-muted-foreground block">
                  Renders just the partner logo, brand name and transfer ratio — no search box, no alliance
                  chips, no Award Seats Open column. Matches the card review page design.
                </span>
              </span>
            </label>

            {validationError && <p className="text-xs text-destructive">{validationError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" onClick={handleSubmit} disabled={!!validationError || submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {isEdit ? 'Save Table' : 'Insert Table'}
              </Button>
            </div>

            {/* Reuse an existing table (create mode only) */}
            {!isEdit && (
              <div className="space-y-2 border-t pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" /> Reuse an existing table
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Insert the same filtered table again — edit it once and every page updates.
                  </p>
                </div>
                {instancesLoading ? (
                  <div className="flex items-center justify-center h-12 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : tpInstances.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic rounded-md border border-dashed p-3 text-center">
                    No tables created yet — configure one above, then reuse it anywhere.
                  </p>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={reuseSearch}
                        onChange={(e) => setReuseSearch(e.target.value)}
                        placeholder="Search by article, program, or alliance…"
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                    <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-1">
                      {tpInstances.map((inst) => {
                        const cfg = inst.tpConfig;
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
                              {/* CMS-141: bank NAMES up front — "3 programs" told you nothing when hunting for the Chase table */}
                              <div className="text-xs font-medium truncate">
                                {cfg ? tpConfigSummary(cfg) : 'Transfer Partner Table'}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {cfg?.description && <Badge variant="info" className="text-[9px]">Description</Badge>}
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {uses === 0
                                    ? 'Not embedded yet'
                                    : `Embedded in: ${inst.hosts.map((h) => h.title).join(', ')}`}
                                </span>
                              </div>
                            </div>
                            {reusingId === inst.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
                          </button>
                        );
                      })}
                      {tpInstances.length === 0 && reuseSearch && (
                        <p className="text-[11px] text-muted-foreground italic text-center py-2">
                          No tables match "{reuseSearch}".
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
