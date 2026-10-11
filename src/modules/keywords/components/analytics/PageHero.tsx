import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  /** Micro-label above the title, e.g. "SEO Research". */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Right-aligned header controls (buttons). */
  actions?: ReactNode;
  /** Content below the title block — search inputs, filters. */
  children?: ReactNode;
  /** Extra bottom padding so following content can overlap upward. */
  overlap?: boolean;
  className?: string;
}

/**
 * Dark "command center" hero band used at the top of every Keyword Magic page.
 * Deep-teal gradient with soft cyan glows; controls inside render glass-style.
 */
export function PageHero({ eyebrow = 'SEO Research', title, description, icon: Icon, actions, children, overlap, className }: PageHeroProps) {
  return (
    <div
      className={cn(
        'kw-hero relative animate-fade-up overflow-hidden rounded-[1.5rem] px-6 py-7 text-white ring-1 ring-white/10 sm:px-8',
        'bg-[#04333d]',
        overlap ? 'pb-20' : '',
        className,
      )}
    >
      {/* Layered glows — static panel, GPU-cheap */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(75% 130% at 88% -20%, rgba(0,205,232,0.32), transparent 58%),' +
            'radial-gradient(55% 110% at -5% 115%, rgba(0,147,167,0.28), transparent 55%),' +
            'linear-gradient(120deg, #032b34 0%, #06414d 55%, #043540 100%)',
        }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-100/90 ring-1 ring-white/15">
              {eyebrow}
            </span>
            <h1 className="mt-3 flex items-center gap-3 font-display text-[30px] font-bold leading-tight tracking-tight [text-wrap:balance]">
              {Icon && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5 text-cyan-200" />
                </span>
              )}
              {title}
            </h1>
            {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cyan-50/60">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
}

/** Input styling for controls rendered inside the dark hero. */
export const HERO_INPUT_CLASS =
  'border-white/15 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-cyan-300/40 focus-visible:ring-offset-0';

/** High-contrast primary button styling for the hero. */
export const HERO_BUTTON_CLASS =
  'bg-white text-[#053741] shadow-[0_8px_24px_-8px_rgba(0,205,232,0.5)] hover:bg-cyan-50';
