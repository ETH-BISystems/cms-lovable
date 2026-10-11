import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface BulkSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (keywords: string[]) => void;
  maxKeywords: number;
}

export function BulkSearchModal({ open, onClose, onSubmit, maxKeywords }: BulkSearchModalProps) {
  const [text, setText] = useState('');

  const keywords = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const handleSubmit = () => {
    if (keywords.length === 0) return;
    onSubmit(keywords.slice(0, maxKeywords));
    setText('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Keyword Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste up to {maxKeywords} keywords, one per line.
          </p>
          <Textarea
            placeholder="best travel credit cards&#10;chase sapphire preferred review&#10;amex platinum benefits..."
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {keywords.length} / {maxKeywords} keywords
            {keywords.length > maxKeywords && (
              <span className="text-red-500 ml-1">(only first {maxKeywords} will be analyzed)</span>
            )}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={keywords.length === 0}>
            Analyze {Math.min(keywords.length, maxKeywords)} Keywords
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
