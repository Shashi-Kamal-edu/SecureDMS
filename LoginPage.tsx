import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, AlertCircle, Fingerprint } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Primitives';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@securedms.demo', password: 'admin123' },
  { role: 'Investigator', email: 'investigator@securedms.demo', password: 'investigator123' },
  { role: 'Reviewer', email: 'reviewer@securedms.demo', password: 'reviewer123' },
  { role: 'Viewer', email: 'viewer@securedms.demo', password: 'viewer123' },
];

const LoginPage: React.FC = () => {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  if (session) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, remember);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(acc: { email: string; password: string }) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  }

  return (
    <div className="min-h-screen flex bg-ink-950">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-ink-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand-600 flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <span className="font-semibold text-lg">SecureDMS</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight mb-4">
            Chain-of-custody, built into every document.
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Every upload is hashed, timestamped, and registered for tamper detection —
            giving investigators, reviewers, and legal teams a verifiable record from
            intake to courtroom.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'SHA-256 document fingerprinting',
              'Blockchain-backed integrity registration',
              'Full audit trail of every action',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-slate-200">
                <Fingerprint size={15} className="text-brand-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">© 2026 SecureDMS · Demo Environment</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <ShieldCheck size={18} />
            </div>
            <span className="font-semibold text-ink-900">SecureDMS</span>
          </div>

          <h2 className="text-xl font-semibold text-ink-900">Secure Digital Document Management System</h2>
          <p className="text-sm text-slate-500 mt-1.5">Sign in to access cases, documents, and integrity tools.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-alert-50 border border-alert-100 text-alert-700 text-xs px-3 py-2.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@securedms.demo"
                  className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-9 py-2.5 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-300" />
                Remember me
              </label>
              <button type="button" className="text-brand-600 hover:text-brand-700 font-medium" onClick={() => setError('Password reset is not available in this demo environment.')}>
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3.5">
            <p className="text-[11px] font-medium text-slate-500 mb-2 uppercase tracking-wide">Demo accounts</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => fillDemo(acc)}
                  className="text-left rounded-md border border-slate-200 px-2.5 py-1.5 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                >
                  <p className="text-xs font-medium text-ink-800">{acc.role}</p>
                  <p className="text-[10px] text-slate-500">{acc.password}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-5 text-center leading-relaxed">
            This is a demo environment with simulated authentication. No real case
            data or personal information is processed by this application.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
