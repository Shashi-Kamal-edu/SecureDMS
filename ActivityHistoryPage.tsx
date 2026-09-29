import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, History } from 'lucide-react';
import * as api from '../../services/api';
import { AuditEvent, AuditAction } from '../../types';
import { Card, PageHeader } from '../../components/ui/Primitives';
import { EmptyState, SkeletonRow } from '../../components/ui/States';
import StatusBadge from '../../components/ui/Badge';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { formatDateTime } from '../../utils/format';
import { OFFICERS } from '../../services/mockData';
import { useToast } from '../../context/ToastContext';

const ACTIONS: AuditAction[] = ['LOGIN', 'UPLOAD', 'VIEW', 'DOWNLOAD', 'UPDATE', 'DELETE', 'OCR_PROCESS', 'VERIFY', 'CREATE_VERSION', 'BLOCKCHAIN_REGISTER'];

const ActivityHistoryPage: React.FC = () => {
  const [params] = useSearchParams();
  const { show } = useToast();
  const [events, setEvents] = React.useState<AuditEvent[] | null>(null);
  const [query, setQuery] = React.useState('');
  const [user, setUser] = React.useState('All');
  const [action, setAction] = React.useState<AuditAction | 'All'>('All');
  const [dateFrom, setDateFrom] = React.useState('');

  const docFilter = params.get('doc');

  React.useEffect(() => {
    api.getAuditLogs().then(setEvents);
    if (docFilter) {
      api.getDocument(docFilter).then((d) => { if (d) setQuery(d.fileName); });
    }
  }, [docFilter]);

  const filtered = React.useMemo(() => {
    if (!events) return [];
    return events.filter((e) => {
      if (user !== 'All' && e.user !== user) return false;
      if (action !== 'All' && e.action !== action) return false;
      if (dateFrom && new Date(e.timestamp) < new Date(dateFrom)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!`${e.user} ${e.documentName ?? ''} ${e.caseId ?? ''} ${e.action}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [events, user, action, dateFrom, query]);

  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filtered, 10);

  function exportCsv() {
    const header = 'Timestamp,User,Action,Document,Case,Device,Status\n';
    const rows = filtered.map((e) => [e.timestamp, e.user, e.action, e.documentName ?? '', e.caseId ?? '', e.device, e.status].map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity_history.csv';
    a.click();
    URL.revokeObjectURL(url);
    show('Activity history exported as CSV.', 'success');
  }

  return (
    <div>
      <PageHeader
        title="Activity History"
        description="Records user and system actions performed on documents and cases."
        actions={<button onClick={exportCsv} className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-2 text-ink-700 hover:bg-slate-50"><Download size={14} /> Export CSV</button>}
      />

      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search activity…" className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white" />
          <select value={user} onChange={(e) => setUser(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <option value="All">All users</option>
            <option value="System">System</option>
            {OFFICERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value as AuditAction | 'All')} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <option value="All">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events === null && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)}
              {events !== null && pageItems.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(e.timestamp)}</td>
                  <td className="px-4 py-3 font-medium text-ink-800">{e.user}</td>
                  <td className="px-4 py-3 text-slate-600">{e.action.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-slate-600">{e.documentName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{e.caseId ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{e.device}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {events !== null && filtered.length === 0 && (
            <EmptyState title="No activity found" description="Try adjusting your filters." icon={<History size={22} />} />
          )}
        </div>
        <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>
    </div>
  );
};

export default ActivityHistoryPage;
