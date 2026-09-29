import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, Briefcase } from 'lucide-react';
import * as api from '../../services/api';
import { Case, DocumentRecord, AuditEvent } from '../../types';
import { Card, Button } from '../../components/ui/Primitives';
import StatusBadge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { formatDate, formatDateTime } from '../../utils/format';

const TABS = ['Overview', 'Documents', 'Activity', 'Timeline'] as const;

const CaseDetailsPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = React.useState<Case | null>(null);
  const [documents, setDocuments] = React.useState<DocumentRecord[]>([]);
  const [audit, setAudit] = React.useState<AuditEvent[]>([]);
  const [tab, setTab] = React.useState<typeof TABS[number]>('Overview');

  React.useEffect(() => {
    if (!caseId) return;
    api.getCase(caseId).then((c) => setCaseRecord(c ?? null));
    api.getDocumentsByCase(caseId).then(setDocuments);
    api.getAuditLogs().then((events) => setAudit(events.filter((e) => e.caseId === caseId)));
  }, [caseId]);

  if (!caseRecord) {
    return <EmptyState title="Case not found" description="This case may have been removed or the link is incorrect." action={<Button variant="outline" onClick={() => navigate('/cases')}>Back to Cases</Button>} />;
  }

  return (
    <div>
      <Link to="/cases" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink-800 mb-4">
        <ArrowLeft size={14} /> Back to Cases
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{caseRecord.caseName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{caseRecord.caseNumber} · {caseRecord.id} · {caseRecord.department}</p>
          </div>
        </div>
        <StatusBadge status={caseRecord.status} className="text-sm px-3 py-1" />
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-ink-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <Card className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <InfoField label="Case ID" value={caseRecord.id} />
          <InfoField label="Case Number" value={caseRecord.caseNumber} />
          <InfoField label="Case Type" value={caseRecord.caseType} />
          <InfoField label="Department" value={caseRecord.department} />
          <InfoField label="Assigned Officer" value={caseRecord.assignedOfficer} />
          <InfoField label="Status" value={<StatusBadge status={caseRecord.status} />} />
          <InfoField label="Created" value={formatDate(caseRecord.createdDate)} />
          <InfoField label="Last Updated" value={formatDate(caseRecord.lastUpdated)} />
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Description</p>
            <p className="text-sm text-ink-700 leading-relaxed">{caseRecord.description}</p>
          </div>
        </Card>
      )}

      {tab === 'Documents' && (
        <Card>
          {documents.length === 0 ? (
            <EmptyState title="No documents attached" description="Upload a document and assign it to this case." icon={<FileText size={22} />} />
          ) : (
            <div className="divide-y divide-slate-50">
              {documents.map((d) => (
                <div key={d.id} onClick={() => navigate(`/documents/${d.id}`)} className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-800 truncate">{d.fileName}</p>
                      <p className="text-xs text-slate-500">{d.documentType} · v{d.version} · {formatDate(d.uploadDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={d.integrityStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Activity' && (
        <Card>
          {audit.length === 0 ? (
            <EmptyState title="No activity recorded" description="Actions on this case's documents will appear here." icon={<Clock size={22} />} />
          ) : (
            <div className="divide-y divide-slate-50">
              {audit.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm text-ink-800"><span className="font-medium">{ev.user}</span> · {ev.action.replace('_', ' ')} {ev.documentName && `— ${ev.documentName}`}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={ev.status} />
                    <span className="text-xs text-slate-400">{formatDateTime(ev.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'Timeline' && (
        <Card className="p-6">
          <ol className="relative border-l border-slate-200 ml-2 space-y-6">
            <TimelineItem label="Case created" detail={`${caseRecord.assignedOfficer} opened this case`} time={formatDateTime(caseRecord.createdDate)} />
            {documents.map((d) => (
              <TimelineItem key={d.id} label={`${d.documentType} uploaded`} detail={`${d.fileName} by ${d.uploadedBy}`} time={formatDateTime(d.uploadDate)} />
            ))}
            <TimelineItem label="Last updated" detail={`Case record last modified`} time={formatDateTime(caseRecord.lastUpdated)} last />
          </ol>
        </Card>
      )}
    </div>
  );
};

const InfoField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
    <div className="text-sm text-ink-900">{value}</div>
  </div>
);

const TimelineItem: React.FC<{ label: string; detail: string; time: string; last?: boolean }> = ({ label, detail, time }) => (
  <li className="ml-4">
    <span className="absolute -left-[7px] h-3 w-3 rounded-full bg-brand-500 ring-4 ring-white" />
    <p className="text-sm font-medium text-ink-900">{label}</p>
    <p className="text-xs text-slate-500">{detail}</p>
    <p className="text-[11px] text-slate-400 mt-0.5">{time}</p>
  </li>
);

export default CaseDetailsPage;
