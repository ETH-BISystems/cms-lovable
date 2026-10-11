import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmScrapeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Name of the single card being scraped (omit for bulk scrapes). */
  cardName?: string;
  /** Number of cards for bulk scrapes (omit for single-card scrapes). */
  cardCount?: number;
}

/**
 * Warning shown before any scrape starts — scraping overwrites the card's
 * existing scraped data and editorial content, so an accidental click on
 * "Scrape Now" must not silently destroy entered content.
 */
export function ConfirmScrapeDialog({ open, onOpenChange, onConfirm, cardName, cardCount }: ConfirmScrapeDialogProps) {
  const target = cardName
    ? `"${cardName}"`
    : cardCount != null
      ? `${cardCount} card${cardCount === 1 ? '' : 's'}`
      : 'all cards';
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Overwrite content with a fresh scrape?</AlertDialogTitle>
          <AlertDialogDescription>
            This will scrape {target} and replace the existing scraped data and editorial
            content with freshly scraped content. Manually overridden fields keep their
            manual values. Are you sure you want to scrape?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Scrape &amp; Overwrite
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
