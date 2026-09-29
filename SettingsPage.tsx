import React from 'react';
import { KeyRound, ShieldCheck, Bell, Sliders, Monitor, RotateCcw } from 'lucide-react';
import { Card, PageHeader, Button } from '../../components/ui/Primitives';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABEL } from '../../utils/permissions';
import { resetDemoData } from '../../services/mockData';

const TABS = ['Profile', 'Security', 'Notifications', 'Preferences'] as const;

const SettingsPage: React.FC = () => {
  const { session } = useAuth();
  const { show } = useToast();
  const [tab, setTab] = React.useState<typeof TABS[number]>('Profile');
  const [notifPrefs, setNotifPrefs] = React.useState({ uploads: true, verification: true, review: true, digest: false });
  const [prefs, setPrefs] = React.useState({ language: 'English', dateFormat: 'DD MMM YYYY' });

  function saveGeneric(section: string) {
    show(`${section} settings saved.`, 'success');
  }

  function handleResetDemo() {
    resetDemoData();
    show('Demo data has been reset.', 'info');
    setTimeout(() => window.location.reload(), 700);
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, security, and application preferences." />

      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-ink-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <Card className="p-6 max-w-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-semibold">{session?.avatarInitials}</div>
            <div>
              <p className="text-base font-semibold text-ink-900">{session?.name}</p>
              <p className="text-sm text-slate-500">{session ? ROLE_LABEL[session.role] : ''}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-ink-700 mb-1.5">Full Name</span>
              <input defaultValue={session?.name} className="input" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink-700 mb-1.5">Email</span>
              <input defaultValue={session?.email} disabled className="input opacity-60" />
            </label>
          </div>
          <Button className="mt-5" onClick={() => saveGeneric('Profile')}>Save Changes</Button>
        </Card>
      )}

      {tab === 'Security' && (
        <div className="space-y-5 max-w-xl">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><KeyRound size={15} className="text-slate-400" /> Change Password</h3>
            <div className="space-y-3">
              <input type="password" placeholder="Current password" className="input" />
              <input type="password" placeholder="New password" className="input" />
              <input type="password" placeholder="Confirm new password" className="input" />
            </div>
            <Button className="mt-4" onClick={() => saveGeneric('Password')}>Update Password</Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2"><ShieldCheck size={15} className="text-slate-400" /> Two-Factor Authentication</h3>
              <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">Not enabled</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Add an extra layer of security to your account. This is a UI placeholder in the current demo build.</p>
            <Button variant="outline" onClick={() => saveGeneric('Two-factor authentication')}>Enable 2FA</Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Monitor size={15} className="text-slate-400" /> Session Management</h3>
            <div className="flex items-center justify-between text-sm border border-slate-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-ink-800 font-medium">Current session</p>
                <p className="text-xs text-slate-500">This browser · Active now</p>
              </div>
              <span className="text-xs text-verified-600 font-medium">Active</span>
            </div>
          </Card>
        </div>
      )}

      {tab === 'Notifications' && (
        <Card className="p-6 max-w-xl">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Bell size={15} className="text-slate-400" /> Notification Preferences</h3>
          <div className="space-y-3.5">
            {[
              { key: 'uploads', label: 'Document upload confirmations' },
              { key: 'verification', label: 'Integrity verification results' },
              { key: 'review', label: 'Documents pending review' },
              { key: 'digest', label: 'Weekly activity digest' },
            ].map((n) => (
              <label key={n.key} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-4 py-3">
                {n.label}
                <input
                  type="checkbox"
                  checked={notifPrefs[n.key as keyof typeof notifPrefs]}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, [n.key]: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-300"
                />
              </label>
            ))}
          </div>
          <Button className="mt-5" onClick={() => saveGeneric('Notification')}>Save Preferences</Button>
        </Card>
      )}

      {tab === 'Preferences' && (
        <Card className="p-6 max-w-xl">
          <h3 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Sliders size={15} className="text-slate-400" /> Application Preferences</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <label className="block">
              <span className="block text-xs font-medium text-ink-700 mb-1.5">Language</span>
              <select value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })} className="input">
                <option>English</option>
                <option>Hindi</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink-700 mb-1.5">Date Format</span>
              <select value={prefs.dateFormat} onChange={(e) => setPrefs({ ...prefs, dateFormat: e.target.value })} className="input">
                <option>DD MMM YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </label>
          </div>
          <Button onClick={() => saveGeneric('Application')}>Save Preferences</Button>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Demo Environment</h4>
            <p className="text-xs text-slate-500 mb-3">Reset all mock data (cases, documents, activity) back to its original seeded state.</p>
            <Button variant="outline" size="sm" icon={<RotateCcw size={13} />} onClick={handleResetDemo}>Reset Demo Data</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
