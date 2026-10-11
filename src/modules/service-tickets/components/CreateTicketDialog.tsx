import { useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAssignableUsers } from '../hooks/useAssignableUsers';
import { useServiceTicketMutations } from '../hooks/useServiceTicketMutations';
import {
  MAX_TICKET_ATTACHMENT_BYTES,
  MAX_TICKET_ATTACHMENTS,
  MAX_TICKET_DESCRIPTION_LENGTH,
  MAX_TICKET_TITLE_LENGTH,
} from '../types';
import { formatFileSize } from '../utils/ticketFormat';

const UNASSIGNED = '__unassigned__';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const { users } = useAssignableUsers();
  const { pending, createTicket, attachFile } = useServiceTicketMutations();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeUid, setAssigneeUid] = useState<string>(UNASSIGNED);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle('');
    setDescription('');
    setAssigneeUid(UNASSIGNED);
    setFiles([]);
  };

  const handleFilesPicked = (picked: FileList | null) => {
    if (!picked) return;
    const next = [...files];
    for (const file of Array.from(picked)) {
      if (file.size > MAX_TICKET_ATTACHMENT_BYTES) {
        toast.error(`${file.name} is too large`, {
          description: `Attachments are limited to ${formatFileSize(MAX_TICKET_ATTACHMENT_BYTES)}.`,
        });
        continue;
      }
      if (next.length >= MAX_TICKET_ATTACHMENTS) {
        toast.error(`A ticket can have at most ${MAX_TICKET_ATTACHMENTS} attachments`);
        break;
      }
      next.push(file);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('A ticket title is required');
      return;
    }
    const ticketId = await createTicket({
      title: trimmedTitle,
      description: description.trim(),
      assigneeUid: assigneeUid === UNASSIGNED ? null : assigneeUid,
    });
    if (!ticketId) return;

    // Upload any attachments chosen at creation time. Failures are toasted by
    // the mutation hook but don't block the ticket itself.
    for (const file of files) {
      await attachFile(ticketId, file);
    }

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New Service Ticket</DialogTitle>
          <DialogDescription>
            Raise an issue or request for the team — a missing element, a field that is not
            syncing, or anything else that needs attention.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-title">Title</Label>
            <Input
              id="ticket-title"
              value={title}
              maxLength={MAX_TICKET_TITLE_LENGTH}
              placeholder="e.g. Transfer partner table not syncing on /cards"
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              value={description}
              maxLength={MAX_TICKET_DESCRIPTION_LENGTH}
              placeholder="What is wrong, where you saw it, and what you expected instead…"
              className="min-h-[110px] resize-y"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <Select value={assigneeUid} onValueChange={setAssigneeUid}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.uid} value={user.uid}>
                    {user.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Attachments</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFilesPicked(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Add images or files
            </Button>
            {files.length > 0 && (
              <ul className="space-y-1 pt-1">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-[12px]"
                  >
                    <span className="truncate">{file.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                      {formatFileSize(file.size)}
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !title.trim()}>
            {pending ? 'Creating…' : 'Create Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
