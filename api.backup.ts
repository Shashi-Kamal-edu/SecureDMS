// ---------------------------------------------------------------------------
// Centralized API service.
//
// Every function below currently reads/writes localStorage through `store`
// (see ./mockData.ts) and resolves after a short artificial delay, so the UI
// already behaves like it is talking to a network API.
//
// To connect the real backend later:
//   1. Create an axios instance (baseURL: import.meta.env.VITE_API_URL).
//   2. Replace each function body with the matching HTTP call, e.g.:
//        export async function getCases() {
//          const { data } = await axios.get<Case[]>('/api/cases');
//          return data;
//        }
//   3. Leave every function signature the same — no page needs to change.
// ---------------------------------------------------------------------------

import {
  Case, CaseStatus, DocumentRecord, DocumentType, AuditEvent, User, Role,
  DashboardStats, NotificationItem,
} from '../types';
import { store, ensureSeeded } from './mockData';
import { generateId, generateMockHash, generateMockTxId } from '../utils/format';
import { login as authLogin, logout as authLogout, getSession, Session } from './auth';

ensureSeeded();

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function nextNumericSuffix(ids: string[], prefix: string): number {
  const nums = ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.split('-')[1], 10))
    .filter((n) => !Number.isNaN(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function logAudit(entry: Omit<AuditEvent, 'id' | 'timestamp'> & { timestamp?: string }) {
  const audit = store.getAudit();
  audit.unshift({
    id: generateId('EVT', nextNumericSuffix(audit.map((a) => a.id), 'EVT')),
    timestamp: entry.timestamp ?? new Date().toISOString(),
    ...entry,
  });
  store.setAudit(audit);
}

// ----------------------------- Auth ---------------------------------------

export async function login(email: string, password: string, remember: boolean): Promise<Session> {
  const session = await authLogin(email, password, remember);
  logAudit({ user: session.name, action: 'LOGIN', device: 'Web Browser', status: 'Success' });
  return session;
}

export function logout(): void {
  const session = getSession();
  if (session) {
    logAudit({ user: session.name, action: 'LOGIN', device: 'Web Browser', status: 'Success' });
  }
  authLogout();
}

// --------------------------- Dashboard --------------------------------

export async function getDashboardStats(): Promise<DashboardStats> {
  const docs = store.getDocuments();
  const cases = store.getCases();
  const todayStr = new Date().toDateString();
  const uploadedToday = docs.filter((d) => new Date(d.uploadDate).toDateString() === todayStr).length;
  const verified = docs.filter((d) => d.blockchainStatus === 'Registered').length;
  const alerts = docs.filter((d) => d.integrityStatus === 'Failed').length;
  const pending = docs.filter((d) => d.integrityStatus === 'Not Verified' || d.blockchainStatus === 'Pending').length;
  const stats: DashboardStats = {
    totalDocuments: docs.length,
    activeCases: cases.filter((c) => c.status === 'Active').length,
    uploadedToday: uploadedToday,
    ocrProcessed: docs.filter((d) => d.ocrStatus === 'Processed').length,
    blockchainVerified: verified,
    integrityAlerts: alerts,
    blockchainVerifiedPct: docs.length ? Math.round((verified / docs.length) * 1000) / 10 : 0,
    pendingReviews: pending,
  };
  return delay(stats);
}

export async function getDocumentsByTypeChart(): Promise<{ type: string; count: number }[]> {
  const docs = store.getDocuments();
  const counts = new Map<string, number>();
  docs.forEach((d) => counts.set(d.documentType, (counts.get(d.documentType) ?? 0) + 1));
  return delay(Array.from(counts.entries()).map(([type, count]) => ({ type, count })));
}

export async function getUploadsOverTimeChart(): Promise<{ date: string; uploads: number }[]> {
  const docs = store.getDocuments();
  const days: Record<string, number> = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days[d.toISOString().slice(0, 10)] = 0;
  }
  docs.forEach((d) => {
    const key = d.uploadDate.slice(0, 10);
    if (key in days) days[key] += 1;
  });
  return delay(Object.entries(days).map(([date, uploads]) => ({ date: date.slice(5), uploads })));
}

export async function getVerificationStatusChart(): Promise<{ status: string; count: number }[]> {
  const docs = store.getDocuments();
  const groups: Record<string, number> = { Verified: 0, Warning: 0, Failed: 0, 'Not Verified': 0 };
  docs.forEach((d) => { groups[d.integrityStatus] = (groups[d.integrityStatus] ?? 0) + 1; });
  return delay(Object.entries(groups).map(([status, count]) => ({ status, count })));
}

export async function getActiveCasesChart(): Promise<{ status: CaseStatus; count: number }[]> {
  const cases = store.getCases();
  const groups: Record<string, number> = { Active: 0, 'Under Review': 0, Closed: 0, Archived: 0 };
  cases.forEach((c) => { groups[c.status] += 1; });
  return delay(Object.entries(groups).map(([status, count]) => ({ status: status as CaseStatus, count })));
}

// ----------------------------- Cases ---------------------------------------

export async function getCases(): Promise<Case[]> {
  return delay([...store.getCases()].sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated)));
}

