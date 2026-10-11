import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { getDefaultBlockTemplate } from '../services/statusMachine';
import type { EditionType, ContentBlockType, CreateEditionInput } from '../types/index';

const EDITION_TYPES: EditionType[] = [
  'Daily',
  'Deal Alert',
  'Transfer Bonus',
  'Special',
];

interface EditionBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEdition?: (input: CreateEditionInput) => void;
  onAISuggestSubject?: () => void;
  loading?: boolean;
}

/**
 * Modal for creating a new newsletter edition.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1
 */
export function EditionBuilderModal({
  open,
  onOpenChange,
  onCreateEdition,
  onAISuggestSubject,
  loading = false,
}: EditionBuilderModalProps) {
  const [editionType, setEditionType] = useState<EditionType>('Daily');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('09:00');
  const [audience, setAudience] = useState('All Subscribers');
  const [notes, setNotes] = useState('');
  const [customTopics, setCustomTopics] = useState('');
  const [blocksModified, setBlocksModified] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingType, setPendingType] = useState<EditionType | null>(null);
  const [blockStructure, setBlockStructure] = useState<ContentBlockType[]>(
    getDefaultBlockTemplate('Daily'),
  );

  const handleTypeChange = useCallback(
    (newType: EditionType) => {
      if (blocksModified) {
        setPendingType(newType);
        setShowResetConfirm(true);
        return;
      }
      setEditionType(newType);
      setBlockStructure(getDefaultBlockTemplate(newType));
    },
    [blocksModified],
  );

  const confirmTypeChange = useCallback(() => {
    if (pendingType) {
      setEditionType(pendingType);
      setBlockStructure(getDefaultBlockTemplate(pendingType));
      setBlocksModified(false);
    }
    setShowResetConfirm(false);
    setPendingType(null);
  }, [pendingType]);

  const keepCurrentStructure = useCallback(() => {
    if (pendingType) {
      setEditionType(pendingType);
    }
    setShowResetConfirm(false);
    setPendingType(null);
  }, [pendingType]);

  const handleSubmit = useCallback(() => {
    if (!subject.trim()) return;

    const blocks = blockStructure.map((type, i) => ({
      id: `block-${Date.now()}-${i}`,
      type,
      title: type,
      previewText: '',
      body: '',
    }));

    onCreateEdition?.({
      editionType,
      subject: subject.trim(),
      previewText: previewText.trim(),
      sendDate: sendDate ? new Date(sendDate) : new Date(),
      sendTime,
      audience,
      templateId: '',
      blocks,
      voiceNotes: [],
      assignees: [],
      notes: notes.trim(),
      topStories: [],
      customTopics: customTopics
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }, [
    editionType,
    subject,
    previewText,
    sendDate,
    sendTime,
    audience,
    notes,
    customTopics,
    blockStructure,
    onCreateEdition,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Edition</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Edition type selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Edition Type</label>
            <div className="flex gap-2 flex-wrap">
              {EDITION_TYPES.map((type) => (
                <Button
                  key={type}
                  variant={editionType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Reset confirmation */}
          {showResetConfirm && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Changing edition type will reset the block structure. Keep current blocks or reset?
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="destructive" onClick={confirmTypeChange}>
                    Reset Blocks
                  </Button>
                  <Button size="sm" variant="outline" onClick={keepCurrentStructure}>
                    Keep Current
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Subject line */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject Line</label>
            <div className="flex gap-2">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject line..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onAISuggestSubject}
                className="flex-shrink-0"
              >
                <Sparkles className="h-3 w-3 mr-1" /> AI Suggest
              </Button>
            </div>
          </div>

          {/* Preview text */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Preview Text</label>
            <Input
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Email preview text..."
            />
          </div>

          {/* Send date & time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Send Date
              </label>
              <Input
                type="date"
                value={sendDate}
                onChange={(e) => setSendDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> Send Time
              </label>
              <Input
                type="time"
                value={sendTime}
                onChange={(e) => setSendTime(e.target.value)}
              />
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Audience</label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Subscribers">All Subscribers</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Free">Free</SelectItem>
                <SelectItem value="Engaged">Engaged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom topics */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Custom Topics</label>
            <Textarea
              value={customTopics}
              onChange={(e) => setCustomTopics(e.target.value)}
              placeholder="One topic per line..."
              className="min-h-[60px] text-sm"
            />
          </div>

          <Separator />

          {/* Block structure preview */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Block Structure</label>
            <div className="flex flex-wrap gap-1.5">
              {blockStructure.map((type, i) => (
                <Badge key={`${type}-${i}`} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!subject.trim() || loading}>
            {loading ? 'Creating...' : 'Create Edition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
