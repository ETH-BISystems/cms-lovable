/**
 * BrandAssetsCDN Component
 *
 * Structured inventory of brand logo slots (issuers, airlines, hotels,
 * alliances, team photos) with CDN URL linking and bulk import.
 *
 * Copied from Lovable prototype and adapted to production:
 * - Mock MOCK_BRAND_SLOTS replaced with Firestore subscription via brandAssetsService
 * - "Save URL" wired to updateBrandAssetUrl Cloud Function
 * - "Bulk Import URLs" wired to bulkImportBrandUrls Cloud Function
 * - Loading/empty/error states added
 * - Toast via sonner instead of Lovable useToast
 *
 * Validates: Requirements 15 (Brand Assets CDN)
 */

import { useState, useEffect } from 'react';
import { Copy, Link, Upload, X, FileText, ChevronDown, ChevronRight, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  subscribeToBrandAssets,
  updateBrandAssetUrl,
  bulkImportBrandUrls,
} from '../services/brandAssetsService';
import type { BrandAssetSlot } from '../types';

export function BrandAssetsCDN() {
  const [slots, setSlots] = useState<BrandAssetSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Subscribe to brand assets from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToBrandAssets(
      (data) => {
        setSlots(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Brand assets subscription error:', err);
        setError('Failed to load brand assets');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const saveUrl = async (slotId: string, entityName: string) => {
    setSavingUrl(true);
    try {
      await updateBrandAssetUrl({ slotId, cdnUrl: urlInput });
      setEditingSlot(null);
      setUrlInput('');
      toast.success(`CDN URL saved for ${entityName} ✓`);
    } catch (err) {
      console.error('Save URL error:', err);
      toast.error('Failed to save CDN URL');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText.split('\n').filter(l => l.includes('|'));
    const rows = lines.map(line => {
      const [name, url] = line.split('|').map(s => s.trim());
      return { entityName: name, cdnUrl: url };
    }).filter(r => r.entityName && r.cdnUrl);

    if (rows.length === 0) {
      toast.error('No valid rows found');
      return;
    }

    setBulkImporting(true);
    try {
      const result = await bulkImportBrandUrls({ rows });
      setBulkOpen(false);
      setBulkText('');
      toast.success(`${result.matched} of ${result.total} URLs matched and saved ✓`);
    } catch (err) {
      console.error('Bulk import error:', err);
      toast.error('Failed to bulk import URLs');
    } finally {
      setBulkImporting(false);
    }
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">Loading brand assets...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12 space-y-3">
        <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (slots.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <Link className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
        <p className="text-sm font-medium">No brand asset slots configured</p>
        <p className="text-xs text-muted-foreground">Brand asset slots will appear here once configured in Firestore</p>
      </div>
    );
  }

  const grouped = slots.reduce((acc, s) => {
    const group = s.category;
    if (!acc[group]) acc[group] = [];
    acc[group].push(s);
    return acc;
  }, {} as Record<string, BrandAssetSlot[]>);

  const filledCount = slots.filter(s => s.cdnUrl).length;
  const totalCount = slots.length;

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Slots</p>
          <p className="text-2xl font-bold mt-1">{totalCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Filled</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{filledCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Empty</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{totalCount - filledCount}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Brand Assets — CDN Links</h3>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBulkOpen(true)}>
          <FileText className="h-3 w-3 mr-1" />Bulk Import URLs
        </Button>
      </div>

      {Object.entries(grouped).map(([group, groupSlots]) => {
        const isCollapsed = collapsedGroups.has(group);
        const filledInGroup = groupSlots.filter(s => s.cdnUrl).length;
        return (
          <Collapsible key={group} open={!isCollapsed} onOpenChange={() => toggleGroup(group)}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full pb-2 border-b border-border/60">
              {isCollapsed ? <ChevronRight className="h-4 w-4 text-accent" /> : <ChevronDown className="h-4 w-4 text-accent" />}
              <span className="text-xs font-semibold uppercase tracking-wider">{group}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1">{filledInGroup}/{groupSlots.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {groupSlots.map(slot => (
                <div key={slot.id} className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-all hover:shadow-sm ${editingSlot === slot.id ? 'ring-1 ring-accent' : ''}`}>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    slot.cdnUrl ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground border-2 border-dashed border-accent/20'
                  }`}>
                    {slot.cdnUrl ? (
                      <Check className="h-4 w-4" />
                    ) : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{slot.entityName}</p>
                    {slot.cdnUrl && editingSlot !== slot.id ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{slot.cdnUrl}</span>
                        <button onClick={() => { navigator.clipboard.writeText(slot.cdnUrl!); toast.success('URL copied ✓'); }}>
                          <Copy className="h-3 w-3 text-muted-foreground hover:text-accent" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {editingSlot === slot.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        placeholder="Paste CDN URL..."
                        className="h-8 text-xs w-64"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
                        onClick={() => saveUrl(slot.id, slot.entityName)}
                        disabled={savingUrl || !urlInput.trim()}
                      >
                        {savingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </Button>
                      <button onClick={() => setEditingSlot(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {slot.cdnUrl ? (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-accent hover:text-accent" onClick={() => { setEditingSlot(slot.id); setUrlInput(slot.cdnUrl || ''); }}>
                          Update URL
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs rounded-full border-accent/30 text-accent hover:bg-accent/5">
                            <Upload className="h-3 w-3 mr-1" />Upload
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs rounded-full border-accent/30 text-accent hover:bg-accent/5" onClick={() => { setEditingSlot(slot.id); setUrlInput(''); }}>
                            <Link className="h-3 w-3 mr-1" />CDN URL
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Bulk Import Modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import CDN URLs</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Paste rows in the format: <code className="bg-muted px-1 rounded">Entity Name | CDN URL</code> (one per line)</p>
          <Textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={`Marriott Bonvoy | https://cdn.example.com/logos/marriott.svg\nHilton Honors | https://cdn.example.com/logos/hilton.svg`}
            className="text-sm font-mono min-h-[120px]"
          />
          {bulkText && (
            <div className="text-xs text-muted-foreground">
              {bulkText.split('\n').filter(l => l.includes('|')).length} rows detected
            </div>
          )}
          <Button
            onClick={handleBulkImport}
            disabled={!bulkText.includes('|') || bulkImporting}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {bulkImporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
            ) : (
              'Import & Match'
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