export async function getCase(id: string): Promise<Case | undefined> {
  return delay(store.getCases().find((c) => c.id === id));
}

export interface CreateCaseInput {
  caseNumber: string;
  caseName: string;
  caseType: string;
  department: string;
  assignedOfficer: string;
  description: string;
}

export async function createCase(input: CreateCaseInput, actor: string): Promise<Case> {
  const cases = store.getCases();
  const now = new Date().toISOString();
  const newCase: Case = {
    id: generateId('CASE', nextNumericSuffix(cases.map((c) => c.id), 'CASE') + 100),
    status: 'Active',
    createdDate: now,
    lastUpdated: now,
    ...input,
  };
  store.setCases([newCase, ...cases]);
  logAudit({ user: actor, action: 'UPDATE', caseId: newCase.id, device: 'Web Browser', status: 'Success' });
  return delay(newCase);
}

export async function updateCase(id: string, patch: Partial<Case>, actor: string): Promise<Case | undefined> {
  const cases = store.getCases();
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) return delay(undefined);
  cases[idx] = { ...cases[idx], ...patch, lastUpdated: new Date().toISOString() };
  store.setCases(cases);
  logAudit({ user: actor, action: 'UPDATE', caseId: id, device: 'Web Browser', status: 'Success' });
  return delay(cases[idx]);
}

// --------------------------- Documents --------------------------------

export async function getDocuments(): Promise<DocumentRecord[]> {
  return delay([...store.getDocuments()].sort((a, b) => +new Date(b.uploadDate) - +new Date(a.uploadDate)));
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
  return delay(store.getDocuments().find((d) => d.id === id));
}

export async function getDocumentsByCase(caseId: string): Promise<DocumentRecord[]> {
  return delay(store.getDocuments().filter((d) => d.caseId === caseId));
}

export interface UploadDocumentInput {
  caseId: string;
  documentType: DocumentType;
  title: string;
  description: string;
  fileName: string;
  fileSizeKb: number;
  fileKind: 'pdf' | 'image' | 'docx';
  tags: string[];
}

export async function uploadDocument(input: UploadDocumentInput, actor: string): Promise<DocumentRecord> {
  const docs = store.getDocuments();
  const now = new Date().toISOString();
  const id = generateId('DOC', nextNumericSuffix(docs.map((d) => d.id), 'DOC') + 1000);
  const hash = generateMockHash(`${input.fileName}-${now}`);
  const txId = generateMockTxId();
  const record: DocumentRecord = {
    id,
    fileName: input.fileName,
    title: input.title,
    caseId: input.caseId,
    documentType: input.documentType,
    version: 1,
    uploadedBy: actor,
    uploadDate: now,
    tags: input.tags,
    fileSizeKb: input.fileSizeKb,
    fileKind: input.fileKind,
    ocrStatus: 'Processing',
    ocrText: '',
    ocrMetadata: {},
    blockchainStatus: 'Pending',
    blockchainTxId: txId,
    currentHash: hash,
    registeredHash: hash,
    integrityStatus: 'Not Verified',
    versions: [{ version: 1, updatedBy: actor, timestamp: now, hash, blockchainTxId: txId, note: 'Initial upload and registration' }],
  };
  store.setDocuments([record, ...docs]);
  logAudit({ user: actor, action: 'UPLOAD', documentName: input.fileName, caseId: input.caseId, device: 'Web Browser', status: 'Success' });
  return delay(record, 200);
}

