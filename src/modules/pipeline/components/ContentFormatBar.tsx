/**
 * Re-export shim — the component moved to the platform layer
 * (src/platform/components/ContentFormatBar.tsx) so the cards module's
 * WYSIWYG field (CMS-90) can share it. Kept so existing pipeline imports
 * don't churn.
 */
export { ContentFormatBar } from '@/platform/components/ContentFormatBar';
