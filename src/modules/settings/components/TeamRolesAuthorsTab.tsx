import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Plus, UserPlus, Shield, Users, Globe, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import { teamService } from '../services/teamService';
import type { TeamMember } from '../services/teamService';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-600',
  editor: 'bg-blue-500/10 text-blue-600',
  writer: 'bg-green-500/10 text-green-600',
  viewer: 'bg-gray-500/10 text-gray-600',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full system access. Manage users, settings, integrations, and all content.',
  editor: 'Edit content, manage pipeline, limited settings access (Brand Voice, Content Rules, KPI Targets, Competitors).',
  writer: 'Create and edit own content. View pipeline and calendar.',
  viewer: 'Read-only access to dashboards and content.',
};

const DEPARTMENTS = [
  'Content', 'Account Executive', 'Flight Search', 'SEO', 'Media', 'Card Data', 'Leadership', 'Operations',
];

const SKILL_TAGS = [
  'Copyediting', 'Fact-Checking', 'Image Sourcing', 'Social Media', 'Card Data',
  'Airline Content', 'Hotel Content', 'Deal Alerts', 'SEO Research', 'Newsletter Production',
];

export function TeamRolesAuthorsTab() {
  const { canWrite, isAdmin } = useSettingsPermissions();
  const readOnly = !isAdmin;
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Add member form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'editor' | 'writer' | 'viewer'>('writer');
  const [newCapacity, setNewCapacity] = useState('10');
  const [newDepartments, setNewDepartments] = useState<string[]>([]);
  const [newSkills, setNewSkills] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = teamService.subscribeToTeamMembers(
      (users) => {
        setMembers(users);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const resetAddForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setShowPassword(false);
    setNewTitle('');
    setNewRole('writer');
    setNewCapacity('10');
    setNewDepartments([]);
    setNewSkills([]);
  };

  const handleCreateUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setCreating(true);
    try {
      await teamService.createUser({
        email: newEmail.trim(),
        password: newPassword,
        displayName: newName.trim(),
        role: newRole,
        title: newTitle.trim() || undefined,
        taskCapacity: parseInt(newCapacity) || 10,
        departments: newDepartments,
        skills: newSkills,
      });
      toast.success(`Team member "${newName.trim()}" created successfully`, {
        description: `Email: ${newEmail.trim()} | Role: ${newRole}`,
      });
      setAddModalOpen(false);
      resetAddForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to create user', { description: msg });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await teamService.updateUserRole({ uid: userId, role: newRole });
      toast.success('Role updated successfully');
    } catch (err) {
      toast.error('Failed to update role', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleDisableUser = async (userId: string, disabled: boolean) => {
    const adminCount = members.filter(m => m.role === 'admin' && !m.disabled).length;
    const member = members.find(m => m.id === userId);
    if (member?.role === 'admin' && adminCount <= 1 && disabled) {
      toast.error('Cannot disable the last admin user');
      return;
    }
    try {
      await teamService.setUserDisabled({ uid: userId, disabled });
      toast.success(disabled ? 'User disabled' : 'User enabled');
    } catch (err) {
      toast.error('Failed to update user', { description: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUserId || resetPasswordValue.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setResettingPassword(true);
    try {
      await teamService.resetUserPassword({ userId: resetPasswordUserId, newPassword: resetPasswordValue });
      toast.success('Password updated successfully');
      setResetPasswordUserId(null);
      setResetPasswordValue('');
    } catch (err) {
      toast.error('Failed to reset password', { description: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSyncToWebflow = async (_userId: string) => {
    toast.info('Author sync to Webflow is not yet available', {
      description: 'Author profiles will sync to the Webflow authors collection in a future release.',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load team members: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Roles Reference Card */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          <h3 className="text-[14px] font-semibold text-card-foreground">Roles Reference</h3>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
              <div key={role} className="p-3 rounded-md border border-border">
                <Badge className={cn('text-[10px] capitalize', ROLE_COLORS[role])}>{role}</Badge>
                <p className="text-[10px] text-muted-foreground mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Departments Reference Card */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          <h3 className="text-[14px] font-semibold text-card-foreground">Departments</h3>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map(dept => (
              <Badge key={dept} variant="outline" className="text-[10px]">{dept}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Team Members ({members.length})</h3>
          {!readOnly && (
            <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={() => setAddModalOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />Add Team Member
            </Button>
          )}
        </div>
        <div className="px-5 py-4">
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-[12px] text-muted-foreground mb-3">No team members found.</p>
              {!readOnly && <Button variant="outline" size="sm" className="text-[12px]" onClick={() => setAddModalOpen(true)}>Add First Team Member</Button>}
            </div>
          ) : (
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.id} className={cn('border border-border rounded-md', member.disabled && 'opacity-50')}>
                  <button
                    onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-[12px] hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {expandedMember === member.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-[11px] font-medium text-accent">
                        {member.displayName?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{member.displayName || 'Unnamed'}</p>
                        <p className="text-[10px] text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-[10px] capitalize', ROLE_COLORS[member.role] || 'bg-muted text-muted-foreground')}>{member.role}</Badge>
                      {member.disabled && <Badge variant="destructive" className="text-[9px]">Disabled</Badge>}
                      {member.title && <span className="text-[10px] text-muted-foreground hidden sm:inline">{member.title}</span>}
                    </div>
                  </button>
                  {expandedMember === member.id && (
                    <div className="px-4 pb-4 border-t border-border space-y-4">
                      {/* Member Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Departments</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(member.departments || []).map(dept => (
                                <Badge key={dept} variant="outline" className="text-[9px]">{dept}</Badge>
                              ))}
                              {(!member.departments || member.departments.length === 0) && <span className="text-[10px] text-muted-foreground">None assigned</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Skills</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(member.skills || []).map(skill => (
                                <Badge key={skill} variant="secondary" className="text-[9px]">{skill}</Badge>
                              ))}
                              {(!member.skills || member.skills.length === 0) && <span className="text-[10px] text-muted-foreground">None listed</span>}
                            </div>
                          </div>
                          {member.taskCapacity != null && (
                            <div>
                              <p className="text-[10px] text-muted-foreground">Task Capacity</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent rounded-full"
                                    style={{ width: `${member.taskCapacity > 0 ? Math.min(((member.currentTasks || 0) / member.taskCapacity) * 100, 100) : 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{member.currentTasks || 0}/{member.taskCapacity}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Author Profile */}
                        {member.authorProfile && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-medium">Author Profile</p>
                              <Button variant="ghost" size="sm" className="text-[10px] h-6 gap-1" onClick={() => handleSyncToWebflow(member.id)}>
                                <Globe className="h-3 w-3" />Sync to Webflow
                              </Button>
                            </div>
                            {member.authorProfile.bio && <p className="text-[10px] text-muted-foreground line-clamp-2">{member.authorProfile.bio}</p>}
                            {member.authorProfile.expertise && member.authorProfile.expertise.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {member.authorProfile.expertise.map(exp => (
                                  <Badge key={exp} variant="outline" className="text-[9px]">{exp}</Badge>
                                ))}
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                <span className="text-muted-foreground">Published:</span> <span className="font-medium">{member.authorProfile.publishedCount || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Edited:</span> <span className="font-medium">{member.authorProfile.editedCount || 0}</span>
                              </div>
                            </div>
                            {member.authorProfile.webflowSynced != null && (
                              <Badge variant={member.authorProfile.webflowSynced ? 'default' : 'secondary'} className="text-[9px]">
                                {member.authorProfile.webflowSynced ? 'Webflow Synced' : 'Not Synced'}
                              </Badge>
                            )}
                            {member.authorProfile.authorPageUrl && (
                              <a href={member.authorProfile.authorPageUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline">
                                View Author Page →
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!readOnly && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className="text-[11px] h-7 rounded-md border border-input bg-background px-2"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="writer">Writer</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn('text-[11px] h-7', member.disabled ? 'text-green-600' : 'text-destructive')}
                            onClick={() => handleDisableUser(member.id, !member.disabled)}
                          >
                            {member.disabled ? 'Enable' : 'Disable'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[11px] h-7 text-accent"
                            onClick={() => { setResetPasswordUserId(member.id); setResetPasswordValue(''); }}
                          >
                            Reset Password
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Team Member Modal */}
      <Dialog open={addModalOpen} onOpenChange={(open) => { setAddModalOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-[550px] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Name + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Name <span className="text-destructive">*</span></label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" className="text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Email <span className="text-destructive">*</span></label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@eth.com" type="email" className="text-[13px]" />
              </div>
            </div>
            {/* Password */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Password <span className="text-destructive">*</span></label>
              <div className="relative">
                <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" type={showPassword ? 'text' : 'password'} className="text-[13px] pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">This password will be given to the team member to log in.</p>
            </div>
            {/* Title + Role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Title</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Senior Account Executive" className="text-[13px]" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Role <span className="text-destructive">*</span></label>
                <Select value={newRole} onValueChange={v => setNewRole(v as typeof newRole)}>
                  <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="writer">Writer</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Weekly Task Capacity */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Weekly Task Capacity</label>
              <Input value={newCapacity} onChange={e => setNewCapacity(e.target.value)} type="number" className="text-[13px] w-24" />
            </div>
            {/* Department Tags */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Department Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {DEPARTMENTS.map(dept => (
                  <button key={dept} onClick={() => setNewDepartments(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])}
                    className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                      newDepartments.includes(dept) ? 'bg-accent/15 text-accent border-accent/30' : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80')}>
                    {dept}
                  </button>
                ))}
              </div>
            </div>
            {/* Skill Tags */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Skill Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_TAGS.map(skill => (
                  <button key={skill} onClick={() => setNewSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])}
                    className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                      newSkills.includes(skill) ? 'bg-green-500/15 text-green-700 border-green-500/30' : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80')}>
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddModalOpen(false); resetAddForm(); }}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleCreateUser} disabled={creating || !newName.trim() || !newEmail.trim() || newPassword.length < 8}>
              {creating ? 'Creating...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordUserId !== null} onOpenChange={(open) => { if (!open) { setResetPasswordUserId(null); setResetPasswordValue(''); } }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground">
              Set a new password for <span className="font-medium text-foreground">{members.find(m => m.id === resetPasswordUserId)?.displayName || 'this user'}</span>.
              They will need to use this new password to log in.
            </p>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">New Password <span className="text-destructive">*</span></label>
              <div className="relative">
                <Input
                  value={resetPasswordValue}
                  onChange={e => setResetPasswordValue(e.target.value)}
                  placeholder="Min 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  className="text-[13px] pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordUserId(null); setResetPasswordValue(''); }}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleResetPassword} disabled={resettingPassword || resetPasswordValue.length < 8}>
              {resettingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
