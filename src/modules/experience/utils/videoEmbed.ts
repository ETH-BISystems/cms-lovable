/**
 * Webflow-safe social embeds (spec CMS-9 criterion 6).
 *
 * The publish path (functions/src/pipeline/helpers/sanitizeRichText.ts)
 * strips every <script> tag (and all inline style attributes), so the
 * platforms' native oEmbed markup (blockquote + script for TikTok/Instagram/
 * X) renders as a bare quote on the published Webflow article. Social embeds
 * inserted into article content therefore use script-less iframes where the
 * platform offers one, which survive sanitization and play both in the CMS
 * Content Preview and on the live Webflow page:
 *
 *   YouTube    → https://www.youtube-nocookie.com/embed/{videoId}
 *   TikTok     → https://www.tiktok.com/embed/v2/{videoId}
 *   Instagram  → https://www.instagram.com/(p|reel|tv)/{shortcode}/embed
 *   Facebook   → https://www.facebook.com/plugins/post.php?href={postUrl}
 *   LinkedIn   → https://www.linkedin.com/embed/feed/update/urn:li:…:{id}
 *
 * X/Twitter and Pinterest have no script-less iframe — they insert as a
 * linked thumbnail card (figure > a > img + caption link), built from
 * structural HTML only (no inline styles; the sanitizer strips them).
 */

/** Convert a public post URL to a script-less iframe src, or null when the
 * platform has no script-less embed (X/Twitter, Pinterest) or the URL shape
 * is not a post. */
export function getVideoEmbedSrc(sourceUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  // YouTube — watch?v=, youtu.be/, /shorts/, /live/, /embed/
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v');
    if (v) return `https://www.youtube-nocookie.com/embed/${v}`;
    const match = url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  }

  // TikTok — /@handle/video/{id}
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const match = url.pathname.match(/\/video\/(\d+)/);
    return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : null;
  }

  // Instagram — /p/{code}, /reel/{code}, /reels/{code}, /tv/{code}
  if (host === 'instagram.com') {
    const match = url.pathname.match(/^\/(p|reel|reels|tv)\/([\w-]+)/);
    if (!match) return null;
    const kind = match[1] === 'reels' ? 'reel' : match[1];
    return `https://www.instagram.com/${kind}/${match[2]}/embed`;
  }

  // Facebook — the post plugin accepts any post/photo/video permalink as href
  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch') {
    return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(sourceUrl)}&show_text=true`;
  }

  // LinkedIn — /posts/{slug}-{activityId}[-{suffix}], /feed/update/urn:li:(activity|share|ugcPost):{id}
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    const urn = sourceUrl.match(/urn:li:(activity|share|ugcPost):(\d+)/);
    if (urn) return `https://www.linkedin.com/embed/feed/update/urn:li:${urn[1]}:${urn[2]}`;
    // Post URLs carry exactly one long digit run — the activity id (19 digits).
    const activity = sourceUrl.match(/(\d{15,})/);
    return activity ? `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activity[1]}` : null;
  }

  return null;
}

/** True when the URL points at a post we can render as a script-less iframe. */
export function isEmbeddableVideoUrl(sourceUrl: string): boolean {
  return getVideoEmbedSrc(sourceUrl) !== null;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Embed dimensions per iframe src family — YouTube 16:9, Facebook/LinkedIn
 * near-square post cards, TikTok/Instagram vertical. */
function embedSize(src: string): { width: number; height: number } {
  if (src.startsWith('https://www.youtube-nocookie.com/')) return { width: 560, height: 315 };
  if (src.startsWith('https://www.facebook.com/')) return { width: 500, height: 590 };
  if (src.startsWith('https://www.linkedin.com/')) return { width: 504, height: 620 };
  return { width: 325, height: 580 };
}

/**
 * Build the script-less iframe HTML block inserted into article content.
 * Returns null when the platform has no script-less embed (use
 * buildSocialLinkCardHtml for those).
 */
export function buildVideoEmbedHtml(sourceUrl: string, title?: string): string | null {
  const src = getVideoEmbedSrc(sourceUrl);
  if (!src) return null;
  const { width, height } = embedSize(src);
  const safeTitle = escapeHtmlAttr(title?.trim() || 'Embedded post');
  return (
    `<figure><iframe src="${src}" width="${width}" height="${height}" title="${safeTitle}" ` +
    'frameborder="0" loading="lazy" ' +
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
    'allowfullscreen></iframe></figure>'
  );
}

/**
 * Embed fallback for platforms without a script-less iframe (X/Twitter,
 * Pinterest): a linked thumbnail card. Structural HTML only — the publish
 * sanitizer strips inline style attributes, so presentation comes from the
 * Webflow side.
 */
export function buildSocialLinkCardHtml(
  sourceUrl: string,
  opts: { thumbnailUrl?: string | null; title?: string | null; platformLabel?: string }
): string {
  const safeUrl = escapeHtmlAttr(sourceUrl);
  const label = opts.platformLabel?.trim() || 'View post';
  const safeLabel = escapeHtmlAttr(label);
  const caption = escapeHtmlAttr(opts.title?.trim() || label);
  const img = opts.thumbnailUrl
    ? `<img src="${escapeHtmlAttr(opts.thumbnailUrl)}" alt="${caption}" loading="lazy" />`
    : '';
  return (
    `<figure><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${img}` +
    `<figcaption>${caption} — ${safeLabel}</figcaption></a></figure>`
  );
}

const PLATFORM_EMBED_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  'x-twitter': 'X/Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  pinterest: 'Pinterest',
};

/**
 * Build the embed HTML for an Experience Library item: a script-less iframe
 * for platforms that have one, otherwise the linked thumbnail card. Returns
 * null when the item has no source URL. This is what every "Embed Social
 * Post" button inserts — never the raw oEmbed markup, whose <script> the
 * publish sanitizer strips.
 */
export function buildSocialEmbedHtml(item: {
  sourceUrl?: string | null;
  source?: string;
  title?: string | null;
  thumbnailUrl?: string | null;
}): string | null {
  const url = item.sourceUrl ?? '';
  if (!url) return null;
  const iframe = buildVideoEmbedHtml(url, item.title ?? undefined);
  if (iframe) return iframe;
  const label = PLATFORM_EMBED_LABELS[item.source ?? ''] ?? 'the platform';
  return buildSocialLinkCardHtml(url, {
    thumbnailUrl: item.thumbnailUrl,
    title: item.title,
    platformLabel: `View on ${label}`,
  });
}

/**
 * Newsletter variant: email clients run no iframes or scripts, so the social
 * embed is ALWAYS the linked thumbnail card, regardless of platform.
 */
export function buildEmailSocialEmbedHtml(item: {
  sourceUrl?: string | null;
  source?: string;
  title?: string | null;
  caption?: string | null;
  thumbnailUrl?: string | null;
}): string | null {
  const url = item.sourceUrl ?? '';
  if (!url) return null;
  const label = PLATFORM_EMBED_LABELS[item.source ?? ''] ?? 'the platform';
  return buildSocialLinkCardHtml(url, {
    thumbnailUrl: item.thumbnailUrl,
    title: item.title ?? item.caption,
    platformLabel: `View on ${label}`,
  });
}
