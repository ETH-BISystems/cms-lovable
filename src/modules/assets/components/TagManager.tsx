/**
 * TagManager Component
 *
 * A dialog for managing taxonomy tags used in the Asset Library filters.
 * Supports: Airlines, Hotels, Cabins, Aircraft, Asset Types.
 *
 * Features:
 * - Add new tags to any category
 * - Rename existing tags
 * - Archive tags (hides from filters but preserves existing tag data)
 * - Unarchive tags (restore from archive)
 * - View archived tags in a separate section
 * - NO deletion — ensures existing tagged assets retain their metadata
 *
 * Data is stored in Firestore `asset-taxonomy/{category}` documents.
 * Merges with hardcoded defaults — hardcoded tags are always available.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Check,
  X,
  Tags,
  Plane,
  Hotel,
  Armchair,
  PlaneTakeoff,
  ImageIcon,
  Loader2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  subscribeToTaxonomyCategory,
  saveTaxonomyCategory,
} from '../services/taxonomyService';

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TagCategory = 'airlines' | 'hotels' | 'cabins' | 'aircraft' | 'assetTypes';

interface TagItem {
  name: string;
  archived: boolean;
  createdAt?: string;
  renamedFrom?: string;
}

interface CategoryData {
  tags: TagItem[];
  updatedAt?: string;
}

const CATEGORY_CONFIG: Record<TagCategory, { label: string; icon: React.ElementType; placeholder: string }> = {
  airlines: { label: 'Airlines', icon: Plane, placeholder: 'e.g. Emirates, Qantas...' },
  hotels: { label: 'Hotels', icon: Hotel, placeholder: 'e.g. Marriott Bonvoy, Hyatt...' },
  cabins: { label: 'Cabins', icon: Armchair, placeholder: 'e.g. First, Business...' },
  aircraft: { label: 'Aircraft', icon: PlaneTakeoff, placeholder: 'e.g. Boeing 787-9, A350...' },
  assetTypes: { label: 'Asset Types', icon: ImageIcon, placeholder: 'e.g. Photo, Infographic...' },
};

/**
 * Hardcoded default tags — these are ALWAYS available in filters regardless
 * of what's in Firestore. They represent tags already used on 2000+ images.
 * The Tag Manager shows them as "built-in" tags that can be archived but not deleted.
 */
const DEFAULT_TAGS: Record<TagCategory, string[]> = {
  airlines: [
    'ANA', 'Air Canada', 'Air France-KLM', 'American Airlines', 'British Airways',
    'Cathay Pacific', 'Delta Air Lines', 'Emirates', 'Etihad Airways', 'EVA Air',
    'Iberia', 'JAL', 'JetBlue', 'Korean Air', 'Lufthansa', 'Qantas',
    'Qatar Airways', 'Singapore Airlines', 'Southwest Airlines', 'Thai Airways',
    'Turkish Airlines', 'United Airlines', 'Virgin Atlantic',
  ],
  hotels: [
    'Hilton Honors', 'IHG One Rewards', 'Marriott Bonvoy', 'World of Hyatt',
    'Accor Live Limitless', 'Choice Privileges', 'Wyndham Rewards',
  ],
  cabins: ['First', 'Business', 'Premium Economy', 'Economy'],
  aircraft: [
    'Boeing 737-800', 'Boeing 737 MAX 8', 'Boeing 747-400', 'Boeing 757-200',
    'Boeing 767-300ER', 'Boeing 777-200ER', 'Boeing 777-300ER', 'Boeing 777X',
    'Boeing 787-8 Dreamliner', 'Boeing 787-9 Dreamliner', 'Boeing 787-10 Dreamliner',
    'Airbus A220-300', 'Airbus A319', 'Airbus A320neo', 'Airbus A321neo',
    'Airbus A321XLR', 'Airbus A330-300', 'Airbus A330-900neo', 'Airbus A340-600',
    'Airbus A350-900', 'Airbus A350-1000', 'Airbus A380',
    'Embraer E175', 'Embraer E190-E2', 'Embraer E195-E2',
  ],
  assetTypes: [
    'Photo', 'Screenshot', 'Infographic', 'Card Art',
    'Issuer Logo', 'Airline Logo', 'Hotel Logo', 'Alliance Logo',
    'Program Logo', 'Team Photo',
  ],
};

