import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, Plane, Wallet, X, type LucideIcon } from 'lucide-react';

const OPTIONS: { label: string; to: string; icon: LucideIcon }[] = [
  { label: 'Log Expense', to: '/expenses', icon: Wallet },
  { label: 'Add Application', to: '/applications', icon: Briefcase },
  { label: 'Schedule Interview', to: '/interviews', icon: Calendar },
  { label: 'Log Travel / Visa / PG', to: '/travel', icon: Plane },
];

/**
 * The center nav "Action" button's launcher. Phase A: routes to the page
 * hosting each real, existing ChatFlow — no AI parsing yet (that's Phase B).
 */
export function QuickAddSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Quick add">
      <div className="w-full max-w-md rounded-t-lg border border-border bg-surface-elevated p-4 pb-8 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Quick Add</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface-2/70 p-4 text-center transition-transform active:scale-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cta">
                <Icon size={18} className="text-white" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-text-primary">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
