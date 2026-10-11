import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeeds } from '../hooks/useFeeds';
import { rssService } from '../services/rssService';
import type { RSSFeed } from '../types';
import { FeedRow } from './FeedRow';

export interface FeedManagementPanelProps {
  open: boolean;
  onClose: () => void;
}

const POLL_INTERVALS = ['15 min', '30 min', '1 hour', '4 hours'] as const;

export function FeedManagementPanel({ open, onClose }: FeedManagementPanelProps) {
  const { feeds, loading, error } = useFeeds();

  // Add feed form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [pollInterval, setPollInterval] = useState<string>('1 hour');
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Edit state
  const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPollInterval, setEditPollInterval] = useState('1 hour');
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteFeedId, setDeleteFeedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const resetAddForm = () => {
    setName('');
    setUrl('');
    setPollInterval('1 hour');
    setTestResult(null);
  };

  const handleTestFeed = async () => {
    if (!url.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await rssService.testFeed(url.trim());
      setTestResult({ success: true, message: `Found "${result.title}" with ${result.itemCount} items` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach feed URL';
      setTestResult({ success: false, message });
    } finally {
      setTesting(false);
    }
  };

  const handleAddFeed = async () => {
    if (!name.trim() || !url.trim()) return;
    setAdding(true);
    try {
      await rssService.addFeed({ name: name.trim(), url: url.trim(), pollInterval });
      toast.success('Feed added successfully');
      resetAddForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add feed';
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (feed: RSSFeed) => {
    setEditingFeed(feed);
    setEditName(feed.name);
    setEditUrl(feed.url);
    setEditPollInterval(feed.pollInterval);
  };

  const handleSaveEdit = async () => {
    if (!editingFeed) return;
    setSaving(true);
    try {
      await rssService.updateFeed({
        feedId: editingFeed.id,
        name: editName.trim(),
        url: editUrl.trim(),
        pollInterval: editPollInterval,
      });
      toast.success('Feed updated');
      setEditingFeed(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update feed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingFeed(null);
  };

  const handlePause = async (feedId: string) => {
    try {
      await rssService.updateFeed({ feedId, status: 'paused' });
      toast.success('Feed paused');
    } catch {
      toast.error('Failed to pause feed');
    }
  };

  const handleResume = async (feedId: string) => {
    try {
      await rssService.updateFeed({ feedId, status: 'active' });
      toast.success('Feed resumed');
    } catch {
      toast.error('Failed to resume feed');
    }
  };

  const handleRetry = async (feedId: string) => {
    try {
      await rssService.updateFeed({ feedId, status: 'active', errorMessage: '' });
      await rssService.pollFeed(feedId);
      toast.success('Feed retried and polled');
    } catch {
      toast.error('Failed to retry feed');
    }
  };

  const handlePollNow = async (feedId: string) => {
    try {
      // Clear any lingering error state before polling
      const feed = feeds.find((f) => f.id === feedId);
      if (feed?.status === 'error') {
        await rssService.updateFeed({ feedId, status: 'active', errorMessage: '' });
      }
      const result = await rssService.pollFeed(feedId);
      toast.success(`Poll complete — ${result.newArticleCount} new article(s)`);
    } catch {
      toast.error('Failed to poll feed');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteFeedId) return;
    setDeleting(true);
    try {
      await rssService.deleteFeed(deleteFeedId);
      toast.success('Feed deleted');
    } catch {
      toast.error('Failed to delete feed');
    } finally {
      setDeleting(false);
      setDeleteFeedId(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle>Manage Feeds</SheetTitle>
            <SheetDescription>Add, edit, and monitor your RSS feed sources.</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
            {/* Add New Feed Form */}
            <div className="space-y-3 pb-4">
              <h3 className="text-sm font-semibold">Add New Feed</h3>
              {editingFeed ? (
                /* Edit mode */
                <div className="space-y-3 rounded-lg border p-3">
                  <div>
                    <Label htmlFor="edit-name" className="text-xs">Name</Label>
                    <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Feed name" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-url" className="text-xs">URL</Label>
                    <Input id="edit-url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://..." className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="edit-interval" className="text-xs">Poll Interval</Label>
                    <Select value={editPollInterval} onValueChange={setEditPollInterval}>
                      <SelectTrigger id="edit-interval" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POLL_INTERVALS.map((interval) => (
                          <SelectItem key={interval} value={interval}>{interval}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving || !editName.trim() || !editUrl.trim()}>
                      {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={saving}>Cancel</Button>
                  </div>
                </div>
              ) : (
                /* Add mode */
                <div className="space-y-3 rounded-lg border p-3">
                  <div>
                    <Label htmlFor="feed-name" className="text-xs">Name</Label>
                    <Input id="feed-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Points Guy" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="feed-url" className="text-xs">URL</Label>
                    <Input id="feed-url" value={url} onChange={(e) => { setUrl(e.target.value); setTestResult(null); }} placeholder="https://thepointsguy.com/feed/" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="feed-interval" className="text-xs">Poll Interval</Label>
                    <Select value={pollInterval} onValueChange={setPollInterval}>
                      <SelectTrigger id="feed-interval" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POLL_INTERVALS.map((interval) => (
                          <SelectItem key={interval} value={interval}>{interval}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {testResult && (
                    <div className={`flex items-start gap-2 rounded-md p-2 text-xs ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {testResult.success ? <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleTestFeed} disabled={testing || !url.trim()}>
                      {testing && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Test Feed
                    </Button>
                    <Button size="sm" onClick={handleAddFeed} disabled={adding || !name.trim() || !url.trim()}>
                      {adding && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Add Feed
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Feed List */}
            <div className="py-4 space-y-3">
              <h3 className="text-sm font-semibold">Configured Feeds</h3>
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              )}
              {!loading && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Failed to load feeds. Please try again.
                </div>
              )}
              {!loading && !error && feeds.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No feeds configured yet. Add your first feed above.
                </div>
              )}
              {!loading && !error && feeds.map((feed) => (
                <FeedRow
                  key={feed.id}
                  feed={feed}
                  onEdit={handleEdit}
                  onPause={handlePause}
                  onResume={handleResume}
                  onRetry={handleRetry}
                  onPollNow={handlePollNow}
                  onDelete={(id) => setDeleteFeedId(id)}
                />
              ))}
            </div>

            <Separator />

            {/* Daily Digest (Slack) — Coming Soon */}
            <div className="py-4 space-y-3 pb-6">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Daily Digest (Slack)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Slack digest integration — Coming Soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <div className="rounded-lg border p-3 opacity-50 cursor-not-allowed space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Enable daily digest</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span><Switch disabled /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Slack digest integration — Coming Soon</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input disabled value="09:00 AM" className="w-28 text-xs" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Slack digest integration — Coming Soon</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-xs text-muted-foreground">Delivery time</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteFeedId !== null} onOpenChange={(isOpen) => { if (!isOpen) setDeleteFeedId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feed? The feed will stop being polled, but all
              previously ingested articles will be retained and continue to appear in your article tabs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Delete Feed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
