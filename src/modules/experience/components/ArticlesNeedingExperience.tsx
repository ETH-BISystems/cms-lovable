import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import { callAttachToArticle, subscribeToArticles } from '../services/experienceService';
import { useExperiences } from '../hooks/useExperiences';
import type { ExperienceItem } from '../types';

interface PipelineArticle {
  id: string;
  title: string;
  status: string;
  assignee: { name: string; avatar: string };
  targetKeyword: string;
  topicTags?: string[];
  attachedExperienceIds?: string[];
  hasExperience?: boolean;
}

interface Suggestion {
  experienceId: string;
  title: string;
  source: string;
  relevance: string;
}

/**
 * "Articles Needing Experience" tab — shows pipeline articles in Writing/Researching
 * that lack attached experience, with AI-matched suggestions from the library.
 */
export function ArticlesNeedingExperience() {
  const [articles, setArticles] = useState<PipelineArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const { items: allExperiences } = useExperiences({});

  // Subscribe to articles needing experience
  useEffect(() => {
    // production: onSnapshot(query(collection(db, 'articles'), where('status', 'in', ['Writing', 'Researching'])))
    const unsub = subscribeToArticles(
      (docs) => {
        const visible = docs
          // Needs experience = no library attachments AND no experience captured
          // at creation (hasExperience covers the green E-E-A-T badge state)
          .filter(a => (!a.attachedExperienceIds || a.attachedExperienceIds.length === 0) && !a.hasExperience);
        setArticles(visible);
        setLoading(false);
      },
      { statusIn: ['Writing', 'Researching'] }
    );
    return () => unsub();
  }, []);

  // Generate AI suggestions by matching topic tags/keywords
  const articleSuggestions = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    for (const article of articles) {
      if (skippedIds.has(article.id)) continue;
      const suggestions: Suggestion[] = [];
      const keyword = (article.targetKeyword || '').toLowerCase();
      const tags = (article.topicTags || []).map(t => t.toLowerCase());

      for (const exp of allExperiences) {
        let relevance = '';
        const expTags = exp.taxonomy.tags.map(t => t.toLowerCase());
        const expText = (exp.transcript || '').toLowerCase();

        // Match by keyword in transcript
        if (keyword && expText.includes(keyword)) {
          relevance = `Transcript mentions "${article.targetKeyword}"`;
        }
        // Match by shared tags
        else if (tags.some(t => expTags.includes(t))) {
          const shared = tags.filter(t => expTags.includes(t));
          relevance = `Shared tags: ${shared.join(', ')}`;
        }
        // Match by taxonomy fields
        else if (keyword && (
          (exp.taxonomy.airline || '').toLowerCase().includes(keyword) ||
          (exp.taxonomy.hotel || '').toLowerCase().includes(keyword) ||
          (exp.taxonomy.creditCard || '').toLowerCase().includes(keyword)
        )) {
          relevance = `Taxonomy match: ${exp.taxonomy.airline || exp.taxonomy.hotel || exp.taxonomy.creditCard}`;
        }

        if (relevance) {
          suggestions.push({
            experienceId: exp.id,
            title: exp.title || exp.transcript.slice(0, 60) + '...',
            source: exp.source,
            relevance,
          });
        }
        if (suggestions.length >= 3) break;
      }
      map.set(article.id, suggestions);
    }
    return map;
  }, [articles, allExperiences, skippedIds]);

  const handleAttach = async (experienceId: string, articleId: string) => {
    setAttachingId(`${experienceId}-${articleId}`);
    try {
      await callAttachToArticle(experienceId, articleId);
      toast.success('Experience attached to article');
    } catch (err) {
      toast.error(`Attach failed: ${(err as Error).message}`);
    } finally {
      setAttachingId(null);
    }
  };

  const handleSkip = (articleId: string) => {
    setSkippedIds(prev => new Set([...prev, articleId]));
    toast.success('Article will proceed without experience (gray E-E-A-T badge)');
  };

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading articles...</div>;
  }

  const visibleArticles = articles.filter(a => !skippedIds.has(a.id));

  if (visibleArticles.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/70 shadow-card p-8 text-center animate-fade-in">
        <p className="text-sm text-muted-foreground">All articles have experience attached or have been skipped.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleArticles.map(article => {
        const suggestions = articleSuggestions.get(article.id) || [];
        return (
          <div key={article.id} className="bg-card rounded-xl border border-border/70 shadow-card p-4 space-y-3">
            {/* Article header */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[9px] font-medium shrink-0">
                {article.assignee?.avatar || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{article.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={article.status} className="text-[10px]" />
                  <span className="text-[11px] text-muted-foreground">{article.targetKeyword}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => handleSkip(article.id)}>
                Skip
              </Button>
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 ? (
              <div className="space-y-2 pl-4 border-l-2 border-accent/20">
                <p className="text-[10px] font-medium text-accent">AI Suggestions:</p>
                {suggestions.map(sug => (
                  <div key={sug.experienceId} className="flex items-center gap-2 bg-accent/5 rounded-lg px-3 py-2">
                    <Badge variant="neutral" className="text-[9px] shrink-0">{sug.source}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{sug.title}</p>
                      <p className="text-[9px] text-muted-foreground">{sug.relevance}</p>
                    </div>
                    <Button
                      size="sm"
                      className="h-5 text-[9px] px-2"
                      disabled={attachingId === `${sug.experienceId}-${article.id}`}
                      onClick={() => handleAttach(sug.experienceId, article.id)}
                    >
                      {attachingId === `${sug.experienceId}-${article.id}` ? '...' : 'Attach'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground pl-4">No matching experiences found. Record a voice note to add experience.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
