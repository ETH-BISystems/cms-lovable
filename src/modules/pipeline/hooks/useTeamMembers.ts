// MOCK — production subscribed to the `users` Firestore collection; here the
// four seed users from the mock auth service are emitted once with the same
// TeamMember shape.

import { useState, useEffect } from 'react';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  disabled?: boolean;
}

const MOCK_TEAM: TeamMember[] = [
  { id: 'user-daynis', name: 'Daynis Olman', email: 'daynis@elitetravelhackers.com', avatar: 'DO', role: 'Admin' },
  { id: 'user-sarah', name: 'Sarah Mitchell', email: 'sarah@elitetravelhackers.com', avatar: 'SM', role: 'Editor' },
  { id: 'user-james', name: 'James Carter', email: 'james@elitetravelhackers.com', avatar: 'JC', role: 'Writer' },
  { id: 'user-emma', name: 'Emma Rodriguez', email: 'emma@elitetravelhackers.com', avatar: 'ER', role: 'Viewer' },
];

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Defer a tick so consumers render the loading state like they do with
    // onSnapshot's first async emission.
    const t = setTimeout(() => {
      setMembers(MOCK_TEAM.filter((u) => !u.disabled));
      setLoading(false);
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return { members, loading };
}
