import { Role, User } from '../types';
import { store, STORAGE_KEYS } from './mockData';

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
  loginAt: string;
}

const DEMO_CREDENTIALS: Record<string, { password: string; userId: string }> = {
  'admin@securedms.demo': { password: 'admin123', userId: 'USR-0001' },
  'investigator@securedms.demo': { password: 'investigator123', userId: 'USR-0002' },
  'reviewer@securedms.demo': { password: 'reviewer123', userId: 'USR-0003' },
  'viewer@securedms.demo': { password: 'viewer123', userId: 'USR-0004' },
};

// login() is written to look like a real API call so it can later be
// replaced with: const { data } = await api.post('/auth/login', { email, password })
export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  await simulateLatency();
  const normalized = email.trim().toLowerCase();
  const cred = DEMO_CREDENTIALS[normalized];
  if (!cred || cred.password !== password) {
    throw new Error('Invalid email or password. Check the demo credentials on this page.');
  }
  const users = store.getUsers();
  const user = users.find((u) => u.id === cred.userId) as User;
  if (user.status === 'Disabled') {
    throw new Error('This account has been disabled. Contact an administrator.');
  }
  user.lastLogin = new Date().toISOString();
  store.setUsers(users.map((u) => (u.id === user.id ? user : u)));

  const session: Session = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarInitials: user.avatarInitials,
    loginAt: new Date().toISOString(),
  };
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  return session;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.session);
  sessionStorage.removeItem(STORAGE_KEYS.session);
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEYS.session) || sessionStorage.getItem(STORAGE_KEYS.session);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function simulateLatency(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
