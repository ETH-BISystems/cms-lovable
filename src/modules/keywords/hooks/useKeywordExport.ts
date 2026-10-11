import { useCallback } from 'react';
import { generateKeywordsCsv, downloadCsv } from '../services/csvExportService';
import type { KeywordOpportunity } from '../types';

export function useKeywordExport(keywords: KeywordOpportunity[]) {
  const exportCsv = useCallback(
    (selectedIds: string[]) => {
      const selected = keywords.filter((kw) => selectedIds.includes(kw.id));
      if (selected.length === 0) return;

      const csv = generateKeywordsCsv(selected);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `keywords-export-${timestamp}.csv`);
    },
    [keywords],
  );

  return { exportCsv };
}
