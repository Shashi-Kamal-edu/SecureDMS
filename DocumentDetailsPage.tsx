import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Download, ShieldCheck, History, GitBranch, CheckCircle2,
  XCircle, Pencil, Save, RefreshCw, FileDown, Briefcase,
} from 'lucide-react';
import * as api from '../../services/api';
import { DocumentRecord, Case } from '../../types';
import { Card, Button, HashBox } from '../../components/ui/Primitives';
import StatusBadge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { formatDate, formatDateTime, truncateHash } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const DocumentDetailsPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const { session, can } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [doc, setDoc] = React.useState<DocumentRecord | null | undefined>(undefined);
  const [caseRecord, setCaseRecord] = React.useState<Case | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [metaDraft, setMetaDraft] = React.useState<Record<string, string>>({});
  const [reprocessing, setReprocessing] = React.useState(false);

  const load = React.useCallback(() => {
    if (!docId) return;
    api.getDocument(docId).then(async (d) => {
      setDoc(d ?? null);
      if (d) {
        setMetaDraft(d.ocrMetadata);
        const c = await api.getCase(d.caseId);
        setCaseRecord(c ?? null);
      }
    });
  }, [docId]);

  React.useEffect(load, [load]);

  if (doc === undefined) return null;
  if (doc === null) {
    return <EmptyState title="Document not found" description="This document may have been removed or the link is incorrect." action={<Button variant="outline" onClick={() => navigate('/documents')}>Back to Documents</Button>} />;
  }

  async function saveMetadata() {
    if (!docId) return;
    await api.updateDocumentMetadata(docId, metaDraft, session!.name);
    show('Metadata updated successfully.', 'success');
    setEditing(false);
    load();
  }

  async function reprocessOcr() {
    if (!docId) return;
    setReprocessing(true);
    await new Promise((r) => setTimeout(r, 900));
    await api.reprocessOcr(docId, session!.name);
    setReprocessing(false);
    show('OCR reprocessing complete.', 'success');
    load();
  }

  function downloadText() {
    const blob = new Blob([doc!.ocrText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc!.fileName.replace(/\.[^.]+$/, '')}_ocr.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const verified = doc.integrityStatus === 'Verified';

  return (
    <div>
      <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink-800 mb-4">
        <ArrowLeft size={14} /> Back to Documents
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-ink-900">{doc.fileName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {doc.id} · {doc.documentType} · {caseRecord && (
                <Link to={`/cases/${caseRecord.id}`} className="text-brand-600 hover:underline">{caseRecord.caseNumber}</Link>
              )}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${verified ? 'bg-verified-50 text-verified-700' : doc.integrityStatus === 'Failed' ? 'bg-alert-50 text-alert-700' : 'bg-slate-100 text-slate-600'}`}>
          {verified ? <CheckCircle2 size={15} /> : doc.integrityStatus === 'Failed' ? <XCircle size={15} /> : null}
          {verified ? 'Document Verified' : doc.integrityStatus === 'Failed' ? 'Integrity Failed' : doc.integrityStatus}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={() => show('Preparing document for download (demo — no real file attached).', 'info')}>View / Download</Button>
        {can('document.verify') && (
          <Button variant="outline" size="sm" icon={<ShieldCheck size={14} />} onClick={() => navigate(`/security/integrity?doc=${doc.id}`)}>Verify Integrity</Button>
        )}
        {can('activity.view') && (
          <Button variant="outline" size="sm" icon={<History size={14} />} onClick={() => navigate(`/security/activity?doc=${doc.id}`)}>View Activity</Button>
        )}
        {can('version.view') && (
          <Button variant="outline" size="sm" icon={<GitBranch size={14} />} onClick={() => navigate(`/security/versions?doc=${doc.id}`)}>View Version History</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Briefcase size={15} className="text-slate-400" /> General Information</h3>
          <dl className="space-y-3 text-sm">
            <Row label="Document ID" value={doc.id} />
            <Row label="File Name" value={doc.fileName} />
            <Row label="Case" value={caseRecord?.caseNumber ?? '—'} />
            <Row label="Type" value={doc.documentType} />
            <Row label="Version" value={`v${doc.version}`} />
            <Row label="Uploaded By" value={doc.uploadedBy} />
            <Row label="Upload Date" value={formatDate(doc.uploadDate)} />
            <Row label="File Size" value={`${(doc.fileSizeKb / 1024).toFixed(2)} MB`} />
          </dl>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink-900">OCR Information</h3>
            <Link to={`/documents/${doc.id}/ocr`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Full OCR view</Link>
          </div>
          <div className="mb-3"><StatusBadge status={doc.ocrStatus} /></div>
          <dl className="space-y-3 text-sm mb-4">
            <Row label="Extracted Text Length" value={`${doc.ocrText.length} characters`} />
          </dl>
          <p className="text-xs font-medium text-slate-500 mb-2">Extracted Metadata</p>
          <div className="space-y-2">
            {Object.entries(editing ? metaDraft : doc.ocrMetadata).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-28 shrink-0">{k}</span>
                {editing ? (
                  <input
                    value={metaDraft[k]}
                    onChange={(e) => setMetaDraft({ ...metaDraft, [k]: e.target.value })}
                    className="flex-1 text-xs border border-slate-300 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-brand-300"
                  />
                ) : (
                  <span className="text-xs text-ink-800 font-medium">{v}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            {can('document.ocr') && !editing && (
              <Button size="sm" variant="outline" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>Edit Metadata</Button>
            )}
            {editing && (
              <Button size="sm" icon={<Save size={13} />} onClick={saveMetadata}>Save Metadata</Button>
            )}
            {can('document.ocr') && (
              <Button size="sm" variant="ghost" icon={<RefreshCw size={13} className={reprocessing ? 'animate-spin' : ''} />} loading={reprocessing} onClick={reprocessOcr}>Reprocess OCR</Button>
            )}
          </div>
          <button onClick={downloadText} className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
            <FileDown size={12} /> Download Extracted Text
          </button>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><ShieldCheck size={15} className="text-slate-400" /> Security Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">SHA-256 Hash</p>
              <HashBox hash={doc.currentHash} onCopy={() => show('Hash copied to clipboard.', 'success')} />
            </div>
            <Row label="Blockchain Status" value={<StatusBadge status={doc.blockchainStatus} />} />
            <Row label="Blockchain Tx ID" value={<span className="hash-text text-xs">{truncateHash(doc.blockchainTxId, 8, 6)}</span>} />
            <Row label="Registration Timestamp" value={formatDateTime(doc.versions[0]?.timestamp ?? doc.uploadDate)} />
            <Row label="Current Version" value={`v${doc.version}`} />
            <Row label="Integrity Status" value={<StatusBadge status={doc.integrityStatus} />} />
          </div>
          <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
            Demo / Mock Blockchain — hashes and transaction IDs are generated locally for demonstration and are not written to a live chain.
          </p>
        </Card>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-ink-900 font-medium text-right">{value}</dd>
  </div>
);

export default DocumentDetailsPage;
