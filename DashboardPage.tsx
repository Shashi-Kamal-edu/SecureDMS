import React from 'react';
import {
  FileStack, Briefcase, UploadCloud, ScanText, Link2, AlertTriangle, ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import * as api from '../../services/api';
import { DashboardStats, AuditEvent } from '../../types';
import { Card, CardHeader, PageHeader } from '../../components/ui/Primitives';
import { SkeletonCard } from '../../components/ui/States';
import { formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const PIE_COLORS = ['#1F9D55', '#DC9A2C', '#D64545', '#94A3B8'];
const BAR_COLORS = ['#1F9D55', '#DC9A2C', '#94A3B8', '#334155'];

const KPI_ICONS = {
  total: <FileStack size={17} />,
  cases: <Briefcase size={17} />,
  today: <UploadCloud size={17} />,
  ocr: <ScanText size={17} />,
  chain: <Link2 size={17} />,
  alerts: <AlertTriangle size={17} />,
};

const DashboardPage: React.FC = () => {
  const { session } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [uploads, setUploads] = React.useState<{ date: string; uploads: number }[]>([]);
  const [byType, setByType] = React.useState<{ type: string; count: number }[]>([]);
  const [verification, setVerification] = React.useState<{ status: string; count: number }[]>([]);
  const [activeCases, setActiveCases] = React.useState<{ status: string; count: number }[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<AuditEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      api.getDashboardStats(),
      api.getUploadsOverTimeChart(),
      api.getDocumentsByTypeChart(),
      api.getVerificationStatusChart(),
      api.getActiveCasesChart(),
      api.getAuditLogs(),
    ]).then(([s, u, t, v, c, audit]) => {
      setStats(s);
      setUploads(u);
      setByType(t);
      setVerification(v.filter((x) => x.count > 0));
      setActiveCases(c);
      setRecentActivity(audit.slice(0, 6));
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Overview of documents, cases, and system integrity." />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const kpis = [
    { key: 'total', label: 'Total Documents', value: stats.totalDocuments.toLocaleString(), icon: KPI_ICONS.total, tone: 'text-brand-600 bg-brand-50' },
    { key: 'cases', label: 'Active Cases', value: stats.activeCases.toLocaleString(), icon: KPI_ICONS.cases, tone: 'text-ink-700 bg-slate-100' },
    { key: 'today', label: 'Uploaded Today', value: stats.uploadedToday.toLocaleString(), icon: KPI_ICONS.today, tone: 'text-brand-600 bg-brand-50' },
    { key: 'ocr', label: 'OCR Processed', value: stats.ocrProcessed.toLocaleString(), icon: KPI_ICONS.ocr, tone: 'text-verified-600 bg-verified-50' },
    { key: 'chain', label: 'Blockchain Verified', value: stats.blockchainVerified.toLocaleString(), icon: KPI_ICONS.chain, tone: 'text-verified-600 bg-verified-50' },
    { key: 'alerts', label: 'Integrity Alerts', value: stats.integrityAlerts.toLocaleString(), icon: KPI_ICONS.alerts, tone: 'text-alert-600 bg-alert-50' },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session?.name?.split(' ')[0]}`}
        description="Overview of documents, cases, and system integrity across the department."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpis.map((k) => (
          <Card key={k.key} className="p-4">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${k.tone}`}>{k.icon}</div>
            <p className="text-xl font-semibold text-ink-900 leading-none">{k.value}</p>
            <p className="text-xs text-slate-500 mt-1.5">{k.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Documents uploaded over time" subtitle="Last 14 days" />
          <div className="h-56 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={uploads} margin={{ left: 0, right: 10 }}>
                <defs>
                  <linearGradient id="uploadFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F5FE0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4F5FE0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Area type="monotone" dataKey="uploads" stroke="#4F5FE0" strokeWidth={2} fill="url(#uploadFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Verification status" subtitle="All documents" />
          <div className="h-56 flex items-center justify-center px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={verification} dataKey="count" nameKey="status" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {verification.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-5 pb-4">
            {verification.map((v, i) => (
              <div key={v.status} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {v.status} ({v.count})
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <CardHeader title="Documents by type" />
          <div className="h-60 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" />
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="count" fill="#4F5FE0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Active cases" subtitle="By status" />
          <div className="h-60 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeCases} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F5" />
                <XAxis type="number" hide />
                <YAxis dataKey="status" type="category" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {activeCases.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent activity"
            action={<Link to="/security/activity" className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">View all <ArrowUpRight size={12} /></Link>}
          />
          <div className="divide-y divide-slate-50">
            {recentActivity.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink-800 truncate">
                    <span className="font-medium">{ev.user}</span>{' '}
                    <span className="text-slate-500">
                      {ev.action === 'UPLOAD' && `uploaded ${ev.documentName}`}
                      {ev.action === 'VIEW' && `viewed ${ev.documentName}`}
                      {ev.action === 'VERIFY' && `verified ${ev.documentName}`}
                      {ev.action === 'OCR_PROCESS' && `ran OCR on ${ev.documentName}`}
                      {ev.action === 'BLOCKCHAIN_REGISTER' && `registered ${ev.documentName} on-chain`}
                      {ev.action === 'CREATE_VERSION' && `created a new version of ${ev.documentName}`}
                      {ev.action === 'LOGIN' && 'signed in'}
                      {ev.action === 'UPDATE' && `updated ${ev.documentName ?? ev.caseId ?? 'a record'}`}
                      {ev.action === 'DOWNLOAD' && `downloaded ${ev.documentName}`}
                      {ev.action === 'DELETE' && `deleted ${ev.documentName}`}
                    </span>
                  </p>
                </div>
                <span className="text-xs text-slate-400 shrink-0 ml-3">{formatDateTime(ev.timestamp)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Security overview</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500">Blockchain verified</span>
                <span className="font-medium text-ink-800">{stats.blockchainVerifiedPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-verified-500 rounded-full" style={{ width: `${stats.blockchainVerifiedPct}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Integrity alerts</span>
              <span className="font-semibold text-alert-600">{stats.integrityAlerts}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Pending reviews</span>
              <span className="font-semibold text-pending-600">{stats.pendingReviews}</span>
            </div>
            <Link to="/security/integrity" className="block text-center text-xs font-medium text-brand-600 hover:text-brand-700 border border-brand-100 bg-brand-50 rounded-lg py-2 mt-2">
              Open Document Integrity
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
