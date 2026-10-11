// MOCK-ONLY — replaces Firestore onSnapshot subscriptions with the in-memory
// settings store. Same exported names/signatures as production.
//
// production:
//   subscribeToSettings — onSnapshot(doc(db, 'settings', settingId), ...)
//   subscribeToAuditLog — onSnapshot(query(collection(db, 'audit-log'), ...), ...)

import type { SettingId, AuditLogEntry, AuditLogFilters } from '../types';
import { getSettingsDoc, onSettingsDoc, getAuditLog, onAuditLogChange } from './settingsStore';

export function subscribeToSettings<T>(
  settingId: SettingId,
  callback: (data: T | null) => void,
  onError?: (error: Error) => void
) {
  try {
    // Emit current state once, then re-emit on every mutation (mirrors
    // Firestore's initial-snapshot + live-update behaviour).
    callback(getSettingsDoc(settingId) as T | null);
    const unsubscribe = onSettingsDoc(settingId, (data) => callback(data as T | null));
    return unsubscribe;
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error('Settings subscription failed'));
    return () => {};
  }
}

export function subscribeToAuditLog(
  filters: AuditLogFilters,
  pageSize: number,
  callback: (entries: AuditLogEntry[]) => void,
  onError?: (error: Error) => void
) {
  const applyFilters = (): AuditLogEntry[] => {
    let entries = getAuditLog();
    if (filters.userId) entries = entries.filter((e) => e.userId === filters.userId);
    if (filters.actionType) entries = entries.filter((e) => e.actionType === filters.actionType);
    if (filters.dateFrom) entries = entries.filter((e) => e.timestamp.toMillis() >= filters.dateFrom!.getTime());
    if (filters.dateTo) entries = entries.filter((e) => e.timestamp.toMillis() <= filters.dateTo!.getTime());
    return entries.slice(0, pageSize);
  };

  try {
    callback(applyFilters());
    const unsubscribe = onAuditLogChange(() => callback(applyFilters()));
    return unsubscribe;
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error('Audit log subscription failed'));
    return () => {};
  }
}
