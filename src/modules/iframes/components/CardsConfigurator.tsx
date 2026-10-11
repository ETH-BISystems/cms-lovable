import { useState } from 'react';
import { GripVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { CardDocument } from '@/modules/cards';
import type { IframeInstanceCard } from '../types';
import { reorderCards, type IframeTypeInfo } from '../utils/iframeTypes';
import { CardPickerDialog } from './CardPickerDialog';

interface CardsConfiguratorProps {
  /** Drives bounds, fixed slot count, and which per-card fields are shown. */
  typeInfo: IframeTypeInfo;
  slots: IframeInstanceCard[];
  onChange: (slots: IframeInstanceCard[]) => void;
  cardsById: Map<string, CardDocument>;
}

const EMPTY_SLOT: IframeInstanceCard = { cardId: '', customText: '', readMoreUrl: '' };

/**
 * Card-based iFrame configuration step, driven by the type's registry entry:
 * card slots (drag to reorder) with optional per-instance custom text and
 * Read-more URL override (blank = the card's own review URL). Fixed-count
 * types (comparable/deals) get no add/remove controls.
 */
export function CardsConfigurator({ typeInfo, slots, onChange, cardsById }: CardsConfiguratorProps) {
  const fixed = typeInfo.fixedCards !== undefined;
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const updateSlot = (index: number, patch: Partial<IframeInstanceCard>) => {
    onChange(slots.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addSlot = () => {
    if (!fixed && slots.length < typeInfo.maxCards) onChange([...slots, { ...EMPTY_SLOT }]);
  };

  const removeSlot = (index: number) => {
    if (!fixed && slots.length > typeInfo.minCards) onChange(slots.filter((_, i) => i !== index));
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null) return;
    onChange(reorderCards(slots, dragIndex, index));
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-3">
      {slots.map((slot, index) => {
        const card = slot.cardId ? cardsById.get(slot.cardId) : undefined;
        const unpublished = card?.publishState === 'unpublished';
        return (
          <div
            key={index}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverIndex(index);
            }}
            onDragLeave={() => setDragOverIndex((i) => (i === index ? null : i))}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            className={`rounded-lg border p-3 space-y-2 bg-background transition-colors ${
              dragOverIndex === index && dragIndex !== null && dragOverIndex !== dragIndex
                ? 'border-primary'
                : 'border-border'
            } ${dragIndex === index ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
              <span className="text-xs font-medium text-muted-foreground">Card {index + 1}</span>
              {unpublished && <Badge variant="warning">Unpublished — hidden in the live iFrame</Badge>}
              <div className="flex-1" />
              {!fixed && slots.length > typeInfo.minCards && (
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-muted/60"
                  title="Remove this card slot"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {card ? (
              <div className="flex items-center gap-3">
                {card.cardImageUrl ? (
                  <img
                    src={card.cardImageUrl}
                    alt=""
                    className="w-20 h-12 object-cover rounded bg-muted shrink-0"
                  />
                ) : (
                  <div className="w-20 h-12 rounded bg-muted shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{card.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{card.issuer}</div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setPickerSlot(index)}>
                  Change
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setPickerSlot(index)}
              >
                Choose card…
              </Button>
            )}

            {typeInfo.allowCustomText && (
              <div className="space-y-1">
                <Textarea
                  value={slot.customText}
                  onChange={(e) => updateSlot(index, { customText: e.target.value })}
                  placeholder="Custom text for this iFrame (optional) — e.g. “The Capital One Venture X is another great complementary card to the Bilt Mastercard…”"
                  rows={2}
                  maxLength={typeInfo.maxCustomTextLength}
                  className="text-sm"
                />
                {/* Live budget so the limit is visible while typing (CMS-173) */}
                {typeInfo.maxCustomTextLength > 0 && (
                  <p
                    className={`text-right text-[10px] ${
                      slot.customText.length >= typeInfo.maxCustomTextLength
                        ? 'text-amber-600 font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {slot.customText.length}/{typeInfo.maxCustomTextLength}
                  </p>
                )}
              </div>
            )}

            {typeInfo.allowReadMore && (
              <Input
                value={slot.readMoreUrl}
                onChange={(e) => updateSlot(index, { readMoreUrl: e.target.value })}
                placeholder={
                  card?.reviewUrl
                    ? `Read more URL (blank = card default: ${card.reviewUrl})`
                    : 'Read more URL (optional, https://…)'
                }
                className="text-sm"
              />
            )}
          </div>
        );
      })}

      {!fixed && slots.length < typeInfo.maxCards && (
        <Button type="button" variant="outline" className="w-full border-dashed" onClick={addSlot}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add card ({slots.length} of {typeInfo.maxCards})
        </Button>
      )}

      <CardPickerDialog
        open={pickerSlot !== null}
        onOpenChange={(open) => {
          if (!open) setPickerSlot(null);
        }}
        excludeCardIds={slots.map((s) => s.cardId).filter(Boolean)}
        onSelect={(card) => {
          if (pickerSlot !== null) updateSlot(pickerSlot, { cardId: card.id });
        }}
      />
    </div>
  );
}
