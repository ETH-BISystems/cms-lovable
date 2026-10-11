/**
 * CMS Page Template Library (CMS-47, enriched CMS-150).
 *
 * Joe's template source is the "Dynamic Sections per Page" Notion doc
 * (https://rural-gold-41b.notion.site/Dynamic-Sections-per-Page-38fa0269926e802da5f3d6e953e11fd2).
 * The doc is rendered client-side and was unreachable at build time, so this
 * ships a placeholder set covering ETH's typical page types.
 *
 * TO ADD OR EDIT TEMPLATES: append/modify entries in PAGE_TEMPLATES below —
 * each template is plain data (name, description, ordered sections). Sections
 * declare the placeholder blocks seeded under their heading (text / photo
 * slot / table slot / bullet list) — the same blocks the gallery preview
 * renders as a wireframe, so what the editor sees before selecting is what
 * lands in the blank article body.
 */

/** Placeholder block kinds a template section can seed (CMS-150). */
export type TemplateBlockKind = 'text' | 'photo' | 'table' | 'list';

export interface PageTemplateSection {
  /** Section heading as it should appear in the article (H2). */
  title: string;
  /** Editor-facing hint describing what belongs in this section. */
  description: string;
  /**
   * Placeholder blocks seeded under the heading, in order (default ['text']):
   * - text:  placeholder paragraph carrying the section description
   * - photo: photo-slot figure the editor replaces via Add Image
   * - table: "insert table here" slot (TP Table embed or pasted table)
   * - list:  bullet-list placeholder carrying the section description
   */
  blocks?: TemplateBlockKind[];
}

