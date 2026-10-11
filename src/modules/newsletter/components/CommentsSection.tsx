import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send } from 'lucide-react';
import type { EditionComment } from '../types/index';

interface CommentsSectionProps {
  comments: EditionComment[];
  onPostComment?: (text: string, mentions: string[]) => void;
  teamMembers?: string[];
}

const MENTION_REGEX = /@(\w*)$/;

/**
 * Threaded comment feed with @mention support.
 *
 * Requirements: 11.1, 11.2, 11.3
 */
export function CommentsSection({
  comments,
  onPostComment,
  teamMembers = [],
}: CommentsSectionProps) {
  const [input, setInput] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sortedComments = [...comments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const filteredMembers = teamMembers.filter((m) =>
    m.toLowerCase().includes(mentionQuery.toLowerCase()),
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      const match = value.match(MENTION_REGEX);
      if (match) {
        setMentionQuery(match[1]);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    },
    [],
  );

  const insertMention = useCallback(
    (name: string) => {
      const newValue = input.replace(MENTION_REGEX, `@${name} `);
      setInput(newValue);
      setShowMentions(false);
      textareaRef.current?.focus();
    },
    [input],
  );

  const handlePost = useCallback(() => {
    if (!input.trim()) return;
    const mentions = Array.from(input.matchAll(/@(\w+)/g)).map((m) => m[1]);
    onPostComment?.(input.trim(), mentions);
    setInput('');
  }, [input, onPostComment]);

  const renderCommentText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-primary font-medium bg-primary/10 rounded px-0.5">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments.length})
      </h4>

      {/* Comment input */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Add a comment... Use @ to mention team members"
          className="min-h-[60px] pr-12 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handlePost();
            }
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="absolute bottom-2 right-2 h-7 w-7"
          onClick={handlePost}
          disabled={!input.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>

        {/* @mention autocomplete */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-48 bg-popover border rounded-md shadow-md z-50 max-h-32 overflow-y-auto">
            {filteredMembers.map((member) => (
              <button
                key={member}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                onClick={() => insertMention(member)}
              >
                @{member}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comment feed */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {sortedComments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No comments yet.</p>
        ) : (
          sortedComments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="text-[10px]">
                  {comment.authorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{comment.author}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatCommentTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-xs mt-0.5 leading-relaxed">
                  {renderCommentText(comment.text)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatCommentTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
