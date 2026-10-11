import { useState } from 'react';
import { Link2, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { callImportSocialPost } from '../services/experienceService';

interface ImportSocialDialogProps {
  open: boolean;
  onClose: () => void;
}

const PLATFORM_HINTS: Array<{ label: string; hint: string }> = [
  { label: 'YouTube', hint: 'caption + subtitle track imported (manual subtitles → high confidence)' },
  { label: 'TikTok', hint: 'caption imported; paste the spoken transcript below for full fidelity' },
  { label: 'Instagram', hint: 'caption + thumbnail + engagement imported; paste transcript for Reels audio' },
  { label: 'X/Twitter', hint: 'full post text imported automatically' },
  { label: 'LinkedIn', hint: 'post text imported; paste to override' },
  { label: 'Facebook', hint: 'post text imported; paste transcript for videos' },
  { label: 'Pinterest', hint: 'pin description imported; paste to override' },
];

/**
 * Import a social post into the Experience Library by URL — TikTok,
 * Instagram, Facebook, YouTube, X/Twitter, LinkedIn, or Pinterest. Reads go
 * through Zernio, so the post must belong to an account connected in
 * Settings → Social Accounts; the error says so plainly when it doesn't. The
 * optional manual transcript paste is the spec's high-confidence override.
 */
export function ImportSocialDialog({ open, onClose }: ImportSocialDialogProps) {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [brand, setBrand] = useState('EPM');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Paste a social post URL to import');
      return;
    }
    setImporting(true);
    try {
      const result = await callImportSocialPost({
        url: trimmed,
        transcriptOverride: transcript.trim() || undefined,
        brand,
      });
      if (result.needsManualTranscript) {
        toast.warning('Post imported without a transcript', {
          description: 'The platform did not expose text for this post — open it and paste the transcript, then re-import the same URL.',
        });
      } else {
        toast.success(
          result.alreadyExisted ? 'Post re-imported (updated existing item)' : 'Post imported to Experience Library',
          { description: `${result.platform} · ${result.transcriptLength.toLocaleString()} transcript chars · ${result.confidence} confidence` }
        );
      }
      setUrl('');
      setTranscript('');
      onClose();
    } catch (err) {
      toast.error('Import failed', { description: (err as Error).message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Import Social Post
          </DialogTitle>
          <DialogDescription>
            Paste a TikTok, Instagram, Facebook, YouTube, X/Twitter, LinkedIn, or Pinterest post link.
            The post must belong to an account connected via Zernio (Settings → Social Accounts or
            the Handles dialog) — imports read through Zernio only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@handle/video/…"
              className="pl-8"
              disabled={importing}
            />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">Brand</p>
            <Select value={brand} onValueChange={setBrand} disabled={importing}>
              <SelectTrigger className="h-8 text-xs w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EPM" className="text-xs">EPM — Elite Points &amp; Miles</SelectItem>
                <SelectItem value="CC" className="text-xs">CC — Counting Countries</SelectItem>
                <SelectItem value="JF" className="text-xs">JF — Justin Froeber</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              Manual transcript <span className="font-normal">(optional — overrides the automatic pull, saved as high confidence)</span>
            </p>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste the spoken transcript here if the platform doesn't expose it…"
              className="text-xs min-h-[90px]"
              disabled={importing}
            />
          </div>

          <div className="rounded-md bg-muted/40 p-2.5 space-y-0.5">
            {PLATFORM_HINTS.map(({ label, hint }) => (
              <p key={label} className="text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">{label}:</span> {hint}
              </p>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || !url.trim()} className="gap-1.5">
            {importing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</> : <><Download className="w-3.5 h-3.5" /> Import</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
