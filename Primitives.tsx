import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div className={`bg-white border border-slate-200 rounded-xl shadow-card ${className}`} {...rest}>
    {children}
  </div>
);

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
    <div>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
  secondary: 'bg-ink-900 text-white hover:bg-ink-800 disabled:bg-slate-300',
  outline: 'bg-white text-ink-800 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'bg-transparent text-ink-700 hover:bg-slate-100 disabled:text-slate-300',
  danger: 'bg-alert-600 text-white hover:bg-alert-700 disabled:bg-alert-300',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', icon, loading, className = '', children, disabled, ...rest
}) => (
  <button
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    {...rest}
  >
    {loading ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : icon}
    {children}
  </button>
);

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({ label, className = '', children, ...rest }) => (
  <button
    aria-label={label}
    title={label}
    className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink-800 transition-colors ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export const PageHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode }> = ({ title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
    <div>
      <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export const HashBox: React.FC<{ hash: string; onCopy?: () => void }> = ({ hash, onCopy }) => (
  <button
    onClick={() => { navigator.clipboard?.writeText(hash); onCopy?.(); }}
    className="group flex items-center gap-2 hash-text text-xs bg-ink-950 text-brand-200 rounded-lg px-3 py-2 w-full text-left hover:bg-ink-900 transition-colors overflow-hidden"
    title="Click to copy full hash"
  >
    <span className="truncate flex-1">{hash}</span>
    <span className="text-[10px] uppercase tracking-wide text-slate-400 group-hover:text-slate-200 shrink-0">Copy</span>
  </button>
);
