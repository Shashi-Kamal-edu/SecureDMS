import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Eye, Download, ShieldCheck, GitBranch } from 'lucide-react';
import * as api from '../../services/api';
import { DocumentRecord, Case } from '../../types';
import { Card, PageHeader, Button, IconButton } from '../../components/ui/Primitives';
import { EmptyState, SkeletonRow } from '../../components/ui/States';
import StatusBadge from '../../components/ui/Badge';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DOC_TYPES } from '../../services/mockData';

const DocumentsPage: React.FC = () => {
  const { can } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [documents, setDocuments] = React.useState<DocumentRecord[] | null>(null);
  const [cases, setCases] = React.useState<Case[]>([]);
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('All');
  const [caseFilter, setCaseFilter] = React.useState('All');

  React.useEffect(() => {
    api.getDocuments().then(setDocuments);
    api.getCases().then(setCases);
  }, []);

  const caseMap = React.useMemo(() => Object.fromEntries(cases.map((c) => [c.id, c])), [cases]);

  const filtered = React.useMemo(() => {
    if (!documents) return [];
    return documents.filter((d) => {
      if (typeFilter !== 'All' && d.documentType !== typeFilter) return false;
      if (caseFilter !== 'All' && d.caseId !== caseFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const caseNum = caseMap[d.caseId]?.caseNumber ?? '';
        if (!`${d.fileName} ${d.title} ${caseNum}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [documents, query, typeFilter, caseFilter, caseMap]);

  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filtered, 10);

  function handleDownload(d: DocumentRecord) {
    show(`Preparing ${d.fileName} for download (demo — no real file attached).`, 'info');
  }

  return (
    <div>
      <PageHeader
        title="All Documents"
        description="Every document registered in the system, with OCR, blockchain, and integrity status."
        actions={can('document.upload') && (
          <Button icon={<Plus size={15} />} onClick={() => navigate('/documents/upload')}>Upload Document</Button>
        )}
      />

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by file name, title, or case number…"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <option value="All">All types</option>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={caseFilter} onChange={(e) => setCaseFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white max-w-[180px]">
            <option value="All">All cases</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Ver.</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">OCR</th>
                <th className="px-4 py-3 font-medium">Blockchain</th>
                <th className="px-4 py-3 font-medium">Integrity</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {documents === null && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={9} />)}
              {documents !== null && pageItems.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/documents/${d.id}`)}>
                    <div className="flex items-center gap-2.5">
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900 truncate max-w-[220px]">{d.fileName}</p>
                        <p className="text-xs text-slate-500">{d.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{caseMap[d.caseId]?.caseNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{d.documentType}</td>
                  <td className="px-4 py-3 text-slate-600">v{d.version}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(d.uploadDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.ocrStatus} /></td>
                  <td className="px-4 py-3"><StatusBadge status={d.blockchainStatus} /></td>
                  <td className="px-4 py-3"><StatusBadge status={d.integrityStatus} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton label="View" onClick={() => navigate(`/documents/${d.id}`)}><Eye size={15} /></IconButton>
                      <IconButton label="Download" onClick={() => handleDownload(d)}><Download size={15} /></IconButton>
                      {can('document.verify') && (
                        <IconButton label="Verify" onClick={() => navigate(`/security/integrity?doc=${d.id}`)}><ShieldCheck size={15} /></IconButton>
                      )}
                      {can('version.view') && (
                        <IconButton label="View History" onClick={() => navigate(`/security/versions?doc=${d.id}`)}><GitBranch size={15} /></IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents !== null && filtered.length === 0 && (
            <EmptyState title="No documents found" description="Try a different search term or filter, or upload a new document." icon={<FileText size={22} />} />
          )}
        </div>
        <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
};

export default DocumentsPage;
