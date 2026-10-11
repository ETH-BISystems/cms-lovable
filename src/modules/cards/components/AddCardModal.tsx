import { useState, useRef } from 'react';
import { Plus, Trash2, Link2, Loader2, CreditCard, ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCardActions } from '../hooks/useCardActions';
import { CategorySelect } from './CategorySelect';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types';
import { toast } from 'sonner';
// CMS-115: real Asset Library dialog (was the 4-item mock picker).
import { AssetPickerDialog } from '@/modules/assets';
import { storageService } from '@/services/storageService';
import type { CardCategory, ScrapeFrequency } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const FREQUENCIES: { value: ScrapeFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'twice-weekly', label: 'Twice Weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface SourceUrlEntry {
  id: string;
  label: string;
  url: string;
}

// ─── URL Input Helper ────────────────────────────────────────────────────────

function UrlInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean;
}) {
  return (
    <div className="relative">
      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="pl-9" disabled={disabled} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AddCardModal() {
  const [open, setOpen] = useState(false);
  const { addCard, isLoading } = useCardActions();
  const { role } = useAuth();

  const isReadOnly = role === Role.Writer || role === Role.Viewer;

  // Form fields
  const [cardName, setCardName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [annualFee, setAnnualFee] = useState('');
  const [signupBonus, setSignupBonus] = useState('');
  const [spendReq, setSpendReq] = useState('');
  const [apr, setApr] = useState('');
  const [category, setCategory] = useState<CardCategory>('Travel');
  const [scrapeFrequency, setScrapeFrequency] = useState<ScrapeFrequency>('daily');
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Source URLs — dynamic list
  const [sourceUrls, setSourceUrls] = useState<SourceUrlEntry[]>([]);

  // Optional URLs
  const [issuerUrl, setIssuerUrl] = useState('');
  const [ratesTermsUrl, setRatesTermsUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');

  const [submitError, setSubmitError] = useState<string | null>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const reset = () => {
    setCardName('');
    setIssuer('');
    setAnnualFee('');
    setSignupBonus('');
    setSpendReq('');
    setApr('');
    setCategory('Travel');
    setScrapeFrequency('daily');
    setCardImageUrl('');
    setSourceUrls([]);
    setIssuerUrl('');
    setRatesTermsUrl('');
    setAffiliateLink('');
    setSubmitError(null);
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  const canSubmit = cardName.trim() !== '' && issuer.trim() !== '';

  // ─── Source URL Management ───────────────────────────────────────────────

  const addSourceUrl = () => {
    setSourceUrls(prev => [...prev, { id: `src-${Date.now()}`, label: '', url: '' }]);
  };

  const updateSourceUrl = (id: string, updates: Partial<SourceUrlEntry>) => {
    setSourceUrls(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSourceUrl = (id: string) => {
    setSourceUrls(prev => prev.filter(s => s.id !== id));
  };

  // ─── Image Upload ────────────────────────────────────────────────────────

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const asset = await storageService.uploadFile(file, 'assets');
      setCardImageUrl(asset.cdnUrl);
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload image');
      console.error('[AddCardModal] Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };

  // ─── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit || isReadOnly) return;
    setSubmitError(null);

    // Build the sourceUrls array (filter out empty entries)
    const validSourceUrls = sourceUrls
      .filter(s => s.url.trim())
      .map(s => ({ label: s.label.trim() || 'Source', url: s.url.trim() }));

    try {
      await addCard({
        name: cardName.trim(),
        issuer: issuer.trim(),
        annualFee: parseFloat(annualFee) || 0,
        signupBonus,
        bonusSpendReq: spendReq,
        category,
        scrapeFrequency,
        issuerUrl,
        ratesTermsUrl,
        affiliateLink,
        notes: '',
        sourceUrls: validSourceUrls,
        cardImageUrl,
      });
      toast.success(`Card "${cardName}" added successfully`);
      handleClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add card');
    }
  };

  const disabled = isLoading || isReadOnly;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Card
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogTitle className="text-lg">Add New Card</DialogTitle>
            <CreditCard className="w-5 h-5 text-teal-600" />
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Core Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Card Name <span className="text-destructive">*</span></Label>
              <Input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Chase Sapphire Reserve" className="mt-1" disabled={disabled} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Issuer <span className="text-destructive">*</span></Label>
              <Input value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="Chase" className="mt-1" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">Annual Fee</Label>
              <Input value={annualFee} onChange={e => setAnnualFee(e.target.value)} placeholder="$550" className="mt-1" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">Signup Bonus</Label>
              <Input value={signupBonus} onChange={e => setSignupBonus(e.target.value)} placeholder="60,000 pts" className="mt-1" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">Spend Requirement</Label>
              <Input value={spendReq} onChange={e => setSpendReq(e.target.value)} placeholder="$4,000 in 3 months" className="mt-1" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">APR Range</Label>
              <Input value={apr} onChange={e => setApr(e.target.value)} placeholder="21.49% - 29.49%" className="mt-1" disabled={disabled} />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <div className="mt-1">
                <CategorySelect
                  value={category}
                  onChange={c => setCategory(c as CardCategory)}
                  allowAdd={!disabled}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Scrape Frequency</Label>
              <select
                value={scrapeFrequency}
                onChange={e => setScrapeFrequency(e.target.value as ScrapeFrequency)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={disabled}
              >
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          {/* Card Image */}
          <div>
            <Label className="text-xs">Card Image</Label>
            <div className="mt-1">
              {cardImageUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-14 rounded-lg border border-border overflow-hidden">
                    <img src={cardImageUrl} alt="Card" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{cardImageUrl}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => setAssetPickerOpen(true)} disabled={disabled}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-14 border-dashed gap-2" onClick={() => setAssetPickerOpen(true)} disabled={disabled || uploading}>
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Select from Asset Library</span>
                  </Button>
                  <Button variant="outline" className="h-14 gap-2" onClick={() => fileInputRef.current?.click()} disabled={disabled || uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Upload'}</span>
                  </Button>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
            <AssetPickerDialog
              open={assetPickerOpen}
              onOpenChange={setAssetPickerOpen}
              title="Select Card Image from Asset Library"
              onSelect={(asset) => {
                setCardImageUrl(asset.cdnUrl);
                setAssetPickerOpen(false);
              }}
            />
          </div>

          {/* Source URLs — Dynamic List */}
          <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source URLs</h3>
            <p className="text-[11px] text-muted-foreground">
              Add competitor review URLs for multi-source scraping. These will be scraped after the card is created via "Scrape Now".
            </p>

            {sourceUrls.map(entry => (
              <div key={entry.id} className="flex gap-2">
                <Input
                  value={entry.label}
                  onChange={e => updateSourceUrl(entry.id, { label: e.target.value })}
                  placeholder="Label (e.g., TPG)"
                  className="w-32"
                  disabled={disabled}
                />
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={entry.url}
                    onChange={e => updateSourceUrl(entry.id, { url: e.target.value })}
                    placeholder="https://..."
                    className="pl-9"
                    disabled={disabled}
                  />
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => removeSourceUrl(entry.id)} disabled={disabled}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}

            <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={addSourceUrl} disabled={disabled}>
              <Plus className="w-3 h-3" /> Add URL
            </Button>
          </div>

          {/* Optional URLs */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Issuer URL <span className="text-[10px] text-muted-foreground">(optional)</span></Label>
              <UrlInput value={issuerUrl} onChange={setIssuerUrl} placeholder="https://creditcards.chase.com/..." disabled={disabled} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rates & Terms URL <span className="text-[10px] text-muted-foreground">(optional)</span></Label>
              <UrlInput value={ratesTermsUrl} onChange={setRatesTermsUrl} placeholder="https://chase.com/rates" disabled={disabled} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Affiliate Link <span className="text-[10px] text-muted-foreground">(optional)</span></Label>
              <UrlInput value={affiliateLink} onChange={setAffiliateLink} placeholder="https://www.cardratings.com/..." disabled={disabled} />
            </div>
          </div>

          {/* Error display */}
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          {/* Submit */}
          <div className="pt-2 space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || disabled}
              className="w-full h-12 bg-teal-600 text-white hover:bg-teal-700 font-semibold"
            >
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Adding...</> : 'Add Card'}
            </Button>
            <div className="flex justify-end">
              <button onClick={handleClose} className="text-sm text-muted-foreground hover:text-foreground" disabled={isLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
