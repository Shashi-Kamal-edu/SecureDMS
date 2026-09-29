import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Permission } from '../utils/permissions';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Primitives';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

export const PermissionRoute: React.FC<{ permission: Permission; children: React.ReactNode }> = ({ permission, children }) => {
  const { can } = useAuth();
  const navigate = useNavigate();
  if (!can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24">
        <div className="h-14 w-14 rounded-full bg-alert-50 flex items-center justify-center text-alert-500 mb-4">
          <ShieldAlert size={26} />
        </div>
        <h2 className="text-lg font-semibold text-ink-900">Access restricted</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Your current role does not have permission to view this page. Contact an administrator if you believe this is incorrect.
        </p>
        <Button className="mt-5" variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }
  return <>{children}</>;
};
