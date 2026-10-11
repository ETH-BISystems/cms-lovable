import { useState, useRef, useEffect } from 'react';
import { Clock, Star, CreditCard, Plus, GripVertical, Trash2, CalendarIcon, Pencil, Globe, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { CardDocument, CardDetailData, FAQEntry, LinkedCard, SectionMeta, EarningRewardRate, OverridableFieldName, WebflowAuthor } from '../../types';
import { CollapsibleSection, OverrideFieldWithProvenance } from '../shared/ProvenanceComponents';
import { RichTextField } from '../shared/RichTextField';
import { SCORE_LABELS, computeCompositeScore } from '../../utils/computeCompositeScore';
import { validateAnnualFee } from '../../utils/annualFee';
import { countWords, limitWords, BEST_FOR_LABEL_WORD_LIMIT } from '../../utils/wordLimit';
import { toBulletItems } from '../../utils/bulletText';
import { toAbbreviatedSlots } from '../../utils/abbreviatedSlots';
import { useCardActions } from '../../hooks/useCardActions';
import { useCards } from '../../hooks/useCards';
// CMS-115: the card-image picker is the REAL Asset Library dialog (was a
// 4-item placehold.co mock — the client's "only a few icons" report).
import { AssetPickerDialog } from '@/modules/assets';
import { FieldLockButton } from '../shared/FieldLockButton';
import { OfferHistoryEditor } from './OfferHistoryEditor';
import { CategorySelect } from '../CategorySelect';
import { toast } from 'sonner';
import { storageService } from '@/services/storageService';
import { cardService } from '../../services/cardService';

/**
 * Author dropdown — options come LIVE from the Webflow Authors collection via
 * the webflowAuthorsList callable, so people added in Webflow appear here
 * automatically (the previous hardcoded list carried TPG-era names that
 * matched no one on the site). The selection stores both the display name
 * (`authorProfile`) and the Webflow item ID (`authorWebflowItemId`); the sync
 * sends the ID to the Cards item's `author` reference field.
 */
function AuthorSelect({
  valueName,
  valueId,
  onChange,
}: {
  valueName: string;
  valueId: string;
  onChange: (name: string, id: string) => void;
}) {
  const [authors, setAuthors] = useState<WebflowAuthor[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    cardService
      .listWebflowAuthors()
      .then(r => { if (!cancelled) setAuthors(r.authors); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const matched = (authors ?? []).find(a => a.id === valueId) ?? (authors ?? []).find(a => a.name === valueName);
  const legacy = !matched && valueName ? valueName : null;

  return (
    <select
      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
      value={matched ? matched.id : legacy ? '__legacy__' : ''}
      disabled={authors === null && !loadFailed}
      onChange={e => {
        const id = e.target.value;
        if (id === '__legacy__') return;
        if (!id) { onChange('', ''); return; }
        const author = (authors ?? []).find(a => a.id === id);
        if (author) onChange(author.name, author.id);
      }}
    >
      <option value="">
        {loadFailed ? 'Couldn’t load authors — check the Webflow connection' : authors === null ? 'Loading authors…' : 'No author assigned'}
      </option>      {legacy && <option value="__legacy__" disabled>{legacy} (not in Webflow Authors — pick a replacement)</option>}
      {(authors ?? []).map(a => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardOverviewTabProps {
  card: CardDocument;
  detailData: CardDetailData;
  onUpdateDetail: (fields: Partial<CardDetailData>) => void;
  sourceUrls?: Array<{ label: string; url: string }>;
  onSourceUrlsChange?: (urls: Array<{ label: string; url: string }>) => void;
  onNavigateToCard?: (cardId: string) => void;
  onPendingOverrideSaveChange?: (pending: boolean) => void;
  /** CMS-109: persist a single field to Firestore immediately (embed inserts). */
  onPersistField?: (fields: Partial<CardDetailData>) => void;
}

// ─── Score Labels ─────────────────────────────────────────────────────────────
// Sourced from the shared SCORE_LABELS list (computeCompositeScore.ts) so the
// display weights here can never drift from the persisted composite formula.

const scoreLabels = SCORE_LABELS.map(s => ({ ...s, weight: `${Math.round(s.weight * 100)}%` }));


// ─── Main Component ───────────────────────────────────────────────────────────

export function CardOverviewTab({ card, detailData, onUpdateDetail, sourceUrls, onSourceUrlsChange, onNavigateToCard, onPendingOverrideSaveChange, onPersistField }: CardOverviewTabProps) {
  const [newFaqQ, setNewFaqQ] = useState('');
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setOverride } = useCardActions();
  const { allCards } = useCards();
  const pendingOverrideSaves = useRef(0);

  // Tracks in-flight setOverride calls so the parent can block "Publish to
  // Webflow" from reading Firestore before an edit that's still saving has
  // actually landed there.
  const trackPendingSave = async <T,>(fn: () => Promise<T>): Promise<T> => {
    pendingOverrideSaves.current += 1;
    if (pendingOverrideSaves.current === 1) onPendingOverrideSaveChange?.(true);
    try {
      return await fn();
    } finally {
      pendingOverrideSaves.current -= 1;
      if (pendingOverrideSaves.current === 0) onPendingOverrideSaveChange?.(false);
    }
  };

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const asset = await storageService.uploadFile(file, 'assets');
      onUpdateDetail({ cardImageUrl: asset.cdnUrl });
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload image');
      console.error('[CardOverviewTab] Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };

  // Override helpers — adapted from Lovable to work with production CardDocument split fields
  const overrides: Record<string, boolean> = {
    // CMS-123: name override is LIVE (was hardcoded off pending backend
    // support — setOverride now accepts 'name').
    name: !!card.overrides?.name?.isOverridden,
    annualFee: !!card.overrides?.annualFee?.isOverridden,
    signupBonus: !!card.overrides?.signupBonus?.isOverridden,
    bonusSpendReq: !!card.overrides?.bonusSpendReq?.isOverridden,
    aprRange: !!card.overrides?.aprRange?.isOverridden,
  };

  // Manual values map for override fields
  const manualValues: Record<string, string> = {
    name: card.name_manual ?? '',
    annualFee: card.annualFee_manual != null ? `${card.annualFee_manual}` : '',
    signupBonus: card.signupBonus_manual ?? '',
    bonusSpendReq: card.bonusSpendReq_manual ?? '',
    aprRange: card.aprRange_manual ?? '',
  };

  // Scraped values map
  const scrapedValues: Record<string, string> = {
    name: card.name,
    annualFee: card.annualFee_scraped != null ? `${card.annualFee_scraped}` : '0',
    signupBonus: card.signupBonus_scraped ?? '',
    bonusSpendReq: card.bonusSpendReq_scraped ?? '',
    aprRange: card.aprRange_scraped ?? '',
  };

  const getDisplayValue = (field: string) => {
    return overrides[field] ? (manualValues[field] || scrapedValues[field]) : scrapedValues[field];
  };

  const toggleOverride = async (field: string, val: boolean): Promise<boolean> => {
    // Only call setOverride for fields that are supported by the Cloud Function
    const supportedFields = ['name', 'annualFee', 'signupBonus', 'bonusSpendReq', 'aprRange'] as const;
    type SupportedField = typeof supportedFields[number];
    if (!supportedFields.includes(field as SupportedField)) return false;

    return trackPendingSave(async () => {
      try {
        if (val) {
          // Toggling ON: use current manual value or scraped value as the override value
          const currentValue = manualValues[field] || scrapedValues[field];
          await setOverride({
            cardId: card.id,
            field: field as SupportedField,
            value: currentValue,
            isOverriding: true,
          });
          toast.success(`Override enabled for ${field}`);
        } else {
          // Toggling OFF: revert to scraped value
          await setOverride({
            cardId: card.id,
            field: field as SupportedField,
            value: null,
            isOverriding: false,
          });
          toast.success(`Override cleared — reverted to scraped value`);
        }
        return true;
      } catch {
        toast.error(`Failed to ${val ? 'set' : 'clear'} override for ${field} — try again before publishing`);
        return false;
      }
    });
  };

  const setManualValue = async (field: string, value: string): Promise<boolean> => {
    // Save the manual override value via the Cloud Function
    const supportedFields = ['name', 'annualFee', 'signupBonus', 'bonusSpendReq', 'aprRange'] as const;
    type SupportedField = typeof supportedFields[number];
    if (!supportedFields.includes(field as SupportedField)) return false;

    return trackPendingSave(async () => {
      try {
        await setOverride({
          cardId: card.id,
          field: field as SupportedField,
          value,
          isOverriding: true,
        });
        return true;
      } catch {
        toast.error(`Failed to save override value for ${field} — try again before publishing`);
        return false;
      }
    });
  };

  // FAQ helpers
  const addFaq = () => {
    const faqs = detailData.faqs ?? [];
    if (faqs.length >= 8 || !newFaqQ.trim()) return;
    const faq: FAQEntry = { id: `faq-${Date.now()}`, question: newFaqQ, answer: '' };
    onUpdateDetail({ faqs: [...faqs, faq] });
    setNewFaqQ('');
  };

  const updateFaq = (id: string, updates: Partial<FAQEntry>) => {
    const faqs = detailData.faqs ?? [];
    onUpdateDetail({ faqs: faqs.map(f => f.id === id ? { ...f, ...updates } : f) });
  };

  const removeFaq = (id: string) => {
    const faqs = detailData.faqs ?? [];
    onUpdateDetail({ faqs: faqs.filter(f => f.id !== id) });
  };

  // Card Relationships helpers
  const removeLinkedCard = (type: 'complementaryCards' | 'comparableCards', id: string) => {
    const cards = detailData[type] ?? [];
    onUpdateDetail({ [type]: cards.filter((c: LinkedCard) => c.id !== id) });
  };

  const addLinkedCard = (type: 'complementaryCards' | 'comparableCards', doc: CardDocument) => {
    const existing = detailData[type] ?? [];
    if (existing.some((c: LinkedCard) => c.cardId === doc.id)) return;
    const linked: LinkedCard = {
      id: `lc-${Date.now()}`,
      cardId: doc.id,
      name: doc.name,
      compositeScore: (doc as unknown as { compositeScore?: number }).compositeScore ?? 0,
    };
    onUpdateDetail({ [type]: [...existing, linked] });
  };

  // Composite score calculation — shared with CardDetailPanel's save-time
  // persistence via computeCompositeScore() so the two can't drift apart.
  const compositeScore = computeCompositeScore(detailData);

  // Real conflict detection: flag only when the scraper ran AFTER the override
  // was set AND found a value different from the override. (Previously a mock
  // conflict rendered whenever the annual fee override was on, so the panel
  // permanently nagged "keep override?" — the tester's complaint.)
  const normalizeForCompare = (v: unknown) => String(v ?? '').replace(/[$,\s]/g, '').toLowerCase();
  const conflictFor = (field: 'annualFee' | 'signupBonus' | 'bonusSpendReq' | 'aprRange') => {
    const ov = card.overrides?.[field];
    if (!ov?.isOverridden) return null;
    const scrapedAt = card.lastScraped?.toMillis?.() ?? 0;
    const overriddenAt = ov.overriddenAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
    if (scrapedAt <= overriddenAt) return null; // scraper hasn't run since the override was set
    const scrapedRaw = card[`${field}_scraped`];
    const manualRaw = card[`${field}_manual`];
    if (scrapedRaw === undefined || scrapedRaw === null || scrapedRaw === '') return null;
    if (normalizeForCompare(scrapedRaw) === normalizeForCompare(manualRaw)) return null;
    return { newScrapedValue: field === 'annualFee' ? `$${scrapedRaw}` : String(scrapedRaw) };
  };

  return (
    <div className="space-y-5">
      {/* ── Zone A: Data Fields (scraper-sourced) ── */}
      <div className="bg-muted/20 rounded-xl p-4 space-y-3 border border-border/50">
        {/* Core Identity */}
        <CollapsibleSection title="Core Identity" defaultOpen metaKey="coreIdentity">
          <div className="grid grid-cols-2 gap-4">
            <OverrideFieldWithProvenance
              label="Card Name"
              value={getDisplayValue('name')}
              scrapedValue={card.name}
              isOverridden={overrides.name}
              onToggle={v => toggleOverride('name', v)}
              onChange={v => setManualValue('name', v)}
            />
            <OverrideFieldWithProvenance
              label="Annual Fee"
              value={getDisplayValue('annualFee')}
              scrapedValue={scrapedValues.annualFee}
              isOverridden={overrides.annualFee}
              onToggle={v => toggleOverride('annualFee', v)}
              onChange={v => setManualValue('annualFee', v)}
              conflict={conflictFor('annualFee')}
              validate={validateAnnualFee}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70">Card Image</label>
            <div className="flex items-center gap-3">
              <div className="w-24 h-16 bg-muted/30 rounded-lg border border-border flex items-center justify-center overflow-hidden">
                {/* CMS-115: preview the EDITED url immediately (detailData),
                    falling back to the persisted card doc value — previously
                    only card.cardImageUrl rendered, so a fresh pick looked
                    like it never saved. */}
                {(detailData.cardImageUrl ?? card.cardImageUrl) ? (
                  <img src={detailData.cardImageUrl ?? card.cardImageUrl} alt={card.name} className="w-full h-full object-cover" />
                ) : (
                  <CreditCard className="w-10 h-6 text-muted-foreground" />
                )}
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setAssetPickerOpen(true)}>Replace</Button>
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
            <AssetPickerDialog
              open={assetPickerOpen}
              onOpenChange={setAssetPickerOpen}
              title="Select Card Image from Asset Library"
              onSelect={(asset) => {
                onUpdateDetail({ cardImageUrl: asset.cdnUrl });
                setAssetPickerOpen(false);
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Image Disclaimer <FieldLockButton card={card} field="cardImageDisclaimer" value={detailData.cardImageDisclaimer ?? ''} /></label>
            <Input
              value={detailData.cardImageDisclaimer ?? ''}
              onChange={e => onUpdateDetail({ cardImageDisclaimer: e.target.value })}
              placeholder="Legal disclaimer text for the card image"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Review URL <FieldLockButton card={card} field="reviewUrl" value={detailData.reviewUrl ?? ''} /></label>
            <Input
              value={detailData.reviewUrl ?? ''}
              onChange={e => onUpdateDetail({ reviewUrl: e.target.value })}
              placeholder="https://... (ETH review article URL)"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70">URL Slug</label>
            <Input
              value={detailData.slug ?? ''}
              onChange={e => onUpdateDetail({ slug: e.target.value })}
              placeholder="Leave blank to auto-generate from the card name"
              className="h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Card page URL in Webflow, e.g. chase-sapphire-preferred</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70">Category</label>
              <CategorySelect
                value={detailData.category ?? card.category}
                onChange={category => onUpdateDetail({ category })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Best For Label <FieldLockButton card={card} field="bestForLabel" value={detailData.bestForLabel ?? ''} /></label>
                <span
                  className={`text-[10px] tabular-nums ${
                    countWords(detailData.bestForLabel ?? '') >= BEST_FOR_LABEL_WORD_LIMIT
                      ? 'text-amber-600 font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {countWords(detailData.bestForLabel ?? '')}/{BEST_FOR_LABEL_WORD_LIMIT} words
                </span>
              </div>
              <Input
                value={detailData.bestForLabel ?? ''}
                onChange={e =>
                  onUpdateDetail({ bestForLabel: limitWords(e.target.value, BEST_FOR_LABEL_WORD_LIMIT) })
                }
                placeholder="e.g. Best for premium travel"
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Max {BEST_FOR_LABEL_WORD_LIMIT} words — rendered as a badge on the Webflow card page.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-foreground/70">Top Offer</label>
            <Switch
              checked={detailData.topOffer ?? false}
              onCheckedChange={v => onUpdateDetail({ topOffer: v })}
            />
          </div>
        </CollapsibleSection>

        {/* Offer & Pricing */}
        <CollapsibleSection title="Offer & Pricing" defaultOpen metaKey="offerPricing">
          <div className="grid grid-cols-2 gap-4">
            <OverrideFieldWithProvenance
              label="Signup Bonus / Welcome Offer"
              value={getDisplayValue('signupBonus')}
              scrapedValue={scrapedValues.signupBonus}
              isOverridden={overrides.signupBonus}
              onToggle={v => toggleOverride('signupBonus', v)}
              onChange={v => setManualValue('signupBonus', v)}
              conflict={conflictFor('signupBonus')}
            />
            <OverrideFieldWithProvenance
              label="Spend Requirement"
              value={getDisplayValue('bonusSpendReq')}
              scrapedValue={scrapedValues.bonusSpendReq}
              isOverridden={overrides.bonusSpendReq}
              onToggle={v => toggleOverride('bonusSpendReq', v)}
              onChange={v => setManualValue('bonusSpendReq', v)}
              conflict={conflictFor('bonusSpendReq')}
            />
            <OverrideFieldWithProvenance
              label="APR Range"
              value={getDisplayValue('aprRange')}
              scrapedValue={scrapedValues.aprRange}
              isOverridden={overrides.aprRange}
              onToggle={v => toggleOverride('aprRange', v)}
              onChange={v => setManualValue('aprRange', v)}
              conflict={conflictFor('aprRange')}
            />
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Foreign Transaction Fee <FieldLockButton card={card} field="foreignTransactionFee" value={detailData.foreignTransactionFee ?? ''} /></label>
              <Input
                value={detailData.foreignTransactionFee ?? ''}
                onChange={e => onUpdateDetail({ foreignTransactionFee: e.target.value })}
                placeholder="e.g. None or 2.7%"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Recommended Credit <FieldLockButton card={card} field="recommendedCredit" value={detailData.recommendedCredit ?? ''} /></label>
              <Input
                value={detailData.recommendedCredit ?? ''}
                onChange={e => onUpdateDetail({ recommendedCredit: e.target.value })}
                placeholder="e.g. Good to Excellent"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Offer Duration <FieldLockButton card={card} field="offerDuration" value={detailData.offerDuration ?? ''} /></label>
              <Input
                value={detailData.offerDuration ?? ''}
                onChange={e => onUpdateDetail({ offerDuration: e.target.value })}
                placeholder="e.g. Limited time — ends March 31"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Blue Header <span className="text-[10px] text-muted-foreground/60">(welcome offer headline)</span> <FieldLockButton card={card} field="blueHeader" value={detailData.blueHeader ?? ''} /></label>
            <Input
              value={detailData.blueHeader ?? ''}
              onChange={e => onUpdateDetail({ blueHeader: e.target.value })}
              placeholder="Hero headline for the card page"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Offer Features <FieldLockButton card={card} field="offerFeatures" value={detailData.offerFeatures ?? ''} /></label>
            <Textarea
              value={detailData.offerFeatures ?? ''}
              onChange={e => onUpdateDetail({ offerFeatures: e.target.value })}
              placeholder="Bullet list of welcome offer features (one per line)"
              className="text-sm min-h-[80px] shadow-inner"
            />
          </div>

          {/* Bonus Prediction */}
          <div className={`rounded-lg p-3 border ${card.bonusDaysActive > card.bonusAvgChangeDays * 0.8 ? 'bg-warning/10 border-warning/30' : 'bg-muted/30 border-border'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-card-foreground">Bonus Prediction</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Current bonus: <strong className="text-card-foreground">{card.signupBonus_scraped}</strong> · Active for{' '}
              <strong className={card.bonusDaysActive > card.bonusAvgChangeDays * 0.8 ? 'text-warning' : 'text-card-foreground'}>{card.bonusDaysActive} days</strong> · Historical avg:{' '}
              <strong className="text-card-foreground">{card.bonusAvgChangeDays} days</strong> between changes
              {card.bonusDaysActive > card.bonusAvgChangeDays * 0.8 && <span className="text-warning font-medium"> · ⚠️ Approaching typical change window</span>}
            </p>
          </div>
        </CollapsibleSection>

        {/* CMS-162: Offer History — the scraped welcome-offer table behind
            the offer-history iframe embed, now editable. Saving locks the
            table against the scraper (dual-value override); Revert restores
            the last scraped rows. */}
        <CollapsibleSection
          title="Offer History"
          metaKey="offerHistory"
          badge={card.overrides?.offerHistory?.isOverridden ? 'Manual' : undefined}
        >
          <OfferHistoryEditor card={card} />
        </CollapsibleSection>

        {/* Source URLs for Multi-Source Scraping */}
        <CollapsibleSection title="Source URLs" icon={<Globe className="w-4 h-4 text-muted-foreground" />}>
          <div className="space-y-3">
            {(sourceUrls ?? card.sourceUrls ?? []).map((entry, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <Input
                  value={entry.label}
                  onChange={e => {
                    const updated = [...(sourceUrls ?? card.sourceUrls ?? [])];
                    updated[idx] = { ...updated[idx], label: e.target.value };
                    onSourceUrlsChange?.(updated);
                  }}
                  placeholder="Label"
                  className="h-8 text-sm w-28"
                />
                <Input
                  value={entry.url}
                  onChange={e => {
                    const updated = [...(sourceUrls ?? card.sourceUrls ?? [])];
                    updated[idx] = { ...updated[idx], url: e.target.value };
                    onSourceUrlsChange?.(updated);
                  }}
                  placeholder="https://..."
                  className="h-8 text-sm flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => {
                    const updated = (sourceUrls ?? card.sourceUrls ?? []).filter((_, i) => i !== idx);
                    onSourceUrlsChange?.(updated);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-muted-foreground"
              onClick={() => {
                const updated = [...(sourceUrls ?? card.sourceUrls ?? []), { label: '', url: '' }];
                onSourceUrlsChange?.(updated);
              }}
            >
              <Plus className="w-3 h-3" /> Add Source URL
            </Button>
            <p className="text-[10px] text-muted-foreground">
              These URLs are used by the multi-source scraper to extract card data from competitor review sites.
            </p>
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Zone B: Editorial Content (team-written) ── */}
      <div className="bg-background rounded-xl p-4 space-y-3 border border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editorial Content</span>
        </div>

        <CollapsibleSection title="Editorial Content" metaKey="editorialContent">
          <div className="space-y-4">
            {/* CMS-126: scrape → ZeroGPT scan → Gemma humanise state for the editorial prose below. */}
            <ProseProcessingChip proseProcessing={card.proseProcessing} />
            <TextAreaField label="Card Header Paragraph" value={detailData.cardHeaderParagraph ?? ''} onChange={v => onUpdateDetail({ cardHeaderParagraph: v })} lockSlot={<FieldLockButton card={card} field="cardHeaderParagraph" value={detailData.cardHeaderParagraph ?? ''} />} />
            <TextAreaField label="Card Overview" value={detailData.cardOverview ?? ''} onChange={v => onUpdateDetail({ cardOverview: v })} lockSlot={<FieldLockButton card={card} field="cardOverview" value={detailData.cardOverview ?? ''} />} />
            <AbbreviatedSlotsField label="Pros — Abbreviated" items={detailData.prosAbbreviated} onChange={v => onUpdateDetail({ prosAbbreviated: v })} />
            <BulletListField label="Benefits — Bullet List" items={detailData.benefitsBullets ?? []} onChange={v => onUpdateDetail({ benefitsBullets: v })} />
            <BulletListField label="Pros — Full" items={toBulletItems(detailData.prosFull)} onChange={v => onUpdateDetail({ prosFull: v })} />
            <AbbreviatedSlotsField label="Cons — Abbreviated" items={detailData.consAbbreviated} onChange={v => onUpdateDetail({ consAbbreviated: v })} />
            <BulletListField label="Cons — Full" items={toBulletItems(detailData.consFull)} onChange={v => onUpdateDetail({ consFull: v })} />
            {/* CMS-90: WYSIWYG — stores raw HTML, synced raw into the Webflow
                who-should-get rich text field. Full uniform format bar (H1-H3
                + embeds); the sync still demotes h1/h2 → h3 at publish so the
                page matches the template scale regardless of editor choice
                (CMS-111). */}
            <RichTextField label="Who Should Get This Card" value={detailData.whoShouldGet ?? ''} onChange={v => onUpdateDetail({ whoShouldGet: v })} onPersist={html => onPersistField?.({ whoShouldGet: html })} placeholder="Numbered audience sections, e.g. 1. Frequent Travelers…" iframeHost={{ collection: 'card_data', docId: card.id, field: 'whoShouldGet' }} editorialTools />
            <TextAreaField label="Who Should NOT Get This Card" value={detailData.whoShouldNot ?? ''} onChange={v => onUpdateDetail({ whoShouldNot: v })} lockSlot={<FieldLockButton card={card} field="whoShouldNot" value={detailData.whoShouldNot ?? ''} />} />
            <TextAreaField label="Who Is This Card Good For?" value={detailData.whoCardGoodFor ?? ''} onChange={v => onUpdateDetail({ whoCardGoodFor: v })} lockSlot={<FieldLockButton card={card} field="whoCardGoodFor" value={detailData.whoCardGoodFor ?? ''} />} />
            <RateCategoryListField label="Earning Rewards" pairs={detailData.earningRewardsRates} legacyItems={toBulletItems(detailData.earningRewardsSection)} onChange={v => onUpdateDetail({ earningRewardsRates: v })} />
            <TextAreaField label="Special Reward Conditions" value={detailData.specialRewardConditions ?? ''} onChange={v => onUpdateDetail({ specialRewardConditions: v })} placeholder="e.g. Use the card 5 times each statement period to earn points. Select &quot;Learn More&quot; to learn about the product features, terms, and conditions." lockSlot={<FieldLockButton card={card} field="specialRewardConditions" value={detailData.specialRewardConditions ?? ''} />} />
            <BulletListField label="Additional Benefits" items={toBulletItems(detailData.additionalBenefitsSection)} onChange={v => onUpdateDetail({ additionalBenefitsSection: v })} />
            <BulletListField label="More Details" items={toBulletItems(detailData.moreDetailsSection)} onChange={v => onUpdateDetail({ moreDetailsSection: v })} />
            <TextAreaField label="What You'll Love" value={detailData.whatYoullLove ?? ''} onChange={v => onUpdateDetail({ whatYoullLove: v })} lockSlot={<FieldLockButton card={card} field="whatYoullLove" value={detailData.whatYoullLove ?? ''} />} />
          </div>
        </CollapsibleSection>

        {/* CMS-97: three iframe-capable RichText embed slots (Complimentary
            Cards / Comparable Cards / Transfer Partners), created in Webflow
            2026-08-19. CMS-107: stacked in a column with the full article
            WYSIWYG insert set (iFrame, TP Table, image, video, social). */}
        <CollapsibleSection title="iFrame Embeds" metaKey="iframeEmbeds">
          <div className="space-y-4">
            <RichTextField
              label="Complimentary Cards"
              value={detailData.complimentaryCardsEmbed ?? ''}
              onChange={v => onUpdateDetail({ complimentaryCardsEmbed: v })}
              onPersist={html => onPersistField?.({ complimentaryCardsEmbed: html })}
              placeholder="Insert the Complimentary Cards embed…"
              iframeHost={{ collection: 'card_data', docId: card.id, field: 'complimentaryCardsEmbed' }}
              editorialTools
            />
            <RichTextField
              label="Comparable Cards"
              value={detailData.comparableCardsEmbed ?? ''}
              onChange={v => onUpdateDetail({ comparableCardsEmbed: v })}
              onPersist={html => onPersistField?.({ comparableCardsEmbed: html })}
              placeholder="Insert the Comparable Cards embed…"
              iframeHost={{ collection: 'card_data', docId: card.id, field: 'comparableCardsEmbed' }}
              editorialTools
            />
            <RichTextField
              label="Transfer Partners"
              value={detailData.transferPartnersEmbed ?? ''}
              onChange={v => onUpdateDetail({ transferPartnersEmbed: v })}
              onPersist={html => onPersistField?.({ transferPartnersEmbed: html })}
              placeholder="Insert the Transfer Partners table…"
              iframeHost={{ collection: 'card_data', docId: card.id, field: 'transferPartnersEmbed' }}
              editorialTools
            />
            {/* CMS-129: Offer History — binds in Webflow directly under the
                Transfer Partners table. Insert the "Offer History" iFrame
                element (this card); rows render live from the scrape. */}
            <RichTextField
              label="Offer History (renders under Transfer Partners)"
              value={detailData.offerHistoryEmbed ?? ''}
              onChange={v => onUpdateDetail({ offerHistoryEmbed: v })}
              onPersist={html => onPersistField?.({ offerHistoryEmbed: html })}
              placeholder="Insert the Offer History table (iFrame → Offer History → this card)…"
              iframeHost={{ collection: 'card_data', docId: card.id, field: 'offerHistoryEmbed' }}
              editorialTools
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Recommendation Tier" metaKey="recommendationTier">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-accent inline-flex items-center gap-1.5">We Don't Recommend <FieldLockButton card={card} field="dontRecommendText" value={detailData.dontRecommendText ?? ''} /></label>
              <Textarea
                value={detailData.dontRecommendText ?? ''}
                onChange={e => onUpdateDetail({ dontRecommendText: e.target.value })}
                placeholder="Explain when/why this card isn't recommended..."
                className="text-sm min-h-[60px] bg-accent/5 shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-accent inline-flex items-center gap-1.5">We Sometimes Recommend <FieldLockButton card={card} field="sometimesRecommendText" value={detailData.sometimesRecommendText ?? ''} /></label>
              <Textarea
                value={detailData.sometimesRecommendText ?? ''}
                onChange={e => onUpdateDetail({ sometimesRecommendText: e.target.value })}
                placeholder="Explain the scenarios where this card makes sense..."
                className="text-sm min-h-[60px] bg-accent/5 shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-accent inline-flex items-center gap-1.5">We Always Recommend <FieldLockButton card={card} field="alwaysRecommendText" value={detailData.alwaysRecommendText ?? ''} /></label>
              <Textarea
                value={detailData.alwaysRecommendText ?? ''}
                onChange={e => onUpdateDetail({ alwaysRecommendText: e.target.value })}
                placeholder="Explain why this card is a strong recommendation..."
                className="text-sm min-h-[60px] bg-accent/5 shadow-inner"
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Transfer & Credit Info" metaKey="transferCreditInfo">
          <TextAreaField label="Transfer Instructions" value={detailData.transferInstructions ?? ''} onChange={v => onUpdateDetail({ transferInstructions: v })} lockSlot={<FieldLockButton card={card} field="transferInstructions" value={detailData.transferInstructions ?? ''} />} />
          <TextAreaField label="Recommended Credit Paragraph" value={detailData.recommendedCreditParagraph ?? ''} onChange={v => onUpdateDetail({ recommendedCreditParagraph: v })} lockSlot={<FieldLockButton card={card} field="recommendedCreditParagraph" value={detailData.recommendedCreditParagraph ?? ''} />} />
        </CollapsibleSection>

        <CollapsibleSection title="Mission & Methodology" metaKey="missionMethodology">
          {/* CMS-116: empty fields fall back to the Global Fields tab's shared text at sync */}
          <p className="text-[10px] text-muted-foreground -mt-1">
            Leave a field empty to use the shared text from Card Data Manager → Global Fields. Card-specific text here always wins.
          </p>
          <TextAreaField label="Our Mission" value={detailData.ourMissionSection ?? ''} onChange={v => onUpdateDetail({ ourMissionSection: v })} lockSlot={<FieldLockButton card={card} field="ourMissionSection" value={detailData.ourMissionSection ?? ''} />} />
          <TextAreaField label="Rating Methodology" value={detailData.ratingMethodologySection ?? ''} onChange={v => onUpdateDetail({ ratingMethodologySection: v })} lockSlot={<FieldLockButton card={card} field="ratingMethodologySection" value={detailData.ratingMethodologySection ?? ''} />} />
        </CollapsibleSection>
      </div>


      {/* ── Zone C: Evaluation & Metadata (teal-tinted) ── */}
      <div className="bg-accent/5 rounded-xl p-4 space-y-3 border border-accent/10">
        {/* ETH Scoring */}
        <CollapsibleSection title="ETH Scoring System" metaKey="ethScoring">
          <div className="space-y-4">
            <div className="relative w-48 h-48 mx-auto">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {[1, 0.75, 0.5, 0.25].map(scale => (
                  <polygon key={scale} points={getHexPoints(100, 100, 80 * scale, scoreLabels.length)} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
                ))}
                <polygon
                  points={getScorePoints(100, 100, 80, scoreLabels.map(s => (detailData as Record<string, unknown>)[s.key] as number ?? 5))}
                  fill="hsl(var(--accent) / 0.2)" stroke="hsl(var(--accent))" strokeWidth="2"
                />
                {scoreLabels.map((s, i) => {
                  const angle = (Math.PI * 2 * i) / scoreLabels.length - Math.PI / 2;
                  const x = 100 + Math.cos(angle) * 95;
                  const y = 100 + Math.sin(angle) * 95;
                  return <text key={s.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[8px]">{s.label}</text>;
                })}
              </svg>
            </div>

            {scoreLabels.map(s => (
              <div key={s.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    {s.label} <span className="text-[10px]">({s.weight})</span>
                    {/* CMS-117: lock a dial against scraper refreshes (CMS-118 made dials scraper-written) */}
                    <FieldLockButton card={card} field={s.key as OverridableFieldName} value={(detailData as Record<string, unknown>)[s.key] as number ?? 5} />
                  </span>
                  <span className="text-xs font-semibold text-card-foreground">{(detailData as Record<string, unknown>)[s.key] as number ?? 5}/10</span>
                </div>
                <Slider
                  value={[(detailData as Record<string, unknown>)[s.key] as number ?? 5]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={([v]) => onUpdateDetail({ [s.key]: v })}
                />
              </div>
            ))}

            <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg border border-accent/30">
              <span className="text-sm font-medium text-card-foreground">Composite Score</span>
              <span className="text-lg font-bold text-accent">{compositeScore}</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* FAQs */}
        <CollapsibleSection title={`FAQs (${(detailData.faqs ?? []).length}/8)`} metaKey="faqs">
          <Accordion type="single" collapsible className="space-y-1">
            {(detailData.faqs ?? []).map((faq, i) => (
              <AccordionItem key={faq.id} value={faq.id} className="border border-border rounded-lg px-3">
                <AccordionTrigger className="text-sm py-2 hover:no-underline">
                  <div className="flex items-center gap-2 flex-1 text-left">
                    <GripVertical className="w-3 h-3 text-muted-foreground shrink-0 cursor-grab" />
                    <span className="text-xs text-muted-foreground">Q{i + 1}.</span>
                    <span className="truncate">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-2">
                  <Input value={faq.question} onChange={e => updateFaq(faq.id, { question: e.target.value })} placeholder="Question" className="h-8 text-sm" />
                  <Textarea value={faq.answer} onChange={e => updateFaq(faq.id, { answer: e.target.value })} placeholder="Answer" className="text-sm min-h-[60px] shadow-inner" />
                  <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => removeFaq(faq.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {(detailData.faqs ?? []).length < 8 && (
            <div className="flex gap-2 mt-2">
              <Input value={newFaqQ} onChange={e => setNewFaqQ(e.target.value)} placeholder="New question..." className="h-8 text-sm" onKeyDown={e => e.key === 'Enter' && addFaq()} />
              <Button variant="outline" size="sm" onClick={addFaq} className="shrink-0 gap-1 text-xs">
                <Plus className="w-3 h-3" /> Add FAQ
              </Button>
            </div>
          )}
        </CollapsibleSection>

        {/* Card Relationships */}
        <CollapsibleSection title="Card Relationships" metaKey="cardRelationships">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-foreground/70 mb-2">Complementary Cards</h4>
              <div className="space-y-1.5">
                {(detailData.complementaryCards ?? []).map(lc => (
                  <div key={lc.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-border">
                    <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                    <button className="text-sm text-accent hover:underline flex-1 text-left" onClick={() => onNavigateToCard?.(lc.cardId)}>{lc.name}</button>
                    <Badge variant="outline" className="text-[10px]"><Star className="w-2.5 h-2.5 mr-0.5" />{lc.compositeScore}</Badge>
                    <button onClick={() => removeLinkedCard('complementaryCards', lc.id)} className="p-0.5 hover:bg-muted rounded">
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
              <LinkedCardPicker
                label="Add Complementary Card"
                cards={allCards}
                excludeIds={[card.id, ...(detailData.complementaryCards ?? []).map(lc => lc.cardId)]}
                onSelect={doc => addLinkedCard('complementaryCards', doc)}
              />
            </div>

            <div>
              <h4 className="text-xs font-medium text-foreground/70 mb-2">Comparable Cards (Competitors)</h4>
              <div className="space-y-1.5">
                {(detailData.comparableCards ?? []).map(lc => (
                  <div key={lc.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-border">
                    <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                    <button className="text-sm text-accent hover:underline flex-1 text-left" onClick={() => onNavigateToCard?.(lc.cardId)}>{lc.name}</button>
                    <Badge variant="outline" className="text-[10px]"><Star className="w-2.5 h-2.5 mr-0.5" />{lc.compositeScore}</Badge>
                    <button onClick={() => removeLinkedCard('comparableCards', lc.id)} className="p-0.5 hover:bg-muted rounded">
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
              <LinkedCardPicker
                label="Add Comparable Card"
                cards={allCards}
                excludeIds={[card.id, ...(detailData.comparableCards ?? []).map(lc => lc.cardId)]}
                onSelect={doc => addLinkedCard('comparableCards', doc)}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Author & Metadata */}
        <CollapsibleSection title="Author & Metadata" metaKey="authorMetadata">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70">Author</label>
              <AuthorSelect
                valueName={detailData.authorProfile ?? ''}
                valueId={detailData.authorWebflowItemId ?? ''}
                onChange={(name, id) => onUpdateDetail({ authorProfile: name, authorWebflowItemId: id })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70">Last Editorial Review</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-8 text-sm", !detailData.lastEditorialReview && "text-muted-foreground")}>
                    <CalendarIcon className="w-3 h-3 mr-1.5" />
                    {detailData.lastEditorialReview ? format(detailData.lastEditorialReview, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={detailData.lastEditorialReview ?? undefined}
                    onSelect={d => d && onUpdateDetail({ lastEditorialReview: d })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70">Review Cycle</label>
              <select
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={detailData.reviewCycle ?? 'Monthly'}
                onChange={e => onUpdateDetail({ reviewCycle: e.target.value as 'Monthly' | 'Quarterly' | 'As Needed' })}
              >
                <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="As Needed">As Needed</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground/70">Last Published to Webflow</label>
              <div className="text-sm text-card-foreground bg-muted/30 rounded px-2 py-1.5">
                {detailData.lastPublishedToWebflow ? detailData.lastPublishedToWebflow.toLocaleDateString() : 'Never'}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70">Internal Notes <span className="text-[10px] text-muted-foreground/60">(team-only, not published)</span></label>
            <Textarea
              value={detailData.internalNotes ?? ''}
              onChange={e => onUpdateDetail({ internalNotes: e.target.value })}
              placeholder="Internal notes about this card..."
              className="text-sm min-h-[80px] shadow-inner"
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}


// ─── Helper Components ────────────────────────────────────────────────────────

/**
 * CMS-126: shows where the card's scraped prose sits in the humanise loop —
 * queued/processing after each scrape, then the ZeroGPT before → after score
 * once the Gemma pass completes. Hidden until the first scrape queues prose.
 */
function ProseProcessingChip({ proseProcessing }: { proseProcessing?: CardDetailData['proseProcessing'] }) {
  if (!proseProcessing?.status) return null;
  const { status, initialAiScore, finalAiScore, failureReason, fieldsNormalized } = proseProcessing;

  if (status === 'queued' || status === 'processing') {
    return (
      <div className="flex items-center gap-1.5 w-fit px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 text-[11px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        {status === 'queued' ? 'Prose queued for humanising (ZeroGPT + Gemma)…' : 'Humanising scraped prose (ZeroGPT + Gemma)…'}
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-1.5 w-fit px-2 py-1 rounded-md bg-destructive/10 text-destructive text-[11px] font-medium" title={failureReason ?? undefined}>
        Prose humanising failed{failureReason?.includes('insufficient_credits') ? ' — ZeroGPT credits need a top-up' : failureReason ? `: ${failureReason}` : ''}
      </div>
    );
  }
  // complete
  const hasInitial = initialAiScore != null;
  const hasFinal = finalAiScore != null;
  return (
    <div
      className="flex items-center gap-1.5 w-fit px-2 py-1 rounded-md bg-success/10 text-success text-[11px] font-medium"
      title={
        fieldsNormalized?.length
          ? `Humanised fields: ${fieldsNormalized.join(', ')}`
          : 'Scraped prose passed through the ZeroGPT + Gemma humanise loop'
      }
    >
      {hasInitial && hasFinal
        ? `Prose humanised · ZeroGPT ${Math.round(initialAiScore)}% → ${Math.round(finalAiScore)}%`
        : hasInitial
          ? `Prose humanised · ZeroGPT before: ${Math.round(initialAiScore)}%`
          : 'Scraped prose humanised (ZeroGPT + Gemma)'}
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder, lockSlot }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** CMS-117: optional per-field lock button rendered beside the label. */
  lockSlot?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">{label}{lockSlot}</label>
      <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-sm min-h-[80px] shadow-inner" />
    </div>
  );
}

// CMS-74 — Earning Rewards as rate + category pairs. Each pair renders on the
// card page as the rate chip ("3x") followed by its category line ("per $1 for
// dining purchases"), and feeds both the At-a-glance Rewards Rate block and
// the Rewards Summary block in Webflow. Legacy bullet-list content
// (earningRewardsSection) seeds the rows as category-only entries until the
// first edit persists pairs (earningRewardsRates).
function RateCategoryListField({ label, pairs, legacyItems, onChange }: {
  label: string;
  pairs: EarningRewardRate[] | undefined;
  legacyItems: string[];
  onChange: (v: EarningRewardRate[]) => void;
}) {
  const rows: EarningRewardRate[] = pairs ?? legacyItems.map(category => ({ rate: '', category }));
  const updateRow = (i: number, patch: Partial<EarningRewardRate>) => {
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground/70">
        {label} <span className="text-[10px] text-muted-foreground/60">(rate + category per row — feeds both Rewards Rate and Rewards Summary)</span>
      </label>
      <div className="space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              aria-label={`${label} rate ${i + 1}`}
              value={row.rate}
              onChange={e => updateRow(i, { rate: e.target.value })}
              placeholder="3x"
              className="h-7 text-sm w-16 shrink-0 text-center"
            />
            <Input
              aria-label={`${label} category ${i + 1}`}
              value={row.category}
              onChange={e => updateRow(i, { category: e.target.value })}
              placeholder="per $1 for dining purchases"
              className="h-7 text-sm"
            />
            <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="p-0.5 hover:bg-muted rounded shrink-0">
              <Trash2 className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onChange([...rows, { rate: '', category: '' }])}>
          <Plus className="w-3 h-3" /> Add rate
        </Button>
      </div>
    </div>
  );
}

// CMS-45 — fixed 8-slot editor for Pros/Cons Abbreviated. Each slot maps 1:1
// to a discrete Webflow bullet field (pros-abbreviated-N / cons-abbreviated-N),
// so positions are preserved: slot 3 stays slot 3 even when slot 2 is blank.
function AbbreviatedSlotsField({ label, items, onChange }: { label: string; items: string[] | undefined; onChange: (v: string[]) => void }) {
  const slots = toAbbreviatedSlots(items);
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground/70">
        {label} <span className="text-[10px] text-muted-foreground/60">(8 Webflow bullet fields)</span>
      </label>
      <div className="space-y-1">
        {slots.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-4 text-[10px] tabular-nums text-muted-foreground text-right shrink-0">{i + 1}.</span>
            <Input
              aria-label={`${label} ${i + 1}`}
              value={item}
              onChange={e => { const next = [...slots]; next[i] = e.target.value; onChange(next); }}
              placeholder={i === 0 ? 'Short bullet, ~8 words max' : ''}
              className="h-7 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BulletListField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground/70">{label}</label>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <Input value={item} onChange={e => { const next = [...items]; next[i] = e.target.value; onChange(next); }} className="h-7 text-sm" />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-0.5 hover:bg-muted rounded shrink-0">
              <Trash2 className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => onChange([...items, ''])}>
          <Plus className="w-3 h-3" /> Add item
        </Button>
      </div>
    </div>
  );
}

// ─── Linked Card Picker ───────────────────────────────────────────────────────
// Searchable popover for choosing an existing card to link as a complementary
// or comparable card. Excludes the current card and already-linked cards.

function LinkedCardPicker({ label, cards, excludeIds, onSelect }: {
  label: string;
  cards: CardDocument[];
  excludeIds: string[];
  onSelect: (card: CardDocument) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const available = cards.filter(c =>
    !excludeIds.includes(c.id) &&
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="mt-2 text-xs gap-1">
          <Plus className="w-3 h-3" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search cards..."
          className="h-8 text-sm mb-2"
        />
        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {available.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1.5">No matching cards.</p>
          )}
          {available.map(c => (
            <button
              key={c.id}
              className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-2"
              onClick={() => { onSelect(c); setOpen(false); setSearch(''); }}
            >
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{c.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{c.issuer}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── SVG Helpers ──────────────────────────────────────────────────────────────

function getHexPoints(cx: number, cy: number, r: number, sides = 6): string {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(' ');
}

function getScorePoints(cx: number, cy: number, maxR: number, scores: number[]): string {
  return scores.map((s, i) => {
    const angle = (Math.PI * 2 * i) / scores.length - Math.PI / 2;
    const r = (s / 10) * maxR;
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(' ');
}
