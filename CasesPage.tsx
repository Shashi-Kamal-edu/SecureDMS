import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowUpDown } from 'lucide-react';
import * as api from '../../services/api';
import { Case, CaseStatus } from '../../types';
import { Card, PageHeader, Button } from '../../components/ui/Primitives';
import { EmptyState, SkeletonRow } from '../../components/ui/States';
import StatusBadge from '../../components/ui/Badge';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CASE_TYPES, STATIONS, OFFICERS } from '../../services/mockData';
import { Modal } from '../../components/ui/Modal';

const STATUS_OPTIONS: (CaseStatus | 'All')[] = ['All', 'Active', 'Under Review', 'Closed', 'Archived'];

const CasesPage: React.FC = () => {
  const { session, can } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [cases, setCases] = React.useState<Case[] | null>(null);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<CaseStatus | 'All'>('All');
  const [sortDesc, setSortDesc] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState({ caseNumber: '', caseName: '', caseType: CASE_TYPES[0], department: STATIONS[0], assignedOfficer: OFFICERS[0], description: '' });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => { api.getCases().then(setCases); }, []);
  React.useEffect(load, [load]);

  const filtered = React.useMemo(() => {
    if (!cases) return [];
    let list = cases.filter((c) => status === 'All' || c.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => [c.caseName, c.caseNumber, c.assignedOfficer, c.department].join(' ').toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => (sortDesc ? +new Date(b.lastUpdated) - +new Date(a.lastUpdated) : +new Date(a.lastUpdated) - +new Date(b.lastUpdated)));
    return list;
  }, [cases, query, status, sortDesc]);

  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filtered, 8);

  async function submitCase(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.createCase(form, session!.name);
      show(`Case ${created.caseNumber} created successfully.`, 'success');
      setModalOpen(false);
      setForm({ caseNumber: '', caseName: '', caseType: CASE_TYPES[0], department: STATIONS[0], assignedOfficer: OFFICERS[0], description: '' });
      load();
      navigate(`/cases/${created.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Cases"
        description="Track investigations and the documents attached to each case."
        actions={can('case.create') && (
          <Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Create Case</Button>
        )}
      />

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by case name, number, officer, department…"
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus | 'All')} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
          </select>
          <button onClick={() => setSortDesc((v) => !v)} className="flex items-center gap-1.5 text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50">
            <ArrowUpDown size={14} /> {sortDesc ? 'Newest' : 'Oldest'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Officer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cases === null && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={6} />)}
              {cases !== null && pageItems.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{c.caseName}</p>
                    <p className="text-xs text-slate-500">{c.caseNumber} · {c.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.caseType}</td>
                  <td className="px-4 py-3 text-slate-600">{c.department}</td>
                  <td className="px-4 py-3 text-slate-600">{c.assignedOfficer}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(c.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cases !== null && filtered.length === 0 && (
            <EmptyState title="No cases found" description="Try adjusting your search or filters, or create a new case." />
          )}
        </div>
        <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Case"
        description="Add a new investigation case to the system."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button form="create-case-form" type="submit" loading={saving}>Create Case</Button>
          </>
        }
      >
        <form id="create-case-form" onSubmit={submitCase} className="space-y-3.5">
          <Field label="Case Number">
            <input required value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} placeholder="e.g. 142/2026" className="input" />
          </Field>
          <Field label="Case Name">
            <input required value={form.caseName} onChange={(e) => setForm({ ...form, caseName: e.target.value })} placeholder="e.g. Warehouse Theft Investigation" className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Case Type">
              <select value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value })} className="input">
                {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input">
                {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Assigned Officer">
            <select value={form.assignedOfficer} onChange={(e) => setForm({ ...form, assignedOfficer: e.target.value })} className="input">
              {OFFICERS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief summary of the case…" className="input resize-none" />
          </Field>
        </form>
      </Modal>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-ink-700 mb-1.5">{label}</span>
    {children}
  </label>
);

export default CasesPage;
