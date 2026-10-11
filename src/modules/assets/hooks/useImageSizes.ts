/**
 * useImageSizes Hook
 *
 * Manages the image size options for AI image generation:
 * - A hardcoded list of default sizes (cannot be deleted)
 * - Team-shared custom sizes from the `image_sizes` Firestore collection
 *   (live subscription; mutations via addImageSize/removeImageSize
 *   Cloud Functions), so sizes added by one user appear for everyone
 * - The currently selected size (first size selected by default)
 *
 * CMS-71: OpenAI's image API (gpt-image-2) only accepts 1024x1024,
 * 1536x1024, and 1024x1536 — anything smaller is rejected with "below
 * minimum pixel budget" and any other dimensions are rejected outright.
 * The default is 1024x1024, and sizes the API rejects are neither offered
 * nor accepted (legacy team-shared sizes like 512x512 are filtered out).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  subscribeToImageSizes,
  addImageSize,
  removeImageSize,
} from '../services/imageSizeService';
import type { ImageSize } from '../types';

/** The only dimensions OpenAI's image API accepts for edits. */
export const OPENAI_ALLOWED_SIZES: ReadonlyArray<Pick<ImageSize, 'width' | 'height'>> = [
  { width: 1024, height: 1024 },
  { width: 1536, height: 1024 },
  { width: 1024, height: 1536 },
];

export const DEFAULT_IMAGE_SIZES: ImageSize[] = [
  { width: 1024, height: 1024, isCustom: false },
  { width: 1536, height: 1024, isCustom: false },
  // Portrait — the article/Instagram-Reel-thumbnail direction (CMS-13)
  { width: 1024, height: 1536, isCustom: false },
];

export const MIN_DIMENSION = 64;
export const MAX_DIMENSION = 4096;

export function imageSizeKey(size: Pick<ImageSize, 'width' | 'height'>): string {
  return `${size.width}x${size.height}`;
}

export function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_DIMENSION && value <= MAX_DIMENSION;
}

/** True only for the exact dimensions the OpenAI image API accepts. */
export function isOpenAIAllowedSize(size: Pick<ImageSize, 'width' | 'height'>): boolean {
  return OPENAI_ALLOWED_SIZES.some((s) => s.width === size.width && s.height === size.height);
}

export interface UseImageSizesResult {
  /** Default sizes followed by team-shared custom sizes */
  sizes: ImageSize[];
  /** Currently selected size (never null — defaults to the first size) */
  selectedSize: ImageSize;
  /** Error from the sizes subscription, if any (defaults still work) */
  sizesError: string | null;
  /** Select a size by its "WxH" key */
  selectSize: (key: string) => void;
  /** Add a custom size shared with the whole team; resolves to an error message or null on success. Selects the new size. */
  addCustomSize: (width: number, height: number) => Promise<string | null>;
  /** Remove a custom size for the whole team (defaults cannot be removed) */
  removeCustomSize: (key: string) => Promise<void>;
}

export function useImageSizes(): UseImageSizesResult {
  const [customSizes, setCustomSizes] = useState<ImageSize[]>([]);
  const [sizesError, setSizesError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(
    imageSizeKey(DEFAULT_IMAGE_SIZES[0])
  );

  useEffect(() => {
    return subscribeToImageSizes(
      (remoteSizes) => {
        // Drop any remote size that duplicates a default so keys stay unique,
        // and drop sizes the OpenAI API rejects (CMS-71) — legacy team-shared
        // entries like 512x512 must never be selectable again.
        setCustomSizes(
          remoteSizes.filter(
            (s) =>
              isOpenAIAllowedSize(s) &&
              !DEFAULT_IMAGE_SIZES.some((d) => imageSizeKey(d) === imageSizeKey(s))
          )
        );
        setSizesError(null);
      },
      (error) => setSizesError(error.message)
    );
  }, []);

  const sizes = useMemo(
    () => [...DEFAULT_IMAGE_SIZES, ...customSizes],
    [customSizes]
  );

  // Falls back to the first default when the selected size was removed
  // (possibly by another user via the shared subscription)
  const selectedSize = useMemo(
    () => sizes.find((s) => imageSizeKey(s) === selectedKey) ?? sizes[0],
    [sizes, selectedKey]
  );

  const selectSize = useCallback(
    (key: string) => {
      if (sizes.some((s) => imageSizeKey(s) === key)) {
        setSelectedKey(key);
      }
    },
    [sizes]
  );

  const addCustomSize = useCallback(
    async (width: number, height: number): Promise<string | null> => {
      if (!isValidDimension(width) || !isValidDimension(height)) {
        return `Width and height must be whole numbers between ${MIN_DIMENSION} and ${MAX_DIMENSION}`;
      }
      // CMS-71: the OpenAI image API rejects every other size — don't let a
      // team-shared size exist that can only fail at generation time.
      if (!isOpenAIAllowedSize({ width, height })) {
        return 'OpenAI only supports 1024 × 1024, 1536 × 1024, and 1024 × 1536';
      }
      const key = imageSizeKey({ width, height });
      if (sizes.some((s) => imageSizeKey(s) === key)) {
        setSelectedKey(key);
        return null;
      }
      try {
        await addImageSize(width, height);
      } catch (error: any) {
        return error.message || 'Failed to add size';
      }
      // Optimistic: the snapshot will confirm shortly
      setCustomSizes((prev) =>
        prev.some((s) => imageSizeKey(s) === key)
          ? prev
          : [...prev, { width, height, isCustom: true }]
      );
      setSelectedKey(key);
      return null;
    },
    [sizes]
  );

  const removeCustomSize = useCallback(
    async (key: string) => {
      const size = customSizes.find((s) => imageSizeKey(s) === key);
      if (!size) return; // not a custom size — defaults cannot be removed
      // Optimistic: on Cloud Function failure the snapshot restores the size
      setCustomSizes((prev) => prev.filter((s) => imageSizeKey(s) !== key));
      if (selectedKey === key) {
        setSelectedKey(imageSizeKey(DEFAULT_IMAGE_SIZES[0]));
      }
      try {
        await removeImageSize(size.width, size.height);
      } catch (error) {
        console.error('Failed to remove image size:', error);
      }
    },
    [customSizes, selectedKey]
  );

  return { sizes, selectedSize, sizesError, selectSize, addCustomSize, removeCustomSize };
}
