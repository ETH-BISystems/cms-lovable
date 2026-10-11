import type {
  ArticleSourceImages,
  SelectedSourceImage,
  SourceArticleImage,
} from '../types';

/**
 * Source Article Images selection logic (CMS-67).
 *
 * Pure helpers behind the Content Preview "Source Article Images" panel:
 * - selection persists on `article.selectedSourceImages` (survives re-scans
 *   and carries AI-edited versions, which never appear in the scan itself);
 * - removals persist on `article.dismissedSourceImageUrls` so a re-scan that
 *   finds the same image again keeps it hidden.
 * Both fields are written via the `updateArticle` callable (full replace).
 */

/** A row rendered by the panel: scan result or persisted selection entry. */
export interface VisibleSourceImage extends SelectedSourceImage {
  selected: boolean;
  /** True when this entry is an AI-edited version of a source image. */
  edited: boolean;
}

export function isSourceImageSelected(
  selected: SelectedSourceImage[] | undefined,
  url: string
): boolean {
  return (selected ?? []).some((s) => s.url === url);
}

/** Toggle a scanned source image in/out of the persisted selection. */
export function toggleSourceImageSelection(
  selected: SelectedSourceImage[] | undefined,
  image: Pick<SourceArticleImage, 'url' | 'sourceUrl' | 'alt'> &
    Partial<Pick<SelectedSourceImage, 'assetId' | 'editedFromUrl'>>
): SelectedSourceImage[] {
  const current = selected ?? [];
  if (current.some((s) => s.url === image.url)) {
    return current.filter((s) => s.url !== image.url);
  }
  return [
    ...current,
    {
      url: image.url,
      sourceUrl: image.sourceUrl ?? '',
      alt: image.alt ?? '',
      ...(image.assetId ? { assetId: image.assetId } : {}),
      ...(image.editedFromUrl ? { editedFromUrl: image.editedFromUrl } : {}),
    },
  ];
}

/**
 * Remove an image from the panel: record the URL as dismissed (so a re-scan
 * doesn't bring it back) and drop it from the selection if it was selected.
 */
export function dismissSourceImage(
  selected: SelectedSourceImage[] | undefined,
  dismissed: string[] | undefined,
  url: string
): { selectedSourceImages: SelectedSourceImage[]; dismissedSourceImageUrls: string[] } {
  return {
    selectedSourceImages: (selected ?? []).filter((s) => s.url !== url),
    dismissedSourceImageUrls: [...new Set([...(dismissed ?? []), url])],
  };
}

/**
 * Record an AI-edited version of a source image in the selection. Iterative
 * edits of the same original replace the previous edited entry (one current
 * AI version per original), so the selection always holds the latest result.
 */
export function upsertEditedSourceImage(
  selected: SelectedSourceImage[] | undefined,
  edited: SelectedSourceImage & { assetId: string; editedFromUrl: string }
): SelectedSourceImage[] {
  const current = (selected ?? []).filter(
    (s) => s.editedFromUrl !== edited.editedFromUrl && s.url !== edited.url
  );
  return [...current, edited];
}

/**
 * Record the Asset Library document id on a selection entry (CMS-155) after
 * the image was imported/saved to the library — a second save or "Edit with
 * AI" then reuses that asset instead of importing a duplicate.
 */
export function markSourceImageAsset(
  selected: SelectedSourceImage[] | undefined,
  url: string,
  assetId: string
): SelectedSourceImage[] {
  return (selected ?? []).map((s) => (s.url === url ? { ...s, assetId } : s));
}

/**
 * Compose the rows the panel renders:
 * - scanned images, minus dismissed URLs, flagged with their selection state;
 * - persisted selection entries the scan doesn't contain (AI-edited versions,
 *   or picks an older scan found) — AI-edited entries slot in right after
 *   their original when it is visible, everything else appends at the end.
 */
export function visibleSourceImages(
  sourceImages: ArticleSourceImages | null | undefined,
  selected: SelectedSourceImage[] | undefined,
  dismissed: string[] | undefined
): VisibleSourceImage[] {
  const dismissedSet = new Set(dismissed ?? []);
  const selectedList = selected ?? [];

  const rows: VisibleSourceImage[] = (sourceImages?.images ?? [])
    .filter((img) => !dismissedSet.has(img.url))
    .map((img) => {
      const pick = selectedList.find((s) => s.url === img.url);
      return {
        url: img.url,
        sourceUrl: img.sourceUrl,
        alt: img.alt,
        ...(pick?.assetId ? { assetId: pick.assetId } : {}),
        selected: !!pick,
        edited: false,
      };
    });

  const scannedUrls = new Set(rows.map((r) => r.url));
  for (const pick of selectedList) {
    if (scannedUrls.has(pick.url) || dismissedSet.has(pick.url)) continue;
    const row: VisibleSourceImage = {
      ...pick,
      selected: true,
      edited: !!pick.editedFromUrl,
    };
    const originalIdx = pick.editedFromUrl
      ? rows.findIndex((r) => r.url === pick.editedFromUrl)
      : -1;
    if (originalIdx >= 0) {
      rows.splice(originalIdx + 1, 0, row);
    } else {
      rows.push(row);
    }
    scannedUrls.add(pick.url);
  }

  return rows;
}
