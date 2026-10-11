/**
 * useAssetDetail Hook
 *
 * Subscribe to single asset by ID.
 * Returns loading, error, and asset data.
 */

import { useState, useEffect } from 'react';
import { subscribeToAsset } from '../services/assetService';
import type { AssetDocument } from '../types';

export interface UseAssetDetailResult {
  asset: AssetDocument | null;
  loading: boolean;
  error: Error | null;
  notFound: boolean;
}

export function useAssetDetail(assetId: string | null): UseAssetDetailResult {
  const [asset, setAsset] = useState<AssetDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      setLoading(false);
      setNotFound(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    const unsubscribe = subscribeToAsset(
      assetId,
      (data) => {
        setAsset(data);
        setLoading(false);
        setNotFound(data === null);
      },
      (err) => {
        console.error('useAssetDetail error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [assetId]);

  return {
    asset,
    loading,
    error,
    notFound,
  };
}
