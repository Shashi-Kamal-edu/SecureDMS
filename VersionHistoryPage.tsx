import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitBranch, CheckCircle2, Eye, Diff, ShieldCheck } from 'lucide-react';
import * as api from '../../services/api';
import { DocumentRecord, DocumentVersion } from '../../types';
import { Card, PageHeader, Button } from '../../components/ui/Primitives';
import { EmptyState } from '../../components/ui/States';
import { Modal } from '../../components/ui/Modal';
import { formatDateTime, truncateHash } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

const VersionHistoryPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { show } = useToast();
  const [documents, setDocuments] = React.useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = React.useState(params.get('doc') ?? '');
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [compareVersions, setCompareVersions] = React.useState<[DocumentVersion, DocumentVersion] | null>(null);
  const [viewVersion, setViewVersion] = React.useState<DocumentVersion | null>(null);

  const load = React.useCallback(() => { api.getDocuments().then(setDocuments); }, []);
  React.useEffect(load, [load]);
  React.useEffect(() => { const d = params.get('doc'); if (d) setSelectedId(d); }, [params]);

  const doc = documents.find((d) => d.id === selectedId);

  function selectDoc(id: string) {
    setSelectedId(id);
    setParams(id ? { doc: id } : {});
  }

  function openCompare() {
    if (!doc || doc.versions.length < 2) {
      show('This document only has one version — nothing to compare yet.', 'info');
      return;
    }
    setCompareVersions([doc.versions[doc.versions.length - 2], doc.versions[doc.versions.length - 1]]);
    setCompareOpen(true);
  }

  return (
    <div>
      <PageHeader title="Version History" description="Authorized updates create a new version instead of silently overwriting the previous record, preserving a full chain of custody." />

      <Card className="p-5 mb-5">
        <label className="block text-xs font-medium text-ink-700 mb-1.5">Document</label>
        <select value={selectedId} onChange={(e) => selectDoc(e.target.value)} className="input max-w-md">
          <option value="">Select a document…</option>
          {documents.map((d) => <option key={d.id} value={d.id}>{d.fileName}</option>)}
        </select>
      </Card>

      {!doc ? (
        <EmptyState title="No document selected" description="Choose a document above to view its version timeline." icon={<GitBranch size={22} />} />
      ) : (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">{doc.fileName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{doc.versions.length} version{doc.versions.length > 1 ? 's' : ''} recorded</p>
            </div>
            <Button size="sm" variant="outline" icon={<Diff size={13} />} onClick={openCompare}>Compare Versions</Button>
          </div>

          <ol className="relative border-l border-slate-200 ml-2 space-y-8">
            {[...doc.versions].reverse().map((v, i) => (
              <li key={v.version} className="ml-5">
                <span className={`absolute -left-[9px] h-4 w-4 rounded-full ring-4 ring-white flex items-center justify-center ${i === 0 ? 'bg-verified-500' : 'bg-brand-400'}`}>
                  {i === 0 && <CheckCircle2 size={10} className="text-white" />}
                </span>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <p className="text-sm font-semibold text-ink-900">Version {v.version} {i === 0 && <span className="text-xs font-normal text-verified-600 ml-1.5">Current</span>}</p>
                  <span className="text-xs text-slate-400">{formatDateTime(v.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{v.note} — {v.updatedBy}</p>
                <p className="hash-text text-[11px] text-slate-500 mb-1">Hash: {truncateHash(v.hash)}</p>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-verified-600"><ShieldCheck size={11} /> Blockchain Registered</span>
                  <button onClick={() => setViewVersion(v)} className="text-[11px] text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"><Eye size={11} /> View Version</button>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Modal open={!!viewVersion} onClose={() => setViewVersion(null)} title={`Version ${viewVersion?.version}`} width="max-w-md">
        {viewVersion && (
          <div className="space-y-3 text-sm">
            <Row label="Updated By" value={viewVersion.updatedBy} />
            <Row label="Timestamp" value={formatDateTime(viewVersion.timestamp)} />
            <Row label="Note" value={viewVersion.note} />
            <div>
              <p className="text-xs text-slate-500 mb-1">Hash</p>
              <p className="hash-text text-xs break-all bg-slate-50 rounded-lg p-2.5">{viewVersion.hash}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Blockchain Tx ID</p>
              <p className="hash-text text-xs break-all bg-slate-50 rounded-lg p-2.5">{viewVersion.blockchainTxId}</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={compareOpen} onClose={() => setCompareOpen(false)} title="Compare Versions" width="max-w-2xl">
        {compareVersions && (
          <div className="grid grid-cols-2 gap-4">
            {compareVersions.map((v) => (
              <div key={v.version} className="border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-ink-900 mb-2">Version {v.version}</p>
                <Row label="Updated By" value={v.updatedBy} />
                <Row label="Timestamp" value={formatDateTime(v.timestamp)} />
                <p className="text-xs text-slate-500 mt-2 mb-1">Hash</p>
                <p className="hash-text text-[11px] break-all">{v.hash}</p>
              </div>
            ))}
            <p className="col-span-2 text-xs text-slate-500">
              {compareVersions[0].hash !== compareVersions[1].hash
                ? 'The hash differs between these versions, confirming the document content changed and a new blockchain record was created.'
                : 'These versions share the same hash.'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
    <span className="text-slate-500">{label}</span>
    <span className="text-ink-800 font-medium text-right">{value}</span>
  </div>
);

export default VersionHistoryPage;
