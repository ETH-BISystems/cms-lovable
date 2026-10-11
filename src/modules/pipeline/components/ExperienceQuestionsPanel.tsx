import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, MessageCircleQuestion, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { callGenerateExperienceQuestions } from '../services/articleService';
import { useArticleMutations } from '../hooks/useArticleMutations';
import type { PipelineArticle, ExperienceQuestion } from '../types';

/**
 * Experience Questions step (CMS-52) — shown in the Deep Research and Write
 * Article stage panels. The AI generates experience-related interview
 * questions about the topic; the author answers them in plain text fields
 * (voice dictation tools type into them). Answers persist on the article
 * (updateArticle) and are woven into the AI draft as first-person
 * personal-experience context.
 */
export function ExperienceQuestionsPanel({ article }: { article: PipelineArticle }) {
  const { updateArticle, loading } = useArticleMutations();
  const [generating, setGenerating] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions: ExperienceQuestion[] = article.experienceQuestions ?? [];

  // Seed local answer drafts. Re-seed only when the article or the question
  // set changes — unrelated article snapshot updates (updatedAt etc.) must
  // not wipe answers the user is still typing.
  const questionIdsKey = questions.map((q) => q.id).join('|');
  const lastArticleIdRef = useRef<string | null>(null);
  useEffect(() => {
    const isNewArticle = lastArticleIdRef.current !== article.id;
    lastArticleIdRef.current = article.id;
    setAnswers((prev) => {
      const next: Record<string, string> = {};
      for (const q of article.experienceQuestions ?? []) {
        next[q.id] = !isNewArticle && prev[q.id] !== undefined ? prev[q.id] : (q.answer || '');
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, questionIdsKey]);

  const dirty = questions.some((q) => (answers[q.id] ?? '') !== (q.answer || ''));
  const answeredCount = questions.filter((q) => (answers[q.id] ?? q.answer ?? '').trim().length > 0).length;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await callGenerateExperienceQuestions(article.id);
      toast.success('Experience questions ready', { description: 'Answer the ones you have first-hand experience with.' });
    } catch (err) {
      toast.error('Question generation failed', { description: (err as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateArticle(article.id, {
        experienceQuestions: questions.map((q) => ({ ...q, answer: answers[q.id] ?? q.answer ?? '' })),
      });
      toast.success('Answers saved', { description: 'Answered questions feed the AI draft as your personal experience.' });
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
          <MessageCircleQuestion className="h-3.5 w-3.5 text-accent" /> Experience Questions
          {questions.length > 0 && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 tabular-nums">
              {answeredCount}/{questions.length} answered
            </Badge>
          )}
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : questions.length > 0 ? <RefreshCw className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          {generating ? 'Generating…' : questions.length > 0 ? 'Regenerate' : 'Generate Questions'}
        </Button>
      </div>

      {questions.length === 0 && !generating && (
        <p className="text-[11px] text-muted-foreground">
          Let AI interview you about this topic — answer only what you know first-hand. Your answers are stored with the article and woven into the draft as authentic personal experience (E-E-A-T).
        </p>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id}>
              <label className="text-[11px] font-medium text-card-foreground block mb-1">
                {i + 1}. {q.question}
              </label>
              <Textarea
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Type or dictate your answer — leave blank if you have no first-hand experience…"
                className="min-h-[56px] text-[12px] bg-background"
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] text-muted-foreground">Only answered questions are used as writing context.</p>
            <Button size="sm" className="h-7 text-[11px]" onClick={handleSave} disabled={!dirty || !!loading.updateArticle}>
              {loading.updateArticle ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Save Answers
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
