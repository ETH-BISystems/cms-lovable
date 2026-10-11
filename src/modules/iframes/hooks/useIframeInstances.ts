import { useEffect, useState } from 'react';
import { iframeService } from '../services/iframeService';
import type { IframeInstanceDoc } from '../types';

/** Realtime list of all iframe instances for the iFrame Manager audit screen. */
export function useIframeInstances(): {
  instances: IframeInstanceDoc[];
  loading: boolean;
  error: Error | null;
} {
  const [instances, setInstances] = useState<IframeInstanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    return iframeService.subscribeToInstances(
      (data) => {
        setInstances(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
  }, []);

  return { instances, loading, error };
}
