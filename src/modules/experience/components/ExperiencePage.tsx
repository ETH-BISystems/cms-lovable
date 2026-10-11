import { useState } from 'react';
import { AtSign, Mic, Keyboard, BookOpen, Search, X, Filter, Download, ChevronDown, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useExperienceFilters } from '../hooks/useExperienceFilters';
import { useExperiences } from '../hooks/useExperiences';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { AudioWaveform } from './AudioWaveform';
import { InlineTagEditor } from './InlineTagEditor';
import { ArticlesNeedingExperience } from './ArticlesNeedingExperience';
import { CapturePanel } from './CapturePanel';
import { NotebookLMPanel } from './NotebookLMPanel';
import { ArticlePickerDialog } from './ArticlePickerDialog';
import { ImportSocialDialog } from './ImportSocialDialog';
import { ManageHandlesDialog } from './ManageHandlesDialog';
import { callUpdateExperienceTags } from '../services/experienceService';
import { getVideoEmbedSrc } from '../utils/videoEmbed';
import type { ExperienceItem, ExperienceSource, ExperienceTaxonomy, Brand } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<ExperienceSource, string> = {
  'voice-note': 'Voice Note',
  'editorial-note': 'Editorial Note',
  'tiktok': 'TikTok',
  'instagram': 'Instagram',
  'youtube': 'YouTube',
  'x-twitter': 'X/Twitter',
  'linkedin': 'LinkedIn',
  'facebook': 'Facebook',
  'pinterest': 'Pinterest',
};

// Soft badge tones for source chips — platform tags get accent/info tints
const SOURCE_VARIANTS: Record<ExperienceSource, BadgeProps['variant']> = {
  'voice-note': 'neutral',
  'editorial-note': 'neutral',
  'tiktok': 'accent',
  'instagram': 'accent',
  'youtube': 'info',
  'x-twitter': 'info',
  'linkedin': 'info',
  'facebook': 'info',
  'pinterest': 'accent',
};

const BRAND_COLORS: Record<Brand, string> = {
  EPM: 'bg-accent/10 text-accent',
  CC: 'bg-warning/15 text-amber-700',
  JF: 'bg-violet-500/10 text-violet-600',
};

const NOTE_TYPE_COLORS: Record<string, string> = {
  personal: 'bg-success/10 text-success',
  editorial: 'bg-warning/15 text-amber-700',
  refresh: 'bg-primary/10 text-primary',
};

// ─── Experience Card ─────────────────────────────────────────────────────────

