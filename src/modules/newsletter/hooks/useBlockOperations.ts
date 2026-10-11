import { useState, useCallback, useRef } from 'react';
import type { ContentBlock } from '../types/index';

/**
 * Strip HTML tags from a string and count whitespace-separated words.
 * Returns 0 for empty or whitespace-only content.
 */
export function getWordCount(html: string): number {
  // Strip all HTML tags
  const text = html.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  const decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Trim and split by whitespace
  const trimmed = decoded.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Local block state management for the block editor.
 * Provides optimistic updates before Cloud Function confirmation.
 *
 * Requirements: 2.3, 2.8, 2.9, 2.10
 */
export function useBlockOperations(initialBlocks: ContentBlock[] = []) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const undoRef = useRef<{ block: ContentBlock; index: number } | null>(null);

  /**
   * Add a block at a specific index. If no index is provided, appends to the end.
   */
  const addBlock = useCallback((block: ContentBlock, atIndex?: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const insertAt = atIndex !== undefined ? Math.min(Math.max(0, atIndex), next.length) : next.length;
      next.splice(insertAt, 0, block);
      return next;
    });
  }, []);

  /**
   * Remove a block by ID. Stores the removed block for undo.
   */
  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === blockId);
      if (index === -1) return prev;
      undoRef.current = { block: prev[index], index };
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  /**
   * Reorder blocks by moving a block from one index to another.
   */
  const reorderBlocks = useCallback((fromIndex: number, toIndex: number) => {
    setBlocks((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  /**
   * Update a block's fields by ID.
   */
  const updateBlock = useCallback(
    (blockId: string, updates: Partial<ContentBlock>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
      );
    },
    [],
  );

  /**
   * Undo the last block removal. Only supports single undo.
   */
  const undoRemove = useCallback(() => {
    const undo = undoRef.current;
    if (!undo) return;

    setBlocks((prev) => {
      const next = [...prev];
      const insertAt = Math.min(undo.index, next.length);
      next.splice(insertAt, 0, undo.block);
      return next;
    });

    undoRef.current = null;
  }, []);

  return {
    blocks,
    addBlock,
    removeBlock,
    reorderBlocks,
    updateBlock,
    undoRemove,
    getWordCount,
  };
}
