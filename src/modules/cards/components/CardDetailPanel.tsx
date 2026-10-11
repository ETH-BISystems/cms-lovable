import { useState, useRef, useCallback } from 'react';
import { Link } from '@/lib/router-compat';
import {
  X, ExternalLink, Copy, Check, Globe, Link2, ChevronDown, ChevronRight,
  CreditCard, AlertTriangle, Pencil, Plus, Trash2, Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useCardsContext } from '../context/CardsContext';
import { WEBFLOW_SITE_SHORTNAME } from '@/platform/config';
import { useCardDetail } from '../hooks/useCardDetail';
import { extractDetailData } from '../utils/extractDetailData';
import { computeCompositeScore } from '../utils/computeCompositeScore';
import { displayCardValue } from '../utils/displayCardValues';
import { toAbbreviatedSlots, trimTrailingEmpty, abbreviatedSlotFields } from '../utils/abbreviatedSlots';
import { useCardActions } from '../hooks/useCardActions';
import { toast } from 'sonner';
import type { CardDocument, CardStatus, CardDetailData, CardUsageDetails } from '../types';

import { ConfirmScrapeDialog } from './ConfirmScrapeDialog';

// Detail tab components
import { CardOverviewTab } from './detail-tabs/CardOverviewTab';
import { CardBenefitsTab } from './detail-tabs/CardBenefitsTab';
import { CardRewardsTab } from './detail-tabs/CardRewardsTab';
import { CardEditorialTab } from './detail-tabs/CardEditorialTab';
import { CardTransferPartnersTab } from './detail-tabs/CardTransferPartnersTab';
import { CardChangeHistoryTab } from './detail-tabs/CardChangeHistoryTab';
import { CardArticlesTab } from './detail-tabs/CardArticlesTab';
import { CardIframesTab } from './detail-tabs/CardIframesTab';

// ─── Constants ───────────────────────────────────────────────────────────────

