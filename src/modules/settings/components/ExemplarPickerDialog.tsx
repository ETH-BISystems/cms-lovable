import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Check } from 'lucide-react';
import { delay } from '@/services/_delay';

// MOCK SEED — replaces the production queries:
//   collection(db, 'articles')          (status === 'Published')
//   collection(db, 'newsletter-editions') (status === 'Sent')
const MOCK_ARTICLES = [
  { id: 'art_001', title: 'Is the Amex Platinum Edge still worth $195 in 2026?', publishedUrl: 'https://elitepointsandmiles.com/amex-platinum-edge-review-2026', targetKeyword: 'amex platinum edge review', sortKey: Date.now() - 4 * 864e5 },
  { id: 'art_002', title: 'The 1.8c Singapore Airlines redemption hiding in plain sight', publishedUrl: 'https://elitepointsandmiles.com/sq-redemption-sweet-spot', targetKeyword: 'krisflyer sweet spots', sortKey: Date.now() - 6 * 864e5 },
  { id: 'art_003', title: 'Velocity transfer partners, ranked by actual value', publishedUrl: 'https://elitepointsandmiles.com/velocity-transfer-partners-ranked', targetKeyword: 'velocity transfer partners', sortKey: Date.now() - 2 * 864e5 },
  { id: 'art_004', title: 'Qantas 90k signup bonus: who should actually apply', publishedUrl: 'https://elitepointsandmiles.com/qantas-90k-signup-bonus', targetKeyword: 'qantas signup bonus', sortKey: Date.now() - 9 * 864e5 },
  { id: 'art_005', title: 'The quiet KrisFlyer devaluation, quantified', publishedUrl: 'https://elitepointsandmiles.com/krisflyer-devaluation-2026', targetKeyword: 'krisflyer devaluation', sortKey: Date.now() - 12 * 864e5 },
  { id: 'art_006', title: 'Best lounges at Sydney Airport, ranked by someone who timed the showers', publishedUrl: 'https://elitepointsandmiles.com/sydney-airport-lounges-ranked', targetKeyword: 'sydney airport lounges', sortKey: Date.now() - 15 * 864e5 },
  { id: 'art_007', title: 'ANZ Frequent Flyer Black vs Westpac Altitude Black: the honest comparison', publishedUrl: 'https://elitepointsandmiles.com/anz-vs-westpac-black', targetKeyword: 'anz frequent flyer black', sortKey: Date.now() - 18 * 864e5 },
  { id: 'art_008', title: 'How we value points (and why 1.5c is a floor, not a target)', publishedUrl: 'https://elitepointsandmiles.com/how-we-value-points', targetKeyword: 'points value australia', sortKey: Date.now() - 21 * 864e5 },
];

const MOCK_EDITIONS = [
  { id: 'nl_001', subject: 'Daily Drop: 90k Qantas bonus + the ANA sweet spot nobody prices correctly', webUrl: 'https://newsletter.elitepointsandmiles.com/p/daily-drop-90k-qantas', sortKey: Date.now() - 1 * 864e5 },
  { id: 'nl_002', subject: 'This week in points: the quiet devaluation at KrisFlyer', webUrl: 'https://newsletter.elitepointsandmiles.com/p/krisflyer-devaluation', sortKey: Date.now() - 3 * 864e5 },
  { id: 'nl_003', subject: 'Daily Drop: Velocity 40% transfer bonus ends Sunday', webUrl: 'https://newsletter.elitepointsandmiles.com/p/velocity-40-transfer', sortKey: Date.now() - 5 * 864e5 },
  { id: 'nl_004', subject: 'The lounge access stacking guide (free PDF inside)', webUrl: 'https://newsletter.elitepointsandmiles.com/p/lounge-stacking-guide', sortKey: Date.now() - 8 * 864e5 },
  { id: 'nl_005', subject: 'Daily Drop: Amex adds two transfer partners', webUrl: 'https://newsletter.elitepointsandmiles.com/p/amex-transfer-partners', sortKey: Date.now() - 11 * 864e5 },
];

export interface ExemplarPickItem {
  id: string;
  title: string;
  url: string;
}

interface ExemplarPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Picks from published articles or sent newsletter editions. */
  kind: 'article' | 'newsletter';
  /** IDs already in the exemplar library — shown as added. */
  existingIds: string[];
  onAdd: (item: ExemplarPickItem) => void;
}

interface PickRow {
  id: string;
  title: string;
  url: string;
  meta: string;
  sortKey: number;
}

/**
 * ExemplarPickerDialog — modal for adding brand-voice exemplars from existing
 * content. Articles come from the `articles` collection (Published only);
 * newsletters from `newsletter-editions` (Sent only).
 */
export function ExemplarPickerDialog({ open, onOpenChange, kind, existingIds, onAdd }: ExemplarPickerDialogProps) {
  const [rows, setRows] = useState<PickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let cancelled = false;
    // Mock: emit the seeded rows once after a short delay (mirrors the
    // initial onSnapshot emission of the Firestore query).
    void delay(300).then(() => {
      if (cancelled) return;
      const items: PickRow[] =
        kind === 'article'
          ? MOCK_ARTICLES.map((a) => ({ id: a.id, title: a.title, url: a.publishedUrl, meta: a.targetKeyword, sortKey: a.sortKey }))
          : MOCK_EDITIONS.map((e) => ({
              id: e.id,
              title: e.subject,
              url: e.webUrl,
              meta: new Date(e.sortKey).toLocaleDateString(),
              sortKey: e.sortKey,
            }));
      items.sort((a, b) => b.sortKey - a.sortKey);
      setRows(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, kind]);

  const filtered = searchQuery.trim()
    ? rows.filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : rows;

  const noun = kind === 'article' ? 'article' : 'newsletter';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Exemplar {kind === 'article' ? 'Article' : 'Newsletter'}</DialogTitle>
          <DialogDescription>
            {kind === 'article'
              ? 'Pick from published articles. The saved brand voice trains on these exemplars.'
              : 'Pick from sent newsletter editions. The saved brand voice trains on these exemplars.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${noun}s by title...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery
                  ? `No ${noun}s match your search.`
                  : kind === 'article'
                    ? 'No published articles found.'
                    : 'No sent newsletter editions found.'}
              </p>
            ) : (
              filtered.map((row) => {
                const isAdded = existingIds.includes(row.id);
                return (
                  <div key={row.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{row.title}</p>
                      {row.meta && (
                        <Badge variant="outline" className="text-[10px]">{row.meta}</Badge>
                      )}
                    </div>
                    {isAdded ? (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" disabled>
                        <Check className="h-3 w-3 mr-1" /> Added
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onAdd({ id: row.id, title: row.title, url: row.url })}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
