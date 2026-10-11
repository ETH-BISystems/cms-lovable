/**
 * Batch-apply metadata payload builder (CMS-158).
 *
 * Shared by BatchEditDialog so the "what gets sent to
 * batchApplyAssetMetadata" decision is pure and unit-testable:
 * description is trimmed, tags are trimmed/deduped, blank fields are
 * omitted (a blank description never wipes existing descriptions), and at
 * least one applicable field is required.
 */

import type { BatchApplyAssetMetadataInput, BatchTagMode } from '../types';

export interface BuildBatchApplyPayloadOptions {
  assetIds: string[];
  description: string;
  tags: string[];
  tagMode: BatchTagMode;
}

/** Trim, drop empties, dedupe (first occurrence wins). */
export function normalizeBatchTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Build the callable input, or throw an Error with a user-facing message
 * when there is nothing to apply.
 */
export function buildBatchApplyPayload({
  assetIds,
  description,
  tags,
  tagMode,
}: BuildBatchApplyPayloadOptions): BatchApplyAssetMetadataInput {
  if (assetIds.length === 0) {
    throw new Error('No assets selected');
  }

  const trimmedDescription = description.trim();
  const normalizedTags = normalizeBatchTags(tags);

  if (trimmedDescription.length === 0 && normalizedTags.length === 0) {
    throw new Error('Enter a description and/or at least one tag to apply');
  }

  return {
    assetIds,
    fields: {
      ...(trimmedDescription.length > 0 ? { description: trimmedDescription } : {}),
      ...(normalizedTags.length > 0 ? { tags: normalizedTags, tagMode } : {}),
    },
  };
}
