import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, pageCount, totalItems, pageSize, onPageChange }) => {
  if (totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
      <span>
        Showing <span className="font-medium text-ink-800">{start}–{end}</span> of{' '}
        <span className="font-medium text-ink-800">{totalItems}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-2 text-ink-700 font-medium">{page} / {Math.max(pageCount, 1)}</span>
        <button
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="h-7 w-7 flex items-center justify-center rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export function usePagination<T>(items: T[], pageSize = 8) {
  const [page, setPage] = React.useState(1);
  const pageCount = Math.max(Math.ceil(items.length / pageSize), 1);
  React.useEffect(() => { if (page > pageCount) setPage(1); }, [items.length, pageCount, page]);
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);
  return { page, setPage, pageCount, pageItems, totalItems: items.length, pageSize };
}
