import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, X, Plus, Loader2 } from 'lucide-react';
import { VoiceNoteRecorder } from '@/components/shared/VoiceNoteRecorder';
import type { VoiceNoteData } from '@/components/shared/VoiceNoteRecorder';
import { useExperienceCapture } from '../hooks/useExperienceCapture';
import { useAuth } from '@/modules/auth';
import type { CapturePanelProps } from '../types';

const CATEGORIES = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'lounge', label: 'Lounge' },
  { value: 'destination', label: 'Destination' },
  { value: 'card', label: 'Card' },
  { value: 'general', label: 'General' },
];

const NOTE_TYPES = [
  { value: 'personal', label: 'Personal' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'refresh', label: 'Refresh' },
];

const COACHING_PROMPTS: Record<string, string[]> = {
  flight: [
    'What class did you fly? What was the seat like?',
    'How was the food and beverage service?',
    'Any standout moments or issues?',
  ],
  hotel: [
    'What room category did you book? Any upgrades?',
    'How was the check-in experience?',
    'What amenities stood out?',
  ],
  lounge: [
    'Which lounge did you visit? How did you access it?',
    'How was the food and drink selection?',
    'Was it crowded? How was the ambiance?',
  ],
  destination: [
    'What city/region are you covering?',
    'What activities or experiences stood out?',
    'Any tips for readers visiting?',
  ],
  card: [
    'Which card are you discussing?',
    'What benefits or perks are you highlighting?',
    'Any redemption strategies to share?',
  ],
  general: [
    'What experience are you capturing?',
    'What would readers find most useful?',
  ],
};

/**
 * CapturePanel — voice note capture tab.
 * Integrates VoiceNoteRecorder with experience-specific metadata fields.
 */
export function CapturePanel({ onSaved, initialMode = 'record' }: CapturePanelProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [noteType, setNoteType] = useState<'personal' | 'editorial' | 'refresh'>('personal');
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const { saving, error, saveRecording, saveTyped } = useExperienceCapture();
  const { user, userProfile } = useAuth();

  const contributor = userProfile?.displayName || user?.displayName || user?.email || 'Unknown';
  const contributorUid = userProfile?.uid || user?.uid || '';

  const handleAddTag = () => {
    if (newTag.trim() && !topicTags.includes(newTag.trim())) {
      setTopicTags([...topicTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTopicTags(topicTags.filter((t) => t !== tag));
  };

  const handleVoiceNoteSave = async (noteData: VoiceNoteData) => {
    const metadata = {
      noteType,
      contributor,
      contributorUid,
      topicTags,
      title,
      category,
    };

    try {
      if (noteData.mode === 'recorded' && noteData.audioBlob) {
        await saveRecording(noteData.audioBlob, noteData.duration, metadata);
      } else {
        await saveTyped(noteData.transcript, metadata);
      }
      resetForm();
      onSaved();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('general');
    setNoteType('personal');
    setTopicTags([]);
    setNewTag('');
  };

  const prompts = COACHING_PROMPTS[category] || COACHING_PROMPTS.general;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Saving state */}
        {saving && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Saving experience note...</AlertDescription>
          </Alert>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this experience a title..."
          />
        </div>

        {/* Category and Note Type */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note Type</Label>
            <Select value={noteType} onValueChange={(v) => setNoteType(v as typeof noteType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Voice Note Recorder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Record or Type</CardTitle>
          </CardHeader>
          <CardContent>
            <VoiceNoteRecorder
              contextId="experience"
              context="experience"
              onSave={handleVoiceNoteSave}
              disabled={saving}
              initialMode={initialMode}
            />
          </CardContent>
        </Card>

        {/* Topic Tags */}
        <div className="space-y-2">
          <Label>Topic Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {topicTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1">
                {tag}
                <button onClick={() => handleRemoveTag(tag)}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag..."
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            />
            <Button size="sm" variant="outline" onClick={handleAddTag}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Coaching prompts sidebar */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Coaching Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {prompts.map((prompt, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-accent font-bold">•</span>
                {prompt}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