// Simulates the backend pipeline: OCR -> hash confirm -> blockchain register.
export async function completeDocumentPipeline(id: string, actor: string): Promise<DocumentRecord | undefined> {
  const docs = store.getDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return delay(undefined);
  const doc = docs[idx];
  const isFir = doc.documentType === 'FIR';
  const caseRecord = store.getCases().find((c) => c.id === doc.caseId);
  const ocrText = isFir
    ? `FIR No: ${caseRecord?.caseNumber ?? '—'}\nPolice Station: ${caseRecord?.department ?? '—'}\nDate: ${doc.uploadDate.slice(0, 10)}\nCase Type: ${caseRecord?.caseType ?? '—'}\nComplainant: —\nInvestigation Officer: ${doc.uploadedBy}`
    : `Document Type: ${doc.documentType}\nCase Reference: ${caseRecord?.caseNumber ?? '—'}\nPrepared By: ${doc.uploadedBy}\nDate: ${doc.uploadDate.slice(0, 10)}\nDepartment: ${caseRecord?.department ?? '—'}`;

  docs[idx] = {
    ...doc,
    ocrStatus: 'Processed',
    ocrText,
    ocrMetadata: {
      'Document Type': doc.documentType,
      'Case Reference': caseRecord?.caseNumber ?? '—',
      Department: caseRecord?.department ?? '—',
      Date: doc.uploadDate.slice(0, 10),
      'Prepared By': doc.uploadedBy,
    },
    blockchainStatus: 'Registered',
    integrityStatus: 'Verified',
  };
  store.setDocuments(docs);
  logAudit({ user: 'System', action: 'OCR_PROCESS', documentName: doc.fileName, caseId: doc.caseId, device: 'Server · OCR Pipeline', status: 'Success' });
  logAudit({ user: 'System', action: 'BLOCKCHAIN_REGISTER', documentName: doc.fileName, caseId: doc.caseId, device: 'Server · Blockchain Node', status: 'Success' });
  return delay(docs[idx], 200);
}

export async function updateDocumentMetadata(id: string, metadata: Record<string, string>, actor: string): Promise<DocumentRecord | undefined> {
  const docs = store.getDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return delay(undefined);
  docs[idx] = { ...docs[idx], ocrMetadata: metadata };
  store.setDocuments(docs);
  logAudit({ user: actor, action: 'UPDATE', documentName: docs[idx].fileName, caseId: docs[idx].caseId, device: 'Web Browser', status: 'Success' });
  return delay(docs[idx]);
}

export async function reprocessOcr(id: string, actor: string): Promise<DocumentRecord | undefined> {
  logAudit({ user: actor, action: 'OCR_PROCESS', device: 'Web Browser', status: 'Success' });
  return getDocument(id);
}

export async function createNewVersion(id: string, actor: string, note: string): Promise<DocumentRecord | undefined> {
  const docs = store.getDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return delay(undefined);
  const doc = docs[idx];
  const nextVersion = doc.version + 1;
  const now = new Date().toISOString();
  const hash = generateMockHash(`${doc.fileName}-v${nextVersion}-${now}`);
  const txId = generateMockTxId();
  docs[idx] = {
    ...doc,
    version: nextVersion,
    currentHash: hash,
    registeredHash: hash,
    integrityStatus: 'Verified',
    blockchainStatus: 'Registered',
    blockchainTxId: txId,
    tamperSimulated: false,
    versions: [...doc.versions, { version: nextVersion, updatedBy: actor, timestamp: now, hash, blockchainTxId: txId, note }],
  };
  store.setDocuments(docs);
  logAudit({ user: actor, action: 'CREATE_VERSION', documentName: doc.fileName, caseId: doc.caseId, device: 'Web Browser', status: 'Success' });
  return delay(docs[idx]);
}

export interface VerificationResult {
  passed: boolean;
  currentHash: string;
  registeredHash: string;
  checkedAt: string;
}

export async function verifyDocumentIntegrity(id: string, actor: string): Promise<VerificationResult | undefined> {
  const docs = store.getDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return delay(undefined);
  const doc = docs[idx];
  const passed = doc.currentHash === doc.registeredHash;
  docs[idx] = { ...doc, integrityStatus: passed ? 'Verified' : 'Failed' };
  store.setDocuments(docs);
  logAudit({ user: actor, action: 'VERIFY', documentName: doc.fileName, caseId: doc.caseId, device: 'Web Browser', status: passed ? 'Success' : 'Failed' });
  return delay({ passed, currentHash: doc.currentHash, registeredHash: doc.registeredHash, checkedAt: new Date().toISOString() });
}

