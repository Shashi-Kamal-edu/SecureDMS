export type Role = 'ADMIN' | 'INVESTIGATOR' | 'REVIEWER' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Disabled';
  lastLogin: string;
  avatarInitials: string;
}

export type CaseStatus = 'Active' | 'Under Review' | 'Closed' | 'Archived';

export interface Case {
  id: string;
  caseNumber: string;
  caseName: string;
  caseType: string;
  department: string;
  assignedOfficer: string;
  status: CaseStatus;
  description: string;
  createdDate: string;
  lastUpdated: string;
}

export type DocumentType =
  | 'FIR'
  | 'Police Report'
  | 'Investigation Record'
  | 'Witness Statement'
  | 'Charge Sheet'
  | 'Court Filing'
  | 'Evidence Record'
  | 'Forensic Report'
  | 'Legal Notice'
  | 'Judgment'
  | 'Other';

export type OcrStatus = 'Processed' | 'Processing' | 'Failed' | 'Not Started';
export type BlockchainStatus = 'Registered' | 'Pending' | 'Not Registered';
export type IntegrityStatus = 'Verified' | 'Warning' | 'Failed' | 'Not Verified';

export interface DocumentVersion {
  version: number;
  updatedBy: string;
  timestamp: string;
  hash: string;
  blockchainTxId: string;
  note: string;
}

export interface DocumentRecord {
  id: string;
  fileName: string;
  title: string;
  caseId: string;
  documentType: DocumentType;
  version: number;
  uploadedBy: string;
  uploadDate: string;
  tags: string[];
  fileSizeKb: number;
  fileKind: 'pdf' | 'image' | 'docx';
  ocrStatus: OcrStatus;
  ocrText: string;
  ocrMetadata: Record<string, string>;
  blockchainStatus: BlockchainStatus;
  blockchainTxId: string;
  currentHash: string;
  registeredHash: string;
  integrityStatus: IntegrityStatus;
  versions: DocumentVersion[];
  tamperSimulated?: boolean;
}

export type AuditAction =
  | 'LOGIN'
  | 'UPLOAD'
  | 'VIEW'
  | 'DOWNLOAD'
  | 'UPDATE'
  | 'DELETE'
  | 'OCR_PROCESS'
  | 'VERIFY'
  | 'CREATE_VERSION'
  | 'BLOCKCHAIN_REGISTER';

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  documentName?: string;
  caseId?: string;
  device: string;
  status: 'Success' | 'Failed';
}

export interface NotificationItem {
  id: string;
  icon: 'success' | 'warning' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardStats {
  totalDocuments: number;
  activeCases: number;
  uploadedToday: number;
  ocrProcessed: number;
  blockchainVerified: number;
  integrityAlerts: number;
  blockchainVerifiedPct: number;
  pendingReviews: number;
}
