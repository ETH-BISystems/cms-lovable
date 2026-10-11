/**
 * AI Service (MOCK)
 *
 * Client-side helpers for AI-powered features — all pure functions are
 * unchanged from production. The generateAIImage callable is mocked by the
 * in-memory implementation in assetService (production callable name kept
 * in the comment there).
 */

import { generateAIImage as mockGenerateAIImage } from './assetService';
import type {
  AISuggestions,
  GenerateAIImageInput,
  GenerateAIImageResult,
  QualityTier,
  Resolution,
} from '../types';

/**
 * Validate AI suggestions before submission
 */
export interface AIValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAISuggestions(suggestions: AISuggestions): AIValidationResult {
  const errors: string[] = [];

  // Description: 10-500 characters
  if (suggestions.description.length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  if (suggestions.description.length > 500) {
    errors.push('Description must not exceed 500 characters');
  }

  // Alt text: 10-150 characters (SEO best practice)
  if (suggestions.altText.length < 10) {
    errors.push('Alt text must be at least 10 characters');
  }
  if (suggestions.altText.length > 150) {
    errors.push('Alt text must not exceed 150 characters');
  }

  // Title attribute: 5-100 characters
  if (suggestions.titleAttribute.length < 5) {
    errors.push('Title attribute must be at least 5 characters');
  }
  if (suggestions.titleAttribute.length > 100) {
    errors.push('Title attribute must not exceed 100 characters');
  }

  // Filename: must be valid and not empty
  if (!suggestions.seoFilename || suggestions.seoFilename.length === 0) {
    errors.push('SEO filename cannot be empty');
  }
  if (suggestions.seoFilename.includes('/') || suggestions.seoFilename.includes('\\')) {
    errors.push('Filename cannot contain path separators');
  }

  // Tags: 0-20 tags
  if (suggestions.tags.length > 20) {
    errors.push('Maximum 20 tags allowed');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate SEO score client-side (matches server-side calculation)
 */
export function calculateSEOScore(
  filename: string,
  altText: string,
  title: string
): number {
  let score = 0;

  // Filename (30 points)
  if (filename.includes('-')) {
    score += 30;
  } else if (filename.includes('_')) {
    score += 15;
  }

  // Alt text (40 points)
  const altLength = altText.length;
  if (altLength >= 50 && altLength <= 120) {
    score += 40;
  } else if (altLength > 0 && altLength < 50) {
    score += 20;
  } else if (altLength > 120) {
    score += 20;
  }

  // Title (30 points)
  if (title && title.length > 0) {
    score += 30;
  }

  return score;
}

/**
 * Get SEO score color (for UI display)
 */
export function getSEOScoreColor(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 80) {
    return 'success';
  } else if (score >= 50) {
    return 'warning';
  } else {
    return 'destructive';
  }
}

/**
 * Get SEO score label
 */
export function getSEOScoreLabel(score: number): string {
  if (score >= 80) {
    return 'Excellent';
  } else if (score >= 50) {
    return 'Good';
  } else if (score >= 30) {
    return 'Fair';
  } else {
    return 'Poor';
  }
}

/**
 * Generate SEO-friendly filename from description
 */
export function generateSEOFilename(description: string): string {
  return description
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .substring(0, 50); // Limit length
}

/**
 * Format taxonomy for display
 */
export function formatTaxonomyForDisplay(taxonomy: any): string[] {
  const items: string[] = [];

  if (taxonomy.airlines && taxonomy.airlines.length > 0) {
    items.push(`Airlines: ${taxonomy.airlines.join(', ')}`);
  }

  if (taxonomy.hotels && taxonomy.hotels.length > 0) {
    items.push(`Hotels: ${taxonomy.hotels.join(', ')}`);
  }

  if (taxonomy.cabinClass) {
    items.push(`Cabin: ${taxonomy.cabinClass}`);
  }

  if (taxonomy.destinations && taxonomy.destinations.length > 0) {
    const destinations = taxonomy.destinations
      .map((d: any) => `${d.city}, ${d.country}`)
      .join('; ');
    items.push(`Destinations: ${destinations}`);
  }

  if (taxonomy.creditCards && taxonomy.creditCards.length > 0) {
    items.push(`Cards: ${taxonomy.creditCards.join(', ')}`);
  }

  return items;
}

// ─── Cost Estimation Constants (mirrors backend) ──────────────────────────────

const QUALITY_TIER_BASE_COST: Record<QualityTier, number> = {
  fast: 0.05,
  standard: 0.02,
  pro: 0.13,
};

const RESOLUTION_COST_MULTIPLIER: Record<Resolution, number> = {
  '1K': 1.0,
  '2K': 1.5,
  '4K': 3.0,
};

/**
 * Calculate the estimated generation cost client-side.
 *
 * Mirrors the backend `calculateGenerationCost` logic so the UI
 * can display cost estimates before the user triggers generation.
 */
export function estimateGenerationCost(
  qualityTier: QualityTier = 'fast',
  resolution: Resolution = '1K',
  numImages: number = 4
): { costPerImage: number; totalCost: number } {
  // 4K forces Pro tier
  const effectiveTier = resolution === '4K' ? 'pro' : qualityTier;
  const baseCost = QUALITY_TIER_BASE_COST[effectiveTier];
  const multiplier = RESOLUTION_COST_MULTIPLIER[resolution];
  const costPerImage = baseCost * multiplier;
  const totalCost = costPerImage * numImages;
  return { costPerImage, totalCost };
}

/**
 * Generate AI image via Cloud Function.
 *
 * production: httpsCallable(functions, 'generateAIImage') — delegated to the
 * in-memory mock in assetService, which registers the generated drafts in
 * the asset store so the library updates live.
 */
export async function generateAIImage(
  input: GenerateAIImageInput
): Promise<GenerateAIImageResult> {
  return mockGenerateAIImage(input);
}

/**
 * Map a failed Smart Tag callable error to a human-readable reason.
 *
 * The raw HttpsError code from `startAIIntake` distinguishes permission
 * problems, missing API-key configuration, and transient AI outages —
 * surfacing the real reason beats the old bare "failed" toast.
 */
export function describeSmartTagError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code || '';
  const message = error instanceof Error ? error.message : '';

  switch (code) {
    case 'functions/unauthenticated':
      return 'Your session expired — sign in again and retry.';
    case 'functions/permission-denied':
      return 'You don’t have permission to run Smart Tag.';
    case 'functions/not-found':
      return 'This asset no longer exists — refresh and try again.';
    case 'functions/failed-precondition':
      return 'Smart Tag isn’t configured yet — an admin needs to set the AI API key.';
    case 'functions/invalid-argument':
      return message || 'Smart Tag was called with invalid data.';
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
    case 'functions/resource-exhausted':
      return 'The tagging service is temporarily unavailable — try again in a moment.';
    default:
      return message || 'Unexpected error running Smart Tag.';
  }
}
