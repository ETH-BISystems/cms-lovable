import { useState, useMemo } from 'react';
import { X, Search, ImageIcon, Upload, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Asset {
  id: string;
  filename: string;
  description: string;
  altText: string;
  category: string;
  width: number;
  height: number;
  sizeBytes: number;
  tags: string[];
  isDraft: boolean;
}

// Placeholder assets for the picker
const MOCK_ASSETS: Asset[] = [
  { id: 'a1', filename: 'chase-sapphire-reserve-card.jpg', description: 'Chase Sapphire Reserve card image', altText: 'Chase Sapphire Reserve credit card', category: 'Card Art', width: 1200, height: 800, sizeBytes: 145000, tags: ['chase', 'sapphire', 'reserve'], isDraft: false },
  { id: 'a2', filename: 'amex-platinum-card.jpg', description: 'American Express Platinum card', altText: 'Amex Platinum credit card', category: 'Card Art', width: 1200, height: 800, sizeBytes: 132000, tags: ['amex', 'platinum'], isDraft: false },
  { id: 'a3', filename: 'jfk-centurion-lounge.jpg', description: 'JFK Centurion Lounge interior', altText: 'American Express Centurion Lounge at JFK', category: 'Lounge', width: 1600, height: 1067, sizeBytes: 285000, tags: ['lounge', 'jfk', 'centurion'], isDraft: false },
  { id: 'a4', filename: 'comparison-table-template.png', description: 'Card comparison table template', altText: 'Credit card comparison table', category: 'Infographic', width: 1400, height: 900, sizeBytes: 198000, tags: ['comparison', 'table'], isDraft: false },
  { id: 'a5', filename: 'draft-hero-image.jpg', description: 'Draft hero image - needs editing', altText: '', category: 'Hero', width: 1920, height: 1080, sizeBytes: 350000, tags: ['hero', 'draft'], isDraft: true },
  { id: 'a6', filename: 'venture-x-card.jpg', description: 'Capital One Venture X card', altText: 'Capital One Venture X credit card', category: 'Card Art', width: 1200, height: 800, sizeBytes: 128000, tags: ['capital-one', 'venture-x'], isDraft: false },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Card Art': 'bg-accent',
    'Lounge': 'bg-success',
    'Infographic': 'bg-warning',
    'Hero': 'bg-primary',
  };
  return colors[category] || 'bg-muted-foreground';
}

interface AssetLibraryPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  topicFilters?: { airlines?: string[]; cabinClass?: string; hotels?: string[]; tags?: string[] };
}

export function AssetLibraryPickerModal({ open, onClose, onSelect, topicFilters }: AssetLibraryPickerModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>(() => {
    const f: string[] = [];
    if (topicFilters?.tags) f.push(...topicFilters.tags.map(t => `tag:${t}`));
    return f;
  });

  const filteredAssets = useMemo(() => {
    let assets = MOCK_ASSETS;
    if (search) {
      const q = search.toLowerCase();
      assets = assets.filter(a =>
        a.filename.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.altText.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    activeFilters.forEach(f => {
      const [, value] = f.split(':');
      assets = assets.filter(a => a.tags.some(t => t.toLowerCase().includes(value.toLowerCase())));
    });
    return assets;
  }, [search, activeFilters]);

  const selectedAsset = selected ? MOCK_ASSETS.find(a => a.id === selected) : null;

  const handleSelect = () => {
    if (selectedAsset && !selectedAsset.isDraft) {
      onSelect(selectedAsset);
      onClose();
      setSelected(null);
      setSearch('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[700px] max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-[15px] font-bold">Select from Asset Library</DialogTitle>
        </DialogHeader>

        {/* Filters + Search */}
        <div className="px-5 py-3 space-y-2 shrink-0">
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Filters:</span>
              {activeFilters.map(f => (
                <Badge key={f} variant="secondary" className="text-[10px] gap-1 pr-1">
                  {f.split(':')[1]}
                  <button onClick={() => setActiveFilters(prev => prev.filter(x => x !== f))} className="ml-0.5 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
              <button onClick={() => setActiveFilters([])} className="text-[10px] text-primary hover:underline">Clear all</button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} className="h-9 text-[12px] pl-9" placeholder="Search images by name, description, or tags..." />
          </div>
          <p className="text-[10px] text-muted-foreground">{filteredAssets.length} images found</p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          <div className="grid grid-cols-3 gap-3">
            {filteredAssets.map(asset => {
              const isSelected = selected === asset.id;
              return (
                <div
                  key={asset.id}
                  onClick={() => !asset.isDraft && setSelected(asset.id)}
                  className={`relative rounded-lg border overflow-hidden cursor-pointer transition-all group ${
                    isSelected ? 'border-primary ring-2 ring-primary/30' :
                    asset.isDraft ? 'border-border opacity-60 cursor-not-allowed' :
                    'border-border hover:border-primary/40 hover:shadow-sm'
                  }`}
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center relative">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-medium text-white ${getCategoryColor(asset.category)}`}>
                      {asset.category}
                    </span>
                    {asset.isDraft && (
                      <div className="absolute inset-0 bg-muted/60 flex items-center justify-center">
                        <Badge className="text-[9px] border-0 bg-warning/80 text-warning-foreground">Draft</Badge>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-medium text-card-foreground truncate">{asset.filename}</p>
                    <p className="text-[9px] text-muted-foreground">{asset.width}×{asset.height} · {formatFileSize(asset.sizeBytes)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">No images match your search</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
          <button className="text-[11px] text-primary hover:underline flex items-center gap-1">
            <Upload className="w-3 h-3" /> Upload New Instead
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              className="h-8 text-[11px] bg-primary text-primary-foreground"
              disabled={!selectedAsset || selectedAsset.isDraft}
              onClick={handleSelect}
            >
              Select Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
