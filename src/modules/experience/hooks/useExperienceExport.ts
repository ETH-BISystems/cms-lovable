import { useState } from 'react';
import { callExportToNotebookLM } from '../services/experienceService';
import type { UseExperienceExportReturn } from '../types';

/**
 * Hook to manage NotebookLM export operations.
 */
export function useExperienceExport(): UseExperienceExportReturn {
  const [exporting, setExporting] = useState(false);

  const exportSelected = async (
    ids: string[],
    format: 'structured' | 'raw'
  ): Promise<string> => {
    setExporting(true);
    try {
      const result = await callExportToNotebookLM(ids, format);
      return result.downloadUrl;
    } finally {
      setExporting(false);
    }
  };

  const exportAllPending = async (
    format: 'structured' | 'raw'
  ): Promise<string> => {
    setExporting(true);
    try {
      const result = await callExportToNotebookLM([], format);
      return result.downloadUrl;
    } finally {
      setExporting(false);
    }
  };

  return { exporting, exportSelected, exportAllPending };
}
