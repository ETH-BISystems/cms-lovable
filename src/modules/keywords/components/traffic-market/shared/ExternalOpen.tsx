import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Absolute URL for a table/card cell value: page paths join the owning
 * domain, bare hosts (subdomain rows, source domains) become https:// URLs,
 * full URLs pass through untouched.
 */
export function pageHref(domain: string, page: string): string {
  if (/^https?:\/\//i.test(page)) return page;
  if (page.startsWith('/')) return `https://${domain}${page}`;
  // No leading slash: a bare host (blog.example.com) or a slashless path.
  return page.includes('.') ? `https://${page}` : `https://${domain}/${page}`;
}

interface ExternalOpenProps {
  href: string;
  /** Accessible name; defaults to "Open {href} in a new tab". */
  label?: string;
  className?: string;
}

/**
 * Muted external-link glyph that opens `href` in a new tab — the house
 * affordance appended to domain and page cells across the Traffic & Market
 * tables and trending cards. Click never bubbles (rows may toggle expansion).
 */
export function ExternalOpen({ href, label, className }: ExternalOpenProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ?? `Open ${href} in a new tab`}
      onClick={event => event.stopPropagation()}
      className={cn(
        'inline-flex shrink-0 text-muted-foreground/50 transition-colors hover:text-accent',
        className,
      )}
    >
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
