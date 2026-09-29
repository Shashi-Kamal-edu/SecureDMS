// ---------------------------------------------------------------------------
// Secure DMS - Real Backend API Service
// React Frontend -> Axios -> FastAPI Backend
// ---------------------------------------------------------------------------

import axios from 'axios';

import {
  Case,
  CaseStatus,
  DocumentRecord,
  DocumentType,
  AuditEvent,
  User,
  Role,
  DashboardStats,
  NotificationItem,
} from '../types';

import {
  login as authLogin,
  logout as authLogout,
  getToken,
  Session,
} from './auth';

// ---------------------------------------------------------------------------
// Axios
// ---------------------------------------------------------------------------

const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const http = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('secure_dms_session');
      localStorage.removeItem('secure_dms_token');

      sessionStorage.removeItem('secure_dms_session');
      sessionStorage.removeItem('secure_dms_token');
    }

    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

type ApiEnvelope<T> = {
  success: boolean;
  message?: string | null;
  data: T;
};

function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || 'API request failed.');
  }

  return response.data.data;
}

function apiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === 'string') {
      return new Error(detail);
    }

    const message = error.response?.data?.message;

    if (typeof message === 'string') {
      return new Error(message);
    }

    if (error.message) {
      return new Error(error.message);
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Unexpected API error.');
}

function unwrapList<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    return (value as { items: T[] }).items;
  }

  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: T[] }).results;
  }

  return [];
}

