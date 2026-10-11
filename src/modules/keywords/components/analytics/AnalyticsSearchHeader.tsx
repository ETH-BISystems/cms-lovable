import { useRef, useState, type ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { HERO_BUTTON_CLASS, HERO_INPUT_CLASS, PageHero } from './PageHero';

interface AnalyticsSearchHeaderProps {
  title: string;
  description: string;
  inputPlaceholder: string;
  /** Initial value shown in the input (e.g. the default domain). */
  initialValue?: string;
  buttonLabel: string;
  loading: boolean;
  onSubmit: (value: string) => void;
  /** Extra controls rendered between the input and the submit button. */
  extraControls?: ReactNode;
  /** Right-aligned hero header controls (e.g. the History button). */
  actions?: ReactNode;
}

/** Dark hero page header with title, single query input, and submit button. */
export function AnalyticsSearchHeader({
  title,
  description,
  inputPlaceholder,
  initialValue = '',
  buttonLabel,
  loading,
  onSubmit,
  extraControls,
  actions,
}: AnalyticsSearchHeaderProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // CMS-35: the submit button stays solid and clickable — it only disables
  // while a search is in flight. An empty submit guides the user to the
  // input instead of rendering the button washed-out from page load.
  const submit = () => {
    if (loading) return;
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error(`Enter a value to ${buttonLabel.toLowerCase()}`);
      inputRef.current?.focus();
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <PageHero title={title} description={description} actions={actions}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={inputPlaceholder}
            data-hero-search-input=""
            className={cn('h-10 pl-9', HERO_INPUT_CLASS)}
          />
        </div>
        {extraControls}
        <Button onClick={submit} disabled={loading} className={cn('h-10', HERO_BUTTON_CLASS)}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {buttonLabel}
        </Button>
      </div>
    </PageHero>
  );
}
