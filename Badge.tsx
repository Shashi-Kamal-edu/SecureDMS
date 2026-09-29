import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, CircleDashed } from 'lucide-react';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-verified-50 text-verified-700 border-verified-100',
  warning: 'bg-pending-50 text-pending-700 border-pending-100',
  danger: 'bg-alert-50 text-alert-700 border-alert-100',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-brand-50 text-brand-700 border-brand-100',
};

const STATUS_MAP: Record<string, { tone: Tone; icon?: React.ReactNode }> = {
  Processed: { tone: 'success', icon: <CheckCircle2 size={12} /> },
  Registered: { tone: 'success', icon: <CheckCircle2 size={12} /> },
  Verified: { tone: 'success', icon: <CheckCircle2 size={12} /> },
  Active: { tone: 'success', icon: <CheckCircle2 size={12} /> },
  Success: { tone: 'success', icon: <CheckCircle2 size={12} /> },
  Processing: { tone: 'warning', icon: <Clock size={12} /> },
  Pending: { tone: 'warning', icon: <Clock size={12} /> },
  'Under Review': { tone: 'warning', icon: <Clock size={12} /> },
  Warning: { tone: 'warning', icon: <AlertTriangle size={12} /> },
  Failed: { tone: 'danger', icon: <XCircle size={12} /> },
  'Not Registered': { tone: 'neutral', icon: <CircleDashed size={12} /> },
  'Not Verified': { tone: 'neutral', icon: <CircleDashed size={12} /> },
  'Not Started': { tone: 'neutral', icon: <CircleDashed size={12} /> },
  Closed: { tone: 'neutral' },
  Archived: { tone: 'neutral' },
  Disabled: { tone: 'neutral' },
};

interface BadgeProps {
  status: string;
  tone?: Tone;
  className?: string;
}

const StatusBadge: React.FC<BadgeProps> = ({ status, tone, className = '' }) => {
  const mapped = STATUS_MAP[status];
  const resolvedTone = tone ?? mapped?.tone ?? 'neutral';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[resolvedTone]} ${className}`}
    >
      {mapped?.icon}
      {status}
    </span>
  );
};

export default StatusBadge;
