import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Role } from '../types/index';

// ─── Tab Definitions ─────────────────────────────────────────────────────────

export type NewsletterTab =
  | 'today'
  | 'past-editions'
  | 'drafts-queued'
  | 'competitor-intel'
  | 'subscribers'
  | 'analytics';

// ─── Context Shape ───────────────────────────────────────────────────────────

interface NewsletterContextValue {
  /** Currently selected edition ID (for detail views) */
  selectedEditionId: string | null;
  setSelectedEditionId: (id: string | null) => void;

  /** Active tab in the newsletter page */
  activeTab: NewsletterTab;
  setActiveTab: (tab: NewsletterTab) => void;

  /** Current user's role for the newsletter module */
  userRole: Role;
}

const NewsletterContext = createContext<NewsletterContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface NewsletterProviderProps {
  children: ReactNode;
  /** User role passed from the auth layer */
  userRole?: Role;
}

export function NewsletterProvider({
  children,
  userRole = 'Viewer',
}: NewsletterProviderProps) {
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NewsletterTab>('today');

  const handleSetSelectedEditionId = useCallback((id: string | null) => {
    setSelectedEditionId(id);
  }, []);

  const handleSetActiveTab = useCallback((tab: NewsletterTab) => {
    setActiveTab(tab);
  }, []);

  const value: NewsletterContextValue = {
    selectedEditionId,
    setSelectedEditionId: handleSetSelectedEditionId,
    activeTab,
    setActiveTab: handleSetActiveTab,
    userRole,
  };

  return (
    <NewsletterContext.Provider value={value}>
      {children}
    </NewsletterContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNewsletterContext(): NewsletterContextValue {
  const context = useContext(NewsletterContext);
  if (!context) {
    throw new Error(
      'useNewsletterContext must be used within a NewsletterProvider',
    );
  }
  return context;
}
