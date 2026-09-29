import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '../components/ui/Primitives';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <FileQuestion size={26} />
      </div>
      <h2 className="text-lg font-semibold text-ink-900">Page not found</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Button className="mt-5" variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
    </div>
  );
};

export default NotFoundPage;
