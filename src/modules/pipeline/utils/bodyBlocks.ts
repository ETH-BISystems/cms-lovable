/**
 * Top-level body-block reordering utilities (CMS-150) — the pure logic
 * behind the article body's WordPress-style drag-and-drop. The editor works
 * on direct children of the [data-content-inner] div (paragraphs, headings,
 * figures/images, tables, hr, lists, placeholder blocks); these helpers
 * locate blocks, compute drop positions, and move blocks — all unit-testable
 * without a live editor.
 */

/**
 * Direct element children of the editor's inner content container — the
 * draggable "blocks" of the article body.
 */
export function getTopLevelBlocks(inner: HTMLElement): HTMLElement[] {
  return Array.from(inner.children) as HTMLElement[];
}

/**
 * Where a dragged block should land given the pointer's clientY: the index
 * in `blocks` BEFORE which to insert. Returns blocks.length to append at the
 * end. Blocks are assumed to be in document order; the pointer past a
 * block's vertical midpoint moves the insertion point below that block.
 */
export function computeDropIndex(blocks: HTMLElement[], clientY: number): number {
  for (let i = 0; i < blocks.length; i++) {
    const rect = blocks[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return i;
    }
  }
  return blocks.length;
}

/**
 * Clamp/normalise a move: insert-before semantics with the source block
 * removed first. Moving a block to its own index or the position immediately
 * after it is a no-op (returns `from`).
 */
export function normalizeMoveTarget(count: number, from: number, to: number): number {
  const clampedFrom = Math.max(0, Math.min(from, count - 1));
  let clampedTo = Math.max(0, Math.min(to, count));
  // Removing the source shifts every later index down by one — express the
  // target in post-removal coordinates.
  if (clampedTo > clampedFrom) clampedTo -= 1;
  if (clampedTo === clampedFrom) return clampedFrom;
  return clampedTo;
}

/**
 * Move the top-level block at index `from` so it lands at index `to`
 * (insert-before semantics in pre-removal coordinates; `to === count`
 * appends at the end). Mutates the DOM under `inner` and returns the
 * resulting innerHTML. No-op moves return the unchanged innerHTML.
 */
export function moveTopLevelBlock(inner: HTMLElement, from: number, to: number): string {
  const blocks = getTopLevelBlocks(inner);
  if (blocks.length === 0 || from < 0 || from >= blocks.length) {
    return inner.innerHTML;
  }
  const target = normalizeMoveTarget(blocks.length, from, to);
  if (target === from) {
    return inner.innerHTML;
  }
  const node = blocks[from];
  node.remove();
  const remaining = getTopLevelBlocks(inner);
  if (target >= remaining.length) {
    inner.appendChild(node);
  } else {
    inner.insertBefore(node, remaining[target]);
  }
  return inner.innerHTML;
}

/**
 * Pure string variant of moveTopLevelBlock — parses `html`, reorders the
 * top-level blocks, and returns the re-serialized HTML. Used by tests and
 * available to callers that only hold the stored HTML string.
 */
export function reorderTopLevelBlocks(html: string, from: number, to: number): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const inner = doc.body.firstElementChild as HTMLElement | null;
  if (!inner) return html;
  moveTopLevelBlock(inner, from, to);
  return inner.innerHTML;
}
