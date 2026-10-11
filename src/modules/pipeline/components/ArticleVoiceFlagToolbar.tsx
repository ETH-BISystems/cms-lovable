import { useState, useEffect, useCallback, useRef } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { storeSaveVoiceFlag } from '../services/articleStore';
import { useAuth } from '@/modules/auth';

interface ArticleVoiceFlagToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  articleId: string;
  articleTitle?: string;
  onFlagCreated?: (flag: { text: string; offsetStart: number; offsetEnd: number }) => void;
}

/**
 * Floating toolbar that appears when users select text in the article content preview.
 * Allows flagging AI-generated patterns for voice/brand training.
 *
 * Requirements: 8.9, 8.10
 */
export function ArticleVoiceFlagToolbar({
  containerRef,
  articleId,
  articleTitle,
  onFlagCreated,
}: ArticleVoiceFlagToolbarProps) {
  const { userProfile } = useAuth();
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [flagCount, setFlagCount] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setShow(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setShow(false);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setShow(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setSelectedText(text);
    setPos({
      top: rect.top - containerRect.top - 36,
      left: rect.left - containerRect.left + rect.width / 2,
    });
    setShow(true);
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const handleFlag = () => {
    const text = selectedText;
    const isPattern = text.split(/\s+/).length > 10;

    // Get character offsets within the container
    const selection = window.getSelection();
    let offsetStart = 0;
    let offsetEnd = 0;
    if (selection && !selection.isCollapsed && containerRef.current) {
      const range = selection.getRangeAt(0);
      const preRange = document.createRange();
      preRange.selectNodeContents(containerRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      offsetStart = preRange.toString().length;
      offsetEnd = offsetStart + text.length;
    }

    setFlagCount(prev => prev + 1);
    setShow(false);
    window.getSelection()?.removeAllRanges();

    // Persist the flag (production: addDoc on articles/{id}/voiceFlags)
    try {
      storeSaveVoiceFlag(articleId, {
        text,
        offsetStart,
        offsetEnd,
        isPattern,
        articleTitle: articleTitle || '',
        flaggedBy: userProfile?.uid || '',
      });
    } catch (err) {
      console.error('[ArticleVoiceFlagToolbar] Failed to save flag:', err);
      toast.error('Failed to save voice flag');
    }

    onFlagCreated?.({ text, offsetStart, offsetEnd });

    if (isPattern) {
      toast.success(`Pattern flagged from "${articleTitle || 'article'}". AI will extract the core phrase.`);
    } else {
      toast.success(`Flagged: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}" — added to banned phrases`);
    }
  };

  return (
    <>
      {show && (
        <div
          ref={toolbarRef}
          className="absolute z-50 animate-in fade-in duration-150"
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
        >
          <button
            onClick={handleFlag}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border shadow-lg text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors whitespace-nowrap"
          >
            🚩 Flag as AI Pattern
          </button>
        </div>
      )}

      {flagCount > 0 && (
        <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
          <Flag className="w-3 h-3" />
          {flagCount} pattern{flagCount !== 1 ? 's' : ''} flagged
        </div>
      )}
    </>
  );
}
