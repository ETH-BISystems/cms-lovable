import { KeywordMagicTool } from './KeywordMagicTool';

/**
 * Keyword Magic page — SEMRush-style keyword research powered by DataForSEO.
 * Replaces the former Opportunities / Explorer / Gap / Top Pages sub-pages.
 */
export function KeywordsPage() {
  return (
    <div className="p-6">
      <KeywordMagicTool mode="standalone" />
    </div>
  );
}
