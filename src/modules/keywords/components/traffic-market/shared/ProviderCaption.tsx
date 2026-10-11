interface ProviderCaptionProps {
  /** Response meta from any traffic-market callable; only `dataSource` matters. */
  meta?: { dataSource: 'dataforseo' | 'similarweb' | 'sample' | 'disabled' } | null;
}

/**
 * Subtle one-line provider hint shown where the sample banner sits when the
 * page is served live by DataForSEO (the default provider). Not a banner —
 * just a muted caption; renders nothing for every other dataSource.
 */
export function ProviderCaption({ meta }: ProviderCaptionProps) {
  if (!meta || meta.dataSource !== 'dataforseo') return null;
  return (
    <p className="px-1 text-xs leading-snug text-muted-foreground">
      Search intelligence via DataForSEO — clickstream metrics activate with a Similarweb key.
    </p>
  );
}
