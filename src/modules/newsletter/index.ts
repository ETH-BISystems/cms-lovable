// ─── Newsletter Module Barrel File ───────────────────────────────────────────
// Public API for the Newsletter Command Center module.
// Other modules and the shell import from '@/modules/newsletter' only.

// ─── Public Types ────────────────────────────────────────────────────────────
export * from './types/index';

// ─── NewsletterPage Component ────────────────────────────────────────────────
export { NewsletterPage } from './components/NewsletterPage';

// ─── Route Definition ────────────────────────────────────────────────────────
import { NewsletterPage as _NewsletterPage } from './components/NewsletterPage';

export const newsletterRoute = {
  path: '/newsletter',
  component: _NewsletterPage,
} as const;

// ─── Navigation Metadata ─────────────────────────────────────────────────────
export const newsletterNavItem = {
  label: 'Newsletter',
  icon: 'Mail',
  path: '/newsletter',
} as const;
