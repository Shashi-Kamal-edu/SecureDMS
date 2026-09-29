import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertTriangle, FlaskConical, RotateCcw, Info } from 'lucide-react';
import * as api from '../../services/api';
import { DocumentRecord } from '../../types';
import { Card, PageHeader, Button, HashBox } from '../../components/ui/Primitives';
import StatusBadge from '../../components/ui/Badge';
import { formatDateTime, truncateHash } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const IntegrityPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { session } = useAuth();
  const { show } = useToast();
  const [documents, setDocuments] = React.useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = React.useState(params.get('doc') ?? '');
  const [checking, setChecking] = React.useState(false);
  const [result, setResult] = React.useState<{ passed: boolean; checkedAt: string } | null>(null);

  const load = React.useCallback(() => { api.getDocuments().then(setDocuments); }, []);
  React.useEffect(load, [load]);

  React.useEffect(() => {
    const docParam = params.get('doc');
    if (docParam) setSelectedId(docParam);
  }, [params]);

  const doc = documents.find((d) => d.id === selectedId);

  function selectDoc(id: string) {
    setSelectedId(id);
    setResult(null);
    setParams(id ? { doc: id } : {});
  }

  async function verify() {
    if (!doc) return;
    setChecking(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 900));
    const res = await api.verifyDocumentIntegrity(doc.id, session!.name);
    setChecking(false);
    if (res) {
      setResult({ passed: res.passed, checkedAt: res.checkedAt });
      show(res.passed ? 'Document integrity verified.' : 'Integrity verification failed.', res.passed ? 'success' : 'error');
    }
    load();
  }

  async function simulateTampering() {
    if (!doc) return;
    await api.simulateTampering(doc.id, session!.name);
    setResult(null);
    show('Tampering simulated — the document hash has been altered.', 'warning');
    load();
  }

  async function restore() {
    if (!doc) return;
    await api.restoreFromTampering(doc.id);
    setResult(null);
    show('Document restored to its registered state.', 'info');
    load();
  }

  return (
    <div>
      <PageHeader title="Document Integrity Verification" description="The system uses cryptographic hashing and blockchain records to verify that a registered document has not been altered after registration." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1 h-fit">
          <label className="block text-xs font-medium text-ink-700 mb-1.5">Select Document</label>
          <select value={selectedId} onChange={(e) => selectDoc(e.target.value)} className="input">
            <option value="">Choose a document…</option>
            {documents.map((d) => <option key={d.id} value={d.id}>{d.fileName}</option>)}
          </select>

          {doc && (
            <div className="mt-5 space-y-3 text-sm">
              <Row label="Document ID" value={doc.id} />
              <Row label="File Name" value={doc.fileName} />
              <Row label="Version" value={`v${doc.version}`} />
              <Row label="Registration Timestamp" value={formatDateTime(doc.versions[0]?.timestamp ?? doc.uploadDate)} />
              <Row label="Blockchain Tx ID" value={<span className="hash-text text-xs">{truncateHash(doc.blockchainTxId, 8, 6)}</span>} />
            </div>
          )}

          {doc && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-2 bg-pending-50 border border-pending-100 rounded-lg p-3 mb-3">
                <FlaskConical size={14} className="text-pending-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-pending-700">Simulate Tampering</p>
                  <p className="text-[11px] text-pending-600 mt-0.5">For demonstration only — alters the current hash so verification fails.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={simulateTampering}>Simulate Tampering</Button>
                {doc.tamperSimulated && (
                  <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={restore}>Restore</Button>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          {!doc ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <ShieldCheck size={32} className="text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Select a document to view its integrity details.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Current SHA-256 Hash</p>
                  <HashBox hash={doc.currentHash} onCopy={() => show('Hash copied.', 'success')} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Registered Blockchain Hash</p>
                  <HashBox hash={doc.registeredHash} onCopy={() => show('Hash copied.', 'success')} />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <StatusBadge status={doc.blockchainStatus} />
                <StatusBadge status={doc.integrityStatus} />
              </div>

              <Button icon={<ShieldCheck size={15} />} loading={checking} onClick={verify}>Verify Document Integrity</Button>

              {result && (
                <div className={`mt-5 rounded-xl border p-5 flex items-start gap-3 ${result.passed ? 'bg-verified-50 border-verified-100' : 'bg-alert-50 border-alert-100'}`}>
                  {result.passed ? <CheckCircle2 size={22} className="text-verified-600 shrink-0" /> : <AlertTriangle size={22} className="text-alert-600 shrink-0" />}
                  <div>
                    <p className={`text-sm font-semibold ${result.passed ? 'text-verified-700' : 'text-alert-700'}`}>
                      {result.passed ? 'DOCUMENT VERIFIED' : 'INTEGRITY VERIFICATION FAILED'}
                    </p>
                    <p className={`text-xs mt-1 ${result.passed ? 'text-verified-700' : 'text-alert-700'}`}>
                      {result.passed
                        ? 'The current document hash matches the blockchain-registered hash.'
                        : 'The current document hash does not match the registered blockchain hash. The document may have been modified.'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2">Checked {formatDateTime(result.checkedAt)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-slate-400 mt-5">
                <Info size={13} className="mt-0.5 shrink-0" />
                Demo / Mock Blockchain — this environment simulates hashing and registration locally rather than writing to a live chain. See{' '}
                <Link to={`/security/versions?doc=${doc.id}`} className="text-brand-600 hover:underline">version history</Link> for the full chain of custody.
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-slate-500">{label}</span>
    <span className="text-ink-900 font-medium text-right">{value}</span>
  </div>
);

export default IntegrityPage;
