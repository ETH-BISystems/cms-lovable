import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuditComponents, AuditComponentKey } from '../../types';

const COMPONENT_LABELS: Record<AuditComponentKey, string> = {
  titleTag: 'Title Tag',
  metaDescription: 'Meta Description',
  h1Tag: 'H1 Tag',
  contentLength: 'Content Length',
  keywordUsage: 'Keyword Usage',
  internalLinks: 'Internal Links',
  externalLinks: 'External Links',
  imageAltText: 'Image Alt Text',
  schemaMarkup: 'Schema Markup',
  urlStructure: 'URL Structure',
  readability: 'Readability',
  contentFreshness: 'Content Freshness',
};

const COMPONENT_ORDER: AuditComponentKey[] = [
  'titleTag',
  'metaDescription',
  'h1Tag',
  'contentLength',
  'keywordUsage',
  'internalLinks',
  'externalLinks',
  'imageAltText',
  'schemaMarkup',
  'urlStructure',
  'readability',
  'contentFreshness',
];

interface AuditComponentGridProps {
  components: AuditComponents;
}

function StatusIcon({ status }: { status: 'pass' | 'warning' | 'fail' }) {
  if (status === 'pass') return <CheckCircle className="w-4 h-4 text-success" />;
  if (status === 'warning')
    return <AlertTriangle className="w-4 h-4 text-warning" />;
  return <XCircle className="w-4 h-4 text-destructive" />;
}

export function AuditComponentGrid({ components }: AuditComponentGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {COMPONENT_ORDER.map((key) => {
        const c = components[key];
        if (!c) return null;
        return (
          <div
            key={key}
            className={cn(
              'rounded-lg border p-3',
              c.status === 'pass'
                ? 'border-success/30 bg-success/5'
                : c.status === 'warning'
                  ? 'border-warning/30 bg-warning/5'
                  : 'border-destructive/30 bg-destructive/5'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">
                {COMPONENT_LABELS[key]}
              </span>
              <StatusIcon status={c.status} />
            </div>
            <p className="text-xs text-muted-foreground">{c.detail}</p>
            <p
              className={cn(
                'text-xs font-bold mt-1',
                c.status === 'pass'
                  ? 'text-success'
                  : c.status === 'warning'
                    ? 'text-warning'
                    : 'text-destructive'
              )}
            >
              {c.score}/10
            </p>
          </div>
        );
      })}
    </div>
  );
}
