import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  teamMembers: Array<{ id: string; name: string; role: string }>;
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-gradient-to-br from-blue-400 to-blue-600',
    'bg-gradient-to-br from-purple-400 to-purple-600',
    'bg-gradient-to-br from-emerald-400 to-emerald-600',
    'bg-gradient-to-br from-orange-400 to-orange-600',
    'bg-gradient-to-br from-pink-400 to-pink-600',
    'bg-gradient-to-br from-cyan-400 to-cyan-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function MentionInput({ value, onChange, onSubmit, disabled, teamMembers }: MentionInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // Detect @ trigger
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s]*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionSearch(atMatch[1]);
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const insertMention = (name: string) => {
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s]*)$/);

    if (atMatch) {
      const beforeAt = textBeforeCursor.slice(0, atMatch.index);
      const newValue = `${beforeAt}@${name} ${textAfterCursor}`;
      onChange(newValue);
    }

    setShowMentions(false);
    setMentionSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex].name);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative">
      {/* Mention dropdown */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 w-full mb-1 bg-popover border border-border/70 rounded-lg shadow-raised z-50 max-h-[200px] overflow-y-auto">
          {filteredMembers.map((m, i) => (
            <button
              key={m.id}
              onClick={() => insertMention(m.name)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                i === mentionIndex ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0', getAvatarColor(m.name))}>
                {m.name[0]?.toUpperCase()}
              </div>
              <span className="text-[12px] font-medium text-card-foreground flex-1">{m.name}</span>
              <span className="text-[10px] text-muted-foreground">{m.role}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... Type @ to mention"
          className="h-8 text-[12px] flex-1 border border-input rounded-md px-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={disabled}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="shrink-0 p-1.5 text-accent hover:bg-accent/10 rounded-md transition-colors duration-150 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}


/** Renders comment text with @mentions highlighted */
export function CommentText({ text }: { text: string }) {
  // Split on @mentions (word characters after @)
  const parts = text.split(/(@\w+)/g);
  return (
    <p className="text-[11px] text-card-foreground">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-accent font-semibold">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}
