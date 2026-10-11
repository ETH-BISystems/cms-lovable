import { useState, useCallback } from 'react';
import type { PositionFilters, AuditFilters, AuditHistoryFilters, AIOverviewFilters, IssueFilters, SchemaFilters, BacklinkFilters, RedirectFilters } from '../types';

const POSITION_DEFAULTS: PositionFilters = { positionRange: 'All', changeType: 'all', volumeMin: '', keywordSearch: '' };
const AUDIT_DEFAULTS: AuditFilters = { scoreRange: 'All', severity: 'All', topicCluster: '', author: '', search: '' };
const AUDIT_HISTORY_DEFAULTS: AuditHistoryFilters = { type: 'All', triggeredBy: '' };
const AI_OVERVIEW_DEFAULTS: AIOverviewFilters = { hasAIOverview: 'All', ethCited: 'All', volumeMin: '', ctrImpact: 'All' };
const ISSUE_DEFAULTS: IssueFilters = { severity: 'All' };
const SCHEMA_DEFAULTS: SchemaFilters = { search: '', schemaType: 'All', validationStatus: 'All' };
const BACKLINK_DEFAULTS: BacklinkFilters = { status: 'All', linkType: 'All' };
const REDIRECT_DEFAULTS: RedirectFilters = { code: 'All', status: 'All', chainType: 'All' };

export function useSEOFilters() {
  const [positionFilters, setPositionFiltersState] = useState<PositionFilters>(POSITION_DEFAULTS);
  const [auditFilters, setAuditFiltersState] = useState<AuditFilters>(AUDIT_DEFAULTS);
  const [auditHistoryFilters, setAuditHistoryFiltersState] = useState<AuditHistoryFilters>(AUDIT_HISTORY_DEFAULTS);
  const [aiOverviewFilters, setAIOverviewFiltersState] = useState<AIOverviewFilters>(AI_OVERVIEW_DEFAULTS);
  const [issueFilters, setIssueFiltersState] = useState<IssueFilters>(ISSUE_DEFAULTS);
  const [schemaFilters, setSchemaFiltersState] = useState<SchemaFilters>(SCHEMA_DEFAULTS);
  const [backlinkFilters, setBacklinkFiltersState] = useState<BacklinkFilters>(BACKLINK_DEFAULTS);
  const [redirectFilters, setRedirectFiltersState] = useState<RedirectFilters>(REDIRECT_DEFAULTS);

  const setPositionFilters = useCallback((f: Partial<PositionFilters>) => setPositionFiltersState(p => ({ ...p, ...f })), []);
  const setAuditFilters = useCallback((f: Partial<AuditFilters>) => setAuditFiltersState(p => ({ ...p, ...f })), []);
  const setAuditHistoryFilters = useCallback((f: Partial<AuditHistoryFilters>) => setAuditHistoryFiltersState(p => ({ ...p, ...f })), []);
  const setAIOverviewFilters = useCallback((f: Partial<AIOverviewFilters>) => setAIOverviewFiltersState(p => ({ ...p, ...f })), []);
  const setIssueFilters = useCallback((f: Partial<IssueFilters>) => setIssueFiltersState(p => ({ ...p, ...f })), []);
  const setSchemaFilters = useCallback((f: Partial<SchemaFilters>) => setSchemaFiltersState(p => ({ ...p, ...f })), []);
  const setBacklinkFilters = useCallback((f: Partial<BacklinkFilters>) => setBacklinkFiltersState(p => ({ ...p, ...f })), []);
  const setRedirectFilters = useCallback((f: Partial<RedirectFilters>) => setRedirectFiltersState(p => ({ ...p, ...f })), []);

  const resetAllFilters = useCallback(() => {
    setPositionFiltersState(POSITION_DEFAULTS);
    setAuditFiltersState(AUDIT_DEFAULTS);
    setAuditHistoryFiltersState(AUDIT_HISTORY_DEFAULTS);
    setAIOverviewFiltersState(AI_OVERVIEW_DEFAULTS);
    setIssueFiltersState(ISSUE_DEFAULTS);
    setSchemaFiltersState(SCHEMA_DEFAULTS);
    setBacklinkFiltersState(BACKLINK_DEFAULTS);
    setRedirectFiltersState(REDIRECT_DEFAULTS);
  }, []);

  return {
    positionFilters, setPositionFilters,
    auditFilters, setAuditFilters,
    auditHistoryFilters, setAuditHistoryFilters,
    aiOverviewFilters, setAIOverviewFilters,
    issueFilters, setIssueFilters,
    schemaFilters, setSchemaFilters,
    backlinkFilters, setBacklinkFilters,
    redirectFilters, setRedirectFilters,
    resetAllFilters,
  };
}
