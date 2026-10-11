import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { CardDocument, CardDetailData } from '../../types';
import { CollapsibleSection } from '../shared/ProvenanceComponents';
import { FieldLockButton } from '../shared/FieldLockButton';
import { computeCompositeScore } from '../../utils/computeCompositeScore';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardEditorialTabProps {
  card: CardDocument;
  detailData: CardDetailData;
  onUpdateDetail: (fields: Partial<CardDetailData>) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CardEditorialTab({ card, detailData, onUpdateDetail }: CardEditorialTabProps) {
  const computedScore = computeCompositeScore(detailData);

  return (
    <div className="space-y-4">
      <CollapsibleSection title="Favorites" defaultOpen>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Favorite Hotels <FieldLockButton card={card} field="favoriteHotels" value={detailData.favoriteHotels ?? ''} /></label>
            <Textarea
              value={detailData.favoriteHotels ?? ''}
              onChange={e => onUpdateDetail({ favoriteHotels: e.target.value })}
              placeholder="e.g. Best redeemed at Hyatt and Marriott properties"
              className="text-sm min-h-[72px]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">Favorite Airlines <FieldLockButton card={card} field="favoriteAirlines" value={detailData.favoriteAirlines ?? ''} /></label>
            <Textarea
              value={detailData.favoriteAirlines ?? ''}
              onChange={e => onUpdateDetail({ favoriteAirlines: e.target.value })}
              placeholder="e.g. Best redeemed with United and Southwest"
              className="text-sm min-h-[72px]"
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Complementary Cards Intro" defaultOpen>
        <div className="space-y-2">
          <label className="text-xs font-medium text-foreground/70">Intro Paragraph</label>
          <Textarea
            value={detailData.complementaryCardsIntro ?? ''}
            onChange={e => onUpdateDetail({ complementaryCardsIntro: e.target.value })}
            placeholder="e.g. Pair this card with these complementary cards to build a well-rounded rewards strategy…"
            className="text-sm min-h-[96px]"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Rating" defaultOpen>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">Star Rating <FieldLockButton card={card} field="starRating" value={detailData.starRating ?? 0} /></span>
              {/* CMS-119: blank → the card page shows the computed score
                  (composite/2); say so instead of a misleading "0/5". */}
              <span className="text-xs font-semibold text-card-foreground">
                {detailData.starRating != null && detailData.starRating > 0
                  ? `${detailData.starRating}/5`
                  : `${Math.round(computedScore / 2)}/5 computed`}
              </span>
            </div>
            <Slider
              value={[detailData.starRating ?? 0]}
              min={0}
              max={5}
              step={0.5}
              onValueChange={([v]) => onUpdateDetail({ starRating: v })}
            />
            {!(detailData.starRating != null && detailData.starRating > 0) && (
              <p className="text-[10px] text-muted-foreground">
                No manual rating — the card review will show the computed score from the ETH scoring dials. Move the slider to override.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground/70 inline-flex items-center gap-1.5">
              Our Score (manual override — computed composite score is {computedScore}/10)
              <FieldLockButton card={card} field="ourScore" value={detailData.ourScore ?? computedScore} />
            </label>
            <Input
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={detailData.ourScore ?? ''}
              onChange={e => onUpdateDetail({ ourScore: e.target.value === '' ? undefined : Number(e.target.value) })}
              placeholder={`Leave blank to use computed score (${computedScore})`}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
