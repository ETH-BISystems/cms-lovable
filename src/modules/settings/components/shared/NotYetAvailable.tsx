import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

/**
 * Wraps settings sections whose controls are not wired to a real backend
 * path yet. Renders the content greyed-out and inert with an honest note,
 * instead of letting users edit fields that silently discard their input.
 */
export function NotYetAvailable({ note, children }: { note?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          {note ?? 'Not yet available — these controls are shown for preview and will be enabled in a future release.'}
        </p>
      </div>
      <fieldset disabled aria-disabled className="opacity-60 pointer-events-none select-none border-0 p-0 m-0 min-w-0">
        {children}
      </fieldset>
    </div>
  );
}

/** Inline variant for a single control row (e.g. one dead button). */
export function NotYetAvailableInline({ children }: { children: ReactNode }) {
  return (
    <span title="Not yet available" className="inline-flex opacity-50 pointer-events-none select-none" aria-disabled>
      {children}
    </span>
  );
}