export interface PageTemplate {
  id: string;
  name: string;
  /** Grouping label shown in the library, e.g. "Reviews". */
  pageType: string;
  description: string;
  sections: PageTemplateSection[];
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'card-review',
    name: 'Credit Card Review',
    pageType: 'Reviews',
    description: 'Single-card deep review: verdict up front, then benefits, earning, redemption, and who it fits.',
    sections: [
      { title: 'Quick Verdict', description: 'One-paragraph take with the star rating and who should get the card.' },
      { title: 'Current Welcome Offer', description: 'Bonus, minimum spend, timing tips.', blocks: ['text', 'photo'] },
      { title: 'Key Benefits & Perks', description: 'Bulleted benefits with real-world value estimates.', blocks: ['list'] },
      { title: 'Earning Rates', description: 'Category multipliers table.', blocks: ['table'] },
      { title: 'Redemption Sweet Spots', description: 'Best transfer partners and example redemptions.', blocks: ['text', 'table'] },
      { title: 'Fees & Fine Print', description: 'Annual fee, APR, foreign transaction fees, notable exclusions.', blocks: ['table'] },
      { title: 'Our Experience', description: 'First-person experience with the card (E-E-A-T).', blocks: ['text', 'photo'] },
      { title: 'Who Should (and Should Not) Get It', description: 'Fit guidance by traveler profile.' },
      { title: 'FAQ', description: '3-5 People-Also-Ask questions.', blocks: ['list'] },
    ],
  },
  {
    id: 'card-comparison',
    name: 'Card vs. Card Comparison',
    pageType: 'Reviews',
    description: 'Head-to-head comparison of two or three cards with a clear winner per use case.',
    sections: [
      { title: 'At a Glance', description: 'Side-by-side summary table of the contenders.', blocks: ['table'] },
      { title: 'Welcome Offers Compared', description: 'Current bonuses and effective value.', blocks: ['text', 'photo'] },
      { title: 'Earning & Multipliers', description: 'Category-by-category earning comparison.', blocks: ['table'] },
      { title: 'Perks & Protections', description: 'Lounge access, credits, insurance differences.', blocks: ['list'] },
      { title: 'Fees', description: 'Annual fee and fee-offset math.', blocks: ['table'] },
      { title: 'Which Card Wins for You', description: 'Winner by traveler profile / use case.' },
      { title: 'FAQ', description: 'Common comparison questions.', blocks: ['list'] },
    ],
  },
  {
    id: 'destination-guide',
    name: 'Destination Guide',
    pageType: 'Guides',
    description: 'Points-first destination guide: getting there on miles, where to stay, what to do.',
    sections: [
      { title: 'Why Go', description: 'Hook — what makes this destination worth the points.', blocks: ['text', 'photo'] },
      { title: 'Getting There on Points', description: 'Award routes, sweet spots, ideal programs.', blocks: ['text', 'table'] },
      { title: 'Where to Stay on Points', description: 'Hotel programs and standout properties.', blocks: ['text', 'photo'] },
      { title: 'What to Do', description: 'Experiences, neighborhoods, food.', blocks: ['text', 'photo'] },
      { title: 'Our Experience', description: 'First-person trip notes and photos.', blocks: ['text', 'photo'] },
      { title: 'Best Cards for This Trip', description: 'Cards that maximize this itinerary.', blocks: ['list'] },
      { title: 'FAQ', description: 'Logistics questions (visas, timing, budgets).', blocks: ['list'] },
    ],
  },
  {
    id: 'listicle-roundup',
    name: 'Top-N Listicle / Roundup',
    pageType: 'Listicles',
    description: 'Ranked roundup ("Best X for Y") with a mini-review per item.',
    sections: [
      { title: 'Our Top Picks', description: 'Summary list of winners with one-line justifications.', blocks: ['list'] },
      { title: 'How We Ranked', description: 'Methodology and criteria (trust signal).' },
      { title: 'The List', description: 'One H3 per item: what it is, why it made the list, drawbacks.', blocks: ['text', 'photo'] },
      { title: 'Honorable Mentions', description: 'Near-misses and niche picks.', blocks: ['list'] },
      { title: 'Bottom Line', description: 'Which pick for which reader.' },
      { title: 'FAQ', description: 'Selection questions.', blocks: ['list'] },
    ],
  },
  {
    id: 'how-to-tutorial',
    name: 'How-To / Tutorial',
    pageType: 'Guides',
    description: 'Step-by-step walkthrough (booking, transferring points, applications).',
    sections: [
      { title: 'What You Will Need', description: 'Prerequisites — accounts, points balances, timing.', blocks: ['list'] },
      { title: 'Step-by-Step Walkthrough', description: 'Numbered steps with screenshots.', blocks: ['text', 'photo'] },
      { title: 'Common Mistakes to Avoid', description: 'Pitfalls seen first-hand.', blocks: ['list'] },
      { title: 'Pro Tips', description: 'Optimizations for advanced readers.', blocks: ['list'] },
      { title: 'FAQ', description: 'Troubleshooting questions.', blocks: ['list'] },
    ],
  },
  {
    id: 'news-update',
    name: 'News / Program Update',
    pageType: 'News',
    description: 'Timely brief on a devaluation, new offer, or program change — what happened and what to do.',
    sections: [
      { title: 'What Changed', description: 'The news in two paragraphs, dated.', blocks: ['text', 'photo'] },
      { title: 'Who Is Affected', description: 'Which cardholders / members this hits.' },
      { title: 'What You Should Do', description: 'Concrete actions with deadlines.', blocks: ['list'] },
      { title: 'Our Take', description: 'Editorial opinion on the change.' },
    ],
  },
  {
    id: 'lounge-guide',
    name: 'Airport / Lounge Guide',
    pageType: 'Guides',
    description: 'Airport or lounge access guide: what is there, how to get in, is it worth it.',
    sections: [
      { title: 'Overview', description: 'Airport/lounge basics — terminals, locations, hours.', blocks: ['text', 'photo'] },
      { title: 'How to Get Access', description: 'Cards, memberships, and day passes that work.', blocks: ['list'] },
      { title: 'What to Expect Inside', description: 'Food, showers, seating, crowding — first-hand.', blocks: ['text', 'photo'] },
      { title: 'Our Experience', description: 'Personal visit notes and photos.', blocks: ['text', 'photo'] },
      { title: 'Is It Worth It', description: 'Verdict versus alternatives.' },
      { title: 'FAQ', description: 'Access rules and guest policies.', blocks: ['list'] },
    ],
  },
  {
    id: 'strategy-deep-dive',
    name: 'Points Strategy Deep-Dive',
    pageType: 'Strategy',
    description: 'Long-form strategy piece (e.g. maximizing a currency, multi-card setups).',
    sections: [
      { title: 'The Strategy in One Paragraph', description: 'TL;DR of the play.' },
      { title: 'Why This Works', description: 'The mechanics and the math.', blocks: ['text', 'table'] },
      { title: 'Step-by-Step Setup', description: 'How to execute, in order.', blocks: ['list'] },
      { title: 'Real-World Example', description: 'A worked example with actual numbers.', blocks: ['text', 'photo'] },
      { title: 'Risks & Caveats', description: 'When this strategy breaks down.', blocks: ['list'] },
      { title: 'Recommended Cards', description: 'The cards that power the strategy.', blocks: ['table'] },
      { title: 'FAQ', description: 'Edge-case questions.', blocks: ['list'] },
    ],
  },
];

