import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic } from 'lucide-react';
import { VoiceNoteRecorder } from '@/components/shared/VoiceNoteRecorder';
import type { VoiceNoteData } from '@/components/shared/VoiceNoteRecorder';
import type { VoiceNote } from '../types/index';

interface VoiceNoteSectionProps {
  voiceNotes?: VoiceNote[];
  onSaveNote?: (note: Omit<VoiceNote, 'id' | 'timestamp'>) => void;
  editionId?: string;
}

/**
 * Voice input section using the shared VoiceNoteRecorder component.
 * Supports Direction and Tip note types with teal/green badges.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function VoiceNoteSection({ voiceNotes = [], onSaveNote, editionId }: VoiceNoteSectionProps) {
  const [noteType, setNoteType] = useState<'direction' | 'tip'>('direction');

  const handleSave = (noteData: VoiceNoteData) => {
    onSaveNote?.({
      type: noteType,
      mode: noteData.mode,
      transcript: noteData.transcript,
      contributor: noteData.contributor || 'Current User',
      duration: noteData.duration,
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Mic className="h-4 w-4" />
        Voice Notes ({voiceNotes.length})
      </h4>

      {/* Note type selector */}
      <Select value={noteType} onValueChange={(v) => setNoteType(v as 'direction' | 'tip')}>
        <SelectTrigger className="w-48 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="direction">Newsletter Direction</SelectItem>
          <SelectItem value="tip">Personal Tip</SelectItem>
        </SelectContent>
      </Select>

      {/* Shared VoiceNoteRecorder */}
      <VoiceNoteRecorder
        contextId={editionId || ''}
        context="newsletter"
        onSave={handleSave}
        noteType={noteType}
      />

      {/* Existing voice notes */}
      {voiceNotes.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          {voiceNotes.map((note) => (
            <div key={note.id} className="flex items-start gap-2 text-xs">
              <Badge
                variant="outline"
                className={`text-[10px] flex-shrink-0 ${
                  note.type === 'direction'
                    ? 'border-teal-500 text-teal-600 bg-teal-50'
                    : 'border-green-500 text-green-600 bg-green-50'
                }`}
              >
                {note.type === 'direction' ? 'Direction' : 'Tip'}
              </Badge>
              <p className="text-muted-foreground flex-1 line-clamp-2">
                {note.transcript}
              </p>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {note.contributor}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
