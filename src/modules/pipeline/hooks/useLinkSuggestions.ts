import { useState, useCallback } from 'react';
import type { LinkSuggestion } from '../types';

export function useLinkSuggestions(actorName?: string) {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const actor = actorName || 'You';

  const approve = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'Approved' as const, approvedBy: actor, approvedDate: new Date(), linkStatus: 'Pending Add' as const } : s))
    );
  }, [actor]);

  const reject = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'Rejected' as const, rejectedBy: actor, rejectedDate: new Date() } : s))
    );
  }, [actor]);

  const undo = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'Pending' as const } : s))
    );
  }, []);

  const bulkApprove = useCallback((ids: string[]) => {
    setSuggestions((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'Approved' as const, approvedBy: actor, approvedDate: new Date(), linkStatus: 'Pending Add' as const } : s))
    );
  }, [actor]);

  const bulkReject = useCallback((ids: string[]) => {
    setSuggestions((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'Rejected' as const, rejectedBy: actor, rejectedDate: new Date() } : s))
    );
  }, [actor]);

  const updateAnchor = useCallback((id: string, anchorText: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, anchorText } : s))
    );
  }, []);

  const verifySingle = useCallback((id: string) => {
    // Verification against live pages requires a Cloud Function; until it exists
    // mark approved links as awaiting addition.
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id && s.status === 'Approved' ? { ...s, linkStatus: s.linkStatus ?? ('Pending Add' as const) } : s))
    );
  }, []);

  const verifyAll = useCallback(() => {
    setVerifying(true);
    setSuggestions((prev) =>
      prev.map((s) => (s.status === 'Approved' ? { ...s, linkStatus: s.linkStatus ?? ('Pending Add' as const) } : s))
    );
    setVerifying(false);
  }, []);

  const verifyLinks = useCallback(() => {
    setLoading(true);
    // Stub: would call a Cloud Function to verify links
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const counts = {
    pending: suggestions.filter((s) => s.status === 'Pending').length,
    approved: suggestions.filter((s) => s.status === 'Approved').length,
    rejected: suggestions.filter((s) => s.status === 'Rejected').length,
  };

  return { suggestions, loading, verifying, approve, reject, undo, bulkApprove, bulkReject, updateAnchor, verifySingle, verifyAll, verifyLinks, counts };
}
