import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ShieldCheck, LayoutDashboard, Briefcase, FileText, UploadCloud, Search,
  FileCheck2, History, GitBranch, BarChart3, Users, Settings, LogOut, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABEL } from '../../utils/permissions';

interface NavItem {
  label: string;
  to?: string;
  icon: React.ReactNode;
  permission?: Parameters<ReturnType<typeof useAuth>['can']>[0];
  children?: { label: string; to: string }[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Cases', to: '/cases', icon: <Briefcase size={17} />, permission: 'case.view' },
  {
    label: 'Documents',
    icon: <FileText size={17} />,
    permission: 'document.view',
    children: [
      { label: 'All Documents', to: '/documents' },
      { label: 'Upload Document', to: '/documents/upload' },
    ],
  },
  { label: 'Search', to: '/search', icon: <Search size={17} />, permission: 'search.use' },
  {
    label: 'Security & Verification',
    icon: <ShieldCheck size={17} />,
    permission: 'document.verify',
    children: [
      { label: 'Document Integrity', to: '/security/integrity' },
      { label: 'Activity History', to: '/security/activity' },
      { label: 'Version History', to: '/security/versions' },
    ],
  },
  { label: 'Reports', to: '/reports', icon: <BarChart3 size={17} />, permission: 'reports.view' },
  { label: 'Users & Roles', to: '/users', icon: <Users size={17} />, permission: 'users.manage' },
  { label: 'Settings', to: '/settings', icon: <Settings size={17} /> },
];

const SUB_ICONS: Record<string, React.ReactNode> = {
  'All Documents': <FileText size={15} />,
  'Upload Document': <UploadCloud size={15} />,
  'Document Integrity': <FileCheck2 size={15} />,
  'Activity History': <History size={15} />,
  'Version History': <GitBranch size={15} />,
};

const linkBase = 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors';
const linkActive = 'bg-brand-600/90 text-white';
const linkInactive = 'text-slate-300 hover:bg-white/5 hover:text-white';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { session, can, logout } = useAuth();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    Documents: true,
    'Security & Verification': false,
  });

  // Auto-open the group containing the current active child
  const { pathname } = useLocation();
  React.useEffect(() => {
    if (pathname.startsWith('/documents')) setOpenGroups((s) => ({ ...s, Documents: true }));
    if (pathname.startsWith('/security')) setOpenGroups((s) => ({ ...s, 'Security & Verification': true }));
  }, [pathname]);

  const visibleNav = NAV.filter((item) => !item.permission || can(item.permission));

  const content = (
    <div className="flex flex-col h-full bg-ink-900 text-white w-64">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10 shrink-0">
        <div className="h-8 w-8 rounded-md bg-brand-600 flex items-center justify-center">
          <ShieldCheck size={18} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">SecureDMS</p>
          <p className="text-[10px] text-slate-400 tracking-wide">Document Management</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          if (item.children) {
            const visibleChildren = item.children;
            const isOpen = openGroups[item.label];
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [item.label]: !s[item.label] }))}
                  className={`${linkBase} ${linkInactive} w-full justify-between`}
                >
                  <span className="flex items-center gap-2.5">{item.icon}{item.label}</span>
                  <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="mt-1 ml-3.5 pl-3.5 border-l border-white/10 space-y-1">
                    {visibleChildren.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={onCloseMobile}
                        className={({ isActive }) => `${linkBase} text-[13px] py-1.5 ${isActive ? linkActive : linkInactive}`}
                      >
                        {SUB_ICONS[child.label]}
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              onClick={onCloseMobile}
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 shrink-0">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-semibold shrink-0">
            {session?.avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{session?.name}</p>
            <p className="text-[11px] text-slate-400">{session ? ROLE_LABEL[session.role] : ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white w-full rounded-lg px-2 py-1.5 hover:bg-white/5"
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <div className="relative h-full">{content}</div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