function ExperienceCard({ item, playback, onAttach }: { item: ExperienceItem; playback: ReturnType<typeof useAudioPlayback>; onAttach: (item: ExperienceItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(false);

  const handleSaveTags = async (taxonomy: ExperienceTaxonomy) => {
    try {
      await callUpdateExperienceTags(item.id, taxonomy);
      toast.success('Tags saved');
      setEditingTags(false);
    } catch (err) {
      toast.error('Failed to save tags', { description: (err as Error).message });
    }
  };

  const isVoice = item.source === 'voice-note' || item.source === 'editorial-note';
  const isPlaying = playback.activeItemId === item.id && playback.isPlaying;
  // Script-less iframe src for inline playback (YouTube/TikTok/Instagram)
  const videoEmbedSrc = !isVoice && item.sourceUrl ? getVideoEmbedSrc(item.sourceUrl) : null;
  const videoIsWide = videoEmbedSrc?.startsWith('https://www.youtube-nocookie.com/') ?? false;

  return (
    <div className="bg-card rounded-xl border border-border/70 shadow-card card-interactive p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent text-[10px] font-semibold flex items-center justify-center shrink-0">
          {item.contributor.avatar}
        </div>
        <span className="text-[13px] font-medium text-foreground">{item.contributor.name}</span>
        {item.accountHandle && <span className="text-[11px] text-muted-foreground">{item.accountHandle}</span>}
        <span className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
        <Badge variant={SOURCE_VARIANTS[item.source] ?? 'neutral'} className="text-[10px]">{SOURCE_LABELS[item.source]}</Badge>
        {item.noteType && <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${NOTE_TYPE_COLORS[item.noteType]}`}>{item.noteType}</span>}
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${BRAND_COLORS[item.brand]}`}>{item.brand}</span>
        {item.aiConfidence && <StatusBadge status={`AI: ${item.aiConfidence}`} className="text-[10px]" />}
      </div>

      {/* Title */}
      {item.title && <p className="text-[13px] font-semibold text-foreground">{item.title}</p>}

      {/* Audio waveform for voice notes */}
      {isVoice && item.audioStoragePath && (
        <AudioWaveform
          audioStoragePath={item.audioStoragePath}
          duration={item.duration || 0}
          isPlaying={isPlaying}
          activeItemId={playback.activeItemId}
          itemId={item.id}
          onPlay={() => item.audioStoragePath && playback.play(item.id, item.audioStoragePath)}
          onPause={playback.pause}
        />
      )}

      {/* Video preview — thumbnail with inline script-less iframe playback */}
      {!isVoice && (item.thumbnailUrl || videoEmbedSrc) && (
        playingVideo && videoEmbedSrc ? (
          <div className="space-y-1.5">
            <div className={`rounded-lg overflow-hidden border border-border/70 bg-black/5 ${videoIsWide ? '' : 'max-w-[325px]'}`}>
              <iframe
                src={videoEmbedSrc}
                title={item.title || item.caption || 'Video preview'}
                className={videoIsWide ? 'w-full aspect-video' : 'w-full h-[580px]'}
                frameBorder="0"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-muted-foreground" onClick={() => setPlayingVideo(false)}>
              <X className="w-3 h-3 mr-1" /> Hide video
            </Button>
          </div>
        ) : item.thumbnailUrl ? (
          <button
            type="button"
            className="relative block rounded-lg overflow-hidden border border-border/70 group max-w-md"
            onClick={() => {
              if (videoEmbedSrc) setPlayingVideo(true);
              else if (item.sourceUrl) window.open(item.sourceUrl, '_blank');
            }}
            title={videoEmbedSrc ? 'Play video' : 'Open on platform'}
          >
            <img src={item.thumbnailUrl} alt={item.title || item.caption || 'Video thumbnail'} loading="lazy" className="w-full max-h-56 object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
              <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                <Play className="w-4 h-4 text-foreground ml-0.5" />
              </span>
            </span>
          </button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 rounded-full text-[11px] gap-1" onClick={() => setPlayingVideo(true)}>
            <Play className="w-3 h-3" /> Play video
          </Button>
        )
      )}

      {/* Engagement metrics for social posts */}
      {item.engagementMetrics && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {item.engagementMetrics.views != null && <span>👁 {formatCount(item.engagementMetrics.views)}</span>}
          {item.engagementMetrics.likes != null && <span>♡ {formatCount(item.engagementMetrics.likes)}</span>}
          {item.engagementMetrics.comments != null && <span>💬 {formatCount(item.engagementMetrics.comments)}</span>}
          {item.engagementMetrics.retweets != null && <span>🔄 {formatCount(item.engagementMetrics.retweets)}</span>}
        </div>
      )}

      {/* Caption */}
      {item.caption && !isVoice && <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>}

      {/* Transcript toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="h-6 px-1.5 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ease-out ${expanded ? 'rotate-180' : ''}`} />
        {expanded ? 'Hide transcript' : 'Show Transcript'}
      </Button>
      {expanded && (
        <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-accent/30 pl-3 animate-fade-in">
          "{item.transcript.slice(0, 500)}{item.transcript.length > 500 ? '...' : ''}"
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {item.taxonomy.airline && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent">{item.taxonomy.airline}</span>}
        {item.taxonomy.hotel && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/15 text-amber-700">{item.taxonomy.hotel}</span>}
        {item.taxonomy.destination && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">{item.taxonomy.destination}</span>}
        {item.taxonomy.cabinClass && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">{item.taxonomy.cabinClass}</span>}
        {item.taxonomy.creditCard && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent">{item.taxonomy.creditCard}</span>}
        {item.taxonomy.tags.slice(0, 5).map(t => (
          <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">{t}</span>
        ))}
      </div>

      {/* Attachment status */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {item.attachedArticles.length > 0 ? (
          <span className="text-success">⟷ Attached to {item.attachedArticles.length} article{item.attachedArticles.length > 1 ? 's' : ''}</span>
        ) : (
          <span>⟷ Not attached</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="h-7 rounded-full text-[11px]" onClick={() => onAttach(item)}>+ Attach to Article</Button>
        <Button variant="outline" size="sm" className="h-7 rounded-full text-[11px]" onClick={() => setEditingTags(!editingTags)}>🏷 Edit Tags</Button>
        {item.sourceUrl && (
          <Button variant="outline" size="sm" className="h-7 rounded-full text-[11px]" onClick={() => window.open(item.sourceUrl, '_blank')}>🔗 View Original</Button>
        )}
      </div>

      {/* Inline Tag Editor — persists via updateExperienceTags */}
      {editingTags && (
        <InlineTagEditor item={item} onSave={handleSaveTags} onCancel={() => setEditingTags(false)} />
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ExperiencePage() {
  const filters = useExperienceFilters();
  const playback = useAudioPlayback();
  const { items, totalCount, filteredCount, accountHandles, allItems, loading, error } = useExperiences({
    source: filters.activeTab === 'voice-notes' ? 'voice-note' : filters.activeSource || undefined,
    brand: filters.brandFilter || undefined,
    searchQuery: filters.searchQuery || undefined,
    usageStatus: filters.usageStatusFilter,
    accountHandle: filters.accountHandleFilter || undefined,
    taxonomyFilters: Object.keys(filters.taxonomyFilters).length > 0 ? filters.taxonomyFilters : undefined,
  });

  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<'record' | 'type'>('record');
  const [importOpen, setImportOpen] = useState(false);
  const [addHandleOpen, setAddHandleOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);

  const handleAttachClick = (item: ExperienceItem) => {
    setSelectedTranscriptId(item.id);
    setSelectedAttachments(item.attachedArticles.map(a => a.id));
    setAttachDialogOpen(true);
  };

  // Count articles needing experience dynamically
  const articlesNeedingCount = items.filter(i => i.attachedArticles.length === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tight text-foreground">Experience Library</h1>
          <p className="text-[13px] text-muted-foreground mt-1">{totalCount} items</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setCaptureMode('record'); setCaptureOpen(true); }} className="gap-1.5">
            <Mic className="w-4 h-4" /> Record New
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => { setCaptureMode('type'); setCaptureOpen(true); }}>
            <Keyboard className="w-4 h-4" /> Type New
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setAddHandleOpen(true)}>
            <AtSign className="w-4 h-4" /> Handles
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <Download className="w-4 h-4" /> Import Social Post
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setNotebookOpen(true)}>
            <BookOpen className="w-4 h-4" /> NotebookLM
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={filters.activeTab} onValueChange={(v) => filters.setActiveTab(v as typeof filters.activeTab)}>
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All Content</TabsTrigger>
            <TabsTrigger value="voice-notes">Voice Notes</TabsTrigger>
            <TabsTrigger value="social-posts">Social Posts</TabsTrigger>
            <TabsTrigger value="articles-needing">
              Articles Needing Experience
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={filters.searchQuery}
              onChange={e => filters.setSearchQuery(e.target.value)}
              placeholder="Search transcripts, tags, titles..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          {filters.hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={filters.clearAll}>
              <X className="w-3 h-3 mr-1" /> Clear All
            </Button>
          )}
        </div>

        {/* Source filter pills */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {(Object.entries(SOURCE_LABELS) as [ExperienceSource, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => filters.setActiveSource(filters.activeSource === key ? null : key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                filters.activeSource === key
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
          {filters.hasActiveFilters && (
            <span className="text-[10px] text-muted-foreground ml-2">{filteredCount} of {totalCount} shown</span>
          )}
        </div>

        {/* Handle filter pills — view everything imported from one connected handle */}
        {accountHandles.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
            {accountHandles.map(({ handle, count }) => (
              <button
                key={handle}
                onClick={() => filters.setAccountHandleFilter(filters.accountHandleFilter === handle ? null : handle)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  filters.accountHandleFilter === handle
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {handle} <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <TabsContent value="all" className="mt-4">
          <ExperienceGrid items={items} loading={loading} error={error} playback={playback} onAttach={handleAttachClick} />
        </TabsContent>
        <TabsContent value="voice-notes" className="mt-4">
          <ExperienceGrid items={items.filter(i => i.source === 'voice-note' || i.source === 'editorial-note')} loading={loading} error={error} playback={playback} onAttach={handleAttachClick} />
        </TabsContent>
        <TabsContent value="social-posts" className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-card px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              Add a handle to import its whole account, or import a single post by URL — YouTube, TikTok,
              Instagram, X/Twitter, Facebook, LinkedIn, Pinterest. Transcripts are stored and feed the article writing pipeline.
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setAddHandleOpen(true)}>
                <AtSign className="w-3 h-3" /> Handles
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setImportOpen(true)}>
                <Download className="w-3 h-3" /> Import from URL
              </Button>
            </div>
          </div>
          <ExperienceGrid items={items.filter(i => !['voice-note', 'editorial-note'].includes(i.source))} loading={loading} error={error} playback={playback} onAttach={handleAttachClick} />
        </TabsContent>
        <TabsContent value="articles-needing" className="mt-4">
          <ArticlesNeedingExperience />
        </TabsContent>
      </Tabs>

      {/* Capture Panel Dialog */}
      {captureOpen && (
        <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Capture New Experience</DialogTitle></DialogHeader>
            <CapturePanel onSaved={() => setCaptureOpen(false)} initialMode={captureMode} />
          </DialogContent>
        </Dialog>
      )}

      {/* Social Import Dialog */}
      <ImportSocialDialog open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Handle management centre — connected handles, stats, removal, add new */}
      <ManageHandlesDialog
        open={addHandleOpen}
        onClose={() => setAddHandleOpen(false)}
        allItems={allItems}
        onViewHandle={(h) => {
          filters.setAccountHandleFilter(h);
          setAddHandleOpen(false);
        }}
      />

      {/* NotebookLM Panel */}
      <NotebookLMPanel open={notebookOpen} onClose={() => setNotebookOpen(false)} />

      {/* Article Picker Dialog */}
      <ArticlePickerDialog
        open={attachDialogOpen}
        onClose={() => setAttachDialogOpen(false)}
        onSelect={() => setAttachDialogOpen(false)}
        currentAttachments={selectedAttachments}
        transcriptId={selectedTranscriptId}
      />
    </div>
  );
}

// ─── Grid ────────────────────────────────────────────────────────────────────

function ExperienceGrid({ items, loading, error, playback, onAttach }: { items: ExperienceItem[]; loading: boolean; error: string | null; playback: ReturnType<typeof useAudioPlayback>; onAttach: (item: ExperienceItem) => void }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/70 shadow-card p-4 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-destructive/20 shadow-card p-8 text-center">
        <p className="text-sm text-destructive">Failed to load experiences: {error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/70 shadow-card p-8 text-center animate-fade-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <Mic className="w-5 h-5 text-accent" />
        </div>
        <p className="text-[14px] font-semibold text-foreground">No experience items yet</p>
        <p className="text-[12px] text-muted-foreground mt-1">Record a voice note or import social content to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <ExperienceCard key={item.id} item={item} playback={playback} onAttach={onAttach} />
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
