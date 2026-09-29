import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL } from '../../utils/permissions';
import * as api from '../../services/api';
import { NotificationItem } from '../../types';
import { formatDateTime } from '../../utils/format';

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  cases: 'Cases',
  documents: 'Documents',
  upload: 'Upload Document',
  search: 'Search',
  security: 'Security & Verification',
  integrity: 'Document Integrity',
  activity: 'Activity History',
  versions: 'Version History',
  reports: 'Reports',
  users: 'Users & Roles',
  settings: 'Settings',
};

function useBreadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  return parts.map((p, i) => ({
    label: LABELS[p] ?? (p.length > 14 ? `${p.slice(0, 14)}…` : p),
    to: `/${parts.slice(0, i + 1).join('/')}`,
  }));
}

const NOTIF_ICON: Record<NotificationItem['icon'], React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-verified-500" />,
  warning: <AlertTriangle size={16} className="text-pending-500" />,
  info: <Info size={16} className="text-brand-500" />,
};

const Topbar: React.FC<{ onOpenMobileNav: () => void }> = ({ onOpenMobileNav }) => {
  const { session } = useAuth();
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    api.getNotifications().then(setNotifications);
  }, []);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  async function openNotifications() {
    setNotifOpen((v) => !v);
    if (unread > 0) {
      await api.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center gap-4 px-4 sm:px-6">
      <button onClick={onOpenMobileNav} className="lg:hidden text-slate-500 hover:text-ink-800">
        <Menu size={20} />
      </button>

      <nav className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
        <Link to="/dashboard" className="hover:text-ink-700">Home</Link>
        {crumbs.map((c, i) => (
          <React.Fragment key={c.to}>
            <span className="text-slate-300">/</span>
            {i === crumbs.length - 1 ? (
              <span className="text-ink-800 font-medium truncate">{c.label}</span>
            ) : (
              <Link to={c.to} className="hover:text-ink-700 truncate">{c.label}</Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      <form onSubmit={onSearchSubmit} className="flex-1 max-w-md ml-auto">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, cases, FIR numbers…"
            className="w-full text-sm bg-slate-100 rounded-lg pl-9 pr-3 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-brand-200 border border-transparent focus:border-brand-300 transition-colors"
          />
        </div>
      </form>

      <div className="relative" ref={menuRef}>
        <button onClick={openNotifications} className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-alert-500 ring-2 ring-white" />
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-ink-900">Notifications</div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 px-4 py-6 text-center">No notifications yet.</p>
              ) : notifications.map((n) => (
                <div key={n.id} className="flex gap-2.5 px-4 py-3 border-b border-slate-50 last:border-0">
                  <div className="mt-0.5">{NOTIF_ICON[n.icon]}</div>
                  <div className="min-w-0">
                    <p className="text-xs text-ink-800 leading-snug">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
        <div className="h-9 w-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
          {session?.avatarInitials}
        </div>
        <div className="hidden sm:block leading-tight">
          <p className="text-sm font-medium text-ink-900">{session?.name}</p>
          <p className="text-[11px] text-slate-500">{session ? ROLE_LABEL[session.role] : ''}</p>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
