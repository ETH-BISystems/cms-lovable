import { useState } from 'react';
import {
  RefreshCw, Sparkles, Mic, X, ExternalLink, Plus, FileText, Pause, Play, RotateCw,
  Plane, Hotel, Armchair, MapPin, CreditCard, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { Priority, RefreshReasonType } from '../types';

const AI_RECOMMENDATIONS = [
  { category: 'SEO', icon: '🔍', text: 'Add 1,200 more words to match SERP average of 4,800 words.', impact: 'High' as const },
  { category: 'Competitor', icon: '📊', text: 'TPG refreshed their article 5 days ago with updated 2026 benefits.', impact: 'High' as const },
  { category: 'Content', icon: '🔗', text: 'Only 2 internal links. Add links to comparison and transfer guide.', impact: 'Medium' as const },
  { category: 'E-E-A-T', icon: '✍️', text: 'No personal experience content. Add a voice note.', impact: 'Medium' as const },
  { category: 'Freshness', icon: '📅', text: 'Article references 2025 data — update to current 2026 pricing.', impact: 'High' as const },
];

const SCOPE_OPTIONS = [
  { label: 'Update facts and data', default: true },
  { label: 'Improve SEO optimization', default: true },
  { label: 'Expand content significantly', default: false },
  { label: 'Rewrite from scratch', default: false },
  { label: 'Update images and media', default: false },
  { label: 'Add personal experience content', default: false },
];

const TEAM = ['Sarah Chen', 'Mike Torres', 'Alex Kim', 'Jordan Lee'];
const ARTICLE_TYPES = ['Review', 'Comparison', 'Guide', 'List Post', 'Strategy', 'News & Updates', 'Deep Dive'];
const LENGTH_OPTIONS = [
  { label: 'Short', range: '800–1,200' },
  { label: 'Standard', range: '1,500–2,500' },
  { label: 'Long-form', range: '3,000–4,500' },
  { label: 'Epic', range: '5,000+' },
];
const DEPTH_OPTIONS = ['Overview', 'Detailed', 'Comprehensive'];
const EXPERIENCE_CATEGORIES = [
  { label: 'Flight Review', icon: Plane },
  { label: 'Hotel Stay', icon: Hotel },
  { label: 'Lounge Visit', icon: Armchair },
  { label: 'Destination', icon: MapPin },
  { label: 'Card Strategy', icon: CreditCard },
  { label: 'General', icon: FileText },
];

interface RefreshArticleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    refreshReason: RefreshReasonType;
    priority: Priority;
    assignedTo: string;
    keyword?: string;
    refreshScope?: string[];
    sourceUrls?: string[];
    editorialDirection?: string;
    targetPosition?: number;
  }) => void;
  article?: {
    title: string;
    url?: string;
    position?: number;
    keyword?: string;
    traffic?: number;
    seoScore?: number;
  };
}

