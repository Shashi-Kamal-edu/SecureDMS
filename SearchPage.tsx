import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import * as api from '../../services/api';
import { Case } from '../../types';
import { SearchResult } from '../../services/api';
import { Card, PageHeader } from '../../components/ui/Primitives';
import { EmptyState } from '../../components/ui/States';
import StatusBadge from '../../components/ui/Badge';
import { DOC_TYPES } from '../../services/mockData';

const SearchPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = React.useState(params.get('q') ?? '');
  const [cases, setCases] = React.useState<Case[]>([]);
  const [filters, setFilters] = React.useState({ documentType: '', caseId: '', ocrStatus: '', blockchainStatus: '', integrityStatus: '' });
  const [results, setResults] = React.useState<SearchResult[] | null>(null);
  const [searched, setSearched] = React.useState(false);

  React.useEffect(() => { api.getCases().then(setCases); }, []);

  const runSearch = React.useCallback((q: string) => {
    setSearched(true);
    api.searchDocuments(q, {
      documentType: filters.documentType || undefined,
      caseId: filters.caseId || undefined,
      ocrStatus: filters.ocrStatus || undefined,
      blockchainStatus: filters.blockchainStatus || undefined,
      integrityStatus: filters.integrityStatus || undefined,
    }).then(setResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  React.useEffect(() => {
    const q = params.get('q') ?? '';
    if (q) { setQuery(q); runSearch(q); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParams(query ? { q: query } : {});
    runSearch(query);
  }

  const caseMap = React.useMemo(() => Object.fromEntries(cases.map((c) => [c.id, c])), [cases]);

  return (
    <div>
      <PageHeader title="Search" description="Search across documents, case numbers, FIR numbers, names, and OCR text." />

      <Card className="p-4 mb-5">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by document, case number, FIR number, name, OCR text…"
              className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
            />
          </div>
          <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg px-5 py-2.5">Search</button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          <select value={filters.documentType} onChange={(e) => setFilters({ ...filters, documentType: e.target.value })} className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white">
            <option value="">Document Type</option>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.caseId} onChange={(e) => setFilters({ ...filters, caseId: e.target.value })} className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white">
            <option value="">Case</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.caseNumber}</option>)}
          </select>
          <select value={filters.ocrStatus} onChange={(e) => setFilters({ ...filters, ocrStatus: e.target.value })} className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white">
            <option value="">OCR Status</option>
            {['Processed', 'Processing', 'Failed'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.blockchainStatus} onChange={(e) => setFilters({ ...filters, blockchainStatus: e.target.value })} className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white">
            <option value="">Blockchain Status</option>
            {['Registered', 'Pending', 'Not Registered'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.integrityStatus} onChange={(e) => setFilters({ ...filters, integrityStatus: e.target.value })} className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white">
            <option value="">Integrity Status</option>
            {['Verified', 'Warning', 'Failed'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" onClick={() => runSearch(query)} className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5">Apply filters</button>
        </div>
      </Card>

      {!searched && (
        <EmptyState title="Start searching" description="Enter a keyword, FIR number, or case number above, or apply filters directly." icon={<SearchIcon size={22} />} />
      )}

      {searched && results === null && <p className="text-sm text-slate-500">Searching…</p>}

      {searched && results !== null && results.length === 0 && (
        <EmptyState title="No matching documents" description="Try a different keyword or broaden your filters." icon={<FileText size={22} />} />
      )}

      {results && results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <Card key={r.id} className="p-4 cursor-pointer hover:border-brand-300 transition-colors" onClick={() => navigate(`/documents/${r.id}`)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <FileText size={17} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{r.fileName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.documentType} · {caseMap[r.caseId]?.caseNumber ?? '—'}</p>
                    <p className="text-xs text-brand-700 bg-brand-50 rounded px-2 py-1 mt-2 inline-block max-w-full truncate">Match: {r.matchedText}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end shrink-0">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    {r.ocrStatus === 'Processed' ? <CheckCircle2 size={12} className="text-verified-500" /> : <Clock size={12} className="text-pending-500" />} OCR
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    {r.blockchainStatus === 'Registered' ? <CheckCircle2 size={12} className="text-verified-500" /> : <Clock size={12} className="text-pending-500" />} Blockchain
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    {r.integrityStatus === 'Verified' ? <CheckCircle2 size={12} className="text-verified-500" /> : r.integrityStatus === 'Failed' ? <XCircle size={12} className="text-alert-500" /> : <Clock size={12} className="text-pending-500" />} {r.integrityStatus}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