/**
 * Merge hardcoded defaults with Firestore custom tags.
 * - Hardcoded tags are always present (marked as built-in)
 * - Custom tags from Firestore are added on top
 * - If a Firestore tag matches a hardcoded one (by name), the Firestore version wins
 *   (allows archiving a default tag via Firestore override)
 */
function mergeWithDefaults(category: TagCategory, firestoreTags: TagItem[]): TagItem[] {
  const defaults = DEFAULT_TAGS[category] || [];
  const firestoreMap = new Map(firestoreTags.map(t => [t.name.toLowerCase(), t]));

  // Start with defaults, allowing Firestore to override their archived state
  const merged: TagItem[] = defaults.map(name => {
    const override = firestoreMap.get(name.toLowerCase());
    if (override) {
      return override; // Firestore version wins (may be archived, renamed, etc.)
    }
    return { name, archived: false }; // Default: active, built-in
  });

  // Add any custom tags from Firestore that aren't already in defaults
  for (const tag of firestoreTags) {
    if (!defaults.some(d => d.toLowerCase() === tag.name.toLowerCase())) {
      merged.push(tag);
    }
  }

  return merged;
}

export function TagManager({ open, onOpenChange }: TagManagerProps) {
  const [activeCategory, setActiveCategory] = useState<TagCategory>('airlines');
  const [categoryData, setCategoryData] = useState<Record<TagCategory, CategoryData>>({
    airlines: { tags: [] },
    hotels: { tags: [] },
    cabins: { tags: [] },
    aircraft: { tags: [] },
    assetTypes: { tags: [] },
  });
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Load taxonomy data (production: Firestore `asset-taxonomy/{category}` docs)
  // and merge with defaults
  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const unsubscribers: (() => void)[] = [];

    for (const category of Object.keys(CATEGORY_CONFIG) as TagCategory[]) {
      const unsub = subscribeToTaxonomyCategory(category, (data) => {
        const firestoreTags = data.tags || [];
        const merged = mergeWithDefaults(category, firestoreTags);
        setCategoryData(prev => ({ ...prev, [category]: { tags: merged } }));
        setLoading(false);
      }, () => {
        // Load error or doc doesn't exist — use defaults only
        const merged = mergeWithDefaults(category, []);
        setCategoryData(prev => ({ ...prev, [category]: { tags: merged } }));
        setLoading(false);
      });
      unsubscribers.push(unsub);
    }

    return () => unsubscribers.forEach(u => u());
  }, [open]);

  const currentTags = categoryData[activeCategory]?.tags || [];
  const activeTags = currentTags.filter(t => !t.archived);
  const archivedTags = currentTags.filter(t => t.archived);
  const filteredActiveTags = tagSearch
    ? activeTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : activeTags;

  const saveCategory = useCallback(async (category: TagCategory, tags: TagItem[]) => {
    setSaving(true);
    try {
      await saveTaxonomyCategory(category, tags);
    } catch (err) {
      console.error('[TagManager] Save failed:', err);
      toast.error('Failed to save tag', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, []);

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (!name) return;

    // Check for duplicates
    if (currentTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Tag already exists');
      return;
    }

    const newTags = [...currentTags, { name, archived: false, createdAt: new Date().toISOString() }];
    await saveCategory(activeCategory, newTags);
    setNewTagName('');
    setAddingNew(false);
    toast.success(`Added "${name}" to ${CATEGORY_CONFIG[activeCategory].label}`);
  };

  const handleRename = async (oldName: string) => {
    const newName = editValue.trim();
    if (!newName || newName === oldName) {
      setEditingTag(null);
      return;
    }

    if (currentTags.some(t => t.name.toLowerCase() === newName.toLowerCase() && t.name !== oldName)) {
      toast.error('A tag with that name already exists');
      return;
    }

    const newTags = currentTags.map(t =>
      t.name === oldName ? { ...t, name: newName, renamedFrom: t.renamedFrom || oldName } : t
    );
    await saveCategory(activeCategory, newTags);
    setEditingTag(null);
    toast.success(`Renamed "${oldName}" → "${newName}"`);
  };

  const handleArchive = async (name: string) => {
    const newTags = currentTags.map(t =>
      t.name === name ? { ...t, archived: true } : t
    );
    await saveCategory(activeCategory, newTags);
    toast.success(`"${name}" archived`);
  };

  const handleUnarchive = async (name: string) => {
    const newTags = currentTags.map(t =>
      t.name === name ? { ...t, archived: false } : t
    );
    await saveCategory(activeCategory, newTags);
    toast.success(`"${name}" restored`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-accent" />
            Tag Manager
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Manage filter options for the Asset Library. Archived tags are hidden from filters but existing tagged assets keep their metadata.
          </p>
        </DialogHeader>

        <Tabs value={activeCategory} onValueChange={(v) => { setActiveCategory(v as TagCategory); setAddingNew(false); setEditingTag(null); setShowArchived(false); setTagSearch(''); }}>
          <TabsList className="w-full grid grid-cols-5">
            {(Object.entries(CATEGORY_CONFIG) as [TagCategory, typeof CATEGORY_CONFIG[TagCategory]][]).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="text-[10px] gap-1 px-1">
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(CATEGORY_CONFIG) as TagCategory[]).map(category => (
            <TabsContent key={category} value={category} className="flex-1 overflow-hidden mt-3">
              <div className="space-y-3">
                {/* Active tags header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Active Tags ({activeTags.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {archivedTags.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] gap-1 text-muted-foreground"
                        onClick={() => setShowArchived(!showArchived)}
                      >
                        <Archive className="w-3 h-3" />
                        Archived ({archivedTags.length})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-[10px] gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => { setAddingNew(true); setNewTagName(''); }}
                    >
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  </div>
                </div>

                {/* Add new tag input */}
                {addingNew && (
                  <div className="flex items-center gap-2 bg-accent/5 rounded-lg p-2 border border-accent/20">
                    <Input
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      placeholder={CATEGORY_CONFIG[category].placeholder}
                      className="h-8 text-sm flex-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); if (e.key === 'Escape') setAddingNew(false); }}
                    />
                    <Button size="sm" className="h-8 w-8 p-0" onClick={handleAddTag} disabled={!newTagName.trim()}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setAddingNew(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Search tags */}
                {!addingNew && activeTags.length > 6 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={tagSearch}
                      onChange={e => setTagSearch(e.target.value)}
                      placeholder="Search tags..."
                      className="h-8 text-sm pl-8"
                    />
                  </div>
                )}

                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* Active tags list */}
                {!loading && (
                  <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
                    {filteredActiveTags.length === 0 && !addingNew && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        {tagSearch ? `No tags matching "${tagSearch}"` : 'All tags are archived. Click "Archived" to restore them.'}
                      </p>
                    )}
                    {filteredActiveTags.map(tag => {
                      const isBuiltIn = DEFAULT_TAGS[activeCategory]?.some(d => d.toLowerCase() === tag.name.toLowerCase()) || false;
                      return (
                      <div key={tag.name} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 group transition-colors">
                        {editingTag === tag.name ? (
                          <>
                            <Input
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="h-7 text-sm flex-1"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleRename(tag.name); if (e.key === 'Escape') setEditingTag(null); }}
                            />
                            <Button size="sm" className="h-7 w-7 p-0" onClick={() => handleRename(tag.name)}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingTag(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-foreground flex-1">{tag.name}</span>
                            {isBuiltIn && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded text-muted-foreground/70 bg-muted/50 border border-border/50">default</span>
                            )}
                            {tag.renamedFrom && (
                              <Badge variant="secondary" className="text-[9px] h-4">was: {tag.renamedFrom}</Badge>
                            )}
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                              onClick={() => { setEditingTag(tag.name); setEditValue(tag.name); }}
                              title="Rename"
                            >
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            </button>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                              onClick={() => handleArchive(tag.name)}
                              title="Archive (hide from filters)"
                            >
                              <Archive className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}

                {/* Archived section */}
                {showArchived && archivedTags.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Archived ({archivedTags.length})
                    </span>
                    <div className="max-h-[150px] overflow-y-auto space-y-1 mt-2 pr-1">
                      {archivedTags.map(tag => (
                        <div key={tag.name} className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30">
                          <span className="text-sm text-muted-foreground flex-1 line-through">{tag.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px] gap-1 text-accent"
                            onClick={() => handleUnarchive(tag.name)}
                          >
                            <ArchiveRestore className="w-3 h-3" /> Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {saving && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
