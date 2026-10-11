// MOCK-ONLY — in-memory team/users store for the Team, Roles & Authors tab.
// Replaces the production onSnapshot(collection(db, 'users')) listener and the
// user-management callables. Seeded with richer team-member docs (departments,
// skills, capacity, author profiles) than the shared authService carries.
//
// production:
//   subscribe — onSnapshot(collection(db, 'users'))
//   createUser — httpsCallable(functions, 'createUser')
//   updateUserRole — httpsCallable(functions, 'updateUserRole')
//   setUserDisabled — httpsCallable(functions, 'setUserDisabled')
//   resetUserPassword — httpsCallable(functions, 'resetUserPassword')

import { delay, mockId } from '@/services/_delay';

export interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: string;
  title?: string;
  departments?: string[];
  skills?: string[];
  taskCapacity?: number;
  currentTasks?: number;
  disabled?: boolean;
  authorProfile?: {
    displayName?: string;
    roleTitle?: string;
    bio?: string;
    expertise?: string[];
    education?: string;
    countries?: string[];
    publishedCount?: number;
    editedCount?: number;
    webflowSynced?: boolean;
    authorPageUrl?: string;
    socialLinks?: Record<string, string>;
  };
}

const members: TeamMember[] = [
  {
    id: 'u_daynis', email: 'daynis@elitetravelhackers.com', displayName: 'Daynis Olman', role: 'admin',
    title: 'Founder & Editor-in-Chief', departments: ['Leadership', 'Content', 'SEO'],
    skills: ['Copyediting', 'SEO Research', 'Card Data'], taskCapacity: 12, currentTasks: 7, disabled: false,
    authorProfile: {
      displayName: 'Daynis Olman', roleTitle: 'Founder & Editor-in-Chief',
      bio: 'Daynis has been collecting points since 2011 and has flown every Oneworld first-class product still in the sky. He writes the long-form card reviews and the valuation methodology behind every number on the site.',
      expertise: ['Points Valuation', 'Credit Cards', 'Oneworld'], education: 'B.Comm, University of Sydney',
      countries: ['Australia', 'Singapore', 'Japan'], publishedCount: 142, editedCount: 388,
      webflowSynced: true, authorPageUrl: 'https://elitepointsandmiles.com/authors/daynis-olman',
      socialLinks: { twitter: 'https://x.com/daynisolman', linkedin: 'https://linkedin.com/in/daynisolman' },
    },
  },
  {
    id: 'u_sarah', email: 'sarah@elitetravelhackers.com', displayName: 'Sarah Chen', role: 'editor',
    title: 'Managing Editor', departments: ['Content', 'SEO'],
    skills: ['Copyediting', 'Fact-Checking', 'Newsletter Production'], taskCapacity: 14, currentTasks: 11, disabled: false,
    authorProfile: {
      displayName: 'Sarah Chen', roleTitle: 'Managing Editor',
      bio: 'Sarah runs the editorial calendar and edits everything that touches a signup bonus. Former travel-desk editor; allergic to the word "delve".',
      expertise: ['Editing', 'Newsletter', 'Deal Alerts'], publishedCount: 38, editedCount: 291,
      webflowSynced: true, authorPageUrl: 'https://elitepointsandmiles.com/authors/sarah-chen',
      socialLinks: { linkedin: 'https://linkedin.com/in/sarahchen-editor' },
    },
  },
  {
    id: 'u_marcus', email: 'marcus@elitetravelhackers.com', displayName: 'Marcus Webb', role: 'writer',
    title: 'Staff Writer — Cards', departments: ['Content', 'Card Data'],
    skills: ['Card Data', 'Airline Content', 'Fact-Checking'], taskCapacity: 10, currentTasks: 6, disabled: false,
    authorProfile: {
      displayName: 'Marcus Webb', roleTitle: 'Staff Writer — Cards',
      bio: 'Marcus covers the Australian card market and keeps the comparison tables honest. He has held 23 cards and closed 19 of them on schedule.',
      expertise: ['Credit Cards', 'Signup Bonuses'], publishedCount: 87, editedCount: 12,
      webflowSynced: true, authorPageUrl: 'https://elitepointsandmiles.com/authors/marcus-webb',
      socialLinks: { twitter: 'https://x.com/marcuswrites' },
    },
  },
  {
    id: 'u_priya', email: 'priya@elitetravelhackers.com', displayName: 'Priya Nair', role: 'writer',
    title: 'Staff Writer — Airlines', departments: ['Content'],
    skills: ['Airline Content', 'Image Sourcing'], taskCapacity: 10, currentTasks: 4, disabled: false,
    authorProfile: {
      displayName: 'Priya Nair', roleTitle: 'Staff Writer — Airlines',
      bio: 'Priya writes the airline-program deep dives and the lounge reviews. Based in Melbourne; flies more than she sleeps.',
      expertise: ['Airline Programs', 'Lounges'], publishedCount: 54, editedCount: 8,
      webflowSynced: false,
    },
  },
  {
    id: 'u_tom', email: 'tom@elitetravelhackers.com', displayName: 'Tom Alvarez', role: 'editor',
    title: 'Account Executive', departments: ['Account Executive', 'Operations'],
    skills: ['Social Media'], taskCapacity: 8, currentTasks: 3, disabled: false,
  },
  {
    id: 'u_emma', email: 'emma@elitetravelhackers.com', displayName: 'Emma Rodriguez', role: 'viewer',
    title: 'SEO Analyst', departments: ['SEO'],
    skills: ['SEO Research'], taskCapacity: 6, currentTasks: 0, disabled: true,
  },
];

type Listener = (members: TeamMember[]) => void;
const listeners = new Set<Listener>();

function emit(): void {
  const snapshot = members.map((m) => ({ ...m }));
  listeners.forEach((l) => l(snapshot));
}

export const teamService = {
  /** production: onSnapshot(collection(db, 'users')) — emits once, then after mutations. */
  subscribeToTeamMembers(listener: Listener, onError?: (error: Error) => void): () => void {
    try {
      listeners.add(listener);
      setTimeout(() => listener(members.map((m) => ({ ...m }))), 200);
      return () => listeners.delete(listener);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to load team members'));
      return () => {};
    }
  },

  /** production: httpsCallable(functions, 'createUser') */
  async createUser(data: {
    email: string;
    password: string;
    displayName: string;
    role: string;
    title?: string;
    taskCapacity?: number;
    departments?: string[];
    skills?: string[];
  }): Promise<{ uid: string }> {
    await delay(500);
    const member: TeamMember = {
      id: mockId('u'),
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      title: data.title,
      taskCapacity: data.taskCapacity ?? 10,
      currentTasks: 0,
      departments: data.departments ?? [],
      skills: data.skills ?? [],
      disabled: false,
    };
    members.push(member);
    emit();
    return { uid: member.id };
  },

  /** production: httpsCallable(functions, 'updateUserRole') */
  async updateUserRole(data: { uid: string; role: string }): Promise<void> {
    await delay(300);
    const member = members.find((m) => m.id === data.uid);
    if (member) {
      member.role = data.role;
      emit();
    }
  },

  /** production: httpsCallable(functions, 'setUserDisabled') */
  async setUserDisabled(data: { uid: string; disabled: boolean }): Promise<void> {
    await delay(300);
    const member = members.find((m) => m.id === data.uid);
    if (member) {
      member.disabled = data.disabled;
      emit();
    }
  },

  /** production: httpsCallable(functions, 'resetUserPassword') */
  async resetUserPassword(_data: { userId: string; newPassword: string }): Promise<void> {
    await delay(400);
    // No stored passwords in the mock — succeed silently.
  },
};
