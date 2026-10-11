import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Trash2, Merge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { ContentRulesSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

export function ContentRulesTab() {
  const { data, loading, error, save } = useSettings<ContentRulesSettings>('contentRules');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('contentRules');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const taxonomy = data?.taxonomy || [];
  const tags = data?.freeformTags || [];
  const templates = data?.articleTemplates || [];

  return (
    <NotYetAvailable note="Content rules are shown for reference — editing is not yet wired, and no module consumes this document yet.">
    <div className="space-y-6">
      {/* Content Taxonomy */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Content Taxonomy</h3>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Category</Button>}
        </div>
        <div className="px-5 py-4">
          {taxonomy.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No categories configured. Add a category to organize content.</p>
          ) : (
            <div className="space-y-2">
              {taxonomy.map(cat => (
                <div key={cat.id} className="border border-border rounded-md">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {expandedCategory === cat.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span className="font-medium">{cat.name}</span>
                      <Badge variant="outline" className="text-[9px]">{cat.articleCount} articles</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{cat.subcategories.length} subcategories</span>
                  </button>
                  {expandedCategory === cat.id && (
                    <div className="px-4 pb-3 border-t border-border">
                      <div className="space-y-1.5 mt-2">
                        {cat.subcategories.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between py-1.5 pl-6 text-[11px]">
                            <span>{sub.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{sub.articleCount} articles</span>
                              {!readOnly && <button className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>}
                            </div>
                          </div>
                        ))}
                        {!readOnly && (
                          <Button variant="ghost" size="sm" className="text-[11px] h-7 mt-1 gap-1">
                            <Plus className="h-3 w-3" />Add Subcategory
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Freeform Tags */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Freeform Tags</h3>
          {!readOnly && (
            <Button variant="outline" size="sm" className="text-[12px] gap-1.5">
              <Merge className="h-3.5 w-3.5" />Merge Duplicates
            </Button>
          )}
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={data?.consistencyEnforcement || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Consistency Enforcement</label>
          </div>
          {tags.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No tags created yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-[11px]">
                  <span>{tag.name}</span>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">{tag.usageCount}</Badge>
                  {!readOnly && <button className="text-muted-foreground hover:text-destructive ml-0.5"><Trash2 className="h-2.5 w-2.5" /></button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Article Content Templates */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Article Content Templates</h3>
          {!readOnly && <Button variant="outline" size="sm" className="text-[12px] gap-1.5"><Plus className="h-3.5 w-3.5" />Add Template</Button>}
        </div>
        <div className="px-5 py-4">
          {templates.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No templates configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Name</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Target Length</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Schema Type</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Articles Using</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(tmpl => (
                    <tr key={tmpl.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{tmpl.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{tmpl.targetLength.toLocaleString()} words</td>
                      <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{tmpl.schemaType}</Badge></td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{tmpl.articlesUsing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Content Expiration Rules */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Content Expiration Rules</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={data?.expirationRules?.promotionExpiration || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Promotion Expiration</label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data?.expirationRules?.dealAlertExpiration || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Deal Alert Expiration</label>
          </div>
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[12px] font-medium text-muted-foreground">Sunset Policy</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Months Threshold</label>
                <Input type="number" value={data?.expirationRules?.sunsetPolicy?.monthsThreshold || 12} disabled={readOnly} className="text-[12px] h-8" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Action</label>
                <select disabled={readOnly} value={data?.expirationRules?.sunsetPolicy?.action || 'flag_for_review'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3 w-full">
                  <option value="flag_for_review">Flag for Review</option>
                  <option value="auto_redirect">Auto Redirect</option>
                  <option value="deindex_and_archive">Deindex & Archive</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canonical URL Rules */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Canonical URL Rules</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-muted-foreground">Default Behavior</label>
            <select disabled={readOnly} value={data?.canonicalUrlRules?.defaultBehavior || 'self_referencing'} className="text-[12px] h-8 rounded-md border border-input bg-background px-3">
              <option value="self_referencing">Self Referencing</option>
              <option value="blog_article_priority">Blog Article Priority</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data?.canonicalUrlRules?.autoDetection || false} disabled={readOnly} />
            <label className="text-[12px] text-muted-foreground">Auto-Detection</label>
          </div>
        </div>
      </div>
    </div>
    </NotYetAvailable>
  );
}
