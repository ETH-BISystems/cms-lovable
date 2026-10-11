import { useLocation } from '@/lib/router-compat';
import { Construction } from 'lucide-react';

/**
 * Extracts a human-readable feature name from the current URL path.
 * e.g. "/keywords" → "Keywords", "/seo/health" → "SEO Health"
 */
function featureNameFromPath(pathname: string): string {
  return pathname
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) =>
      segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' ');
}

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const featureName = featureNameFromPath(pathname);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Construction className="mx-auto h-12 w-12 text-teal-600" />
        <h2 className="mt-4 text-2xl font-semibold text-foreground">
          {featureName || 'This Feature'}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Coming Soon — This feature is not yet available.
        </p>
      </div>
    </div>
  );
}