function stringValue(
  object: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = object[key];

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

function numberValue(
  object: Record<string, unknown>,
  ...keys: string[]
): number {
  for (const key of keys) {
    const value = object[key];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Backend -> Frontend mapping
// ---------------------------------------------------------------------------

function mapCase(raw: unknown): Case {
  const item = (raw || {}) as Record<string, unknown>;

  const statusRaw = stringValue(item, 'status');

  let status: CaseStatus = 'Active';

  switch (statusRaw.toUpperCase()) {
    case 'OPEN':
    case 'ACTIVE':
      status = 'Active';
      break;

    case 'UNDER_INVESTIGATION':
    case 'UNDER_REVIEW':
    case 'INVESTIGATION':
      status = 'Under Review';
      break;

    case 'CLOSED':
      status = 'Closed';
      break;

    case 'ARCHIVED':
      status = 'Archived';
      break;

    default:
      if (
        statusRaw === 'Active' ||
        statusRaw === 'Under Review' ||
        statusRaw === 'Closed' ||
        statusRaw === 'Archived'
      ) {
        status = statusRaw as CaseStatus;
      }
  }

  return {
    id: stringValue(item, 'id', 'case_id'),
    caseNumber: stringValue(item, 'case_number', 'caseNumber'),
    caseName: stringValue(item, 'case_name', 'caseName'),
    caseType: stringValue(item, 'case_type', 'caseType'),
    department: stringValue(item, 'department'),
    assignedOfficer: stringValue(
      item,
      'assigned_officer',
      'assignedOfficer'
    ),
    description: stringValue(item, 'description'),
    status,
    createdDate: stringValue(
      item,
      'created_at',
      'createdDate',
      'created_date'
    ),
    lastUpdated: stringValue(
      item,
      'updated_at',
      'lastUpdated',
      'last_updated'
    ),
  };
}

function mapDocument(raw: unknown): DocumentRecord {
  const item = (raw || {}) as Record<string, unknown>;

  const ocrRaw = stringValue(
    item,
    'ocr_status',
    'ocrStatus'
  ).toUpperCase();

  const blockchainRaw = stringValue(
    item,
    'blockchain_status',
    'blockchainStatus'
  ).toUpperCase();

  const integrityRaw = stringValue(
    item,
    'integrity_status',
    'integrityStatus'
  ).toUpperCase();
let ocrStatus: 'Processing' | 'Processed' | 'Failed' =
  'Processing';

  if (ocrRaw === 'COMPLETED' || ocrRaw === 'PROCESSED') {
    ocrStatus = 'Processed';
  } else if (ocrRaw === 'FAILED') {
    ocrStatus = 'Failed';
  } else if (ocrRaw === 'PROCESSING') {
    ocrStatus = 'Processing';
  } else if (ocrRaw === 'PENDING') {
    ocrStatus = 'Processing';
  }

  let blockchainStatus: 'Pending' | 'Registered' =
  'Pending';

if (blockchainRaw === 'REGISTERED') {
  blockchainStatus = 'Registered';
} else {
  blockchainStatus = 'Pending';
}

  let integrityStatus:
    | 'Verified'
    | 'Failed'
    | 'Not Verified'
    | 'Warning' = 'Not Verified';

  if (integrityRaw === 'VERIFIED') {
    integrityStatus = 'Verified';
  } else if (integrityRaw === 'FAILED') {
    integrityStatus = 'Failed';
  } else if (integrityRaw === 'WARNING') {
    integrityStatus = 'Warning';
  }

  const filename = stringValue(
    item,
    'filename',
    'file_name',
    'fileName'
  );

  const sizeBytes = numberValue(
    item,
    'file_size',
    'fileSize'
  );

  return {
    id: stringValue(item, 'id', 'document_id'),
    fileName: filename,
    title: stringValue(item, 'title'),
    caseId: stringValue(item, 'case_id', 'caseId'),
    documentType: stringValue(
      item,
      'document_type',
      'documentType'
    ) as DocumentType,
    version: numberValue(item, 'version') || 1,
    uploadedBy: stringValue(
      item,
      'uploaded_by',
      'uploadedBy'
    ),
    uploadDate: stringValue(
      item,
      'created_at',
      'uploadDate',
      'uploaded_at'
    ),
    tags: Array.isArray(item.tags)
      ? (item.tags as string[])
      : [],
    fileSizeKb:
      numberValue(item, 'file_size_kb') ||
      (sizeBytes ? Math.round(sizeBytes / 1024) : 0),
    fileKind:
      filename.toLowerCase().endsWith('.pdf')
        ? 'pdf'
        : filename.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)
          ? 'image'
          : 'docx',

    ocrStatus,
    ocrText: stringValue(item, 'ocr_text', 'ocrText'),

    ocrMetadata:
      item.ocr_metadata &&
      typeof item.ocr_metadata === 'object'
        ? (item.ocr_metadata as Record<string, string>)
        : {},

    blockchainStatus,
    blockchainTxId: stringValue(
      item,
      'blockchain_tx_hash',
      'blockchainTxId'
    ),

    currentHash: stringValue(
      item,
      'sha256_hash',
      'currentHash',
      'current_hash'
    ),

    registeredHash: stringValue(
      item,
      'registered_hash',
      'registeredHash'
    ),

    integrityStatus,

    versions: [],
  };
}

function mapAudit(raw: unknown): AuditEvent {
  const item = (raw || {}) as Record<string, unknown>;

  return {
    id: stringValue(item, 'id'),
    timestamp: stringValue(item, 'timestamp', 'created_at'),
    user: stringValue(
      item,
      'user',
      'user_name',
      'user_id'
    ) || 'System',

    action: stringValue(
      item,
      'action'
    ) as AuditEvent['action'],

    documentName:
      stringValue(
        item,
        'document_name',
        'documentName',
        'document_id'
      ) || undefined,

    caseId:
      stringValue(
        item,
        'case_id',
        'caseId'
      ) || undefined,

    device:
      stringValue(item, 'device') || 'Backend',

    status:
      stringValue(item, 'status').toUpperCase() === 'SUCCESS'
        ? 'Success'
        : 'Failed',
  } as AuditEvent;
}

function mapUser(raw: unknown): User {
  const item = (raw || {}) as Record<string, unknown>;

  const name = stringValue(item, 'name');

  return {
    id: stringValue(item, 'id', 'user_id'),
    name,
    email: stringValue(item, 'email'),
    role: stringValue(item, 'role') as Role,
    status:
      stringValue(item, 'status') === 'DISABLED'
        ? 'Disabled'
        : 'Active',
    lastLogin:
      stringValue(item, 'last_login', 'lastLogin') || '—',
    avatarInitials:
      name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U',
  } as User;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(
  email: string,
  password: string,
  remember: boolean
): Promise<Session> {
  try {
    return await authLogin(email, password, remember);
  } catch (error) {
    throw apiError(error);
  }
}

export function logout(): void {
  void authLogout();
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

interface BackendDashboardStats {
  total_documents?: number;
  total_cases?: number;
  active_cases?: number;
  documents_uploaded_today?: number;
  uploaded_today?: number;
  ocr_processed?: number;
  blockchain_registered?: number;
  blockchain_verified?: number;
  verified_documents?: number;
  integrity_failures?: number;
  integrity_alerts?: number;
  pending_reviews?: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await http.get('/dashboard/stats');

    const data = unwrap<BackendDashboardStats>(response);

    const totalDocuments = data.total_documents ?? 0;

    const blockchainVerified =
      data.blockchain_registered ??
      data.blockchain_verified ??
      data.verified_documents ??
      0;

    const integrityAlerts =
      data.integrity_failures ??
      data.integrity_alerts ??
      0;

    return {
      totalDocuments,
      activeCases: data.active_cases ?? 0,
      uploadedToday:
        data.documents_uploaded_today ??
        data.uploaded_today ??
        0,

      ocrProcessed: data.ocr_processed ?? 0,

      blockchainVerified,

      integrityAlerts,

      blockchainVerifiedPct: totalDocuments
        ? Math.round(
            (blockchainVerified / totalDocuments) * 1000
          ) / 10
        : 0,

      pendingReviews:
        data.pending_reviews ??
        Math.max(
          0,
          totalDocuments - data.ocr_processed! - integrityAlerts
        ),
    };
  } catch (error) {
    throw apiError(error);
  }
}

async function fetchDocumentsRaw(): Promise<unknown[]> {
  const response = await http.get('/documents', {
    params: {
      page: 1,
      page_size: 100,
    },
  });

  return unwrapList<unknown>(unwrap<unknown>(response));
}

async function fetchCasesRaw(): Promise<unknown[]> {
  const response = await http.get('/cases', {
    params: {
      page: 1,
      page_size: 100,
    },
  });

  return unwrapList<unknown>(unwrap<unknown>(response));
}

export async function getDocumentsByTypeChart(): Promise<
  { type: string; count: number }[]
> {
  try {
    const rawDocuments = await fetchDocumentsRaw();

    const counts = new Map<string, number>();

    rawDocuments.forEach((raw) => {
      const doc = mapDocument(raw);

      counts.set(
        doc.documentType,
        (counts.get(doc.documentType) ?? 0) + 1
      );
    });

    return Array.from(counts.entries()).map(
      ([type, count]) => ({
        type,
        count,
      })
    );
  } catch (error) {
    throw apiError(error);
  }
}

export async function getUploadsOverTimeChart(): Promise<
  { date: string; uploads: number }[]
> {
  try {
    const rawDocuments = await fetchDocumentsRaw();

    const days: Record<string, number> = {};

    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);

      date.setDate(date.getDate() - i);

      const key = date.toISOString().slice(0, 10);

      days[key] = 0;
    }

    rawDocuments.forEach((raw) => {
      const doc = mapDocument(raw);

      const key = doc.uploadDate.slice(0, 10);

      if (key in days) {
        days[key] += 1;
      }
    });

    return Object.entries(days).map(
      ([date, uploads]) => ({
        date: date.slice(5),
        uploads,
      })
    );
  } catch (error) {
    throw apiError(error);
  }
}

export async function getVerificationStatusChart(): Promise<
  { status: string; count: number }[]
> {
  try {
    const rawDocuments = await fetchDocumentsRaw();

    const groups: Record<string, number> = {
      Verified: 0,
      Warning: 0,
      Failed: 0,
      'Not Verified': 0,
    };

    rawDocuments.forEach((raw) => {
      const doc = mapDocument(raw);

      groups[doc.integrityStatus] =
        (groups[doc.integrityStatus] ?? 0) + 1;
    });

    return Object.entries(groups).map(
      ([status, count]) => ({
        status,
        count,
      })
    );
  } catch (error) {
    throw apiError(error);
  }
}

export async function getActiveCasesChart(): Promise<
  { status: CaseStatus; count: number }[]
> {
  try {
    const rawCases = await fetchCasesRaw();

    const groups: Record<string, number> = {
      Active: 0,
      'Under Review': 0,
      Closed: 0,
      Archived: 0,
    };

    rawCases.forEach((raw) => {
      const caseItem = mapCase(raw);

      if (caseItem.status in groups) {
        groups[caseItem.status] += 1;
      }
    });

    return Object.entries(groups).map(
      ([status, count]) => ({
        status: status as CaseStatus,
        count,
      })
    );
  } catch (error) {
    throw apiError(error);
  }
}

export async function getDashboardRecentActivity(): Promise<
  AuditEvent[]
> {
  try {
    const response = await http.get(
      '/dashboard/recent-activity',
      {
        params: {
          limit: 20,
        },
      }
    );

    const data = unwrap<unknown>(response);

    return unwrapList<unknown>(data).map(mapAudit);
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export async function getCases(): Promise<Case[]> {
  try {
    const rawCases = await fetchCasesRaw();

    return rawCases
      .map(mapCase)
      .sort(
        (a, b) =>
          +new Date(b.lastUpdated) -
          +new Date(a.lastUpdated)
      );
  } catch (error) {
    throw apiError(error);
  }
}

export async function getCase(
  id: string
): Promise<Case | undefined> {
  try {
    const response = await http.get(`/cases/${id}`);

    const data = unwrap<unknown>(response);

    return data ? mapCase(data) : undefined;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 404
    ) {
      return undefined;
    }

    throw apiError(error);
  }
}

export interface CreateCaseInput {
  caseNumber: string;
  caseName: string;
  caseType: string;
  department: string;
  assignedOfficer: string;
  description: string;
}

export async function createCase(
  input: CreateCaseInput,
  _actor: string
): Promise<Case> {
  try {
    const response = await http.post('/cases', {
      case_number: input.caseNumber,
      case_name: input.caseName,
      case_type: input.caseType,
      department: input.department,
      assigned_officer: input.assignedOfficer,
      description: input.description,
    });

    return mapCase(unwrap<unknown>(response));
  } catch (error) {
    throw apiError(error);
  }
}

export async function updateCase(
  id: string,
  patch: Partial<Case>,
  _actor: string
): Promise<Case | undefined> {
  try {
    const payload: Record<string, unknown> = {};

    if (patch.caseNumber !== undefined) {
      payload.case_number = patch.caseNumber;
    }

    if (patch.caseName !== undefined) {
      payload.case_name = patch.caseName;
    }

    if (patch.caseType !== undefined) {
      payload.case_type = patch.caseType;
    }

    if (patch.department !== undefined) {
      payload.department = patch.department;
    }

    if (patch.assignedOfficer !== undefined) {
      payload.assigned_officer = patch.assignedOfficer;
    }

    if (patch.description !== undefined) {
      payload.description = patch.description;
    }

    if (patch.status !== undefined) {
      payload.status = patch.status;
    }

    const response = await http.put(
      `/cases/${id}`,
      payload
    );

    return mapCase(unwrap<unknown>(response));
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 404
    ) {
      return undefined;
    }

    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getDocuments(): Promise<
  DocumentRecord[]
> {
  try {
    const rawDocuments = await fetchDocumentsRaw();

    return rawDocuments
      .map(mapDocument)
      .sort(
        (a, b) =>
          +new Date(b.uploadDate) -
          +new Date(a.uploadDate)
      );
  } catch (error) {
    throw apiError(error);
  }
}

export async function getDocument(
  id: string
): Promise<DocumentRecord | undefined> {
  try {
    const response = await http.get(`/documents/${id}`);

    const data = unwrap<unknown>(response);

    return data ? mapDocument(data) : undefined;
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 404
    ) {
      return undefined;
    }

    throw apiError(error);
  }
}

export async function getDocumentsByCase(
  caseId: string
): Promise<DocumentRecord[]> {
  const documents = await getDocuments();

  return documents.filter(
    (document) => document.caseId === caseId
  );
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface UploadDocumentInput {
  caseId: string;
  documentType: DocumentType;
  title: string;
  description: string;
  fileName: string;
  fileSizeKb: number;
  fileKind: 'pdf' | 'image' | 'docx';
  tags: string[];

  // Real file object.
  // UploadDocumentPage should provide this when available.
  file?: File;
}

function backendDocumentType(
  type: DocumentType
): string {
  const mapping: Record<string, string> = {
    'Police Report': 'POLICE_REPORT',
    'Investigation Record': 'OTHER',
    'Witness Statement': 'WITNESS_STATEMENT',
    'Charge Sheet': 'CHARGE_SHEET',
    'Court Filing': 'COURT_FILING',
    'Evidence Record': 'OTHER',
    'Forensic Report': 'FORENSIC_REPORT',
    'Legal Notice': 'LEGAL_NOTICE',
    Judgment: 'JUDGMENT',
    FIR: 'FIR',
    Other: 'OTHER',
  };

  return mapping[type] || String(type).toUpperCase();
}

export async function uploadDocument(
  input: UploadDocumentInput,
  _actor: string
): Promise<DocumentRecord> {
  try {
    if (!input.file) {
      throw new Error(
        'No file selected. The upload page must provide the actual File object.'
      );
    }

    const formData = new FormData();

    formData.append('file', input.file);

    formData.append('case_id', input.caseId);

    formData.append(
      'document_type',
      backendDocumentType(input.documentType)
    );

    formData.append('title', input.title);

    formData.append(
      'description',
      input.description || ''
    );

    const response = await http.post(
      '/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return mapDocument(unwrap<unknown>(response));
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------------

export async function completeDocumentPipeline(
  id: string,
  _actor: string
): Promise<DocumentRecord | undefined> {
  try {
    const response = await http.post(
      `/documents/${id}/ocr`
    );

    return mapDocument(unwrap<unknown>(response));
  } catch (error) {
    throw apiError(error);
  }
}

export async function updateDocumentMetadata(
  id: string,
  metadata: Record<string, string>,
  _actor: string
): Promise<DocumentRecord | undefined> {
  try {
    const response = await http.put(
      `/documents/${id}`,
      {
        ocr_metadata: metadata,
      }
    );

    return mapDocument(unwrap<unknown>(response));
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 404
    ) {
      return undefined;
    }

    throw apiError(error);
  }
}

export async function reprocessOcr(
  id: string,
  _actor: string
): Promise<DocumentRecord | undefined> {
  try {
    const response = await http.post(
      `/documents/${id}/ocr`
    );

    return mapDocument(unwrap<unknown>(response));
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Blockchain
// ---------------------------------------------------------------------------

export async function registerDocumentBlockchain(
  id: string
): Promise<DocumentRecord | undefined> {
  try {
    const response = await http.post(
      `/documents/${id}/blockchain/register`
    );

    return mapDocument(unwrap<unknown>(response));
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

export async function createNewVersion(
  id: string,
  _actor: string,
  note: string
): Promise<DocumentRecord | undefined> {
  try {
    const response = await http.post(
      `/documents/${id}/versions`,
      {
        note,
      }
    );

    return mapDocument(unwrap<unknown>(response));
  } catch (error) {
    throw apiError(error);
  }
}

export async function getVersionHistory(
  documentId: string
) {
  try {
    const response = await http.get(
      `/documents/${documentId}/versions`
    );

    return unwrap<unknown>(response);
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Integrity Verification
// ---------------------------------------------------------------------------

export interface VerificationResult {
  passed: boolean;
  currentHash: string;
  registeredHash: string;
  checkedAt: string;
}

export async function verifyDocumentIntegrity(
  id: string,
  _actor: string
): Promise<VerificationResult | undefined> {
  try {
    const response = await http.post(
      `/documents/${id}/verify`
    );

    const data = unwrap<Record<string, unknown>>(response);

    const integrity =
      stringValue(
        data,
        'integrity'
      ).toUpperCase();

    return {
      passed:
        integrity === 'VERIFIED' ||
        Boolean(data.passed),

      currentHash: stringValue(
        data,
        'current_hash',
        'currentHash'
      ),

      registeredHash: stringValue(
        data,
        'registered_hash',
        'registeredHash'
      ),

      checkedAt:
        stringValue(
          data,
          'checked_at',
          'checkedAt'
        ) || new Date().toISOString(),
    };
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

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

export async function searchDocuments(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  try {
    const response = await http.get('/search', {
      params: {
        q: query,
        document_type: filters.documentType,
        case_id: filters.caseId,
        uploaded_by: filters.uploadedBy,
        ocr_status: filters.ocrStatus,
        blockchain_status: filters.blockchainStatus,
        integrity_status: filters.integrityStatus,
      },
    });

    const data = unwrap<unknown>(response);

    const items = unwrapList<unknown>(data);

    return items.map((raw) => {
      const document = mapDocument(raw);

      const item = raw as Record<string, unknown>;

      return {
        ...document,
        matchedText:
          stringValue(
            item,
            'matched_text',
            'matchedText'
          ) || document.title,
      };
    });
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export async function getAuditLogs(): Promise<
  AuditEvent[]
> {
  try {
    const response = await http.get('/audit/logs', {
      params: {
        page: 1,
        page_size: 100,
      },
    });

    const data = unwrap<unknown>(response);

    return unwrapList<unknown>(data).map(mapAudit);
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<User[]> {
  try {
    const response = await http.get('/users', {
      params: {
        page: 1,
        page_size: 100,
      },
    });

    const data = unwrap<unknown>(response);

    return unwrapList<unknown>(data).map(mapUser);
  } catch (error) {
    throw apiError(error);
  }
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Disabled';
}

export async function createUser(
  input: CreateUserInput,
  _actor: string
): Promise<User> {
  try {
    const response = await http.post('/users', {
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status,
    });

    return mapUser(unwrap<unknown>(response));
  } catch (error) {
    throw apiError(error);
  }
}

export async function updateUser(
  id: string,
  patch: Partial<User>,
  _actor: string
): Promise<User | undefined> {
  try {
    const response = await http.put(`/users/${id}`, {
      ...patch,
    });

    return mapUser(unwrap<unknown>(response));
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 404
    ) {
      return undefined;
    }

    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(): Promise<
  NotificationItem[]
> {
  // Notifications are not currently backed by a dedicated
  // FastAPI endpoint. Return an empty list instead of mock data.
  return [];
}

export async function markNotificationsRead(): Promise<void> {
  // No backend notification endpoint currently exists.
  return;
}

// ---------------------------------------------------------------------------
// Document download
// ---------------------------------------------------------------------------

export async function downloadDocument(
  id: string
): Promise<Blob> {
  try {
    const response = await http.get(
      `/documents/${id}/download`,
      {
        responseType: 'blob',
      }
    );

    return response.data as Blob;
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Document delete
// ---------------------------------------------------------------------------

export async function deleteDocument(
  id: string
): Promise<void> {
  try {
    await http.delete(`/documents/${id}`);
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Case delete
// ---------------------------------------------------------------------------

export async function deleteCase(
  id: string
): Promise<void> {
  try {
    await http.delete(`/cases/${id}`);
  } catch (error) {
    throw apiError(error);
  }
}

// ---------------------------------------------------------------------------
// Integrity demo / tampering simulation compatibility
// ---------------------------------------------------------------------------
// The current FastAPI backend exposes real integrity verification, but it does
// not expose a "simulate tampering" endpoint. These functions keep the existing
// Integrity UI compiling and demonstrate the state change locally in memory.
// They do NOT modify the actual stored document or database.

export async function simulateTampering(
  id: string,
  _actor: string
): Promise<DocumentRecord | undefined> {
  const document = await getDocument(id);

  if (!document) {
    return undefined;
  }

  return {
    ...document,
    currentHash: `TAMPERED-${Date.now()}-${document.currentHash.slice(-16)}`,
    integrityStatus: 'Failed',
  };
}

export async function restoreFromTampering(
  id: string
): Promise<DocumentRecord | undefined> {
  const document = await getDocument(id);

  if (!document) {
    return undefined;
  }

  return {
    ...document,
    currentHash: document.registeredHash || document.currentHash,
    integrityStatus: document.registeredHash
      ? 'Verified'
      : document.integrityStatus,
  };
}