export async function simulateTampering(id: string, actor: string): Promise<DocumentRecord | undefined> {
  const docs = store.getDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return delay(undefined);
  const doc = docs[idx];
  const tamperedHash = generateMockHash(`${doc.fileName}-TAMPERED-${Date.now()}`);
  docs[idx] = { ...doc, currentHash: tamperedHash, integrityStatus: 'Failed', tamperSimulated: true };
  store.setDocuments(docs);
  logAudit({ user: actor, action: 'UPDATE', documentName: doc.fileName, caseId: doc.caseId, device: 'Web Browser (Demo)', status: 'Failed' });
  return delay(docs[idx]);
}

export async function restoreFromTampering(id: string): Promise<DocumentRecord | undefined> {
  const docs = store.getDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return delay(undefined);
  const doc = docs[idx];
  docs[idx] = { ...doc, currentHash: doc.registeredHash, integrityStatus: 'Verified', tamperSimulated: false };
  store.setDocuments(docs);
  return delay(docs[idx]);
}

export interface SearchFilters {
  documentType?: string;
  caseId?: string;
  uploadedBy?: string;
  ocrStatus?: string;
  blockchainStatus?: string;
  integrityStatus?: string;
}

export interface SearchResult extends DocumentRecord {
  matchedText: string;
}

export async function searchDocuments(query: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
  const docs = store.getDocuments();
  const q = query.trim().toLowerCase();
  const results = docs.filter((d) => {
    if (filters.documentType && d.documentType !== filters.documentType) return false;
    if (filters.caseId && d.caseId !== filters.caseId) return false;
    if (filters.uploadedBy && d.uploadedBy !== filters.uploadedBy) return false;
    if (filters.ocrStatus && d.ocrStatus !== filters.ocrStatus) return false;
    if (filters.blockchainStatus && d.blockchainStatus !== filters.blockchainStatus) return false;
    if (filters.integrityStatus && d.integrityStatus !== filters.integrityStatus) return false;
    if (!q) return true;
    const caseRecord = store.getCases().find((c) => c.id === d.caseId);
    const haystack = [d.fileName, d.title, d.ocrText, caseRecord?.caseNumber, d.uploadedBy, ...d.tags].join(' ').toLowerCase();
    return haystack.includes(q);
  });
  const withMatches: SearchResult[] = results.map((d) => {
    let matched = d.title;
    if (q) {
      const line = d.ocrText.split('\n').find((l) => l.toLowerCase().includes(q));
      if (line) matched = line.trim();
    }
    return { ...d, matchedText: matched };
  });
  return delay(withMatches);
}

// --------------------------- Activity / Versions ------------------------

export async function getAuditLogs(): Promise<AuditEvent[]> {
  return delay(store.getAudit());
}

export async function getVersionHistory(documentId: string) {
  const doc = store.getDocuments().find((d) => d.id === documentId);
  return delay(doc?.versions ?? []);
}

// ----------------------------- Users ---------------------------------------

export async function getUsers(): Promise<User[]> {
  return delay(store.getUsers());
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Disabled';
}

export async function createUser(input: CreateUserInput, actor: string): Promise<User> {
  const users = store.getUsers();
  const initials = input.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const user: User = {
    id: generateId('USR', nextNumericSuffix(users.map((u) => u.id), 'USR')),
    lastLogin: '—',
    avatarInitials: initials || 'U',
    ...input,
  };
  store.setUsers([...users, user]);
  logAudit({ user: actor, action: 'UPDATE', device: 'Web Browser', status: 'Success' });
  return delay(user);
}

export async function updateUser(id: string, patch: Partial<User>, actor: string): Promise<User | undefined> {
  const users = store.getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return delay(undefined);
  users[idx] = { ...users[idx], ...patch };
  store.setUsers(users);
  logAudit({ user: actor, action: 'UPDATE', device: 'Web Browser', status: 'Success' });
  return delay(users[idx]);
}

// ------------------------- Notifications --------------------------------

export async function getNotifications(): Promise<NotificationItem[]> {
  return delay(store.getNotifications());
}

export async function markNotificationsRead(): Promise<void> {
  const items = store.getNotifications().map((n) => ({ ...n, read: true }));
  store.setNotifications(items);
}
