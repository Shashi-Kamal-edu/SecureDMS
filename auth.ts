import axios from 'axios';
import { Role } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const SESSION_KEY = 'secure_dms_session';
const TOKEN_KEY = 'secure_dms_token';

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
  loginAt: string;
}

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active?: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: BackendUser;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function saveSession(session: Session, token: string, remember: boolean): void {
  const storage = remember ? localStorage : sessionStorage;

  storage.setItem(SESSION_KEY, JSON.stringify(session));
  storage.setItem(TOKEN_KEY, token);

  // Remove stale copy from the other storage.
  const otherStorage = remember ? sessionStorage : localStorage;
  otherStorage.removeItem(SESSION_KEY);
  otherStorage.removeItem(TOKEN_KEY);
}

export async function login(
  email: string,
  password: string,
  remember: boolean
): Promise<Session> {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: email.trim().toLowerCase(),
      password,
    });

    const body = response.data;

    if (!body?.success || !body?.data) {
      throw new Error(body?.message || 'Login failed.');
    }

    const data = body.data as LoginResponse;
    const user = data.user;

    const session: Session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarInitials: getInitials(user.name),
      loginAt: new Date().toISOString(),
    };

    saveSession(session, data.access_token, remember);

    return session;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;

      if (typeof detail === 'string') {
        throw new Error(detail);
      }

      throw new Error(
        error.response?.data?.message ||
          'Unable to connect to the Secure DMS backend.'
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Login failed.');
  }
}

export async function getCurrentUser(): Promise<Session | null> {
  const token = getToken();

  if (!token) {
    return getSession();
  }

  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = response.data;

    if (!body?.success || !body?.data) {
      return null;
    }

    const user = body.data as BackendUser;

    const session: Session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarInitials: getInitials(user.name),
      loginAt: getSession()?.loginAt || new Date().toISOString(),
    };

    const remember = Boolean(localStorage.getItem(SESSION_KEY));

    saveSession(session, token, remember);

    return session;
  } catch {
    logout();
    return null;
  }
}

export async function logout(): Promise<void> {
  const token = getToken();

  if (token) {
    try {
      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch {
      // Even if backend logout fails, clear the local session.
    }
  }

  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);

  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY)
  );
}

export function getSession(): Session | null {
  const raw =
    localStorage.getItem(SESSION_KEY) ||
    sessionStorage.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}