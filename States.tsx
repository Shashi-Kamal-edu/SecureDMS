import React from 'react';
import { Inbox, AlertOctagon } from 'lucide-react';
import { Button } from './Primitives';

export const EmptyState: React.FC<{ title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode }> = ({
  title, description, icon, action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
      {icon ?? <Inbox size={22} />}
    </div>
    <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
    {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="h-12 w-12 rounded-full bg-alert-50 flex items-center justify-center text-alert-500 mb-3">
      <AlertOctagon size={22} />
    </div>
    <h3 className="text-sm font-semibold text-ink-800">Something went wrong</h3>
    <p className="text-xs text-slate-500 mt-1 max-w-sm">{message}</p>
    {onRetry && <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>Try again</Button>}
  </div>
);

export const SkeletonRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-3.5 rounded bg-slate-100 animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
      </td>
    ))}
  </tr>
);

export const SkeletonCard: React.FC = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
    <div className="h-3 w-1/3 rounded bg-slate-100 animate-pulse" />
    <div className="h-6 w-1/2 rounded bg-slate-100 animate-pulse" />
    <div className="h-2.5 w-2/3 rounded bg-slate-100 animate-pulse" />
  </div>
);
