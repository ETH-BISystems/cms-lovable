import { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Download, Loader2, Paperclip, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAssignableUsers } from '../hooks/useAssignableUsers';
import { useServiceTicketMutations } from '../hooks/useServiceTicketMutations';
import { useTicketComments } from '../hooks/useTicketComments';
import type { ServiceTicket, TicketStatus } from '../types';
import {
  MAX_TICKET_ATTACHMENT_BYTES,
  MAX_TICKET_COMMENT_LENGTH,
  TICKET_STATUSES,
  TICKET_STATUS_META,
  isValidTicketStatusTransition,
} from '../types';
import { formatFileSize, formatTicketDateTime, getAvatarColor, getInitials } from '../utils/ticketFormat';

const UNASSIGNED = '__unassigned__';

interface TicketDetailDialogProps {
  ticket: ServiceTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailDialog({ ticket, open, onOpenChange }: TicketDetailDialogProps) {
  const { user, role } = useAuth();
  const { users } = useAssignableUsers();
  const { comments, loading: commentsLoading } = useTicketComments(open ? ticket?.id ?? null : null);
  const { pending, changeStatus, assignTicket, addComment, attachFile, removeAttachment } =
    useServiceTicketMutations();

  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const archived = ticket?.status === 'archived';

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  if (!ticket) return null;

  const handleStatusChange = async (next: string) => {
    const status = next as TicketStatus;
    if (!isValidTicketStatusTransition(ticket.status, status)) return;
    await changeStatus(ticket.id, status);
  };

  const handleAssigneeChange = async (next: string) => {
    await assignTicket(ticket.id, next === UNASSIGNED ? null : next);
  };

  const handleFilePicked = async (picked: FileList | null) => {
    if (!picked) return;
    for (const file of Array.from(picked)) {
      if (file.size > MAX_TICKET_ATTACHMENT_BYTES) {
        toast.error(`${file.name} is too large`, {
          description: `Attachments are limited to ${formatFileSize(MAX_TICKET_ATTACHMENT_BYTES)}.`,
        });
        continue;
      }
      await attachFile(ticket.id, file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = async (storagePath: string) => {
    await removeAttachment(ticket.id, storagePath);
  };

  const handleSendComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    const ok = await addComment(ticket.id, text);
    if (ok) setCommentText('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-[640px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="leading-snug">{ticket.title}</DialogTitle>
              <DialogDescription className="mt-1">
                Raised by {ticket.createdByName} · {formatTicketDateTime(ticket.createdAt)}
                {ticket.updatedAt && ticket.updatedAt.getTime() !== ticket.createdAt?.getTime()
                  ? ` · Updated ${formatTicketDateTime(ticket.updatedAt)}`
                  : ''}
              </DialogDescription>
            </div>
            <span
              className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
              style={{ backgroundColor: TICKET_STATUS_META[ticket.status].color }}
            >
              {TICKET_STATUS_META[ticket.status].label}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {/* Controls */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={ticket.status} onValueChange={handleStatusChange} disabled={pending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((status) => (
                    <SelectItem
                      key={status}
                      value={status}
                      disabled={!isValidTicketStatusTransition(ticket.status, status)}
                    >
                      {TICKET_STATUS_META[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned to</Label>
              <Select
                value={ticket.assigneeUid ?? UNASSIGNED}
                onValueChange={handleAssigneeChange}
                disabled={pending || archived}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.uid} value={u.uid}>
                      {u.displayName}
                    </SelectItem>
                  ))}
                  {/* Keep the current assignee selectable even if their account was disabled */}
                  {ticket.assigneeUid &&
                    ticket.assigneeName &&
                    !users.some((u) => u.uid === ticket.assigneeUid) && (
                      <SelectItem value={ticket.assigneeUid}>{ticket.assigneeName}</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          {ticket.description && (
            <div>
              <Label className="text-[12px] text-muted-foreground">Description</Label>
              <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-[13px] leading-relaxed">
                {ticket.description}
              </p>
            </div>
          )}

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[12px] text-muted-foreground">
                Attachments ({ticket.attachments.length})
              </Label>
              {!archived && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilePicked(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-[11.5px]"
                    disabled={pending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3 w-3" />
                    Add file
                  </Button>
                </>
              )}
            </div>

            {ticket.attachments.length > 0 && (
              <ul className="mt-2 space-y-2">
                {ticket.attachments.map((attachment) => {
                  const isImage = attachment.contentType.startsWith('image/');
                  const canRemove =
                    !archived && (attachment.uploadedByUid === user?.uid || role === 'admin');
                  return (
                    <li
                      key={attachment.storagePath}
                      className="flex items-center gap-3 rounded-lg border border-border p-2"
                    >
                      {isImage && attachment.downloadURL ? (
                        <a
                          href={attachment.downloadURL}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={attachment.downloadURL}
                            alt={attachment.name}
                            className="h-12 w-12 rounded-md object-cover"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium">{attachment.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatFileSize(attachment.size)} · {attachment.uploadedByName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {attachment.downloadURL && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a
                              href={attachment.downloadURL}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Download ${attachment.name}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={pending}
                            aria-label={`Remove ${attachment.name}`}
                            onClick={() => handleRemoveAttachment(attachment.storagePath)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <Label className="text-[12px] text-muted-foreground">
              Comments ({ticket.commentCount})
            </Label>
            <div className="mt-2 max-h-[260px] space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-muted-foreground">
                  No comments yet — start the conversation below.
                </p>
              ) : (
                comments.map((comment) => {
                  const mine = comment.authorUid === user?.uid;
                  return (
                    <div key={comment.id} className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white',
                          getAvatarColor(comment.authorName)
                        )}
                      >
                        {getInitials(comment.authorName)}
                      </span>
                      <div className={cn('max-w-[75%]', mine && 'text-right')}>
                        <p className="text-[10.5px] text-muted-foreground">
                          {comment.authorName} · {formatTicketDateTime(comment.createdAt)}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 inline-block whitespace-pre-wrap rounded-2xl px-3 py-1.5 text-left text-[12.5px] leading-relaxed',
                            mine ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
                          )}
                        >
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {!archived && (
              <div className="mt-2 flex items-end gap-2">
                <Textarea
                  value={commentText}
                  maxLength={MAX_TICKET_COMMENT_LENGTH}
                  placeholder="Write a comment…"
                  className="min-h-[40px] flex-1 resize-none"
                  rows={1}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={pending || !commentText.trim()}
                  aria-label="Send comment"
                  onClick={handleSendComment}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer: archive / restore */}
        <div className="flex justify-between border-t border-border pt-3">
          <span className="text-[11px] text-muted-foreground">Ticket ID: {ticket.id}</span>
          {archived ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={pending}
              onClick={() => handleStatusChange('open')}
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
              Restore to Open
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              disabled={pending}
              onClick={() => handleStatusChange('archived')}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive Ticket
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
