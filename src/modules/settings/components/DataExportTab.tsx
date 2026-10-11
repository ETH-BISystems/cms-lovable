import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, FileJson, FileSpreadsheet, Archive, BarChart3, CreditCard, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { DataExportSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

const EXPORT_OPTIONS = [
  { type: 'articles', label: 'Articles', description: 'Export all articles with metadata, content, and SEO data', icon: FileText },
  { type: 'analytics', label: 'Analytics Snapshots', description: 'Export traffic, engagement, and performance data', icon: BarChart3 },
  { type: 'card_data', label: 'Card Data', description: 'Export credit card data, terms, and transfer partners', icon: CreditCard },
  { type: 'full_archive', label: 'Full Platform Archive', description: 'Complete data export of all platform data', icon: Archive },
] as const;

export function DataExportTab() {
  const { data, loading, error } = useSettings<DataExportSettings>('dataExport');
  const { canWrite, isAdmin } = useSettingsPermissions();
  const readOnly = !isAdmin;
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async (type: string, format: 'json' | 'csv') => {
    setExporting(type);
    setExportProgress(0);

    // Simulate progress for UX
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    try {
      // In production, this would call a Cloud Function
      await new Promise(resolve => setTimeout(resolve, 3000));
      setExportProgress(100);
      toast.success('Export completed', { description: `${type} exported as ${format.toUpperCase()}` });
    } catch (err) {
      toast.error('Export failed', { description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setExporting(null);
        setExportProgress(0);
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const exportHistory = data?.exportHistory || [];

  return (
    <NotYetAvailable note="Data export is not yet implemented — the previous buttons simulated an export without producing a real file. A Cloud Function-backed export is planned.">
    <div className="space-y-6">
      {/* Export Options */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Export Data</h3>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EXPORT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isCurrentlyExporting = exporting === opt.type;
              return (
                <div key={opt.type} className="border border-border rounded-md p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <span className="text-[13px] font-medium">{opt.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                  {isCurrentlyExporting ? (
                    <div className="space-y-2">
                      <Progress value={exportProgress} className="h-2" />
                      <p className="text-[10px] text-muted-foreground text-center">{exportProgress}% complete</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] gap-1.5 h-7"
                        onClick={() => handleExport(opt.type, 'json')}
                        disabled={readOnly || exporting !== null}
                      >
                        <FileJson className="h-3 w-3" />JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] gap-1.5 h-7"
                        onClick={() => handleExport(opt.type, 'csv')}
                        disabled={readOnly || exporting !== null}
                      >
                        <FileSpreadsheet className="h-3 w-3" />CSV
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Export History */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Export History</h3>
        </div>
        <div className="px-5 py-4">
          {exportHistory.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No exports have been performed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Format</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Size</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {exportHistory.map(exp => (
                    <tr key={exp.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 text-muted-foreground">{exp.date ? new Date(exp.date as unknown as string).toLocaleDateString() : '—'}</td>
                      <td className="py-2 px-2"><Badge variant="outline" className="text-[10px] capitalize">{exp.type.replace('_', ' ')}</Badge></td>
                      <td className="py-2 px-2 uppercase text-muted-foreground">{exp.format}</td>
                      <td className="py-2 px-2 text-muted-foreground">{exp.size}</td>
                      <td className="py-2 px-2 text-right">
                        {exp.downloadUrl ? (
                          <Button variant="ghost" size="sm" className="text-[11px] h-6 gap-1" asChild>
                            <a href={exp.downloadUrl} download>
                              <Download className="h-3 w-3" />Download
                            </a>
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Expired</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </NotYetAvailable>
  );
}