export function RefreshArticleModal({ open, onClose, onSubmit, article }: RefreshArticleModalProps) {
  const [articleTitle, setArticleTitle] = useState(article?.title || '');
  const [articleType, setArticleType] = useState('Review');
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [checkedRecs, setCheckedRecs] = useState<Set<number>>(new Set(AI_RECOMMENDATIONS.map((_, i) => i)));
  const [targetKeyword, setTargetKeyword] = useState(article?.keyword || '');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [newSecondary, setNewSecondary] = useState('');
  const [topicCluster, setTopicCluster] = useState('Premium Cards');
  const [selectedLength, setSelectedLength] = useState(1);
  const [depth, setDepth] = useState('Detailed');
  const [expCategory, setExpCategory] = useState<string | null>(null);
  const [expMode, setExpMode] = useState<'record' | 'type'>('record');
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [expText, setExpText] = useState('');
  const [editorialNotes, setEditorialNotes] = useState('');
  const [scope, setScope] = useState<Set<number>>(new Set(SCOPE_OPTIONS.map((o, i) => o.default ? i : -1).filter(i => i >= 0)));
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [assignee, setAssignee] = useState(TEAM[0]);
  const [targetPosition, setTargetPosition] = useState('');
  const [sourceUrls, setSourceUrls] = useState<{ url: string; title: string; type: string }[]>([]);
  const [newUrl, setNewUrl] = useState('');

  if (!open) return null;

  const handleSend = () => {
    onSubmit({
      title: articleTitle,
      refreshReason: 'Manual',
      priority: priority === 'Urgent' ? 'High' : priority as Priority,
      assignedTo: assignee,
      keyword: targetKeyword,
      refreshScope: [...scope].map((i) => SCOPE_OPTIONS[i]?.label).filter(Boolean),
      sourceUrls: sourceUrls.map((u) => u.url),
      editorialDirection: editorialNotes.trim() || undefined,
      targetPosition: targetPosition ? Number(targetPosition) : undefined,
    });
    onClose();
  };

  const toggleRec = (i: number) => {
    setCheckedRecs(prev => { const n = new Set(prev); if (n.has(i)) { n.delete(i); } else { n.add(i); } return n; });
  };

  const toggleScope = (i: number) => {
    setScope(prev => { const n = new Set(prev); if (n.has(i)) { n.delete(i); } else { n.add(i); } return n; });
  };

  const addSourceUrl = () => {
    if (!newUrl.trim()) return;
    try {
      const parsed = new URL(newUrl.startsWith('http') ? newUrl : `https://${newUrl}`);
      const hostname = parsed.hostname.replace(/^www\./, '');
      setSourceUrls(prev => [...prev, { url: parsed.href, title: hostname, type: 'Reference' }]);
      setNewUrl('');
    } catch { /* invalid URL */ }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-2xl w-[680px] max-h-[88vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10 rounded-t-xl">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-bold text-foreground">🔄 Refresh Article</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Current Article Info Bar */}
        {article && (
          <div className="bg-muted/40 px-6 py-3 border-b border-border">
            <h3 className="text-[13px] font-bold text-foreground">{article.title}</h3>
            <div className="flex items-center gap-4 mt-2 text-[11px] flex-wrap">
              <span><span className="text-muted-foreground">Position:</span> <span className="font-medium">#{article.position || '—'}</span></span>
              <span><span className="text-muted-foreground">Traffic:</span> <span className="font-medium">{(article.traffic || 0).toLocaleString()}/mo</span></span>
              <span><span className="text-muted-foreground">SEO Score:</span> <span className="font-medium">{article.seoScore || '—'}/100</span></span>
            </div>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Section 1 — Article Basics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
              <h3 className="text-sm font-semibold text-foreground">Article Basics</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Article Title</label>
                <Input value={articleTitle} onChange={e => setArticleTitle(e.target.value)} className="text-sm" />
              </div>
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 border-accent text-accent" onClick={() => setShowTitleSuggestions(!showTitleSuggestions)}>
                <Sparkles className="w-3.5 h-3.5" /> AI Suggest Titles
              </Button>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Article Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {ARTICLE_TYPES.map(t => (
                    <button key={t} onClick={() => setArticleType(t)} className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${articleType === t ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2 — AI Recommendations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
              <h3 className="text-sm font-semibold text-foreground">AI Recommendations</h3>
            </div>
            <div className="space-y-1.5">
              {AI_RECOMMENDATIONS.map((rec, i) => (
                <label key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                  <input type="checkbox" checked={checkedRecs.has(i)} onChange={() => toggleRec(i)} className="mt-0.5 rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{rec.icon}</span>
                      <span className="text-[11px] font-medium text-foreground">{rec.category}</span>
                      <Badge className={`text-[9px] px-1 py-0 border-0 ${rec.impact === 'High' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning-foreground'}`}>{rec.impact}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{rec.text}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Section 3 — Keywords */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
              <h3 className="text-sm font-semibold text-foreground">Keywords & Clusters</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Target Keyword</label>
                <Input value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)} className="text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Secondary Keywords</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {secondaryKeywords.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-[11px]">
                      {kw}
                      <button onClick={() => setSecondaryKeywords(prev => prev.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                {secondaryKeywords.length < 5 && (
                  <div className="flex gap-2">
                    <Input value={newSecondary} onChange={e => setNewSecondary(e.target.value)} placeholder="Add keyword..." className="text-xs flex-1" onKeyDown={e => { if (e.key === 'Enter' && newSecondary.trim()) { setSecondaryKeywords(prev => [...prev, newSecondary.trim()]); setNewSecondary(''); } }} />
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { if (newSecondary.trim()) { setSecondaryKeywords(prev => [...prev, newSecondary.trim()]); setNewSecondary(''); } }}><Plus className="w-3 h-3" /></Button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Topic Cluster</label>
                <select value={topicCluster} onChange={e => setTopicCluster(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                  {['Premium Cards', 'Travel Rewards', 'Cash Back', 'Business Cards', 'Credit Building', 'Points Strategy'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 4 — Length & Depth */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">4</span>
              <h3 className="text-sm font-semibold text-foreground">Article Length & Depth</h3>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {LENGTH_OPTIONS.map((opt, i) => (
                <button key={opt.label} onClick={() => setSelectedLength(i)} className={`p-2.5 rounded-lg border text-center transition-colors ${selectedLength === i ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'}`}>
                  <p className="text-[12px] font-semibold text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.range}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {DEPTH_OPTIONS.map(d => (
                <button key={d} onClick={() => setDepth(d)} className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${depth === d ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>{d}</button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Section 5 — Experience */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">5</span>
              <h3 className="text-sm font-semibold text-foreground">Your Experience</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EXPERIENCE_CATEGORIES.map(c => {
                const Icon = c.icon;
                return (
                  <button key={c.label} onClick={() => setExpCategory(expCategory === c.label ? null : c.label)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${expCategory === c.label ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-3 h-3" /> {c.label}
                  </button>
                );
              })}
            </div>
            <div className="flex bg-muted rounded-md p-0.5 w-fit mb-3">
              <button onClick={() => setExpMode('record')} className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-colors ${expMode === 'record' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                <Mic className="w-3 h-3" /> Record
              </button>
              <button onClick={() => setExpMode('type')} className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-colors ${expMode === 'type' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                <FileText className="w-3 h-3" /> Type
              </button>
            </div>
            {expMode === 'record' ? (
              <div className="flex flex-col items-center gap-2 py-4">
                {!recorded && !recording && (
                  <>
                    <button onClick={() => setRecording(true)} className="w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:bg-accent/90 transition-all hover:scale-105 shadow-sm">
                      <Mic className="w-6 h-6" />
                    </button>
                    <p className="text-[11px] text-muted-foreground">Click to start recording</p>
                  </>
                )}
                {recording && (
                  <>
                    <button onClick={() => { setRecording(false); setRecorded(true); }} className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center animate-pulse">
                      <span className="w-6 h-6 rounded-sm bg-destructive-foreground" />
                    </button>
                    <p className="text-[11px] text-muted-foreground">Recording... click to stop</p>
                  </>
                )}
                {recorded && !recording && (
                  <div className="flex items-center gap-3 w-full">
                    <button onClick={() => setPlaying(!playing)} className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                      {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 h-6 bg-muted rounded" />
                    <button onClick={() => { setRecorded(false); setPlaying(false); }} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1">
                      <RotateCw className="w-3 h-3" /> Re-record
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Textarea value={expText} onChange={e => setExpText(e.target.value)} placeholder="Type your personal experience..." className="text-xs min-h-[70px]" />
            )}
            <div className="mt-3">
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Editorial Notes</label>
              <Textarea value={editorialNotes} onChange={e => setEditorialNotes(e.target.value)} placeholder="Notes for the writing team..." className="text-xs min-h-[50px]" />
            </div>
          </div>

          <Separator />

          {/* Section 6 — Scope & Priority */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">6</span>
              <h3 className="text-sm font-semibold text-foreground">Refresh Scope & Priority</h3>
            </div>
            <div className="space-y-1.5 mb-3">
              {SCOPE_OPTIONS.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-[12px] cursor-pointer">
                  <input type="checkbox" checked={scope.has(i)} onChange={() => toggleScope(i)} className="rounded" />
                  <span className="text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-1.5">
              {(['Low', 'Medium', 'High', 'Urgent'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)} className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${priority === p ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>{p}</button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Section 7 — Assignment & Sources */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0">7</span>
              <h3 className="text-sm font-semibold text-foreground">Assignment & Source Material</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Assignee</label>
                <select value={assignee} onChange={e => setAssignee(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                  {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Target Position</label>
                <Input value={targetPosition} onChange={e => setTargetPosition(e.target.value)} placeholder="1-100" className="text-xs" type="number" min={1} max={100} />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Source Material</label>
              {sourceUrls.map((su, i) => (
                <div key={i} className="flex items-center gap-2 mb-1 p-2 rounded border border-border">
                  <span className="text-[11px] text-foreground truncate flex-1">{su.title}</span>
                  <Badge variant="secondary" className="text-[9px]">{su.type}</Badge>
                  <button onClick={() => setSourceUrls(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Paste URL..." className="text-xs flex-1" onKeyDown={e => e.key === 'Enter' && addSourceUrl()} />
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addSourceUrl}><Plus className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end gap-2 rounded-b-xl">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Send to Refresh Queue
          </Button>
        </div>
      </div>
    </div>
  );
}
