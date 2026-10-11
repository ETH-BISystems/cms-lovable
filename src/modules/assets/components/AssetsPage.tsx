/**
 * AssetsPage Component
 *
 * Main page for Asset Manager module.
 * Integrates all components: NeedsIntakeBanner, FilterBar, AssetGrid/AssetListView,
 * BulkActionsToolbar, ArticlePicker, and all dialogs.
 */

import React, { useState } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload, Sparkles, Tags, Archive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';
import { AssetGrid } from './AssetGrid';
import { AssetListView } from './AssetListView';
import { NeedsIntakeBanner } from './NeedsIntakeBanner';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { UploadDialog } from './UploadDialog';
import { BatchEditDialog } from './BatchEditDialog';
import { GenerateAIImageDialog } from './GenerateAIImageDialog';
import { AssetDetailPanel } from './AssetDetailPanel';
import { AIIntakeFlow } from './AIIntakeFlow';
import { BrandAssetsCDN } from './BrandAssetsCDN';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { WebflowSyncDialog } from './WebflowSyncDialog';
import { ExportDialog } from './ExportDialog';
import { TagManager } from './TagManager';
import { AssetsProvider, useAssetsContext } from '../context/AssetsContext';
import { useAssetDetail } from '../hooks/useAssetDetail';
import { useAssetMutations } from '../hooks/useAssetMutations';
import { searchAssets } from '../services/assetService';
import type { AssetDocument } from '../types';

