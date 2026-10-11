/**
 * Aspect-ratio helpers for the article thumbnail flow (CMS-13).
 *
 * The article thumbnail's target format is Instagram Reel portrait —
 * 1080×1920 (9:16). Other aspect ratios are allowed (the check is a
 * non-blocking warning, never a hard reject).
 */

export const REEL_PORTRAIT = { width: 1080, height: 1920 } as const;

/** Relative tolerance when comparing an image's ratio against 9:16. */
export const REEL_PORTRAIT_TOLERANCE = 0.02;

/**
 * True when width:height is 9:16 portrait within a small relative tolerance
 * (covers rounding from resized exports like 720×1280 or 1079×1920).
 */
export function isReelPortrait(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width <= 0 || height <= 0) return false;
  const target = REEL_PORTRAIT.width / REEL_PORTRAIT.height; // 9:16 = 0.5625
  const ratio = width / height;
  return Math.abs(ratio - target) / target <= REEL_PORTRAIT_TOLERANCE;
}

/**
 * Load an image in the browser to read its natural dimensions.
 * Resolves to null when the image cannot be loaded (bad URL, CORS, 404).
 */
export function loadImageDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Check whether an asset is 9:16 Reel portrait.
 *
 * Uses the stored width/height when present; device uploads store 0×0 until
 * dimensions are populated, so it falls back to loading the image
 * client-side. Returns null when the dimensions cannot be determined —
 * callers should skip the warning in that case (never block).
 */
export async function checkReelPortrait(asset: {
  width: number;
  height: number;
  cdnUrl: string;
}): Promise<boolean | null> {
  if (asset.width > 0 && asset.height > 0) {
    return isReelPortrait(asset.width, asset.height);
  }
  const dims = await loadImageDimensions(asset.cdnUrl);
  if (!dims || dims.width <= 0 || dims.height <= 0) return null;
  return isReelPortrait(dims.width, dims.height);
}
