import React from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import * as api from '../../services/api';
import { User, Role } from '../../types';
import { Card, PageHeader, Button } from '../../components/ui/Primitives';
import StatusBadge from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ROLE_LABEL } from '../../utils/permissions';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ROLES: Role[] = ['ADMIN', 'INVESTIGATOR', 'REVIEWER', 'VIEWER'];

const PERMISSION_ROWS: { label: string; roles: Record<Role, boolean> }[] = [
  { label: 'View cases', roles: { ADMIN: true, INVESTIGATOR: true, REVIEWER: true, VIEWER: true } },
  { label: 'Create / edit cases', roles: { ADMIN: true, INVESTIGATOR: true, REVIEWER: false, VIEWER: false } },
  { label: 'Upload documents', roles: { ADMIN: true, INVESTIGATOR: true, REVIEWER: false, VIEWER: false } },
  { label: 'Run / edit OCR', roles: { ADMIN: true, INVESTIGATOR: true, REVIEWER: false, VIEWER: false } },
  { label: 'Verify document integrity', roles: { ADMIN: true, INVESTIGATOR: true, REVIEWER: true, VIEWER: false } },
  { label: 'Review documents', roles: { ADMIN: true, INVESTIGATOR: false, REVIEWER: true, VIEWER: false } },
  { label: 'View activity & versions', roles: { ADMIN: true, INVESTIGATOR: true, REVIEWER: true, VIEWER: false } },
  { label: 'View reports', roles: { ADMIN: true, INVESTIGATOR: false, REVIEWER: false, VIEWER: false } },
  { label: 'Manage users', roles: { ADMIN: true, INVESTIGATOR: false, REVIEWER: false, VIEWER: false } },
];

const UsersPage: React.FC = () => {
  const { session } = useAuth();
  const { show } = useToast();
  const [users, setUsers] = React.useState<User[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', role: 'VIEWER' as Role, status: 'Active' as 'Active' | 'Disabled' });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => { api.getUsers().then(setUsers); }, []);
  React.useEffect(load, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createUser(form, session!.name);
      show(`User ${form.name} added.`, 'success');
      setModalOpen(false);
      setForm({ name: '', email: '', role: 'VIEWER', status: 'Active' });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: User) {
    await api.updateUser(u.id, { status: u.status === 'Active' ? 'Disabled' : 'Active' }, session!.name);
    show(`${u.name} ${u.status === 'Active' ? 'disabled' : 'enabled'}.`, 'success');
    load();
  }

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage who has access to SecureDMS and what each role is permitted to do."
        actions={<Button icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>Add User</Button>}
      />

      <Card className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">{u.avatarInitials}</div>
                      <span className="font-medium text-ink-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} tone={u.status === 'Active' ? 'success' : 'neutral'} /></td>
                  <td className="px-4 py-3 text-slate-500">{u.lastLogin === '—' ? '—' : formatDateTime(u.lastLogin)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleStatus(u)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                      {u.status === 'Active' ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-ink-900 mb-1 flex items-center gap-2"><ShieldCheck size={15} className="text-slate-400" /> Role Permission Matrix</h3>
        <p className="text-xs text-slate-500 mb-4">Reflects the authorization rules the backend will enforce for each role.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="py-2 pr-4 font-medium">Permission</th>
                {ROLES.map((r) => <th key={r} className="py-2 px-3 font-medium text-center">{ROLE_LABEL[r]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="py-2.5 pr-4 text-ink-700">{row.label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="py-2.5 px-3 text-center">
                      {row.roles[r] ? <span className="inline-block h-2 w-2 rounded-full bg-verified-500" /> : <span className="inline-block h-2 w-2 rounded-full bg-slate-200" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add User"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button form="add-user-form" type="submit" loading={saving}>Add User</Button></>}
      >
        <form id="add-user-form" onSubmit={submit} className="space-y-3.5">
          <label className="block">
            <span className="block text-xs font-medium text-ink-700 mb-1.5">Name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-700 mb-1.5">Email</span>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-ink-700 mb-1.5">Role</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="input">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink-700 mb-1.5">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Disabled' })} className="input">
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UsersPage;
