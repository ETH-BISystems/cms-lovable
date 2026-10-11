import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, FileText } from 'lucide-react';
import type { ContentBlockType, QuickBriefConfig } from '../types/index';

const BLOCK_TYPES: ContentBlockType[] = [
  'Lead Story',
  'Card Alert',
  'Deal Alert',
  'Article Spotlight',
  'Quick Hits',
  'Transfer Bonus',
  'Tip of the Day',
  'Personal Note',
  'Custom',
];

const CONTENT_LENGTHS = ['Short', 'Standard', 'Detailed'] as const;

interface QuickBriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: string;
  competitorContext?: { competitors: string[]; type: string };
  onGenerate?: (config: QuickBriefConfig) => void;
  onAddBlank?: (blockType: ContentBlockType) => void;
}

/**
 * Modal for generating content from competitor intel topics.
 *
 * Requirements: 5.14, 5.15
 */
export function QuickBriefModal({
  open,
  onOpenChange,
  topic = '',
  competitorContext,
  onGenerate,
  onAddBlank,
}: QuickBriefModalProps) {
  const [angle, setAngle] = useState('');
  const [blockType, setBlockType] = useState<ContentBlockType>('Lead Story');
  const [contentLength, setContentLength] = useState<'Short' | 'Standard' | 'Detailed'>('Standard');

  const handleGenerate = useCallback(() => {
    onGenerate?.({
      topic,
      competitorContext,
      angle: angle.trim(),
      blockType,
      contentLength,
    });
    onOpenChange(false);
  }, [topic, competitorContext, angle, blockType, contentLength, onGenerate, onOpenChange]);

  const handleAddBlank = useCallback(() => {
    onAddBlank?.(blockType);
    onOpenChange(false);
  }, [blockType, onAddBlank, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Brief</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Topic summary */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Topic</label>
            <p className="text-sm bg-muted p-2 rounded">{topic || 'No topic selected'}</p>
          </div>

          {/* Competitor context */}
          {competitorContext && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Competitor Context</label>
              <div className="flex flex-wrap gap-1.5">
                {competitorContext.competitors.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {c}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs">
                  {competitorContext.type}
                </Badge>
              </div>
            </div>
          )}

          {/* Your angle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Your Angle</label>
            <Textarea
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="How do you want to cover this topic? What's your unique perspective?"
              className="min-h-[80px] text-sm"
            />
          </div>

          {/* Block type selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Block Type</label>
            <Select value={blockType} onValueChange={(v) => setBlockType(v as ContentBlockType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content length */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Content Length</label>
            <div className="flex gap-2">
              {CONTENT_LENGTHS.map((len) => (
                <Button
                  key={len}
                  variant={contentLength === len ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setContentLength(len)}
                >
                  {len}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleAddBlank}>
            <FileText className="h-3 w-3 mr-1" /> Add Blank Block
          </Button>
          <Button onClick={handleGenerate}>
            <Sparkles className="h-3 w-3 mr-1" /> Generate & Add Block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
