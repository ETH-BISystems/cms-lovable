import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import {
  ArrowRightLeft,
  Pencil,
  Trash2,
  AlertTriangle,
  FileText,
  Loader2,
  Image as ImageIcon,
  Repeat,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { iframeService, useIframeInstances, type IframeInstanceDoc } from '@/modules/iframes';
import { TransferPartnersPage, transferPartnerService, type TransferPartnerDocument } from '@/modules/cards';
import { AssetPickerDialog } from '@/modules/assets';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { tpTableService, type TpTableBranding } from '../services/tpTableService';
import { TP_ALLIANCE_ICON_OPTIONS, TP_ALLIANCE_OPTIONS, TP_HOTEL_BRAND_OPTIONS, TP_PROGRAM_OPTIONS, tpConfigSearchText } from '../constants';
import { TpTableInsertModal } from './TpTableInsertModal';

const programLabel = (id: string) => TP_PROGRAM_OPTIONS.find((p) => p.id === id)?.label ?? id;

/**
 * Transfer Partner Tables — the stand-alone home of the TP cheat-sheet
 * embeds (a sibling of the iFrame Manager): the Embeds tab audits every
 * tp-table instance (filters, where it's embedded, edit/delete), the Matrix
 * data tab edits the underlying transfer partner values, and the Branding
 * tab sets the program logos / alliance icons the public renderer uses.
 */
export function TransferPartnerTablesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Transfer Partner Tables</h1>
          <p className="text-sm text-muted-foreground">
            Embeddable cheat-sheet tables, the partner values behind them, and brand assets
          </p>
        </div>
      </div>

      <Tabs defaultValue="embeds">
        <TabsList>
          <TabsTrigger value="embeds">Embeds</TabsTrigger>
          <TabsTrigger value="matrix">Matrix data</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>
        <TabsContent value="embeds">
          <EmbedsTab />
        </TabsContent>
        <TabsContent value="matrix">
          <TransferPartnersPage />
        </TabsContent>
        <TabsContent value="branding">
          <BrandingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Embeds tab ───────────────────────────────────────────────────────────────

function EmbedsTab() {
  const { instances, loading } = useIframeInstances();
  const navigate = useNavigate();
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IframeInstanceDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  // CMS-141: searchable like the iFrame Manager — by bank label, alliance,
  // description, or the page the table is embedded in (raw ids match too).
  const tpInstances = useMemo(() => {
    const list = instances.filter((i) => i.type === 'tp-table');
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => {
      if (i.hosts.some((h) => h.title.toLowerCase().includes(q))) return true;
      return tpConfigSearchText(i.tpConfig).includes(q);
    });
  }, [instances, search]);

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
          ? `Table deleted and removed from ${result.removedFromHosts} page(s).`
          : 'Table deleted. Any page still referencing it will show a fallback message.'
      );
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete the table.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3 pt-4">
      {/* CMS-141: find a table by bank / alliance / embedded page */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by bank, alliance, or page it's embedded in…"
          className="pl-9"
        />
      </div>
      {loading ? (
        <>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </>
      ) : tpInstances.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ArrowRightLeft className="w-8 h-8 text-muted-foreground/50" />
          {search.trim() ? (
            <>
              <p className="mt-3 text-sm font-medium">No tables match "{search.trim()}"</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">Try a different bank, alliance, or page title.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium">No Transfer Partner Tables embedded yet</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Open any article's Content Preview and use <span className="font-medium">Insert TP Table</span> to
                embed a filtered cheat sheet. Embedded tables appear here for auditing and editing.
              </p>
            </>
          )}
        </div>
      ) : (
        tpInstances.map((inst) => (
          <TpInstanceRow
            key={inst.id}
            instance={inst}
            onEdit={() => setEditId(inst.id)}
            onDelete={() => setDeleteTarget(inst)}
            onOpenArticle={(docId) => navigate(`/pipeline?article=${docId}`)}
          />
        ))
      )}

      <TpTableInsertModal
        open={editId !== null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
        editInstanceId={editId}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Transfer Partner Table?</AlertDialogTitle>
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
              {deleting ? 'Deleting…' : 'Delete Table'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TpInstanceRow({
  instance,
  onEdit,
  onDelete,
  onOpenArticle,
}: {
  instance: IframeInstanceDoc;
  onEdit: () => void;
  onDelete: () => void;
  onOpenArticle: (docId: string) => void;
}) {
  const cfg = instance.tpConfig;
  const orphaned = instance.hosts.length === 0;

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <div className="w-20 h-12 rounded bg-muted shrink-0 flex items-center justify-center">
        <ArrowRightLeft className="w-5 h-5 text-muted-foreground/50" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="neutral">Transfer Partner Table</Badge>
          <span className="text-xs text-muted-foreground">{instance.rowCount ?? '—'} partner rows</span>
          {cfg?.description && <Badge variant="info">Custom description</Badge>}
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
        </div>

        {cfg && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div className="truncate">
              <span className="font-medium text-foreground/80">Programs:</span>{' '}
              {cfg.programs.map(programLabel).join(' · ')}
            </div>
            <div className="truncate">
              <span className="font-medium text-foreground/80">Rows:</span> {cfg.alliances.join(' · ')}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
          <span>Embedded in:</span>
          {instance.hosts.length === 0 ? (
            <span className="italic">nowhere (orphaned)</span>
          ) : (
            instance.hosts.map((h) =>
              h.collection === 'articles' ? (
                <button
                  key={`${h.collection}/${h.docId}`}
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
                <Badge key={`${h.collection}/${h.docId}`} variant="neutral" className="font-normal">
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
          title="Edit this table's filters"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60"
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          title="Delete this table"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}

// ─── Branding tab ─────────────────────────────────────────────────────────────

function BrandingTab() {
  const [branding, setBranding] = useState<TpTableBranding>({ programLogos: {}, allianceIcons: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Which slot the asset picker is currently choosing for.
  const [pickerSlot, setPickerSlot] = useState<{ map: 'programLogos' | 'allianceIcons'; key: string } | null>(null);
  // CMS-108/110: per-partner logo picking (writes partner.logoUrl)
  const [partners, setPartners] = useState<TransferPartnerDocument[]>([]);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerPicker, setPartnerPicker] = useState<TransferPartnerDocument | null>(null);
  const { role } = useAuth();
  const canEdit = role === Role.Admin || role === Role.Editor;

  useEffect(() => {
    tpTableService
      .getBranding()
      .then(setBranding)
      .catch(() => toast.error('Failed to load branding settings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return transferPartnerService.subscribeToPartners(setPartners, () => setPartners([]));
  }, []);

  const setLogo = (map: 'programLogos' | 'allianceIcons', key: string, url: string) => {
    setBranding((prev) => ({ ...prev, [map]: { ...prev[map], [key]: url.trim() } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await tpTableService.updateBranding(branding);
      toast.success('Branding saved — every Transfer Partner Table embed picks it up within a minute.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save branding.');
    } finally {
      setSaving(false);
    }
  };

  const setPartnerLogo = async (partner: TransferPartnerDocument, url: string) => {
    try {
      await transferPartnerService.updatePartner({
        partnerId: partner.id,
        fields: { logoUrl: url },
      });
      toast.success(url ? `${partner.name} logo set` : `${partner.name} logo cleared`);
    } catch (err) {
      toast.error('Failed to save logo', { description: (err as Error).message });
    }
  };

  const filteredPartners = useMemo(() => {
    const q = partnerSearch.trim().toLowerCase();
    const sorted = [...partners].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.loyaltyProgram ?? '').toLowerCase().includes(q) ||
        (p.alliance ?? '').toLowerCase().includes(q),
    );
  }, [partners, partnerSearch]);

  if (loading) {
    return (
      <div className="space-y-3 pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const slotRow = (map: 'programLogos' | 'allianceIcons', key: string, label: string, hint: string) => {
    const url = branding[map][key] ?? '';
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs w-48 shrink-0">{label}</span>
        <div className="w-14 h-9 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/60">
          {url ? (
            <img src={url} alt="" className="w-full h-full object-contain" />
          ) : (
            <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
          )}
        </div>
        <span className="text-[10px] text-muted-foreground truncate flex-1 min-w-0">
          {url ? url.split('/').pop() : hint}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[10px] shrink-0"
          onClick={() => setPickerSlot({ map, key })}
        >
          Browse…
        </Button>
        {url && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => setLogo(map, key, '')}
          >
            Clear
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pt-4 max-w-2xl">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" /> Program logos
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
          Shown in the table's white logo row (renders at 168×40). Pick art from the Asset Library —
          blank = the program name text shows instead.
        </p>
        <div className="space-y-2">
          {TP_PROGRAM_OPTIONS.map((p) => (
            <div key={p.id}>{slotRow('programLogos', p.id, p.label, 'No logo set')}</div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" /> Alliance icons
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
          Shown at 20×20 next to each partner name. Blank = no icon.
        </p>
        <div className="space-y-2">
          {TP_ALLIANCE_ICON_OPTIONS.map((a) => (
            <div key={a}>{slotRow('allianceIcons', a, a, 'No icon set')}</div>
          ))}
        </div>
      </div>

      {/* CMS-110: hotel brands get individual icon slots */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" /> Hotel brand logos
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
          Shown at 20×20 next to each hotel partner's name — the table matches partners to brands
          automatically (a partner-level override is available in the Transfer Partner Manager).
        </p>
        <div className="space-y-2">
          {TP_HOTEL_BRAND_OPTIONS.map((b) => (
            <div key={b}>{slotRow('allianceIcons', b, b, 'No logo set')}</div>
          ))}
        </div>
      </div>

      {/* CMS-108/110: per-partner logos (airlines + hotels) */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" /> Partner logos
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
          A picked logo renders left of the partner's name in every table (filtered + full) — it
          wins over the alliance/brand icon. Saved per partner, no Save button needed.
        </p>
        <Input
          value={partnerSearch}
          onChange={(e) => setPartnerSearch(e.target.value)}
          placeholder="Search partners (e.g. 'Qantas', 'Marriott')…"
          className="h-8 text-[12px] mb-3 max-w-sm"
        />
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {filteredPartners.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-xs w-48 shrink-0 truncate">
                {p.name}
                <span className="block text-[9px] text-muted-foreground/70">{p.alliance}</span>
              </span>
              <div className="w-9 h-9 rounded bg-white flex items-center justify-center overflow-hidden shrink-0 border border-border/60">
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] shrink-0"
                  onClick={() => setPartnerPicker(p)}
                >
                  Browse…
                </Button>
              )}
              {p.logoUrl && canEdit && (
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => void setPartnerLogo(p, '')}
                >
                  Clear
                </button>
              )}
            </div>
          ))}
          {filteredPartners.length === 0 && (
            <p className="text-[11px] text-muted-foreground py-4 text-center">No partners match.</p>
          )}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
        Save branding
      </Button>

      {/* Asset Library picker — branding slots */}
      <AssetPickerDialog
        open={pickerSlot !== null}
        onOpenChange={(open) => {
          if (!open) setPickerSlot(null);
        }}
        title={pickerSlot ? `Choose art — ${pickerSlot.key}` : 'Choose art'}
        onSelect={(asset) => {
          if (pickerSlot) setLogo(pickerSlot.map, pickerSlot.key, asset.cdnUrl || asset.thumbnailUrl || '');
          setPickerSlot(null);
        }}
      />

      {/* Asset Library picker — per-partner logo */}
      <AssetPickerDialog
        open={partnerPicker !== null}
        onOpenChange={(open) => {
          if (!open) setPartnerPicker(null);
        }}
        title={partnerPicker ? `Choose logo — ${partnerPicker.name}` : 'Choose logo'}
        onSelect={(asset) => {
          if (partnerPicker) void setPartnerLogo(partnerPicker, asset.cdnUrl || asset.thumbnailUrl || '');
          setPartnerPicker(null);
        }}
      />
    </div>
  );
}
