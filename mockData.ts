import {
  User, Case, DocumentRecord, AuditEvent, DocumentType, CaseStatus, NotificationItem,
} from '../types';
import { generateMockHash, generateMockTxId, generateId } from '../utils/format';

export const STORAGE_KEYS = {
  users: 'securedms_users',
  cases: 'securedms_cases',
  documents: 'securedms_documents',
  audit: 'securedms_audit',
  notifications: 'securedms_notifications',
  session: 'securedms_session',
  seeded: 'securedms_seeded_v1',
};

const OFFICERS = ['Rahul Sharma', 'Amit Verma', 'Neha Singh', 'Arjun Mehta', 'Priya Nair'];
const STATIONS = ['Demo Nagar PS', 'Central District PS', 'Riverside PS', 'North Zone PS', 'Cantt PS'];
const DOC_TYPES: DocumentType[] = [
  'FIR', 'Police Report', 'Investigation Record', 'Witness Statement', 'Charge Sheet',
  'Court Filing', 'Evidence Record', 'Forensic Report', 'Legal Notice', 'Judgment',
];
const CASE_TYPES = ['Theft', 'Cybercrime', 'Assault', 'Fraud', 'Property Dispute', 'Homicide', 'Narcotics', 'Forgery'];
const CASE_STATUSES: CaseStatus[] = ['Active', 'Under Review', 'Closed', 'Archived'];

