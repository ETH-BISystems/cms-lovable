/**
 * Webflow Service
 *
 * Client-side helpers for Webflow sync operations.
 * Actual API calls happen in Cloud Functions for security.
 */

import type { WebflowSyncStatus } from '../types';

/**
 * Get Webflow sync status color (for UI display)
 */
export function getWebflowSyncStatusColor(
  status: WebflowSyncStatus
): 'default' | 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'Synced':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Failed':
      return 'destructive';
    case 'Not Published':
    case 'N/A':
    default:
      return 'default';
  }
}

/**
 * Get Webflow sync status icon
 */
export function getWebflowSyncStatusIcon(status: WebflowSyncStatus): string {
  switch (status) {
    case 'Synced':
      return '✓';
    case 'Pending':
      return '⏳';
    case 'Failed':
      return '✗';
    case 'Not Published':
      return '○';
    case 'N/A':
    default:
      return '—';
  }
}

/**
 * Format last synced timestamp
 */
export function formatLastSynced(lastSynced: Date | null): string {
  if (!lastSynced) {
    return 'Never';
  }

  const now = new Date();
  const diff = now.getTime() - lastSynced.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Check if asset can be synced to Webflow
 */
export interface CanSyncResult {
  canSync: boolean;
  reason?: string;
}

export function canSyncToWebflow(asset: {
  status: string;
  cdnUrl: string;
  webflowSync: WebflowSyncStatus;
}): CanSyncResult {
  // Must be active
  if (asset.status !== 'active') {
    return {
      canSync: false,
      reason: 'Asset must be active to sync',
    };
  }

  // Must have CDN URL
  if (!asset.cdnUrl) {
    return {
      canSync: false,
      reason: 'Asset must have a CDN URL',
    };
  }

  // Cannot sync if already synced
  if (asset.webflowSync === 'Synced') {
    return {
      canSync: false,
      reason: 'Asset is already synced',
    };
  }

  // Cannot sync if pending
  if (asset.webflowSync === 'Pending') {
    return {
      canSync: false,
      reason: 'Sync already in progress',
    };
  }

  return { canSync: true };
}

/**
 * Estimate sync time based on batch size
 */
export function estimateSyncTime(assetCount: number): string {
  // Rate limit: 60 requests/minute
  const minutes = Math.ceil(assetCount / 60);

  if (minutes === 1) {
    return 'Less than 1 minute';
  } else if (minutes < 60) {
    return `Approximately ${minutes} minutes`;
  } else {
    const hours = Math.ceil(minutes / 60);
    return `Approximately ${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

/**
 * Validate bulk sync selection
 */
export interface BulkSyncValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBulkSync(assets: any[]): BulkSyncValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (assets.length === 0) {
    errors.push('No assets selected');
  }

  if (assets.length > 50) {
    errors.push('Maximum 50 assets per bulk sync');
  }

  const inactiveCount = assets.filter((a) => a.status !== 'active').length;
  if (inactiveCount > 0) {
    warnings.push(`${inactiveCount} asset${inactiveCount > 1 ? 's are' : ' is'} not active`);
  }

  const alreadySynced = assets.filter((a) => a.webflowSync === 'Synced').length;
  if (alreadySynced > 0) {
    warnings.push(`${alreadySynced} asset${alreadySynced > 1 ? 's are' : ' is'} already synced`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
