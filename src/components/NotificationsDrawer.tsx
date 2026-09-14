import { Bell, X } from 'lucide-react';
import type { Suggestion } from '@/domains/suggestions/types';

interface NotificationsDrawerProps {
  suggestions: Suggestion[];
  onDismissAll: () => void;
  onClose: () => void;
}

/** The "Mission Alerts" modal — extracted from AiHomePage so any page's AppHeader bell can open the same real drawer. */
export function NotificationsDrawer({ suggestions, onDismissAll, onClose }: NotificationsDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm space-y-3 rounded-3xl border border-[#523385] bg-[#150D24] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-pink-400" aria-hidden="true" />
            <h3 className="text-sm font-extrabold text-white">Mission Alerts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-500/30 bg-[#23173F] text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {suggestions.length === 0 && <p className="py-4 text-center text-xs text-zinc-400">No alerts right now.</p>}
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="space-y-1 rounded-xl border border-pink-500/40 bg-[#1F1338] p-3 text-xs text-white">
              <div className="flex items-center justify-between font-bold">
                <span>{suggestion.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">{suggestion.reason}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onDismissAll}
          className="w-full rounded-xl border border-purple-500/40 bg-[#23173F] py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#2C1D4F]"
        >
          Mark All Read & Dismiss
        </button>
      </div>
    </div>
  );
}
