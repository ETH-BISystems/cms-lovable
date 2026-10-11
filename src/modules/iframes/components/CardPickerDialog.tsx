import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCardPicker } from '../hooks/useCardPicker';
import type { CardDocument } from '@/modules/cards';

interface CardPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cards already used in other slots of this instance — hidden from the list. */
  excludeCardIds?: string[];
  onSelect: (card: CardDocument) => void;
}

/**
 * Card picker for iFrame configuration: search + issuer filter over the Card
 * Data Manager. Unpublished cards are excluded (useCardPicker) — they can't be
 * embedded in new instances.
 */
export function CardPickerDialog({ open, onOpenChange, excludeCardIds = [], onSelect }: CardPickerDialogProps) {
  const { visibleCards, issuers, search, setSearch, issuer, setIssuer, loading } = useCardPicker();
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const cards = visibleCards.filter((c) => !excludeCardIds.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a card</DialogTitle>
          <DialogDescription>
            From the Card Data Manager. Image and title load live into the iFrame.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, issuer, or category…"
              className="pl-9"
              autoFocus
            />
          </div>
          <Select value={issuer || 'all'} onValueChange={(v) => setIssuer(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All issuers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All issuers</SelectItem>
              {issuers.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-80 rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : cards.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No cards match your search.
            </div>
          ) : (
            <div className="divide-y">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                  onClick={() => {
                    onSelect(card);
                    onOpenChange(false);
                  }}
                >
                  {card.cardImageUrl && !imgErrors.has(card.id) ? (
                    <img
                      src={card.cardImageUrl}
                      alt=""
                      className="w-16 h-10 object-cover rounded bg-muted shrink-0"
                      loading="lazy"
                      onError={() => setImgErrors((s) => new Set(s).add(card.id))}
                    />
                  ) : (
                    <div className="w-16 h-10 rounded bg-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{card.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {card.issuer}{card.category ? ` · ${card.category}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
