import { Info } from 'lucide-react';

interface SampleDataBannerProps {
  /** Response meta from any traffic-market callable; only `dataSource` matters. */
  meta?: { dataSource: 'dataforseo' | 'similarweb' | 'sample' | 'disabled' } | null;
}

/**
 * Slim informational strip shown at the top of Traffic & Market pages while
 * the backend serves deterministic sample data (explicit demo mode).
 * Renders nothing when the data is live ('dataforseo' / 'similarweb'), the
 * integration is disabled, or meta is absent (the disabled state has its own
 * card — SimilarwebDisabledCard; live DataForSEO shows ProviderCaption).
 */
export function SampleDataBanner({ meta }: SampleDataBannerProps) {
  if (!meta || meta.dataSource !== 'sample') return null;
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-2.5 text-[13px] leading-snug text-amber-800 ring-1 ring-amber-200">
      <Info className="h-4 w-4 shrink-0" />
      <p>
        Demo mode is on — these numbers are deterministic sample data, not live research. An admin can
        turn demo mode off, or add a Similarweb API key under Settings → SEO API Integration for live
        clickstream data.
      </p>
    </div>
  );
}