function AssetsPageContent() {
  const {
    assets,
    filters,
    setFilters,
    sortOption,
    setSortOption,
    viewMode,
    setViewMode,
  } = useAssetsContext();
  const { mutationState, deleteOne } = useAssetMutations();

  // State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetDocument[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [showAIIntake, setShowAIIntake] = useState(false);
  const [activeTab, setActiveTab] = useState('all-assets');
  const [pageSize, setPageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(0);

  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [generateAIDialogOpen, setGenerateAIDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [webflowSyncDialogOpen, setWebflowSyncDialogOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false);
  const [deleteWarnings, setDeleteWarnings] = useState<any[]>([]);

  // Active asset detail
  const { asset: activeAsset } = useAssetDetail(activeAssetId);

  // Display assets (search results or filtered assets)
  const visibleAssets = (searchQuery.length > 0 ? searchResults : assets.assets);
  const allDisplayAssets = visibleAssets.filter((a) => a.status !== 'archived');
  const archivedAssets = visibleAssets.filter((a) => a.status === 'archived');

  // Pagination
  const totalAssets = allDisplayAssets.length;
  const totalPages = Math.ceil(totalAssets / pageSize);
  const paginatedAssets = allDisplayAssets.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Reset page when filters/search/sort change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filters, sortOption, pageSize]);

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      const results = await searchAssets(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  // Selection handlers
  const handleSelect = (assetId: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const getSelectedAssets = () => {
    return allDisplayAssets.filter((a) => selectedIds.has(a.id));
  };

  // Check if any selected assets are drafts
  const selectedAssetsHaveDraft = getSelectedAssets().some(
    (a) => a.status === 'draft'
  );

  // Asset actions
  const handleAssetClick = (asset: AssetDocument) => {
    setActiveAssetId(asset.id);
    setShowAIIntake(false);
  };

  const handleUploadComplete = (assetId: string) => {
    setActiveAssetId(assetId);
    setShowAIIntake(true);
  };

  // CMS-158: after a bulk upload, auto-select the new assets and open the
  // batch editor so shared keywords/description/tags land in one action.
  const handleBulkUploadComplete = (assetIds: string[]) => {
    if (assetIds.length === 0) return;
    setSelectedIds(new Set(assetIds));
    setBatchEditDialogOpen(true);
  };

  // Google Drive imports land as ordinary assets — select them so the
  // library's existing bulk actions (tag/export/sync) apply immediately.
  const handleDriveImportComplete = (assetIds: string[]) => {
    setSelectedIds(new Set(assetIds));
    setUploadDialogOpen(false);
    toast.success(
      `Imported ${assetIds.length} asset${assetIds.length !== 1 ? 's' : ''} from Google Drive — selected below for tagging.`
    );
  };

  // OAuth popup lands back here after connecting Google Drive.
  const [searchParams, setSearchParams] = useSearchParams();
  React.useEffect(() => {
    const drive = searchParams.get('drive');
    if (!drive) return;
    if (drive === 'connected') {
      toast.success('Google Drive connected — the whole team can now import from it.');
    } else if (drive === 'error') {
      const reason = searchParams.get('reason');
      toast.error('Google Drive connection failed', {
        description: reason ? `Reason: ${reason}` : undefined,
      });
    }
    searchParams.delete('drive');
    searchParams.delete('reason');
    setSearchParams(searchParams, { replace: true });
    // When this page is the OAuth popup, close it — the main window picks
    // the connection up via its status polling.
    if (window.opener && !window.opener.closed) {
      window.close();
    }
  }, [searchParams, setSearchParams]);

  const handleDelete = async () => {
    const selectedAssets = getSelectedAssets();
    if (selectedAssets.length === 0) return;

    // Check usage for first asset (simplified - in production check all)
    const result = await deleteOne({ assetId: selectedAssets[0].id });

    if (result.usageCount > 0) {
      setDeleteWarnings(result.usageWarnings);
      setDeleteDialogOpen(true);
    } else {
      // Proceed with delete
      await confirmDelete();
    }
  };

  const confirmDelete = async () => {
    const selectedAssets = getSelectedAssets();
    for (const asset of selectedAssets) {
      await deleteOne({ assetId: asset.id });
    }
    setDeleteDialogOpen(false);
    setDeleteWarnings([]);
    handleClearSelection();
  };

  // Needs Intake Banner handlers
  const handleReviewNow = () => {
    setFilters({ ...filters, aiIntakeOnly: true });
  };

  const handleShowAll = () => {
    setFilters({ ...filters, aiIntakeOnly: false });
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight text-foreground">Asset Library</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {totalAssets.toLocaleString()} asset{totalAssets !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setTagManagerOpen(true)}
            className="gap-2"
            size="sm"
          >
            <Tags className="h-3.5 w-3.5" />
            Tag Manager
          </Button>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="gap-2"
            size="sm"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          <Button
            variant="outline"
            onClick={() => setGenerateAIDialogOpen(true)}
            className="gap-2"
            size="sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Generate
          </Button>
        </div>
      </div>

      {/* Tabs: All Assets / Brand Assets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="all-assets">All Assets</TabsTrigger>
            <TabsTrigger value="brand-assets">Brand Assets</TabsTrigger>
            <TabsTrigger value="archived">Archived{archivedAssets.length > 0 ? ` (${archivedAssets.length})` : ''}</TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="flex-1 max-w-[200px]">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        <TabsContent value="all-assets" className="space-y-4 mt-4">
          {/* Needs Intake Banner */}
          <NeedsIntakeBanner
            draftCount={assets.draftCount}
            isFilterActive={filters.aiIntakeOnly}
            filteredCount={allDisplayAssets.length}
            onReviewNow={handleReviewNow}
            onShowAll={handleShowAll}
          />

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onChange={setFilters}
            sortOption={sortOption}
            onSortChange={setSortOption}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Bulk Actions Toolbar */}
          {selectedIds.size > 0 && (
            <BulkActionsToolbar
              selectedCount={selectedIds.size}
              selectedAssetIds={Array.from(selectedIds)}
              selectedAssetsHaveDraft={selectedAssetsHaveDraft}
              onBatchEdit={() => setBatchEditDialogOpen(true)}
              onExport={() => setExportDialogOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
              onClearSelection={handleClearSelection}
            />
          )}

          {/* Asset Grid or List View */}
          {viewMode === 'grid' ? (
            <AssetGrid
              assets={paginatedAssets}
              loading={assets.loading}
              error={assets.error}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onAssetClick={handleAssetClick}
            />
          ) : (
            <AssetListView
              assets={paginatedAssets}
              loading={assets.loading}
              error={assets.error}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onAssetClick={handleAssetClick}
            />
          )}

          {/* Pagination Controls */}
          {totalAssets > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-2">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 rounded-md border border-input bg-background px-2 text-[13px] font-medium focus:ring-1 focus:ring-accent"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>per page</span>
                <span className="mx-1.5 text-border">·</span>
                <span className="font-medium text-foreground">
                  {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, totalAssets)}
                </span>
                <span>of {totalAssets.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(0)}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="px-2.5 text-xs font-medium text-muted-foreground">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(totalPages - 1)}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="brand-assets" className="mt-4 space-y-8">
          <BrandAssetsCDN />
          <div className="border-t pt-6">
            {viewMode === 'grid' ? (
              <AssetGrid
                assets={paginatedAssets}
                loading={assets.loading}
                error={assets.error}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onAssetClick={handleAssetClick}
              />
            ) : (
              <AssetListView
                assets={paginatedAssets}
                loading={assets.loading}
                error={assets.error}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onAssetClick={handleAssetClick}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="archived" className="mt-4 space-y-4">
          {archivedAssets.length === 0 ? (
            <div className="bg-card rounded-xl border border-border/70 shadow-card p-10 text-center animate-fade-in">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Archive className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[14px] font-semibold text-foreground">No archived assets</p>
              <p className="text-[12px] text-muted-foreground mt-1">Archive assets from their detail panel to move them out of the main library without deleting them.</p>
            </div>
          ) : (
            <AssetGrid
              assets={archivedAssets}
              loading={assets.loading}
              error={assets.error}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onAssetClick={handleAssetClick}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
        onBulkUploadComplete={handleBulkUploadComplete}
        onDriveImportComplete={handleDriveImportComplete}
      />

      {/* Batch Edit Dialog (CMS-158) */}
      <BatchEditDialog
        open={batchEditDialogOpen}
        onOpenChange={setBatchEditDialogOpen}
        assetIds={Array.from(selectedIds)}
        onApplied={handleClearSelection}
      />

      {/* Generate AI Image Dialog */}
      <GenerateAIImageDialog
        open={generateAIDialogOpen}
        onOpenChange={setGenerateAIDialogOpen}
        onSuccess={() => {
          setGenerateAIDialogOpen(false);
        }}
      />

      {/* Asset Detail Panel */}
      {!showAIIntake && (
        <AssetDetailPanel
          asset={activeAsset}
          open={activeAssetId !== null && !showAIIntake}
          onOpenChange={(open) => {
            if (!open) {
              setActiveAssetId(null);
            }
          }}
          onDelete={async () => {
            if (!activeAsset) return;
            const result = await deleteOne({ assetId: activeAsset.id });
            if (result.usageCount > 0) {
              setDeleteWarnings(result.usageWarnings);
              setDeleteDialogOpen(true);
            } else {
              setActiveAssetId(null);
            }
          }}
          onSync={() => setWebflowSyncDialogOpen(true)}
          onAIIntake={() => setShowAIIntake(true)}
        />
      )}

      {/* AI Intake Flow */}
      {showAIIntake && activeAsset && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l bg-background p-6 shadow-lg">
            <AIIntakeFlow
              assetId={activeAsset.id}
              filename={activeAsset.filename}
              category={activeAsset.category}
              initialDescription={activeAsset.description}
              onComplete={() => {
                setShowAIIntake(false);
                setActiveAssetId(null);
              }}
              onCancel={() => {
                setShowAIIntake(false);
                setActiveAssetId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        assetCount={selectedIds.size}
        usageWarnings={deleteWarnings}
      />

      {/* Webflow Sync Dialog */}
      <WebflowSyncDialog
        open={webflowSyncDialogOpen}
        onOpenChange={setWebflowSyncDialogOpen}
        assets={getSelectedAssets().length > 0 ? getSelectedAssets() : activeAsset ? [activeAsset] : []}
        onComplete={() => {
          setWebflowSyncDialogOpen(false);
          handleClearSelection();
        }}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        assetIds={Array.from(selectedIds)}
      />

      {/* Tag Manager Dialog */}
      <TagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
      />
    </div>
  );
}

// Exported wrapper with provider
export function AssetsPage() {
  return (
    <AssetsProvider>
      <AssetsPageContent />
    </AssetsProvider>
  );
}