function daysAgoIso(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function seedUsers(): User[] {
  return [
    { id: 'USR-0001', name: 'Admin User', email: 'admin@securedms.demo', role: 'ADMIN', status: 'Active', lastLogin: daysAgoIso(0, 8, 45), avatarInitials: 'AU' },
    { id: 'USR-0002', name: 'Rahul Sharma', email: 'investigator@securedms.demo', role: 'INVESTIGATOR', status: 'Active', lastLogin: daysAgoIso(0, 9, 5), avatarInitials: 'RS' },
    { id: 'USR-0003', name: 'Neha Singh', email: 'reviewer@securedms.demo', role: 'REVIEWER', status: 'Active', lastLogin: daysAgoIso(1, 16, 20), avatarInitials: 'NS' },
    { id: 'USR-0004', name: 'Arjun Mehta', email: 'viewer@securedms.demo', role: 'VIEWER', status: 'Active', lastLogin: daysAgoIso(3, 11, 0), avatarInitials: 'AM' },
    { id: 'USR-0005', name: 'Priya Nair', email: 'priya.nair@securedms.demo', role: 'INVESTIGATOR', status: 'Disabled', lastLogin: daysAgoIso(20, 14, 30), avatarInitials: 'PN' },
  ];
}

function seedCases(): Case[] {
  const cases: Case[] = [];
  for (let i = 1; i <= 10; i++) {
    const created = daysAgoIso(60 - i * 3, 9, 30);
    cases.push({
      id: generateId('CASE', 100 + i),
      caseNumber: `${100 + i}/2026`,
      caseName: `${CASE_TYPES[i % CASE_TYPES.length]} Investigation ${100 + i}`,
      caseType: CASE_TYPES[i % CASE_TYPES.length],
      department: STATIONS[i % STATIONS.length],
      assignedOfficer: OFFICERS[i % OFFICERS.length],
      status: CASE_STATUSES[i % CASE_STATUSES.length],
      description: `Investigation record concerning a reported ${CASE_TYPES[i % CASE_TYPES.length].toLowerCase()} case filed at ${STATIONS[i % STATIONS.length]}.`,
      createdDate: created,
      lastUpdated: daysAgoIso(60 - i * 3 - Math.floor(Math.random() * 5), 14, 0),
    });
  }
  return cases;
}

function seedDocuments(cases: Case[]): DocumentRecord[] {
  const docs: DocumentRecord[] = [];

  for (let i = 1; i <= 25; i++) {
    const c = cases[i % cases.length];
    const type = DOC_TYPES[i % DOC_TYPES.length];
    const uploader = OFFICERS[i % OFFICERS.length];
    const uploadDate = i <= 3 ? daysAgoIso(0, 8 + i, 15) : daysAgoIso(45 - i, 10, 15);
    const fileName = `${type.replace(/\s+/g, '_')}_${c.caseNumber.replace('/', '_')}.pdf`;
    const seed = `${fileName}-v1-${uploadDate}`;
    const hash = generateMockHash(seed);
    const isFailing = i === 3 || i === 7; // two seeded integrity alerts
    const isPending = i % 9 === 0;
    const ocrText = type === 'FIR'
      ? `FIR No: ${c.caseNumber}\nPolice Station: ${c.department}\nDate: ${uploadDate.slice(0, 10)}\nCase Type: ${c.caseType}\nComplainant: ${OFFICERS[(i + 1) % OFFICERS.length]}\nInvestigation Officer: ${uploader}`
      : `Document Type: ${type}\nCase Reference: ${c.caseNumber}\nPrepared By: ${uploader}\nDate: ${uploadDate.slice(0, 10)}\nDepartment: ${c.department}\nSummary: Official ${type.toLowerCase()} filed in relation to case ${c.caseNumber} at ${c.department}.`;

    const versions = [
      {
        version: 1,
        updatedBy: uploader,
        timestamp: uploadDate,
        hash,
        blockchainTxId: generateMockTxId(),
        note: 'Initial upload and registration',
      },
    ];
    if (i % 5 === 0) {
      const v2Date = daysAgoIso(45 - i - 2, 14, 0);
      versions.push({
        version: 2,
        updatedBy: OFFICERS[(i + 2) % OFFICERS.length],
        timestamp: v2Date,
        hash: generateMockHash(seed + '-v2'),
        blockchainTxId: generateMockTxId(),
        note: 'Metadata corrected after review',
      });
    }
    const latest = versions[versions.length - 1];

    docs.push({
      id: generateId('DOC', 1000 + i),
      fileName,
      title: `${type} - ${c.caseNumber}`,
      caseId: c.id,
      documentType: type,
      version: latest.version,
      uploadedBy: uploader,
      uploadDate,
      tags: [c.caseType.toLowerCase(), type.toLowerCase().replace(/\s+/g, '-')],
      fileSizeKb: 220 + i * 37,
      fileKind: i % 4 === 0 ? 'image' : i % 7 === 0 ? 'docx' : 'pdf',
      ocrStatus: i % 11 === 0 ? 'Failed' : 'Processed',
      ocrText,
      ocrMetadata: {
        'Document Type': type,
        'Case Reference': c.caseNumber,
        Department: c.department,
        Date: uploadDate.slice(0, 10),
        'Prepared By': uploader,
      },
      blockchainStatus: isPending ? 'Pending' : 'Registered',
      blockchainTxId: latest.blockchainTxId,
      currentHash: isFailing ? generateMockHash(seed + '-tampered') : latest.hash,
      registeredHash: latest.hash,
      integrityStatus: isPending ? 'Not Verified' : isFailing ? 'Failed' : 'Verified',
      versions,
      tamperSimulated: isFailing,
    });
  }
  return docs;
}

function seedAudit(docs: DocumentRecord[]): AuditEvent[] {
  const events: AuditEvent[] = [];
  let counter = 1;
  const devices = ['Chrome · Windows · 10.0.14.22', 'Firefox · Ubuntu · 10.0.14.31', 'Edge · Windows · 10.0.9.5', 'Mobile App · Android · 10.0.22.7'];
  docs.slice(0, 20).forEach((doc, idx) => {
    events.push({
      id: generateId('EVT', counter++),
      timestamp: doc.uploadDate,
      user: doc.uploadedBy,
      action: 'UPLOAD',
      documentName: doc.fileName,
      caseId: doc.caseId,
      device: devices[idx % devices.length],
      status: 'Success',
    });
    events.push({
      id: generateId('EVT', counter++),
      timestamp: new Date(new Date(doc.uploadDate).getTime() + 20 * 60000).toISOString(),
      user: 'System',
      action: 'OCR_PROCESS',
      documentName: doc.fileName,
      caseId: doc.caseId,
      device: 'Server · OCR Pipeline',
      status: doc.ocrStatus === 'Failed' ? 'Failed' : 'Success',
    });
    events.push({
      id: generateId('EVT', counter++),
      timestamp: new Date(new Date(doc.uploadDate).getTime() + 40 * 60000).toISOString(),
      user: 'System',
      action: 'BLOCKCHAIN_REGISTER',
      documentName: doc.fileName,
      caseId: doc.caseId,
      device: 'Server · Blockchain Node',
      status: doc.blockchainStatus === 'Pending' ? 'Failed' : 'Success',
    });
    if (idx % 3 === 0) {
      events.push({
        id: generateId('EVT', counter++),
        timestamp: new Date(new Date(doc.uploadDate).getTime() + 3 * 3600000).toISOString(),
        user: OFFICERS[(idx + 1) % OFFICERS.length],
        action: 'VIEW',
        documentName: doc.fileName,
        caseId: doc.caseId,
        device: devices[(idx + 1) % devices.length],
        status: 'Success',
      });
    }
  });
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function seedNotifications(): NotificationItem[] {
  return [
    { id: 'NTF-0001', icon: 'success', message: 'Document successfully uploaded — FIR_125_2026.pdf', timestamp: daysAgoIso(0, 9, 10), read: false },
    { id: 'NTF-0002', icon: 'success', message: 'Blockchain registration completed for Evidence_Record_104_2026.pdf', timestamp: daysAgoIso(0, 8, 40), read: false },
    { id: 'NTF-0003', icon: 'warning', message: 'Integrity verification failed for Charge_Sheet_103_2026.pdf', timestamp: daysAgoIso(1, 17, 5), read: false },
    { id: 'NTF-0004', icon: 'info', message: 'New document requires review — Witness_Statement_108_2026.pdf', timestamp: daysAgoIso(2, 12, 0), read: true },
    { id: 'NTF-0005', icon: 'success', message: 'OCR processing completed for Court_Filing_106_2026.pdf', timestamp: daysAgoIso(2, 9, 25), read: true },
  ];
}

function readLS<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeLS<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function ensureSeeded(): void {
  if (localStorage.getItem(STORAGE_KEYS.seeded)) return;
  const users = seedUsers();
  const cases = seedCases();
  const documents = seedDocuments(cases);
  const audit = seedAudit(documents);
  const notifications = seedNotifications();
  writeLS(STORAGE_KEYS.users, users);
  writeLS(STORAGE_KEYS.cases, cases);
  writeLS(STORAGE_KEYS.documents, documents);
  writeLS(STORAGE_KEYS.audit, audit);
  writeLS(STORAGE_KEYS.notifications, notifications);
  localStorage.setItem(STORAGE_KEYS.seeded, 'true');
}

export function resetDemoData(): void {
  localStorage.removeItem(STORAGE_KEYS.seeded);
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  ensureSeeded();
}

export const store = {
  getUsers: () => readLS<User[]>(STORAGE_KEYS.users) ?? [],
  setUsers: (v: User[]) => writeLS(STORAGE_KEYS.users, v),
  getCases: () => readLS<Case[]>(STORAGE_KEYS.cases) ?? [],
  setCases: (v: Case[]) => writeLS(STORAGE_KEYS.cases, v),
  getDocuments: () => readLS<DocumentRecord[]>(STORAGE_KEYS.documents) ?? [],
  setDocuments: (v: DocumentRecord[]) => writeLS(STORAGE_KEYS.documents, v),
  getAudit: () => readLS<AuditEvent[]>(STORAGE_KEYS.audit) ?? [],
  setAudit: (v: AuditEvent[]) => writeLS(STORAGE_KEYS.audit, v),
  getNotifications: () => readLS<NotificationItem[]>(STORAGE_KEYS.notifications) ?? [],
  setNotifications: (v: NotificationItem[]) => writeLS(STORAGE_KEYS.notifications, v),
};

export { OFFICERS, STATIONS, DOC_TYPES, CASE_TYPES, CASE_STATUSES };