export function getPageTemplate(id: string | undefined | null): PageTemplate | null {
  if (!id) return null;
  return PAGE_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Blocks a section seeds when it declares none — a single text placeholder. */
export function sectionBlocks(section: PageTemplateSection): TemplateBlockKind[] {
  return section.blocks && section.blocks.length > 0 ? section.blocks : ['text'];
}

/** Attribute marking seeded placeholder blocks in the article body. */
export const TEMPLATE_PLACEHOLDER_ATTR = 'data-template-placeholder';

const PLACEHOLDER_STYLE =
  'border:2px dashed #94a3b8;border-radius:8px;padding:28px 16px;text-align:center;' +
  'color:#64748b;background:#f8fafc;margin:16px 0;font-size:13px;font-style:italic;';

/** Photo-slot placeholder — the editor replaces it with the Add Image button. */
export function buildPhotoSlotHtml(sectionTitle: string): string {
  return (
    `<figure ${TEMPLATE_PLACEHOLDER_ATTR}="photo" style="${PLACEHOLDER_STYLE}">` +
    `<span style="font-size:22px;font-style:normal;" aria-hidden="true">📷</span>` +
    `<figcaption style="margin-top:4px;">Photo slot — ${sectionTitle}. Replace with an image (Add Image button).</figcaption>` +
    `</figure>`
  );
}

/** Table-slot placeholder — the editor replaces it with a TP Table embed or a pasted table. */
export function buildTableSlotHtml(sectionTitle: string): string {
  return (
    `<div ${TEMPLATE_PLACEHOLDER_ATTR}="table" style="${PLACEHOLDER_STYLE}">` +
    `<span style="font-size:20px;font-style:normal;" aria-hidden="true">▦</span>` +
    `<p style="margin:4px 0 0;">Insert table here — ${sectionTitle}.</p>` +
    `</div>`
  );
}

/** Placeholder HTML for a single block kind under a section. */
export function buildBlockPlaceholderHtml(kind: TemplateBlockKind, section: PageTemplateSection): string {
  switch (kind) {
    case 'photo':
      return buildPhotoSlotHtml(section.title);
    case 'table':
      return buildTableSlotHtml(section.title);
    case 'list':
      return `<ul>\n<li><em>[${section.description}]</em></li>\n</ul>`;
    case 'text':
    default:
      return `<p><em>[${section.description}]</em></p>`;
  }
}

/**
 * Build the skeleton HTML seeded into an empty article when a template is
 * applied: an H2 per section followed by its placeholder blocks (text,
 * photo slots, "insert table here" slots, bullet lists).
 */
export function buildTemplateSkeletonHtml(template: PageTemplate): string {
  return template.sections
    .map((s) => {
      const parts = [`<h2>${s.title}</h2>`];
      for (const kind of sectionBlocks(s)) {
        parts.push(buildBlockPlaceholderHtml(kind, s));
      }
      return parts.join('\n');
    })
    .join('\n');
}
