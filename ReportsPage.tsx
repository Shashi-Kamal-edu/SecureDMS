import React from 'react';
import { FileDown, FileSpreadsheet, FileBarChart } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import * as api from '../../services/api';
import { DashboardStats } from '../../types';
import { Card, CardHeader, PageHeader, Button } from '../../components/ui/Primitives';
import { useToast } from '../../context/ToastContext';

const PIE_COLORS = ['#1F9D55', '#DC9A2C', '#D64545', '#94A3B8'];

const ReportsPage: React.FC = () => {
  const { show } = useToast();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [byType, setByType] = React.useState<{ type: string; count: number }[]>([]);
  const [byCase, setByCase] = React.useState<{ caseNumber: string; count: number }[]>([]);
  const [verification, setVerification] = React.useState<{ status: string; count: number }[]>([]);

  React.useEffect(() => {
    api.getDashboardStats().then(setStats);
    api.getDocumentsByTypeChart().then(setByType);
    api.getVerificationStatusChart().then((v) => setVerification(v.filter((x) => x.count > 0)));
    Promise.all([api.getDocuments(), api.getCases()]).then(([docs, cases]) => {
      const caseMap = Object.fromEntries(cases.map((c) => [c.id, c.caseNumber]));
      const counts = new Map<string, number>();
      docs.forEach((d) => {
        const label = caseMap[d.caseId] ?? d.caseId;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      });
      setByCase(Array.from(counts.entries()).map(([caseNumber, count]) => ({ caseNumber, count })).sort((a, b) => b.count - a.count).slice(0, 8));
    });
  }, []);

  function exportAction(kind: string) {
    show(`${kind} export generated (demo — no backend report engine connected yet).`, 'info');
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total Documents', value: stats.totalDocuments },
    { label: 'Verified Documents', value: stats.blockchainVerified },
    { label: 'Integrity Alerts', value: stats.integrityAlerts },
    { label: 'OCR Processed', value: stats.ocrProcessed },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Summary statistics across documents, cases, and verification activity."
        actions={
          <>
            <Button variant="outline" size="sm" icon={<FileDown size={14} />} onClick={() => exportAction('PDF')}>Export PDF</Button>
            <Button variant="outline" size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => exportAction('CSV')}>Export CSV</Button>
            <Button size="sm" icon={<FileBarChart size={14} />} onClick={() => exportAction('Report')}>Generate Report</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xl font-semibold text-ink-900">{c.value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Documents by Type" />
          <div className="h-64 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F5" />
                <XAxis dataKey="type" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={55} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="count" fill="#4F5FE0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Documents by Case" subtitle="Top 8 cases" />
          <div className="h-64 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCase} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEF1F5" />
                <XAxis type="number" hide />
                <YAxis dataKey="caseNumber" type="category" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={64} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="count" fill="#1D2E4A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Verification Status" />
          <div className="h-64 flex items-center justify-center px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={verification} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {verification.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">OCR Processing Statistics</h3>
          <div className="space-y-4">
            <StatRow label="Documents processed" value={`${stats.ocrProcessed} / ${stats.totalDocuments}`} pct={(stats.ocrProcessed / Math.max(stats.totalDocuments, 1)) * 100} />
            <StatRow label="Blockchain registered" value={`${stats.blockchainVerified} / ${stats.totalDocuments}`} pct={stats.blockchainVerifiedPct} />
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string; pct: number }> = ({ label, value, pct }) => (
  <div>
    <div className="flex justify-between text-xs mb-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

export default ReportsPage;