const ISSUER_COLORS: Record<string, string> = {
  'Chase': 'bg-[#0a3d91]', 'American Express': 'bg-[#006fcf]',
  'Capital One': 'bg-[#d03027]', 'Citi': 'bg-[#003b70]',
  'Barclays': 'bg-[#00aeef]', 'US Bank': 'bg-[#c41230]',
  'Wells Fargo': 'bg-[#d71e28]', 'Bilt': 'bg-[#1a1a1a]',
  'Bank of America': 'bg-[#012169]', 'Discover': 'bg-[#f76f20]',
};
const ISSUER_SHORT: Record<string, string> = {
  'Chase': 'C', 'American Express': 'AX', 'Capital One': 'C1',
  'Citi': 'Ci', 'Barclays': 'B', 'US Bank': 'US',
  'Wells Fargo': 'WF', 'Bilt': 'B', 'Bank of America': 'BA', 'Discover': 'D',
};
const statusConfig: Record<CardStatus, { label: string; cls: string }> = {
  current: { label: 'Current', cls: 'bg-green-500/10 text-green-600 border-green-500/30' },
  changed: { label: 'Changed', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  outdated: { label: 'Outdated', cls: 'bg-red-500/10 text-red-600 border-red-500/30' },
  new: { label: 'New', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
};

// ─── Source URLs Section ──────────────────────────────────────────────────────

interface SourceUrlsProps {
  issuerUrl: string; affiliateLink: string; ratesTermsUrl: string;
  competitors: { label: string; url: string }[];
  onIssuerUrlChange: (v: string) => void;
  onAffiliateLinkChange: (v: string) => void;
  onRatesTermsUrlChange: (v: string) => void;
  onCompetitorsChange: (v: { label: string; url: string }[]) => void;
}

function SourceUrlsSection({
  issuerUrl, affiliateLink, ratesTermsUrl, competitors,
  onIssuerUrlChange, onAffiliateLinkChange, onRatesTermsUrlChange, onCompetitorsChange,
}: SourceUrlsProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [addingCompetitor, setAddingCompetitor] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const totalUrls = (issuerUrl ? 1 : 0) + (affiliateLink ? 1 : 0) + (ratesTermsUrl ? 1 : 0) + competitors.length;

  const startEdit = (rowId: string, url: string, label?: string) => {
    setEditingRow(rowId); setEditUrl(url); setEditLabel(label || '');
  };
  const saveEdit = (rowId: string) => {
    if (rowId === 'issuer') onIssuerUrlChange(editUrl);
    else if (rowId === 'affiliate') onAffiliateLinkChange(editUrl);
    else if (rowId === 'rates') onRatesTermsUrlChange(editUrl);
    else if (rowId.startsWith('comp-')) {
      const idx = parseInt(rowId.split('-')[1]);
      const updated = [...competitors];
      updated[idx] = { label: editLabel, url: editUrl };
      onCompetitorsChange(updated);
    }
    setEditingRow(null);
  };
  const removeCompetitor = (idx: number) => {
    onCompetitorsChange(competitors.filter((_, i) => i !== idx));
    setDeleteConfirm(null);
  };
  const addCompetitor = () => {
    if (newUrl.trim()) {
      onCompetitorsChange([...competitors, { label: newLabel || 'Custom', url: newUrl }]);
      setNewLabel(''); setNewUrl(''); setAddingCompetitor(false);
    }
  };

  function UrlRow({ rowId, label, url, deletable }: { rowId: string; label: string; url: string; deletable?: boolean }) {
    const isEditing = editingRow === rowId;
    const isComp = rowId.startsWith('comp-');
    const compIdx = isComp ? parseInt(rowId.split('-')[1]) : -1;
    if (isEditing) {
      return (
        <div className="space-y-1.5">
          {isComp && <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Site name" className="h-7 text-[11px]" />}
          <div className="flex items-center gap-1.5">
            <Input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://..." className="h-7 text-[11px] flex-1" autoFocus />
            <button onClick={() => saveEdit(rowId)} className="h-7 px-2 rounded-md bg-teal-600 text-white flex items-center gap-1 text-[11px] font-medium shrink-0"><Check className="w-3.5 h-3.5" /> Save</button>
            <button onClick={() => setEditingRow(null)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
        </div>
      );
    }
    // Empty fixed rows (Issuer Page / Affiliate Link / Rates & Terms) stay
    // visible with an always-shown "Add" affordance — previously they were
    // hidden entirely when blank, so there was no way to (re-)enter them
    // (CMS-46).
    if (!url) {
      return (
        <div className="flex items-center gap-1.5 group">
          <span className="text-muted-foreground w-20 shrink-0">{label}</span>
          <button
            onClick={() => startEdit(rowId, '', isComp ? label : undefined)}
            className="flex items-center gap-1 text-muted-foreground/70 hover:text-teal-600 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add URL
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 group">
        <span className="text-muted-foreground w-20 shrink-0">{label}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline truncate flex-1">{url}</a>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => startEdit(rowId, url, isComp ? label : undefined)} className="p-0.5 rounded hover:bg-muted"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded hover:bg-muted"><ExternalLink className="w-3 h-3 text-muted-foreground" /></a>
          {deletable && (
            deleteConfirm === compIdx
              ? <button onClick={() => removeCompetitor(compIdx)} className="p-0.5 rounded hover:bg-red-100 text-red-600 text-[9px] font-medium">Confirm</button>
              : <button onClick={() => setDeleteConfirm(compIdx)} className="p-0.5 rounded hover:bg-muted"><Trash2 className="w-3 h-3 text-muted-foreground" /></button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-muted/30 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Globe className="w-3 h-3" />
          <span className="font-medium">Source URLs</span>
          <span className="text-[10px]">({totalUrls})</span>
        </div>
        {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-1.5 text-[11px]">
          {/* Fixed source rows are always rendered — even when empty — so the
              Issuer URL and Rates & Terms fields never disappear (CMS-46) */}
          <UrlRow rowId="issuer" label="Issuer Page" url={issuerUrl} />
          <UrlRow rowId="affiliate" label="Affiliate Link" url={affiliateLink} />
          <UrlRow rowId="rates" label="Rates & Terms" url={ratesTermsUrl} />
          {competitors.length > 0 && (
            <>
              <hr className="border-border" />
              <span className="text-muted-foreground font-medium">Competitor Reviews</span>
              {competitors.map((c, i) => <UrlRow key={i} rowId={`comp-${i}`} label={c.label} url={c.url} deletable />)}
            </>
          )}
          {addingCompetitor ? (
            <div className="space-y-1.5 pt-1">
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g., Doctor of Credit" className="h-7 text-[11px]" />
              <div className="flex items-center gap-1.5">
                <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." className="h-7 text-[11px] flex-1" autoFocus />
                <button onClick={addCompetitor} className="h-7 px-2 rounded-md bg-teal-600 text-white flex items-center gap-1 text-[11px] font-medium shrink-0"><Check className="w-3.5 h-3.5" /> Save</button>
                <button onClick={() => setAddingCompetitor(false)} className="p-1.5 rounded-md hover:bg-muted"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingCompetitor(true)} className="flex items-center gap-1 text-muted-foreground hover:text-teal-600 pt-1">
              <Plus className="w-3 h-3" /> Add Competitor Review
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CardDetailPanel() {
  const { activeCardId, setActiveCardId } = useCardsContext();
  const { card, changeHistory, loading } = useCardDetail(activeCardId);
  const { syncToWebflow, scrapeCard, updateCard, deleteCard } = useCardActions();

  const [copied, setCopied] = useState(false);
  const [linkTested, setLinkTested] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [editingLink, setEditingLink] = useState(false);
  const [editingLinkValue, setEditingLinkValue] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [issuerUrl, setIssuerUrl] = useState('');
  const [ratesTermsUrl, setRatesTermsUrl] = useState('');
  const [competitors, setCompetitors] = useState<{ label: string; url: string }[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [confirmScrapeOpen, setConfirmScrapeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingOverrideSave, setPendingOverrideSave] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blockedUsage, setBlockedUsage] = useState<CardUsageDetails | null>(null);

  // Detail data state — shared across all tabs via onUpdateDetail
  const [detailData, setDetailData] = useState<CardDetailData>({});

  // Source URLs for multi-source scraping (managed as local state, persisted on save)
  const [sourceUrls, setSourceUrls] = useState<Array<{ label: string; url: string }>>([]);

  // Sync URL fields from card when card changes
  const prevCardId = useRef<string | null>(null);
  if (card && card.id !== prevCardId.current) {
    prevCardId.current = card.id;
    setAffiliateLink(card.affiliateLink || '');
    setIssuerUrl(card.issuerUrl || '');
    setRatesTermsUrl(card.ratesTermsUrl || '');
    setCompetitors(card.sourceUrls ?? []);
    setSourceUrls(card.sourceUrls ?? []);
    setHasUnsavedChanges(false);
    setActiveTab('overview');
    setDetailData(extractDetailData(card));
  }

  const markChanged = useCallback(() => setHasUnsavedChanges(true), []);

  const handleUpdateDetail = useCallback((fields: Partial<CardDetailData>) => {
    setDetailData(prev => ({ ...prev, ...fields }));
    setHasUnsavedChanges(true);
  }, []);

  // CMS-109: embed inserts (iFrame / TP Table / media) persist to Firestore
  // immediately — the manual "Save Changes" flow stays for text edits.
  const handlePersistField = useCallback(async (fields: Partial<CardDetailData>) => {
    if (!activeCardId) return;
    try {
      await updateCard({ cardId: activeCardId, fields });
      toast.success('Embed saved ✓', { description: 'Use "Sync to Webflow" (Publish button) to push the card — including the new embed — to the live site.', duration: 4000 });
    } catch (err) {
      toast.error('Failed to save embed', { description: (err as Error).message });
    }
  }, [activeCardId, updateCard]);

  const handleSourceUrlsChange = useCallback((urls: Array<{ label: string; url: string }>) => {
    setSourceUrls(urls);
    setHasUnsavedChanges(true);
  }, []);

  const handleNavigateToCard = useCallback((cardId: string) => {
    setActiveCardId(cardId);
  }, [setActiveCardId]);

  const handlePublish = async () => {
    if (!activeCardId) return;
    if (pendingOverrideSave) {
      // A field edit (e.g. an Annual Fee override) is still saving to
      // Firestore — publishing now would read the pre-edit value, since
      // syncToWebflow reads Firestore directly and has no visibility into
      // in-flight client writes.
      toast.error('Please wait — a field edit is still saving');
      return;
    }
    setPublishing(true);
    try {
      // Persist first — syncToWebflow reads Firestore, so publishing without
      // saving would push the pre-edit values (this is what dropped embeds
      // that were inserted but never Save-Changed, 2026-08-24).
      await updateCard({ cardId: activeCardId, fields: buildSaveFields() });
      setHasUnsavedChanges(false);
      await syncToWebflow({ cardId: activeCardId });
      toast.success('Published to Webflow ✓');
    } catch (err) {
      // Surface the actual Webflow API error (e.g. a field-level rejection)
      // instead of a generic failure — a rejected field must never look like
      // a successful sync (CMS-18).
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to publish to Webflow: ${msg}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleScrapeNow = async () => {
    if (!activeCardId) return;
    setConfirmScrapeOpen(false);
    setScraping(true);
    toast.info('Scraping… this can take up to 60 seconds');
    try {
      const result = await scrapeCard({ cardId: activeCardId });
      if (result.success === false) {
        toast.error(`Scrape failed: ${result.error ?? 'unknown error'}`);
      } else {
        const changed = result.fieldsChanged ?? result.fieldsUpdated ?? [];
        const editorial = result.editorialFieldsFilled ?? [];
        if (changed.length > 0 || editorial.length > 0) {
          toast.success(
            `Scrape complete — ${changed.length} field(s) updated` +
            (editorial.length > 0 ? `, ${editorial.length} editorial field(s) written` : '')
          );
        } else {
          toast.info('Scrape complete — no changes detected');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Scrape failed: ${msg}`);
    } finally {
      setScraping(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCardId) return;
    setDeleting(true);
    try {
      const result = await deleteCard({ cardId: activeCardId });
      toast.success('Card deleted', {
        description: `${result.deletedWebflowItems} synced Webflow item(s) removed. Live pages drop the card on the next Webflow site publish.`,
      });
      setDeleteDialogOpen(false);
      setActiveCardId(null);
    } catch (err) {
      const e = err as { code?: string; message?: string; details?: unknown };
      if (e.code === 'functions/failed-precondition' && e.details && typeof e.details === 'object') {
        // Card is still referenced — show exactly where so the editor can
        // remove the embeds/tags first (this is the designed guard, not a bug).
        setDeleteDialogOpen(false);
        setBlockedUsage(e.details as CardUsageDetails);
      } else {
        toast.error(`Failed to delete card: ${e.message ?? String(err)}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  // Shared save payload — the full detailData plus derived/link fields. Used
  // by both Save Changes and Publish to Webflow (which must persist first).
  const buildSaveFields = () => {
    // CMS-162: offerHistory is never round-tripped through Save/Publish — its
    // only writers are the scraper and the Offer History editor (setOverride).
    // detailData is a stale snapshot once either writes, and re-saving it here
    // would clobber fresh rows (and ignore the scraper lock).
    const saveData = { ...detailData };
    delete saveData.offerHistory;
    return {
      ...saveData,
      compositeScore: computeCompositeScore(detailData),
      affiliateLink,
      issuerUrl,
      ratesTermsUrl,
      sourceUrls: sourceUrls,
      // CMS-45: persist Pros/Cons Abbreviated both as the canonical
      // arrays (trailing blanks trimmed) and as the 8 discrete
      // prosAbbreviated1..8 / consAbbreviated1..8 fields that map 1:1
      // to the Webflow pros-abbreviated-N / cons-abbreviated-N bullets.
      ...(detailData.prosAbbreviated !== undefined && {
        prosAbbreviated: trimTrailingEmpty(toAbbreviatedSlots(detailData.prosAbbreviated)),
        ...abbreviatedSlotFields('prosAbbreviated', detailData.prosAbbreviated),
      }),
      ...(detailData.consAbbreviated !== undefined && {
        consAbbreviated: trimTrailingEmpty(toAbbreviatedSlots(detailData.consAbbreviated)),
        ...abbreviatedSlotFields('consAbbreviated', detailData.consAbbreviated),
      }),
    };
  };

  const handleSave = async () => {
    if (!activeCardId) return;
    try {
      // Persist source URLs and detail data via the updateCard Cloud Function.
      // compositeScore is computed fresh here (not read from detailData) —
      // it was previously only ever a render-time display value in
      // CardOverviewTab and was never actually written to Firestore.
      await updateCard({
        cardId: activeCardId,
        fields: buildSaveFields(),
      });
      setHasUnsavedChanges(false);
      toast.success('Changes saved');
    } catch {
      toast.error('Failed to save changes');
    }
  };

  const handleDiscard = () => {
    if (card) {
      setAffiliateLink(card.affiliateLink || '');
      setIssuerUrl(card.issuerUrl || '');
      setRatesTermsUrl(card.ratesTermsUrl || '');
      setSourceUrls(card.sourceUrls ?? []);
      setCompetitors(card.sourceUrls ?? []);
    }
    setDetailData(extractDetailData(card));
    setHasUnsavedChanges(false);
    setDiscardDialogOpen(false);
  };

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) setCloseDialogOpen(true);
    else setActiveCardId(null);
  };

  const handleCopyLink = () => {
    if (!affiliateLink) return;
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestLink = () => {
    if (affiliateLink) window.open(affiliateLink, '_blank');
    setLinkTested('testing');
    setTimeout(() => setLinkTested(affiliateLink ? 'ok' : 'fail'), 1500);
  };

  const isOpen = activeCardId !== null;
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full max-w-[50vw] bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {loading || !card ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-3 w-full px-6">
              <div className="h-8 bg-muted animate-pulse rounded w-48" />
              <div className="h-4 bg-muted animate-pulse rounded w-32" />
              <div className="h-64 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-border space-y-3 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`relative group w-[120px] h-[76px] rounded-xl shadow-md flex flex-col items-center justify-center overflow-hidden ${ISSUER_COLORS[card.issuer] || 'bg-muted'}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-black/20" />
                    <CreditCard className="w-8 h-6 text-white/70 relative z-10" />
                    <span className="text-[8px] font-semibold text-white/80 mt-0.5 relative z-10 text-center leading-tight px-2 truncate max-w-full">{displayCardValue(card, 'name')}</span>
                    <button className="absolute inset-0 bg-background/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-medium text-teal-600 z-20">Replace</button>
                  </div>
                  <div className="pt-1">
                    <h2 className="text-[20px] font-semibold leading-tight">{displayCardValue(card, 'name')}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold text-white ${ISSUER_COLORS[card.issuer] || 'bg-muted-foreground'}`}>
                        {ISSUER_SHORT[card.issuer] || card.issuer.charAt(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">{card.issuer}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusConfig[card.status]?.cls}>{statusConfig[card.status]?.label}</Badge>
                    <Button variant="ghost" size="icon" onClick={handleCloseAttempt}><X className="w-4 h-4" /></Button>
                  </div>
                  <span className="text-[11px] text-muted-foreground/60">
                    {card.lastScraped?.toMillis ? `Scraped ${new Date(card.lastScraped.toMillis()).toLocaleDateString()}` : 'Never scraped'}
                  </span>
                </div>
              </div>

              {/* Affiliate link row — inline edit */}
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {editingLink ? (
                  <>
                    <input
                      value={editingLinkValue}
                      onChange={e => setEditingLinkValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setAffiliateLink(editingLinkValue); setEditingLink(false); markChanged(); } }}
                      className="flex-1 px-2 py-0.5 rounded border border-input bg-background text-sm"
                      autoFocus
                    />
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setAffiliateLink(editingLinkValue); setEditingLink(false); markChanged(); }}>
                      <Check className="w-3 h-3 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingLink(false)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground truncate max-w-xs">{affiliateLink || 'No affiliate link'}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopyLink} disabled={!affiliateLink}>
                      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleTestLink} disabled={!affiliateLink}>
                      {linkTested === 'testing' ? '...' : linkTested === 'ok' ? <Check className="w-3 h-3 text-green-600" /> : linkTested === 'fail' ? <X className="w-3 h-3 text-red-600" /> : 'Test'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setEditingLinkValue(affiliateLink); setEditingLink(true); }}>Edit</Button>
                  </>
                )}
              </div>

              {/* Source URLs expandable with edit */}
              <SourceUrlsSection
                issuerUrl={issuerUrl}
                affiliateLink={affiliateLink}
                ratesTermsUrl={ratesTermsUrl}
                competitors={competitors}
                onIssuerUrlChange={v => { setIssuerUrl(v); markChanged(); }}
                onAffiliateLinkChange={v => { setAffiliateLink(v); markChanged(); }}
                onRatesTermsUrlChange={v => { setRatesTermsUrl(v); markChanged(); }}
                onCompetitorsChange={v => { setCompetitors(v); setSourceUrls(v); markChanged(); }}
              />

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  disabled={!card.webflowItemId}
                  title={card.webflowItemId ? 'Open in Webflow CMS' : 'Not yet published to Webflow'}
                  onClick={() => window.open(`https://webflow.com/design/${WEBFLOW_SITE_SHORTNAME}#cms-${card.webflowItemId}`, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" /> View on Webflow
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handlePublish}
                  disabled={publishing || pendingOverrideSave}
                  title={pendingOverrideSave ? 'A field edit is still saving…' : undefined}
                >
                  <Globe className="w-3 h-3" /> {publishing ? 'Publishing…' : 'Publish to Webflow'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setConfirmScrapeOpen(true)} disabled={scraping}>
                  <Play className="w-3 h-3" /> {scraping ? 'Scraping…' : 'Scrape Now'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-red-600 border-red-500/40 hover:bg-red-500/10 hover:text-red-700"
                  onClick={() => setDeleteDialogOpen(true)}
                  title="Permanently delete this card (refused while it is used by iframe embeds or articles)"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>

              <ConfirmScrapeDialog
                open={confirmScrapeOpen}
                onOpenChange={setConfirmScrapeOpen}
                onConfirm={handleScrapeNow}
                cardName={card.name}
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 mt-3 justify-start bg-muted/50 flex-shrink-0 h-9 overflow-x-auto">
                {[
                  { value: 'overview', label: 'Overview' },
                  { value: 'benefits', label: 'Benefits' },
                  { value: 'rewards', label: 'Rewards' },
                  { value: 'editorial', label: 'Editorial' },
                  { value: 'partners', label: 'Partners' },
                  { value: 'history', label: 'History' },
                  { value: 'articles', label: 'Articles' },
                  { value: 'iframes', label: 'Iframes' },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-[13px] px-2.5 py-1 data-[state=active]:bg-teal-600/10 data-[state=active]:shadow-none data-[state=active]:border-b-[3px] data-[state=active]:border-teal-600 data-[state=active]:text-teal-700"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="overview" className="m-0 px-6 py-5">
                  <CardOverviewTab card={card} detailData={detailData} onUpdateDetail={handleUpdateDetail} sourceUrls={sourceUrls} onSourceUrlsChange={handleSourceUrlsChange} onNavigateToCard={handleNavigateToCard} onPendingOverrideSaveChange={setPendingOverrideSave} onPersistField={handlePersistField} />
                </TabsContent>
                <TabsContent value="benefits" className="m-0 px-6 py-5">
                  <CardBenefitsTab card={card} detailData={detailData} onUpdateDetail={handleUpdateDetail} />
                </TabsContent>
                <TabsContent value="rewards" className="m-0 px-6 py-5">
                  <CardRewardsTab card={card} detailData={detailData} onUpdateDetail={handleUpdateDetail} />
                </TabsContent>
                <TabsContent value="editorial" className="m-0 px-6 py-5">
                  <CardEditorialTab card={card} detailData={detailData} onUpdateDetail={handleUpdateDetail} />
                </TabsContent>
                <TabsContent value="partners" className="m-0 px-6 py-5">
                  <CardTransferPartnersTab card={card} />
                </TabsContent>
                <TabsContent value="history" className="m-0 px-6 py-5">
                  <CardChangeHistoryTab card={card} changeHistory={changeHistory} />
                </TabsContent>
                <TabsContent value="articles" className="m-0 px-6 py-5">
                  <CardArticlesTab card={card} />
                </TabsContent>
                <TabsContent value="iframes" className="m-0 px-6 py-5">
                  <CardIframesTab card={card} />
                </TabsContent>
              </div>
            </Tabs>

            {/* Sticky unsaved changes footer */}
            {hasUnsavedChanges && (
              <div className="p-3 border-t border-border bg-amber-500/5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>You have unsaved changes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDiscardDialogOpen(true)}>Discard</Button>
                  <Button size="sm" onClick={handleSave} className="bg-teal-600 text-white hover:bg-teal-700">Save Changes</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Close with unsaved changes dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>You have unsaved changes</DialogTitle>
            <DialogDescription>Save before closing?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setCloseDialogOpen(false); handleDiscard(); setActiveCardId(null); }}>Discard</Button>
            <Button variant="ghost" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { handleSave(); setCloseDialogOpen(false); setActiveCardId(null); }} className="bg-teal-600 text-white hover:bg-teal-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard confirmation dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard all changes?</DialogTitle>
            <DialogDescription>This will revert all modified fields back to their last saved state.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDiscardDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDiscard}>Discard Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog — rendered only once the card has loaded:
          `card` is null while useCardDetail's first snapshot is in flight, and
          this JSX sits outside the loading guard above, so an unguarded
          `card.name` here crashed the whole app on every panel open. */}
      {card && (
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {card.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the card from the Card Data Manager and removes its synced
              Webflow CMS items (card page, scoring, editorial, FAQs). This cannot be undone.
              If the card is embedded in any iframe or tagged on an article, the delete is refused —
              remove those references first (see the Articles and Iframes tabs).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Delete blocked — card still in use */}
      <Dialog open={blockedUsage !== null} onOpenChange={(open) => { if (!open) setBlockedUsage(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Card is still in use
            </DialogTitle>
            <DialogDescription>
              This card can't be deleted while iframe embeds or articles reference it.
              Remove the card from the places below, then try again.
            </DialogDescription>
          </DialogHeader>
          {blockedUsage && (
            <div className="space-y-4 text-sm max-h-[50vh] overflow-y-auto">
              {blockedUsage.iframes.length > 0 && (
                <div>
                  <p className="font-medium mb-1.5">Iframe embeds ({blockedUsage.iframes.length})</p>
                  <ul className="space-y-1.5">
                    {blockedUsage.iframes.map((inst) => (
                      <li key={inst.id} className="text-xs border border-border rounded-md px-2.5 py-1.5">
                        <span className="font-medium">{inst.type}</span>
                        <span className="text-muted-foreground font-mono text-[10px] ml-2">{inst.id}</span>
                        {inst.hosts.length > 0 ? (
                          <span className="block mt-1 text-muted-foreground">
                            Embedded in:{' '}
                            {inst.hosts.map((h, j) => (
                              <span key={j}>
                                {j > 0 && ', '}
                                {h.collection === 'articles' ? (
                                  <Link
                                    to={`/pipeline?article=${h.docId}`}
                                    className="text-teal-600 hover:underline"
                                    onClick={() => setBlockedUsage(null)}
                                  >
                                    {h.title || h.docId}
                                  </Link>
                                ) : (
                                  <span>{h.title || h.docId}</span>
                                )}
                                {h.field ? ` (${h.field})` : ''}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="block mt-1 text-muted-foreground italic">
                            Not placed anywhere — delete it in the{' '}
                            <Link to="/iframes" className="text-teal-600 hover:underline not-italic" onClick={() => setBlockedUsage(null)}>
                              iFrame Manager
                            </Link>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {blockedUsage.articles.length > 0 && (
                <div>
                  <p className="font-medium mb-1.5">Articles tagging this card ({blockedUsage.articles.length})</p>
                  <ul className="space-y-1.5">
                    {blockedUsage.articles.map((a) => (
                      <li key={a.id} className="text-xs border border-border rounded-md px-2.5 py-1.5">
                        <Link
                          to={`/pipeline?article=${a.id}`}
                          className="text-teal-600 hover:underline"
                          onClick={() => setBlockedUsage(null)}
                        >
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockedUsage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
