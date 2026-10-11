import { useState, useEffect, useCallback } from 'react';
import { subscribeAuditConfig } from '../services/auditConfigService';
import { callUpdateAuditSchedule } from '../services/seoCallables';
import type { SiteId, AuditConfigDoc, UpdateAuditScheduleInput } from '../types';

export function useAuditSchedule(siteId: SiteId = 'eth') {
  const [config, setConfig] = useState<AuditConfigDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeAuditConfig(siteId, (data) => {
      setConfig(data);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [siteId]);

  const saveConfig = useCallback(
    async (input: Omit<UpdateAuditScheduleInput, 'siteId'>) => {
      await callUpdateAuditSchedule({ siteId, ...input });
    },
    [siteId]
  );

  return {
    config,
    loading,
    error,
    saveConfig,
  };
}
