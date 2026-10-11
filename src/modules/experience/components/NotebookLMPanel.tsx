import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useExperienceTranscripts } from '../hooks/useExperienceTranscripts';
import { useExperienceExport } from '../hooks/useExperienceExport';
import type { NotebookLMPanelProps } from '../types';

/**
 * NotebookLMPanel — Sheet/drawer for NotebookLM export operations.
 */
export function NotebookLMPanel({ open, onClose }: NotebookLMPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<'structured' | 'raw'>('structured');
  const [lastDownloadUrl, setLastDownloadUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const { transcripts: allTranscripts, loading: loadingAll } = useExperienceTranscripts({});
  const { transcripts: pendingTranscripts, loading: loadingPending } = useExperienceTranscripts({
    exportedToNotebookLM: false,
  });

  const { exporting, exportSelected, exportAllPending } = useExperienceExport();

  const totalExported = allTranscripts.filter((t) => t.exportedToNotebookLM).length;
  const totalPending = pendingTranscripts.length;
  const totalCount = allTranscripts.length;
  const exportProgress = totalCount > 0 ? (totalExported / totalCount) * 100 : 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingTranscripts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingTranscripts.map((t) => t.id));
    }
  };

  const handleExportSelected = async () => {
    setExportError(null);
    try {
      const url = await exportSelected(selectedIds, format);
      setLastDownloadUrl(url);
      setSelectedIds([]);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleExportAll = async () => {
    setExportError(null);
    try {
      const url = await exportAllPending(format);
      setLastDownloadUrl(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>NotebookLM Export</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Export status */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Export Progress</span>
              <span className="font-medium">{totalExported} / {totalCount} exported</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{totalPending} pending</span>
              <span>{totalExported} exported</span>
            </div>
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="structured">Structured (Markdown)</SelectItem>
                <SelectItem value="raw">Raw Transcripts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error state */}
          {exportError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-xs">{exportError}</span>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setExportError(null)}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Download link */}
          {lastDownloadUrl && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-xs">Export ready!</span>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" asChild>
                  <a href={lastDownloadUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3 mr-1" /> Download
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleExportSelected}
              disabled={exporting || selectedIds.length === 0}
            >
              {exporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Export Selected ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportAll}
              disabled={exporting || totalPending === 0}
            >
              {exporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              Export All Pending
            </Button>
          </div>

          {/* Pending transcripts list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Pending Transcripts</h4>
              {pendingTranscripts.length > 0 && (
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={toggleSelectAll}>
                  {selectedIds.length === pendingTranscripts.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>

            {loadingPending ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pendingTranscripts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All transcripts have been exported.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {pendingTranscripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    className="flex items-start gap-3 p-2 border rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedIds.includes(transcript.id)}
                      onCheckedChange={() => toggleSelect(transcript.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {transcript.title || transcript.transcriptText.slice(0, 60) || 'Untitled'}
                      </p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span>{transcript.contributor}</span>
                        <Badge variant="outline" className="text-[9px] h-4">
                          {transcript.sourcePlatform}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
