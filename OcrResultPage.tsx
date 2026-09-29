import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Pencil, Save, RefreshCw, FileDown } from 'lucide-react';
import * as api from '../../services/api';
import { DocumentRecord } from '../../types';
import { Card, Button } from '../../components/ui/Primitives';
import { EmptyState } from '../../components/ui/States';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const OcrResultPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const { session, can } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [doc, setDoc] = React.useState<DocumentRecord | null | undefined>(undefined);
  const [editing, setEditing] = React.useState(false);
  const [metaDraft, setMetaDraft] = React.useState<Record<string, string>>({});
  const [reprocessing, setReprocessing] = React.useState(false);

  const load = React.useCallback(() => {
    if (!docId) return;
    api.getDocument(docId).then((d) => { setDoc(d ?? null); if (d) setMetaDraft(d.ocrMetadata); });
  }, [docId]);
  React.useEffect(load, [load]);

  if (doc === undefined) return null;
  if (doc === null) {
    return <EmptyState title="Document not found" action={<Button variant="outline" onClick={() => navigate('/documents')}>Back to Documents</Button>} />;
  }

  async function saveMetadata() {
    await api.updateDocumentMetadata(docId!, metaDraft, session!.name);
    show('Metadata saved.', 'success');
    setEditing(false);
    load();
  }

  async function reprocess() {
    setReprocessing(true);
    await new Promise((r) => setTimeout(r, 800));
    await api.reprocessOcr(docId!, session!.name);
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

  return (
    <div>
      <Link to={`/documents/${doc.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink-800 mb-4">
        <ArrowLeft size={14} /> Back to Document
      </Link>
      <h1 className="text-lg font-semibold text-ink-900 mb-1">OCR Result — {doc.fileName}</h1>
      <p className="text-sm text-slate-500 mb-5">Text extracted using PaddleOCR (simulated in this demo environment).</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5 flex flex-col items-center justify-center min-h-[420px] bg-slate-50/60">
          <FileText size={40} className="text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">Document preview placeholder</p>
          <p className="text-xs text-slate-400 mt-1">{doc.fileName}</p>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Extracted Text</h3>
            <pre className="text-xs text-ink-700 bg-slate-50 rounded-lg p-3.5 whitespace-pre-wrap leading-relaxed font-sans">{doc.ocrText}</pre>
            <button onClick={downloadText} className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              <FileDown size={12} /> Download Extracted Text
            </button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink-900">Extracted Metadata</h3>
            </div>
            <div className="space-y-2 mb-4">
              {Object.entries(editing ? metaDraft : doc.ocrMetadata).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-32 shrink-0">{k}</span>
                  {editing ? (
                    <input value={metaDraft[k]} onChange={(e) => setMetaDraft({ ...metaDraft, [k]: e.target.value })} className="flex-1 text-xs border border-slate-300 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-brand-300" />
                  ) : (
                    <span className="text-xs text-ink-800 font-medium">{v}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {can('document.ocr') && !editing && <Button size="sm" variant="outline" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>Edit Metadata</Button>}
              {editing && <Button size="sm" icon={<Save size={13} />} onClick={saveMetadata}>Save Metadata</Button>}
              {can('document.ocr') && <Button size="sm" variant="ghost" loading={reprocessing} icon={<RefreshCw size={13} />} onClick={reprocess}>Reprocess OCR</Button>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OcrResultPage;
