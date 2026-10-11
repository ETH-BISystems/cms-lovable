import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Check, X, CreditCard, RefreshCw, CheckCheck, Plus } from 'lucide-react';
import { useCardTagSuggestions } from '../hooks/useCardTagSuggestions';
import type { CardTagSuggestion } from '../services/articleService';
import type { PipelineArticle } from '../types';

interface CardTagSuggestionsProps {
  article: PipelineArticle;
}

const CONFIDENCE_STYLES: Record<CardTagSuggestion['confidence'], string> = {
  high: 'bg-success/10 text-success border-success/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

/**
 * AI card-tag scan shown at Final Approval and in the Publish step: the
 * article body is scanned and the cards it covers are suggested as tags.
 * The editor accepts suggestions individually or all at once, deletes
 * inaccurate ones, or adds tags manually — or ignores them entirely; the
 * scan never blocks approval or publishing. Accepted tags persist to the
 * article's cardTags and merge into topicTags so they resolve to Webflow
 * tags.
 */
export function CardTagSuggestions({ article }: CardTagSuggestionsProps) {
  const {
    scanning,
    saving,
    scannedOnce,
    appliedTags,
    visibleSuggestions,
    accepted,
    decisions,
    scan,
    toggleAccept,
    rejectSuggestion,
    acceptAll,
    applyAccepted,
    addManualTag,
    removeApplied,
  } = useCardTagSuggestions(article);
  const [manualTag, setManualTag] = useState('');

  const handleAddManual = async () => {
    const ok = await addManualTag(manualTag);
    if (ok) setManualTag('');
  };

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-accent" /> Card Tags
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={scan} disabled={scanning}>
          {scanning ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {scanning ? 'Scanning…' : scannedOnce || appliedTags.length > 0 ? 'Re-scan Article' : 'Scan Article'}
        </Button>
      </div>

      {appliedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {appliedTags.map((tag) => (
            <Badge key={tag.cardId} variant="secondary" className="text-[11px] gap-1 pr-1">
              {tag.name}
              <button
                onClick={() => removeApplied(tag.cardId, tag.name)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                title="Remove card tag"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {scanning ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : visibleSuggestions.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              AI suggests tagging this article with the cards below — accept the ones that apply.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 shrink-0"
              onClick={acceptAll}
              disabled={visibleSuggestions.every((s) => decisions[s.cardId] === 'accepted')}
            >
              <CheckCheck className="h-3 w-3" /> Accept All
            </Button>
          </div>
          {visibleSuggestions.map((s) => {
            const isAccepted = decisions[s.cardId] === 'accepted';
            return (
              <div key={s.cardId} className="flex items-start justify-between gap-3 rounded-md border border-border/70 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-medium text-foreground">{s.name}</span>
                    <Badge variant="outline" className={`text-[10px] capitalize ${CONFIDENCE_STYLES[s.confidence]}`}>
                      {s.confidence}
                    </Badge>
                  </div>
                  {s.reason && <p className="text-[11px] text-muted-foreground mt-0.5">{s.reason}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant={isAccepted ? 'default' : 'outline'}
                    className="h-7 text-[11px] gap-1"
                    onClick={() => toggleAccept(s.cardId)}
                  >
                    <Check className="h-3 w-3" /> {isAccepted ? 'Accepted' : 'Accept'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                    onClick={() => rejectSuggestion(s.cardId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          {accepted.length > 0 && (
            <Button size="sm" className="h-7 text-[11px]" onClick={applyAccepted} disabled={saving}>
              {saving ? 'Saving…' : `Add ${accepted.length} Card Tag${accepted.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      ) : scannedOnce && appliedTags.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No card suggestions — the article doesn't appear to cover specific catalog cards.</p>
      ) : null}

      {/* Manual tag entry (CMS-50) — plain text input, works with voice dictation */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
        <Input
          value={manualTag}
          onChange={(e) => setManualTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAddManual(); } }}
          placeholder="Add a tag manually…"
          className="h-7 text-[11px] flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] gap-1 shrink-0"
          onClick={handleAddManual}
          disabled={saving || !manualTag.trim()}
        >
          <Plus className="h-3 w-3" /> Add Tag
        </Button>
      </div>
    </div>
  );
}
