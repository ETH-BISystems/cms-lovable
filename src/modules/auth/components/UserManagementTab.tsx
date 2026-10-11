import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserPlus, Shield, Users, RefreshCw, Copy, Check, MailWarning,
  MoreHorizontal, Trash2, Ban, CircleCheck, Mail, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Role } from '@/platform/types/roles';
import { authService } from '@/services/authService';
import type { ManagedUser } from '@/services/types';
import { useAuth } from '../hooks/useAuth';
import { AccessDenied } from './AccessDenied';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-600',
  editor: 'bg-blue-500/10 text-blue-600',
  writer: 'bg-green-500/10 text-green-600',
  viewer: 'bg-gray-500/10 text-gray-600',
};

const ASSIGNABLE_ROLES = [Role.Admin, Role.Editor, Role.Writer, Role.Viewer] as const;

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(date: Date | null): string {
  if (!date) return 'Never';
  return `${formatDate(date)}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

type InviteStage = 'form' | 'done';

interface InviteResult {
  email: string;
  displayName: string;
  emailSent: boolean;
  resetLink: string | null;
}

/**
 * Admin User Management screen (CMS-160): lists every CMS login account and
 * lets admins invite new users (random temporary password + password-reset
 * email so invitees set their own), change roles, disable/enable, delete
 * accounts, and resend invites. All mutations run through admin-gated
 * callable Cloud Functions; the directory itself comes from the `listUsers`
 * callable because Firebase Auth data is only available server-side.
 */
export function UserManagementTab() {
  const { role, user } = useAuth();
  const isAdmin = role === Role.Admin;

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStage, setInviteStage] = useState<InviteStage>('form');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  // Per the client request every new account lands as admin by default.
  const [inviteRole, setInviteRole] = useState<Role>(Role.Admin);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await authService.listManagedUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadUsers();
    }
  }, [isAdmin, loadUsers]);

  const activeAdminCount = useMemo(
    () => users.filter((u) => u.role === Role.Admin && !u.disabled).length,
    [users],
  );

  const resetInviteForm = useCallback(() => {
    setInviteStage('form');
    setInviteName('');
    setInviteEmail('');
    setInviteRole(Role.Admin);
    setInviteResult(null);
    setLinkCopied(false);
  }, []);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    const displayName = inviteName.trim();
    if (!email || !displayName) {
      toast.error('Name and email are required');
      return;
    }
    setInviting(true);
    try {
      const result = await authService.createUser({ email, displayName, role: inviteRole });
      let emailSent = true;
      try {
        await authService.sendPasswordReset(email);
      } catch {
        emailSent = false;
      }
      setInviteResult({ email, displayName, emailSent, resetLink: result.resetLink ?? null });
      setInviteStage('done');
      void loadUsers();
    } catch (err) {
      toast.error('Failed to create user', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success('Password-reset link copied');
    } catch {
      toast.error('Could not copy — select and copy the link manually');
    }
  };

  const handleUpdateRole = async (target: ManagedUser, nextRole: Role) => {
    if (target.role === nextRole) return;
    try {
      await authService.updateUserRole({ uid: target.uid, role: nextRole });
      toast.success(`${target.displayName || target.email} is now ${nextRole}`);
      void loadUsers();
    } catch (err) {
      toast.error('Failed to update role', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleSetDisabled = async (target: ManagedUser, disabled: boolean) => {
    if (disabled && target.uid === user?.uid) {
      toast.error('You cannot disable your own account');
      return;
    }
    if (disabled && target.role === Role.Admin && activeAdminCount <= 1) {
      toast.error('Cannot disable the last admin account');
      return;
    }
    try {
      await authService.setUserDisabled({ uid: target.uid, disabled });
      toast.success(disabled ? 'Account disabled' : 'Account enabled');
      void loadUsers();
    } catch (err) {
      toast.error('Failed to update account', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleResendInvite = async (target: ManagedUser) => {
    try {
      await authService.sendPasswordReset(target.email);
      toast.success(`Password-reset email sent to ${target.email}`);
    } catch (err) {
      toast.error('Failed to send invite email', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authService.deleteUser({ uid: deleteTarget.uid });
      toast.success(`${deleteTarget.displayName || deleteTarget.email} deleted`);
      setDeleteTarget(null);
      void loadUsers();
    } catch (err) {
      toast.error('Failed to delete user', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) {
    return <AccessDenied userRole={role ?? Role.Viewer} requiredRoles={[Role.Admin]} />;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border px-5 py-8 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
        <p className="text-[13px] text-destructive">Failed to load users: {error}</p>
        <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={() => void loadUsers()}>
          <RefreshCw className="h-3.5 w-3.5" />Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <h3 className="text-[14px] font-semibold text-card-foreground">
              CMS Accounts ({users.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-[12px] gap-1.5" onClick={() => void loadUsers()}>
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </Button>
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-[12px] gap-1.5"
              onClick={() => { resetInviteForm(); setInviteOpen(true); }}
            >
              <UserPlus className="h-3.5 w-3.5" />Invite User
            </Button>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-[12px] text-muted-foreground mb-3">No accounts found.</p>
            <Button
              variant="outline"
              size="sm"
              className="text-[12px]"
              onClick={() => { resetInviteForm(); setInviteOpen(true); }}
            >
              Invite the first user
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">User</TableHead>
                <TableHead className="text-[11px]">Role</TableHead>
                <TableHead className="text-[11px]">Status</TableHead>
                <TableHead className="text-[11px]">Created</TableHead>
                <TableHead className="text-[11px]">Last sign-in</TableHead>
                <TableHead className="text-[11px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((managed) => {
                const isSelf = managed.uid === user?.uid;
                const isLastAdmin = managed.role === Role.Admin && !managed.disabled && activeAdminCount <= 1;
                return (
                  <TableRow key={managed.uid} className={cn(managed.disabled && 'opacity-60')}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-[11px] font-medium text-accent shrink-0">
                          {(managed.displayName || managed.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[12px] font-medium">
                            {managed.displayName || 'Unnamed'}
                            {isSelf && <span className="text-[10px] text-muted-foreground"> (you)</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{managed.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {managed.role ? (
                        <Badge className={cn('text-[10px] capitalize', ROLE_COLORS[managed.role])}>
                          {managed.role}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">No role</Badge>
                      )}
                      {managed.profileMissing && (
                        <p className="text-[9px] text-muted-foreground mt-1">No CMS profile</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={managed.disabled ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {managed.disabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {formatDate(managed.createdAt)}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {formatDateTime(managed.lastSignInAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Select
                          value={managed.role ?? undefined}
                          onValueChange={(value) => void handleUpdateRole(managed, value as Role)}
                          disabled={managed.authMissing}
                        >
                          <SelectTrigger className="h-7 w-[104px] text-[11px]">
                            <SelectValue placeholder="Set role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="text-[12px] capitalize">
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Account actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void handleResendInvite(managed)}>
                              <Mail className="h-3.5 w-3.5 mr-2" />Resend invite email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void handleSetDisabled(managed, !managed.disabled)}
                              disabled={isSelf || isLastAdmin}
                            >
                              {managed.disabled ? (
                                <><CircleCheck className="h-3.5 w-3.5 mr-2" />Enable account</>
                              ) : (
                                <><Ban className="h-3.5 w-3.5 mr-2" />Disable account</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(managed)}
                              disabled={isSelf || isLastAdmin || managed.authMissing}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />Delete account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invite User dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) resetInviteForm(); }}>
        <DialogContent className="max-w-[480px]">
          {inviteStage === 'form' ? (
            <>
              <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-[12px] text-muted-foreground">
                  Creates a CMS login and emails the invitee a secure link to set their own password.
                  No password is chosen or seen by anyone here.
                </p>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Full name"
                    className="text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@elitetravelhackers.com"
                    type="email"
                    className="text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Role <span className="text-destructive">*</span>
                  </label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                    <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-[13px] capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Admin = full system access, including inviting and managing other users.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setInviteOpen(false); resetInviteForm(); }}>
                  Cancel
                </Button>
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => void handleInvite()}
                  disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
                >
                  {inviting ? 'Creating…' : 'Create & Send Invite'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader><DialogTitle>User Invited</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {inviteResult?.emailSent ? (
                  <p className="text-[12px] text-muted-foreground">
                    <span className="font-medium text-foreground">{inviteResult.displayName}</span> was
                    created and a password-setup email was sent to{' '}
                    <span className="font-medium text-foreground">{inviteResult.email}</span>. They set
                    their own password from that link and can then sign in.
                  </p>
                ) : (
                  <div className="flex items-start gap-2 rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2.5">
                    <MailWarning className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                    <p className="text-[12px] text-orange-700">
                      The account was created but the invite email could not be sent. Send the
                      password-setup link below to {inviteResult?.email} manually.
                    </p>
                  </div>
                )}
                {inviteResult?.resetLink && (
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Backup password-setup link
                    </label>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={inviteResult.resetLink} className="text-[11px] font-mono" />
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5"
                        onClick={() => inviteResult.resetLink && void handleCopyLink(inviteResult.resetLink)}
                      >
                        {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {linkCopied ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Same link the email points to — share it directly if the email does not arrive.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetInviteForm}>Invite another</Button>
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => { setInviteOpen(false); resetInviteForm(); }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the login for{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.displayName || deleteTarget?.email}
              </span>{' '}
              ({deleteTarget?.email}) and removes their CMS profile. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); void handleDelete(); }}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
