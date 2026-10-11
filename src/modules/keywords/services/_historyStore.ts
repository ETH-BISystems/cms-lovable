/**
 * MOCK-ONLY — in-memory search-history store shared by every keywords-module
 * service. Production persists one snapshot per search via the
 * trafficMarket_history* callables (Firestore + Storage); here every mocked
 * search appends to this store so History panels / history-first gates behave
 * exactly like production.
 *
 * production: trafficMarket_historyList / trafficMarket_historyGet /
 *             trafficMarket_historyDelete (Firestore collection
 *             `seo_search_history` + payload objects in Cloud Storage)
 */

import { mockId } from '@/services/_delay';
import type {
  HistoryEntryMeta,
  HistoryGetResult,
  HistoryListInput,
  SeoHistoryPage,
} from '../types/trafficMarket';

interface StoredSnapshot {
  entry: HistoryEntryMeta;
  payload: unknown;
}

const snapshots: StoredSnapshot[] = [];

function estimateSize(payload: unknown): number {
  try {
    return JSON.stringify(payload).length;
  } catch {
    return 4096;
  }
}

function countRows(payload: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (Array.isArray(value)) counts[key] = value.length;
    }
  }
  return counts;
}

export function addHistorySnapshot(input: {
  page: SeoHistoryPage;
  section: string;
  domains: string[];
  channel?: HistoryEntryMeta['channel'];
  region?: string;
  provider: HistoryEntryMeta['provider'];
  payload: unknown;
  /** Backdate the entry (seed data only). */
  createdAt?: string;
}): HistoryEntryMeta {
  const entry: HistoryEntryMeta = {
    id: mockId('hist'),
    page: input.page,
    section: input.section,
    createdAt: input.createdAt ?? new Date().toISOString(),
    createdBy: 'mock-admin',
    createdByName: 'Admin User',
    domains: input.domains,
    region: input.region ?? 'us',
    channel: input.channel ?? null,
    provider: input.provider,
    resultCounts: countRows(input.payload),
    sizeBytes: estimateSize(input.payload),
  };
  snapshots.unshift({ entry, payload: input.payload });
  // Keep the store bounded like the production retention policy.
  if (snapshots.length > 400) snapshots.length = 400;
  return entry;
}

export function listHistory(input: HistoryListInput): { entries: HistoryEntryMeta[]; nextCursor: string | null } {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100));
  const start = input.cursor ? Number.parseInt(input.cursor, 10) || 0 : 0;

  const filtered = snapshots
    .map(s => s.entry)
    .filter(e => e.page === input.page)
    .filter(e => !input.domain || e.domains.some(d => d.includes(input.domain!.toLowerCase())))
    .filter(e => !input.from || e.createdAt >= input.from)
    .filter(e => !input.to || e.createdAt <= input.to)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const entries = filtered.slice(start, start + limit);
  const next = start + limit;
  return { entries, nextCursor: next < filtered.length ? String(next) : null };
}

export function getHistory(id: string): HistoryGetResult | null {
  const found = snapshots.find(s => s.entry.id === id);
  return found ? { entry: found.entry, payload: found.payload } : null;
}

export function deleteHistory(id: string): boolean {
  const idx = snapshots.findIndex(s => s.entry.id === id);
  if (idx === -1) return false;
  snapshots.splice(idx, 1);
  return true;
}
