import type { ArticleVersion } from '../types';

/**
 * CMS-152: version-history helpers shared by the panel-header History menu,
 * the header Revert-to-previous-version button, and the Version History tab.
 *
 * Versions arrive newest-first (`subscribeToArticleVersions` orders by
 * timestamp desc), so index 0 is the CURRENT state — "previous version"
 * means the first older entry that carries a content snapshot.
 */

/** A version can only be restored when it has a stored body snapshot
 *  (entries recorded before restore support shipped have none). */
export function isRestorableVersion(version: ArticleVersion): boolean {
  return !!version.contentSnapshot;
}

/** The most recent restorable version BEFORE the current state — the target
 *  of the header "Revert" button. Null when no such version exists. */
export function findPreviousRestorableVersion(versions: ArticleVersion[]): ArticleVersion | null {
  for (let i = 1; i < versions.length; i++) {
    if (isRestorableVersion(versions[i])) return versions[i];
  }
  return null;
}
