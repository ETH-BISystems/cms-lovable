import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToAuditLog } from '../services/firestoreSubscriptions';
import { getAuditLog } from '../services/settingsStore';
import type { AuditLogEntry, AuditLogFilters } from '../types';

const PAGE_SIZE = 20;

export function useAuditLog(filters: AuditLogFilters) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  // Cursor: timestamp (ms) of the last loaded entry — mirrors the production
  // startAfter(lastEntry.timestamp) cursor without Firestore snapshots.
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setEntries([]);
    setHasMore(true);
    lastTsRef.current = null;

    const unsubscribe = subscribeToAuditLog(
      filters,
      PAGE_SIZE + 1,
      (results) => {
        if (results.length > PAGE_SIZE) {
          setEntries(results.slice(0, PAGE_SIZE));
          setHasMore(true);
          lastTsRef.current = results[PAGE_SIZE - 1]?.timestamp.toMillis() ?? null;
        } else {
          setEntries(results);
          setHasMore(results.length === PAGE_SIZE);
          lastTsRef.current = results[results.length - 1]?.timestamp.toMillis() ?? null;
        }
        setLoading(false);
      },
      (err) => {
        console.error('Audit log subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.userId, filters.actionType, filters.dateFrom, filters.dateTo]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || entries.length === 0) return;

    setLoading(true);

    try {
      // production: getDocs(query(collection(db, 'audit-log'),
      //   orderBy('timestamp','desc'), startAfter(lastEntry.timestamp), limit(PAGE_SIZE+1)))
      let all = getAuditLog();
      if (filters.userId) all = all.filter((e) => e.userId === filters.userId);
      if (filters.actionType) all = all.filter((e) => e.actionType === filters.actionType);
      if (filters.dateFrom) all = all.filter((e) => e.timestamp.toMillis() >= filters.dateFrom!.getTime());
      if (filters.dateTo) all = all.filter((e) => e.timestamp.toMillis() <= filters.dateTo!.getTime());

      const cursor = lastTsRef.current;
      const afterCursor = cursor != null ? all.filter((e) => e.timestamp.toMillis() < cursor) : all;
      const newEntries = afterCursor.slice(0, PAGE_SIZE + 1);

      if (newEntries.length > PAGE_SIZE) {
        setEntries((prev) => [...prev, ...newEntries.slice(0, PAGE_SIZE)]);
        setHasMore(true);
        lastTsRef.current = newEntries[PAGE_SIZE - 1]?.timestamp.toMillis() ?? cursor;
      } else {
        setEntries((prev) => [...prev, ...newEntries]);
        setHasMore(newEntries.length === PAGE_SIZE);
        lastTsRef.current = newEntries[newEntries.length - 1]?.timestamp.toMillis() ?? cursor;
      }
    } catch (err) {
      console.error('Error loading more audit log entries:', err);
    } finally {
      setLoading(false);
    }
  }, [entries, hasMore, loading, filters.userId, filters.actionType, filters.dateFrom, filters.dateTo]);

  return { entries, loading, hasMore, loadMore };
}
