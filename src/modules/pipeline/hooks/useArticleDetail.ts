import { useState, useCallback } from 'react';

export function useArticleDetail() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isRefreshContext, setIsRefreshContext] = useState(false);
  // CMS-153: undefined means "no explicit tab requested" — the panel then
  // lands on the article stage's working surface (STAGE_DEFAULT_TAB).
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);

  const openPanel = useCallback((articleId: string, refreshContext = false, tab?: string) => {
    setSelectedArticleId(articleId);
    setIsRefreshContext(refreshContext);
    setInitialTab(tab);
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setSelectedArticleId(null);
    setIsRefreshContext(false);
    setInitialTab(undefined);
  }, []);

  return { isOpen, selectedArticleId, isRefreshContext, initialTab, openPanel, closePanel };
}
