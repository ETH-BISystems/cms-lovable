import { formatCompact } from '../../analytics/format';

/**
 * Traffic & Market formatting helpers — composes the analytics `format.ts`
 * primitives with the traffic-specific units (durations, 0–1 shares, deltas).
 */

/** Seconds → "m:ss" clock string: 272 → "4:32". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** 0–1 share → one-decimal percent: 0.123 → "12.3%". */
export function formatShare(share: number | null | undefined): string {
  if (share === null || share === undefined || !Number.isFinite(share)) return '—';
  return `${(share * 100).toFixed(1)}%`;
}

/** Signed one-decimal delta with a true minus sign: 4.2 → "+4.2%", -1.3 → "−1.3%". */
export function formatDeltaPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value).toFixed(1);
  if (value > 0) return `+${abs}%`;
  if (value < 0) return `−${abs}%`;
  return '0.0%';
}

// Re-exported so traffic-market files have one import site for figures.
export { formatCompact };
