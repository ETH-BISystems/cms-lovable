import { useState } from 'react';
import { Globe, RefreshCw, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCardsContext } from '../context/CardsContext';
import { useCardActions } from '../hooks/useCardActions';
import { useCards } from '../hooks/useCards';
import { ConfirmScrapeDialog } from './ConfirmScrapeDialog';
import { toast } from 'sonner';

export function BulkActionBar() {
  const { selectedCardIds, clearSelection } = useCardsContext();
  const { bulkSyncToWebflow, scrapeCard, isLoading } = useCardActions();
  const { cards } = useCards();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [confirmScrapeOpen, setConfirmScrapeOpen] = useState(false);

  if (selectedCardIds.size === 0) return null;

  const selectedCount = selectedCardIds.size;
  const selectedIdsArray = Array.from(selectedCardIds);

  const handleBulkPublish = async () => {
    setIsSyncing(true);
    try {
      const result = await bulkSyncToWebflow({ cardIds: selectedIdsArray });
      toast.success(`${result.synced.length} card${result.synced.length !== 1 ? 's' : ''} published to Webflow`);
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} card${result.failed.length !== 1 ? 's' : ''} failed to sync`);
      }
    } catch {
      toast.error('Bulk publish failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBulkScrape = async () => {
    setConfirmScrapeOpen(false);
    setIsScraping(true);
    let succeeded = 0;
    let failed = 0;
    for (const cardId of selectedIdsArray) {
      try {
        await scrapeCard({ cardId });
        succeeded++;
      } catch {
        failed++;
      }
    }
    setIsScraping(false);
    toast.success(`Scraper complete: ${succeeded} updated, ${failed} failed`);
  };

  const handleBulkExport = () => {
    const selectedCards = cards.filter((c) => selectedCardIds.has(c.id));
    if (selectedCards.length === 0) return;

    const headers = ['Name', 'Issuer', 'Category', 'Status', 'Annual Fee', 'Signup Bonus', 'Last Scraped'];
    const rows = selectedCards.map((c) => [
      c.name,
      c.issuer,
      c.category,
      c.status,
      String(c.annualFee_scraped ?? ''),
      c.signupBonus_scraped ?? '',
      c.lastScraped?.toMillis ? new Date(c.lastScraped.toMillis()).toISOString() : '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cards-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedCards.length} cards`);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 animate-fade-in">
      <span className="text-[13px] font-medium text-accent">
        {selectedCount} card{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center gap-2 ml-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkPublish}
          disabled={isSyncing || isScraping}
        >
          <Globe className="h-3.5 w-3.5 mr-1.5" />
          {isSyncing ? 'Publishing...' : 'Bulk Publish to Webflow'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmScrapeOpen(true)}
          disabled={isSyncing || isScraping}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isScraping ? 'animate-spin' : ''}`} />
          {isScraping ? 'Scraping...' : 'Bulk Run Scraper'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleBulkExport} disabled={isSyncing || isScraping}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Bulk Export
        </Button>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={clearSelection}
        className="ml-auto h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <ConfirmScrapeDialog
        open={confirmScrapeOpen}
        onOpenChange={setConfirmScrapeOpen}
        onConfirm={handleBulkScrape}
        cardCount={selectedCount}
      />
    </div>
  );
}
