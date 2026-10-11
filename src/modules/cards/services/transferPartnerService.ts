// MOCK — in-memory transfer-partner service (ported from the Firestore-backed
// original).
//
// production: reads used `onSnapshot(collection(db, 'transfer_partner_matrix'))`;
// mutations were callable Cloud Functions (`updateTransferPartner`,
// `deleteTransferPartner`, `scrapeTransferPartners`, `addTransferPartner`,
// `verifyTransferPartners`, `seedTransferPartnerMatrix`, `alertTeamTransfer`,
// `managePointSale`). Callable names are preserved in comments at each seam.
// The in-memory store re-emits to subscribers after each mutation, mirroring
// onSnapshot. `exportMatrixCsv` is pure client-side code — unchanged.

import { delay } from '@/services/_delay';
import type {
  TransferPartnerDocument,
  UpdateTransferPartnerInput,
  AddTransferPartnerInput,
  ManagePointSaleInput,
  CardProgram,
} from '../types';
import {
  onTransferPartnerStoreChange,
  getPartners,
  getTpScrapeStatus,
  storeUpdatePartner,
  storeDeletePartner,
  storeAddPartner,
  storeScrapePartners,
  storeVerifyPartners,
  storeSeedMatrix,
  storeManagePointSale,
} from './mockTransferPartnerStore';
import type { Timestamp } from '@/services/timestamp';

export const transferPartnerService = {
  // production: onSnapshot(collection(db, 'transfer_partner_matrix'))
  subscribeToPartners(
    onData: (partners: TransferPartnerDocument[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getPartners());
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 60);
    const unsub = onTransferPartnerStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // production: onSnapshot(doc(db, 'settings', 'tpMatrixScrape')) — the
  // "last scraped" status line, written by the scrapeTransferPartners callable.
  subscribeToScrapeStatus(
    onData: (status: { lastRunAt?: Timestamp; valuationAsOf?: string } | null) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getTpScrapeStatus());
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 40);
    const unsub = onTransferPartnerStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // production: httpsCallable(functions, 'updateTransferPartner')
  async updatePartner(input: UpdateTransferPartnerInput): Promise<void> {
    await delay(250);
    storeUpdatePartner(input.partnerId, { ...input.fields });
  },

  // production: httpsCallable(functions, 'deleteTransferPartner')
  async deletePartner(partnerId: string): Promise<{ success: boolean }> {
    await delay(250);
    storeDeletePartner(partnerId);
    return { success: true };
  },

  /** Scrape Now — re-pull the TPG transfer-partners tables into the matrix.
   * production: httpsCallable(functions, 'scrapeTransferPartners') */
  async scrapePartners(): Promise<TpScrapeSummary> {
    await delay(2200);
    return storeScrapePartners();
  },

  // production: httpsCallable(functions, 'addTransferPartner')
  async addPartner(input: AddTransferPartnerInput): Promise<{ id: string }> {
    await delay(300);
    const id = storeAddPartner({ ...input });
    return { id };
  },

  // production: httpsCallable(functions, 'verifyTransferPartners')
  async verifyPartners(partnerId?: string): Promise<{ verified: number; verifiedAt: string; checkedBy: string }> {
    await delay(500);
    return storeVerifyPartners(partnerId);
  },

  // production: httpsCallable(functions, 'seedTransferPartnerMatrix')
  async seedMatrix(overwrite = false): Promise<{ created: number; updated: number; skipped: number; total: number }> {
    await delay(800);
    return storeSeedMatrix(overwrite);
  },

  // production: httpsCallable(functions, 'alertTeamTransfer')
  async alertTeam(input: { kind: 'transfer-bonus' | 'point-sale'; title: string; detail?: string }): Promise<void> {
    await delay(300);
    void input;
  },

  // production: httpsCallable(functions, 'managePointSale')
  async managePointSale(input: ManagePointSaleInput): Promise<{ id: string }> {
    await delay(300);
    const id = storeManagePointSale(input);
    return { id };
  },
};

// ─── TPG scrape ──────────────────────────────────────────────────────────────

/** Result of the scrapeTransferPartners callable (TPG matrix scrape). */
export interface TpScrapeSummary {
  matched: number;
  updated: number;
  cellsChanged: number;
  created: string[];
  missingFromTpg: string[];
  valuationAsOf: string;
}

/** Client-side CSV export of the matrix — mirrors the visible columns. */
export function exportMatrixCsv(
  partners: TransferPartnerDocument[],
  visiblePrograms: CardProgram[],
  programLabels: Record<CardProgram, string>
): void {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = [
    'Partner', 'Loyalty Program', 'Type', 'Alliance', 'Award Release (days)', 'Release Pattern',
    ...visiblePrograms.flatMap((p) => [`${programLabels[p]} Ratio`, `${programLabels[p]} Speed`, `${programLabels[p]} Bonus %`]),
  ];
  const rows = partners.map((tp) => [
    esc(tp.name), esc(tp.loyaltyProgram), esc(tp.type), esc(tp.alliance),
    esc(tp.awardReleaseDays ?? ''), esc(tp.awardReleasePattern ?? ''),
    ...visiblePrograms.flatMap((p) => {
      const entry = tp.programs?.[p];
      return [esc(entry?.ratioDisplay || entry?.ratio || ''), esc(entry?.speed ?? ''), esc(entry?.bonusPercent ?? '')];
    }),
  ]);
  const csv = [header.map(esc).join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `transfer-partner-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
