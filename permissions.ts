import { Role } from '../types';

export type Permission =
  | 'case.view'
  | 'case.create'
  | 'case.edit'
  | 'document.view'
  | 'document.upload'
  | 'document.ocr'
  | 'document.verify'
  | 'document.review'
  | 'search.use'
  | 'activity.view'
  | 'version.view'
  | 'reports.view'
  | 'users.manage'
  | 'settings.manage';

// This mirrors the authorization rules that the FastAPI backend will
// eventually enforce server-side. Keeping it centralized here means the
// backend can expose the same matrix (e.g. GET /me/permissions) and the UI
// logic will not need to change.
const PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'case.view', 'case.create', 'case.edit',
    'document.view', 'document.upload', 'document.ocr', 'document.verify', 'document.review',
    'search.use', 'activity.view', 'version.view', 'reports.view',
    'users.manage', 'settings.manage',
  ],
  INVESTIGATOR: [
    'case.view', 'case.create',
    'document.view', 'document.upload', 'document.ocr', 'document.verify',
    'search.use', 'activity.view', 'version.view',
    'settings.manage',
  ],
  REVIEWER: [
    'case.view',
    'document.view', 'document.verify', 'document.review',
    'search.use', 'activity.view',
    'settings.manage',
  ],
  VIEWER: [
    'case.view',
    'document.view',
    'search.use',
    'settings.manage',
  ],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(permission);
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  INVESTIGATOR: 'Investigator',
  REVIEWER: 'Reviewer',
  VIEWER: 'Viewer',
};
