import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeDropIndex,
  getTopLevelBlocks,
  moveTopLevelBlock,
} from '../utils/bodyBlocks';

/**
 * WordPress-style block drag-and-drop for the article body editor (CMS-150).
 *
 * The body is a single contentEditable div whose direct children are the
 * article's "blocks" (headings, paragraphs, figures/photos, tables, lists,
 * template placeholders). This hook adds:
 *  - a floating drag handle that appears when hovering a top-level block
 *  - an insertion indicator line while dragging
 *  - drop-to-reorder via DOM manipulation, then reports the new innerHTML so
 *    the caller can persist it (same pattern as the iframe insert/delete
 *    flows, which save immediately).
 *
 * Only drags started from the handle reorder blocks — native text-selection
 * drags and OS file drags are ignored (no drag session is active, so
 * dragover/drop are not intercepted).
 */

interface DragSession {
  /** Index of the dragged block within the inner container's children. */
  fromIndex: number;
  /** The dragged block element (dimmed while dragging). */
  block: HTMLElement;
}

interface UseBlockDragAndDropOptions {
  /** Wrapper positioned `relative` that contains the editable inner div. */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Drag-and-drop only makes sense once there is body content. */
  enabled: boolean;
  /** Called with the new body HTML after a block is dropped in a new spot. */
  onReorder: (newHtml: string) => void;
}

const INNER_SELECTOR = '[data-content-inner]';
export const BLOCK_DRAG_HANDLE_ATTR = 'data-block-drag-handle';

export function useBlockDragAndDrop({ containerRef, enabled, onReorder }: UseBlockDragAndDropOptions) {
  const [handle, setHandle] = useState<{ top: number; left: number } | null>(null);
  const [indicator, setIndicator] = useState<{ top: number } | null>(null);
  const sessionRef = useRef<DragSession | null>(null);
  // Top-level block currently under the pointer — the handle floats over it
  // and dragstart reads it back (the handle lives outside the editable, so
  // the block can't be derived from the drag event target).
  const hoverRef = useRef<{ block: HTMLElement; index: number } | null>(null);
  // onReorder identity changes per render in the panel — keep a ref so the
  // DOM handlers below can stay stable.
  const onReorderRef = useRef(onReorder);
  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  const getInner = useCallback((): HTMLElement | null => {
    const container = containerRef.current;
    return container ? (container.querySelector(INNER_SELECTOR) as HTMLElement | null) : null;
  }, [containerRef]);

  const endSession = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      session.block.style.opacity = '';
      sessionRef.current = null;
    }
    setIndicator(null);
  }, []);

  // If the editor is disabled/unmounted mid-drag, restore the block style.
  useEffect(() => {
    if (!enabled) {
      endSession();
      setHandle(null);
      hoverRef.current = null;
    }
    return () => endSession();
  }, [enabled, endSession]);

  /** Resolve the top-level block under a pointer event target, if any. */
  const blockFromTarget = (target: HTMLElement): { block: HTMLElement; inner: HTMLElement } | null => {
    const inner = getInner();
    if (!inner) return null;
    let node: HTMLElement | null = target;
    while (node && node.parentElement !== inner) {
      node = node.parentElement;
      if (!node || node === containerRef.current) return null;
    }
    return node ? { block: node, inner } : null;
  };

  const containerProps = {
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled || sessionRef.current) return;
      const target = e.target as HTMLElement;
      // Pointer on the handle itself — keep the current handle visible.
      if (target.closest(`[${BLOCK_DRAG_HANDLE_ATTR}]`)) return;
      // Pointer on an overlay toolbar (rewrite bar, iframe popover) — hide.
      if (target.closest('[data-rewrite-toolbar]')) {
        setHandle(null);
        hoverRef.current = null;
        return;
      }
      const hit = blockFromTarget(target);
      const container = containerRef.current;
      if (!hit || !container) {
        setHandle(null);
        hoverRef.current = null;
        return;
      }
      const rect = hit.block.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      hoverRef.current = {
        block: hit.block,
        index: getTopLevelBlocks(hit.inner).indexOf(hit.block),
      };
      setHandle({
        top: rect.top - containerRect.top + 2,
        left: rect.left - containerRect.left - 22,
      });
    },
    onMouseLeave: () => {
      if (!sessionRef.current) {
        setHandle(null);
        hoverRef.current = null;
      }
    },
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!enabled || !session) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const inner = getInner();
      const container = containerRef.current;
      if (!inner || !container) return;
      const blocks = getTopLevelBlocks(inner);
      if (blocks.length === 0) return;
      const dropIndex = computeDropIndex(blocks, e.clientY);
      const containerRect = container.getBoundingClientRect();
      const top =
        dropIndex < blocks.length
          ? blocks[dropIndex].getBoundingClientRect().top - containerRect.top - 1
          : blocks[blocks.length - 1].getBoundingClientRect().bottom - containerRect.top + 1;
      setIndicator({ top });
    },
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!enabled || !session) return;
      e.preventDefault();
      const inner = getInner();
      if (inner) {
        const beforeHtml = inner.innerHTML;
        const dropIndex = computeDropIndex(getTopLevelBlocks(inner), e.clientY);
        const newHtml = moveTopLevelBlock(inner, session.fromIndex, dropIndex);
        endSession();
        setHandle(null);
        hoverRef.current = null;
        if (newHtml && newHtml !== beforeHtml) {
          onReorderRef.current(newHtml);
        }
      } else {
        endSession();
        setHandle(null);
        hoverRef.current = null;
      }
    },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      // Leaving the container entirely (not just crossing a child) clears the line.
      const related = e.relatedTarget as Node | null;
      if (!related || !containerRef.current?.contains(related)) {
        setIndicator(null);
      }
    },
  };

  const handleProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      const hovered = hoverRef.current;
      if (!enabled || !hovered) {
        e.preventDefault();
        return;
      }
      sessionRef.current = { fromIndex: hovered.index, block: hovered.block };
      hovered.block.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
      // Some browsers require data to be set for the drag to start at all.
      e.dataTransfer.setData('text/plain', 'eth-article-block');
      setHandle(null);
    },
    onDragEnd: () => {
      endSession();
    },
  };

  return { handle, indicator, containerProps, handleProps };
}
