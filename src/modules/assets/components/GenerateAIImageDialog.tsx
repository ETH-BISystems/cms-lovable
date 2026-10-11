/**
 * GenerateAIImageDialog Component
 *
 * Multi-phase dialog for AI image generation:
 *   Config → Generating → Results → Intake
 *
 * Copied from Lovable AIGenerateModal.tsx and adapted to production:
 * - Mock budget data → real subscribeToBudgetUsage from budgetService
 * - Simulated generation → actual generateAIImage Cloud Function via aiService
 * - Results phase → displays actual CDN URLs from Cloud Function response
 * - Intake phase "Save to Library" → calls completeAIIntake Cloud Function
 * - Added loading/error states for generation failures and network errors
 * - Added toast notifications for 4K→Pro upgrade, budget exceeded, save success
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Check,
  RotateCcw,
  ChevronLeft,
  Loader2,
  Zap,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import { generateAIImage, estimateGenerationCost } from '../services/aiService';
import { completeAIIntake } from '../services/assetService';
import { subscribeToBudgetUsage } from '../services/budgetService';
import type {
  QualityTier,
  StylePreset,
  AspectRatioOption,
  Resolution,
  BudgetUsage,
  GenerateAIImageResult,
} from '../types';

// ─── Constants (mirrors Lovable prototype) ────────────────────────────────────

const QUALITY_OPTIONS: {
  value: QualityTier;
  label: string;
  model: string;
  cost: number;
  desc: string;
  badge?: string;
}[] = [
  {
    value: 'fast',
    label: 'Fast',
    model: 'gemini-3.1-flash-image-preview',
    cost: 0.05,
    desc: 'Best balance of speed & quality',
  },
  {
    value: 'standard',
    label: 'Standard',
    model: 'gemini-2.5-flash-image',
    cost: 0.02,
    desc: 'Cheapest option',
  },
  {
    value: 'pro',
    label: 'Pro',
    model: 'gemini-3-pro-image-preview',
    cost: 0.13,
    desc: 'Highest quality, 4K capable',
    badge: 'Best for text & logos',
  },
];

const STYLE_OPTIONS: { value: StylePreset; label: string; suffix: string }[] = [
  { value: 'photorealistic', label: 'Photorealistic', suffix: 'photorealistic photography, high quality, detailed' },
  { value: 'editorial', label: 'Editorial', suffix: 'editorial magazine photography style, professional lighting' },
  { value: 'cinematic', label: 'Cinematic', suffix: 'cinematic quality, dramatic lighting, shallow depth of field' },
  { value: 'illustration', label: 'Illustration', suffix: 'digital illustration style, clean lines' },
  { value: 'infographic', label: 'Infographic', suffix: 'clean infographic style, minimal, data visualization' },
  { value: 'brand', label: 'Brand Graphic', suffix: 'modern brand graphic, minimal design, professional' },
  { value: 'none', label: 'None', suffix: '' },
];

const ASPECT_LABELS: Record<AspectRatioOption, string> = {
  '1:1': 'Square',
  '4:3': 'Standard',
  '16:9': 'Landscape',
  '3:4': 'Portrait',
  '9:16': 'Vertical',
};

// ─── Generated image type (from Cloud Function response) ──────────────────────

interface GeneratedImageEntry {
  assetId: string;
  cdnUrl: string;
  aspectRatio: AspectRatioOption;
  resolution: Resolution;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface GenerateAIImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Called with the saved asset id after "Save to Library" (e.g. the
   *  pipeline thumbnail flow sets it as the article's featured image). */
  onSaved?: (assetId: string) => void;
  /** Initial aspect ratio (e.g. '9:16' for article thumbnails). Default '16:9'. */
  defaultAspectRatio?: AspectRatioOption;
  /** Initial resolution (e.g. '2K' for ~1080×1920 thumbnails). Default '1K'. */
  defaultResolution?: Resolution;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GenerateAIImageDialog({
  open,
  onOpenChange,
  onSuccess,
  onSaved,
  defaultAspectRatio = '16:9',
  defaultResolution = '1K',
}: GenerateAIImageDialogProps) {
  // Config state
  const [prompt, setPrompt] = useState('');
  const [quality, setQuality] = useState<QualityTier>('fast');
  const [style, setStyle] = useState<StylePreset>('photorealistic');
  const [aspect, setAspect] = useState<AspectRatioOption>(defaultAspectRatio);
  const [resolution, setResolution] = useState<Resolution>(defaultResolution);
  const [numImages, setNumImages] = useState<1 | 2 | 4>(4);

  // Flow state
  const [phase, setPhase] = useState<'config' | 'generating' | 'results' | 'intake'>('config');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageEntry[]>([]);
  const [selectedGenImage, setSelectedGenImage] = useState<GeneratedImageEntry | null>(null);

  // Intake state
  const [description, setDescription] = useState('');
  const [seoFilename, setSeoFilename] = useState('');
  const [altText, setAltText] = useState('');
  const [titleAttr, setTitleAttr] = useState('');

  // Budget state (real-time from Firestore)
  const [budget, setBudget] = useState<BudgetUsage>({ used: 0, total: 50, remaining: 50 });

  // Error / loading state
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Subscribe to real-time budget usage
  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeToBudgetUsage(
      (usage) => setBudget(usage),
      (error) => {
        console.error('Budget subscription error:', error);
        // Keep defaults on error — don't block the UI
      }
    );

    return () => unsubscribe();
  }, [open]);

  // Derived values
  const qualityInfo = QUALITY_OPTIONS.find((q) => q.value === quality)!;
  const styleInfo = STYLE_OPTIONS.find((s) => s.value === style)!;

  const costEstimate = useMemo(
    () => estimateGenerationCost(quality, resolution, numImages),
    [quality, resolution, numImages]
  );

  const budgetExceeded = costEstimate.totalCost > budget.remaining;
  const budgetPercent = budget.total > 0 ? Math.min((budget.used / budget.total) * 100, 100) : 0;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleResolutionChange = (res: Resolution) => {
    if (res === '4K' && quality !== 'pro') {
      setQuality('pro');
      toast.info('4K requires Pro quality — model upgraded');
    }
    setResolution(res);
  };

  const handleGenerate = async () => {
    if (budgetExceeded) {
      toast.error('Monthly image generation budget reached', {
        description: 'Adjust in Settings → AI Configuration.',
      });
      return;
    }

    setPhase('generating');
    setGenerationError(null);

    try {
      const result: GenerateAIImageResult = await generateAIImage({
        prompt: prompt.trim(),
        qualityTier: quality,
        stylePreset: style,
        resolution,
        aspectRatio: aspect,
        numImages,
      });

      // Build the generated images list from the Cloud Function response
      const images: GeneratedImageEntry[] = [
        {
          assetId: result.assetId,
          cdnUrl: result.cdnUrl,
          aspectRatio: aspect,
          resolution,
        },
      ];

      if (result.additionalAssets) {
        for (const additional of result.additionalAssets) {
          images.push({
            assetId: additional.assetId,
            cdnUrl: additional.cdnUrl,
            aspectRatio: aspect,
            resolution,
          });
        }
      }

      setGeneratedImages(images);
      setPhase('results');
    } catch (err: any) {
      console.error('Image generation error:', err);
      const message = err?.message || 'Failed to generate image. Please try again.';
      setGenerationError(message);
      toast.error('Generation failed', { description: message });
      setPhase('config');
    }
  };

  const handleSelectImage = (img: GeneratedImageEntry) => {
    setSelectedGenImage(img);
    // Auto-populate intake fields from prompt
    setDescription(prompt);
    const slug = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60);
    setSeoFilename(`${slug}.webp`);
    setAltText(prompt);
    setTitleAttr(`${prompt} — AI Generated`);
    setPhase('intake');
  };

  const handleSaveToLibrary = async () => {
    if (description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    if (!selectedGenImage) return;

    setSaving(true);

    try {
      await completeAIIntake({
        assetId: selectedGenImage.assetId,
        approvedData: {
          description,
          altText,
          titleAttribute: titleAttr,
          filename: seoFilename,
          taxonomy: {},
          tags: [],
        },
      });

      toast.success(`AI image saved as "${seoFilename}" ✓`);
      onSaved?.(selectedGenImage.assetId);
      onSuccess?.();
      resetAndClose();
    } catch (err: any) {
      console.error('Save to library error:', err);
      const message = err?.message || 'Failed to save image to library.';
      toast.error('Save failed', { description: message });
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setPrompt('');
    setQuality('fast');
    setStyle('photorealistic');
    setAspect(defaultAspectRatio);
    setResolution(defaultResolution);
    setNumImages(4);
    setPhase('config');
    setGeneratedImages([]);
    setSelectedGenImage(null);
    setDescription('');
    setSeoFilename('');
    setAltText('');
    setTitleAttr('');
    setGenerationError(null);
    setSaving(false);
    onOpenChange(false);
  };

  const aspectRatioClass = (ar: AspectRatioOption) => {
    switch (ar) {
      case '1:1': return 'aspect-square';
      case '4:3': return 'aspect-[4/3]';
      case '16:9': return 'aspect-video';
      case '3:4': return 'aspect-[3/4]';
      case '9:16': return 'aspect-[9/16]';
    }
  };

  const gridCols = numImages === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Generate Image
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Powered by Gemini Nano Banana
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 pt-3">
          {/* ─── PHASE: CONFIG ─────────────────────────────────────────── */}
          {phase === 'config' && (
            <div className="space-y-5">
              {/* Prompt */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Prompt</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to generate... e.g., 'Luxury first class suite with champagne, warm lighting, wide-body aircraft'"
                  className="min-h-[90px] text-sm"
                />
                {style !== 'none' && styleInfo.suffix && (
                  <p className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    Style: <span className="font-medium text-foreground">{styleInfo.label}</span> will be added to your prompt
                  </p>
                )}
              </div>

              {/* Generation error from previous attempt */}
              {generationError && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Previous generation failed</p>
                    <p className="text-[10px] mt-0.5">{generationError}</p>
                  </div>
                </div>
              )}

              {/* Quality */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Quality</label>
                <div className="grid grid-cols-3 gap-2">
                  {QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q.value}
                      onClick={() => setQuality(q.value)}
                      className={`relative p-3 rounded-lg border text-left transition-all ${
                        quality === q.value
                          ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                          : 'border-border hover:border-accent/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold">{q.label}</span>
                        {q.badge && (
                          <Badge className="text-[8px] bg-accent/10 text-accent border-accent/20 px-1 py-0">
                            {q.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">{q.desc}</p>
                      <p className="text-[10px] font-medium text-accent mt-1">~${q.cost.toFixed(2)}/image</p>
                      {quality === q.value && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-accent-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Style</label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStyle(s.value)}
                      className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                        style === s.value
                          ? 'bg-accent text-white border-accent'
                          : 'bg-muted/50 text-foreground border-border hover:border-accent/50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Aspect Ratio</label>
                <div className="flex gap-1.5">
                  {(Object.keys(ASPECT_LABELS) as AspectRatioOption[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAspect(a)}
                      className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                        aspect === a
                          ? 'bg-accent text-white border-accent'
                          : 'bg-muted/50 text-foreground border-border hover:border-accent/50'
                      }`}
                    >
                      {a} <span className={aspect === a ? 'text-white/70 ml-0.5' : 'text-muted-foreground ml-0.5'}>({ASPECT_LABELS[a]})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Resolution</label>
                <div className="flex gap-1.5">
                  {(['1K', '2K', '4K'] as Resolution[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleResolutionChange(r)}
                      className={`px-4 py-1.5 rounded-full text-[11px] border transition-colors ${
                        resolution === r
                          ? 'bg-accent text-white border-accent'
                          : 'bg-muted/50 text-foreground border-border hover:border-accent/50'
                      }`}
                    >
                      {r}
                      {r === '4K' && <span className="ml-1 text-[9px] text-muted-foreground">(Pro only)</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Images */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Options to generate</label>
                <div className="flex gap-1.5">
                  {([1, 2, 4] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumImages(n)}
                      className={`px-4 py-1.5 rounded-full text-[11px] border transition-colors ${
                        numImages === n
                          ? 'bg-accent text-white border-accent'
                          : 'bg-muted/50 text-foreground border-border hover:border-accent/50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Estimate + Budget */}
              <div className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-2.5 border border-border">
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Estimated cost:{' '}
                    <span className="font-semibold text-foreground">
                      ~${costEstimate.totalCost.toFixed(2)}
                    </span>
                    {numImages > 1 && (
                      <span className="text-muted-foreground">
                        {' '}({numImages} × ${costEstimate.costPerImage.toFixed(2)})
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Budget: ${budget.used.toFixed(2)} / ${budget.total.toFixed(2)} this month
                  </p>
                </div>
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      budgetPercent > 80 ? 'bg-destructive' : 'bg-accent'
                    }`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={resetAndClose}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={!prompt.trim() || budgetExceeded}
                  onClick={handleGenerate}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
              {budgetExceeded && (
                <p className="text-[10px] text-destructive text-center">
                  Monthly image generation budget reached. Adjust in Settings → AI Configuration.
                </p>
              )}
            </div>
          )}


          {/* ─── PHASE: GENERATING ─────────────────────────────────────── */}
          {phase === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-accent animate-spin" />
                <Sparkles className="h-4 w-4 text-accent absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">
                  Generating {numImages} image{numImages !== 1 ? 's' : ''}...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Using {qualityInfo.label} quality ({qualityInfo.model})
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  This may take 5-15 seconds
                </p>
              </div>
            </div>
          )}

          {/* ─── PHASE: RESULTS ────────────────────────────────────────── */}
          {phase === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {generatedImages.length} option{generatedImages.length !== 1 ? 's' : ''} generated
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Select your favorite to add to the Asset Library
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setPhase('config')}
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Edit Prompt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={handleGenerate}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className={`grid ${gridCols} gap-3`}>
                {generatedImages.map((img, i) => (
                  <button
                    key={img.assetId}
                    onClick={() => handleSelectImage(img)}
                    className={`relative rounded-lg border overflow-hidden text-left transition-all hover:shadow-md group ${
                      selectedGenImage?.assetId === img.assetId
                        ? 'border-accent ring-2 ring-accent/30'
                        : 'border-border hover:border-accent/40'
                    }`}
                  >
                    <div
                      className={`${aspectRatioClass(img.aspectRatio)} bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center max-h-52 relative overflow-hidden`}
                    >
                      {img.cdnUrl ? (
                        <img
                          src={img.cdnUrl}
                          alt={`Generated option ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      )}
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <Badge variant="secondary" className="text-[8px] px-1 py-0">
                          {img.aspectRatio}
                        </Badge>
                        <Badge variant="secondary" className="text-[8px] px-1 py-0">
                          {img.resolution}
                        </Badge>
                      </div>
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent/80 flex items-center justify-center text-accent-foreground text-[10px] font-bold">
                        {i + 1}
                      </div>
                    </div>
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Option {i + 1}</span>
                      <span className="text-[10px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── PHASE: INTAKE (Save to Library) ───────────────────────── */}
          {phase === 'intake' && selectedGenImage && (
            <div className="space-y-4">
              <button
                onClick={() => setPhase('results')}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" />
                Back to options
              </button>

              <div className="flex gap-4">
                {/* Preview */}
                <div className="w-40 shrink-0">
                  <div
                    className={`${aspectRatioClass(aspect)} bg-gradient-to-br from-muted to-muted/40 rounded-lg border border-accent flex items-center justify-center overflow-hidden`}
                  >
                    {selectedGenImage.cdnUrl ? (
                      <img
                        src={selectedGenImage.cdnUrl}
                        alt="Selected generated image"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    <Badge variant="secondary" className="text-[8px]">
                      {aspect}
                    </Badge>
                    <Badge variant="secondary" className="text-[8px]">
                      {resolution}
                    </Badge>
                    <Badge className="text-[8px] bg-accent/10 text-accent border-accent/20">
                      AI
                    </Badge>
                  </div>
                </div>

                {/* Fields */}
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Description <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[60px] text-xs"
                      placeholder="Describe what this image shows..."
                    />
                    {description.length > 0 && description.length < 10 && (
                      <p className="text-[10px] text-destructive">Minimum 10 characters</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">SEO Filename</label>
                    <Input
                      value={seoFilename}
                      onChange={(e) => setSeoFilename(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                        Alt Text
                        <button
                          onClick={() => {
                            setAltText(prompt);
                            toast.success('Alt text generated from prompt ✓');
                          }}
                          className="text-[9px] text-accent hover:underline"
                        >
                          AI Suggest
                        </button>
                      </label>
                      <Input
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">
                        Title Attribute
                      </label>
                      <Input
                        value={titleAttr}
                        onChange={(e) => setTitleAttr(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
                    <Zap className="h-3 w-3 text-accent" />
                    Source: AI Generated · Model: {qualityInfo.label} ({qualityInfo.model})
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={resetAndClose} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={description.length < 10 || saving}
                  onClick={handleSaveToLibrary}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save to Library
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}