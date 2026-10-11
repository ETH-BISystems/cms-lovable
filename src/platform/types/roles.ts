export enum Role {
  Admin = 'admin',
  Editor = 'editor',
  Writer = 'writer',
  Viewer = 'viewer',
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.Admin]: 4,
  [Role.Editor]: 3,
  [Role.Writer]: 2,
  [Role.Viewer]: 1,
};

export function isValidRole(value: unknown): value is Role {
  return Object.values(Role).includes(value as Role);
}
