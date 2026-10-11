/**
 * AIIntakeFlow Component — 4-Step Image Intake Process
 *
 * Step 1: Description — user manually describes what the image shows
 * Step 2: AI Metadata — Claude generates SEO filename, alt text, title attribute
 * Step 3: SEO Keywords — DataForSEO returns best keywords for this image
 * Step 4: Review — user reviews everything, can edit, then saves
 *
 * Data flow:
 * - Step 1 → description (manual)
 * - Step 2 → Claude API → seoFilename, altText, titleAttribute (editable)
 * - Step 3 → DataForSEO API → keywords[] (selectable/editable)
 * - Step 4 → user reviews all → completeAIIntake saves to Firestore
 */

import { useState } from 'react';
import {
  Sparkles, ChevronRight, ChevronLeft, Check,
  Loader2, Image, Search, X, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { completeAIIntake, startAIIntakeMetadata } from '../services/assetService';
import { ContentTagsSection } from './ContentTagsSection';
import { KeywordMagicTool } from '@/modules/keywords';
import type { AssetTaxonomy } from '../types';

interface AIIntakeFlowProps {
  assetId?: string;
  filename: string;
  category: string;
  association?: string;
  initialDescription?: string;
  onComplete: (result: IntakeResult) => void;
  onCancel: () => void;
  compact?: boolean;
}

export interface IntakeResult {
  description: string;
  taxonomy: AssetTaxonomy;
  altText: string;
  titleAttr: string;
  seoFilename: string;
  freeTags: string[];
}

function emptyTaxonomy(): AssetTaxonomy {
  return {
    airlines: [], hotels: [], cabinClass: null, experienceTypes: [],
    lounges: [], destinations: [], creditCards: [], aircraftTypes: [],
    tripComponent: null,
  };
}

export function AIIntakeFlow({
  assetId,
  filename,
  category,
  initialDescription,
  onComplete,
  onCancel,
}: AIIntakeFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Description
  const [description, setDescription] = useState(initialDescription || '');

  // Step 2: AI Metadata (Claude)
  const [seoFilename, setSeoFilename] = useState('');
  const [altText, setAltText] = useState('');
  const [titleAttr, setTitleAttr] = useState('');
  const [metadataLoading, setMetadataLoading] = useState(false);

  // Step 3: SEO Keywords (Keyword Magic / DataForSEO)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [manualKeywords, setManualKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');

  // Step 4: Review — taxonomy + tags
  const [taxonomy, setTaxonomy] = useState<AssetTaxonomy>(emptyTaxonomy());
  const [freeTags, setFreeTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const descriptionValid = description.trim().length >= 10;

  // ─── Step 1 → Step 2: Generate AI Metadata ────────────────────────────────

  const handleGenerateMetadata = async () => {
    setMetadataLoading(true);
    try {
      const result = await startAIIntakeMetadata({ mode: 'metadata', description: description.trim(), category, filename });
      setSeoFilename(result.seoFilename);
      setAltText(result.altText);
      setTitleAttr(result.titleAttribute);
      setStep(2);
    } catch (err) {
      // Fallback: generate locally if Claude fails
      const slug = description.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 60);
      setSeoFilename(slug || 'untitled');
      setAltText(description.slice(0, 120));
      setTitleAttr(`${description.slice(0, 60)} — ${category}`);
      setStep(2);
      toast.info('AI unavailable — metadata generated locally. Please review.');
    } finally {
      setMetadataLoading(false);
    }
  };

  // ─── Step 2 → Step 3: Keyword Magic ───────────────────────────────────────

  /** Seed for the embedded Keyword Magic tool — alt text is the best SEO signal. */
  const keywordSeed = (altText || description).trim();

  // ─── Step 3 → Step 4: Proceed to Review ───────────────────────────────────

  const handleProceedToReview = () => {
    // Collect selected + manual keywords as free tags
    setFreeTags(prev => {
      const merged = new Set([...prev, ...selectedKeywords, ...manualKeywords]);
      return Array.from(merged);
    });
    setStep(4);
  };

  // ─── Step 4: Save & Complete ──────────────────────────────────────────────

  const handleComplete = async () => {
    if (assetId) {
      setSaving(true);
      try {
        await completeAIIntake({
          assetId,
          approvedData: {
            description: description.trim(),
            altText,
            titleAttribute: titleAttr,
            filename: seoFilename,
            taxonomy: {
              airlines: taxonomy.airlines,
              hotels: taxonomy.hotels,
              cabinClass: taxonomy.cabinClass,
              experienceTypes: taxonomy.experienceTypes,
              lounges: taxonomy.lounges,
              destinations: taxonomy.destinations,
              creditCards: taxonomy.creditCards,
              aircraftTypes: taxonomy.aircraftTypes,
            },
            tags: freeTags,
          },
        });
        toast.success('Image intake complete ✓');
        onComplete({ description, taxonomy, altText, titleAttr, seoFilename, freeTags });
      } catch (err) {
        toast.error('Failed to save. Please try again.');
        console.error('[AIIntakeFlow] Save error:', err);
      } finally {
        setSaving(false);
      }
    } else {
      onComplete({ description, taxonomy, altText, titleAttr, seoFilename, freeTags });
      toast.success('Image intake complete ✓');
    }
  };

  // ─── Manual keyword additions ─────────────────────────────────────────────

  const addCustomKeyword = () => {
    const kw = customKeyword.trim().toLowerCase();
    if (kw && !manualKeywords.includes(kw) && !selectedKeywords.includes(kw)) {
      setManualKeywords(prev => [...prev, kw]);
      setCustomKeyword('');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
        {[
          { num: 1, label: 'Description' },
          { num: 2, label: 'AI Metadata' },
          { num: 3, label: 'SEO Keywords' },
          { num: 4, label: 'Review' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-1 shrink-0">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              step === s.num ? 'bg-accent text-accent-foreground' :
              step > s.num ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s.num ? <Check className="h-3 w-3" /> : s.num}
            </div>
            <span className={`text-[11px] ${step === s.num ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>

      {/* ═══════════════════ STEP 1: Description ═══════════════════ */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/20 flex items-center justify-center py-10">
            <div className="text-center text-muted-foreground">
              <Image className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-[11px]">{filename}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">
              What does this image show? <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Be specific — airline, cabin, route, hotel, location. e.g., 'JAL First Class Suite on 777-300ER, Narita to JFK'"
              className="text-sm min-h-[80px] resize-none"
              autoFocus
            />
            <span className="text-[10px] text-muted-foreground">
              {description.trim().length} characters (min 10)
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleGenerateMetadata}
              disabled={!descriptionValid || metadataLoading}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {metadataLoading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating metadata...</>
              ) : (
                <>Continue <ChevronRight className="h-3.5 w-3.5 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════ STEP 2: AI Metadata ═══════════════════ */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold">AI-Generated SEO Metadata</span>
            <span className="text-[10px] text-muted-foreground">(editable)</span>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-accent uppercase tracking-wider">SEO Filename</label>
              <Input
                value={seoFilename}
                onChange={e => setSeoFilename(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="h-9 text-sm font-mono"
              />
              <p className="text-[9px] text-muted-foreground">{seoFilename.length}/60 chars · lowercase, hyphens only</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-accent uppercase tracking-wider">Alt Text</label>
              <Textarea
                value={altText}
                onChange={e => setAltText(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
              />
              <p className={`text-[9px] ${altText.length >= 50 && altText.length <= 120 ? 'text-green-600' : 'text-amber-600'}`}>
                {altText.length} chars (ideal: 50-120)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-accent uppercase tracking-wider">Title Attribute</label>
              <Input
                value={titleAttr}
                onChange={e => setTitleAttr(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <Button
              size="sm"
              onClick={() => setStep(3)}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Search className="h-3.5 w-3.5 mr-1.5" /> Discover Keywords
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════ STEP 3: SEO Keywords ═══════════════════ */}
      {step === 3 && (
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Search className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">SEO Keywords</span>
              <p className="text-[10px] text-muted-foreground">Select keywords for this image — they become searchable tags</p>
            </div>
          </div>

          {/* Scrollable Keyword Magic area */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-card p-3">
            <KeywordMagicTool
              mode="embedded"
              initialSeed={keywordSeed}
              autoSearch={!!keywordSeed}
              selectionMode="multi"
              onSelectionChange={setSelectedKeywords}
            />
          </div>

          {/* Sticky bottom bar */}
          <div className="shrink-0 pt-3 mt-3 border-t border-border bg-background space-y-3">
            {/* Add custom keyword */}
            <div className="flex gap-2">
              <Input
                value={customKeyword}
                onChange={e => setCustomKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomKeyword()}
                placeholder="Add custom keyword..."
                className="h-8 text-sm flex-1"
              />
              <Button size="sm" variant="outline" className="h-8" onClick={addCustomKeyword} disabled={!customKeyword.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {manualKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {manualKeywords.map(kw => (
                  <Badge key={kw} variant="secondary" className="text-[10px] gap-1 pr-1">
                    {kw}
                    <button onClick={() => setManualKeywords(prev => prev.filter(k => k !== kw))} className="hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-accent">
                {selectedKeywords.length + manualKeywords.length} keyword{selectedKeywords.length + manualKeywords.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleProceedToReview}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
                >
                  Continue to Review <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ STEP 4: Review & Save ═══════════════════ */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h4 className="text-sm font-semibold">Review Summary</h4>

            <div className="space-y-1">
              <label className="text-[10px] font-medium text-accent uppercase tracking-wider">Description</label>
              <p className="text-[12px] text-foreground bg-muted/30 rounded px-2.5 py-2">{description}</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-accent uppercase tracking-wider">SEO Filename</label>
                <p className="text-[11px] font-mono text-foreground bg-muted/30 rounded px-2.5 py-1.5">{seoFilename}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-accent uppercase tracking-wider">Alt Text</label>
                <p className="text-[11px] text-foreground bg-muted/30 rounded px-2.5 py-1.5">{altText}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-accent uppercase tracking-wider">Title</label>
                <p className="text-[11px] text-foreground bg-muted/30 rounded px-2.5 py-1.5">{titleAttr}</p>
              </div>
            </div>

            {/* Keywords section — always visible */}
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-accent uppercase tracking-wider">SEO Keywords</label>
              {freeTags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {freeTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] gap-1 pr-1">
                      {tag}
                      <button onClick={() => setFreeTags(prev => prev.filter(t => t !== tag))} className="hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-muted-foreground">No keywords selected.</p>
                  <Input
                    placeholder="Add keyword..."
                    className="h-7 text-[11px] max-w-[160px]"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                        setFreeTags(prev => [...prev, (e.target as HTMLInputElement).value.trim().toLowerCase()]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Content Tags (taxonomy) */}
          <div className="rounded-lg border bg-muted/20 p-3">
            <ContentTagsSection
              taxonomy={taxonomy}
              onChange={setTaxonomy}
              freeTags={freeTags}
              onFreeTagsChange={setFreeTags}
              assetId={assetId}
              description={description}
              compact
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(3)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...</>
              ) : (
                <><Check className="h-3.5 w-3.5 mr-1.5" /> Save & Complete</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
