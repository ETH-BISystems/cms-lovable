import type { AssetDocument } from '@/modules/assets';

/** Attribute-escape for values baked into the inserted markup. */
function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * CMS-96 — the Add Image embed block inserted into article content: a
 * <figure><img> with lazy loading (figure wrapper matches the proven
 * video/iframe embed pattern). Survives the Webflow publish sanitize, which
 * only strips script/style elements, event-handler attributes, and inline
 * styles. Returns null when the asset has no usable image URL.
 */
export function buildImageEmbedHtml(asset: AssetDocument): string | null {
  const url = asset.cdnUrl || asset.thumbnailUrl;
  if (!url) return null;
  const alt = asset.altText || asset.titleAttribute || asset.description || asset.filename || 'Article image';
  return `<figure><img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" loading="lazy" /></figure>`;
}
