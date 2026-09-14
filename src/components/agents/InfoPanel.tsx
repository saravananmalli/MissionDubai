import type { ReactNode } from 'react';

export function InfoPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-purple-500/20 bg-[#110A21] p-2.5 text-xs ${className}`}>{children}</div>;
}

export function InfoPanelEmpty({ children }: { children: ReactNode }) {
  return <InfoPanel className="text-center text-zinc-400">{children}</InfoPanel>;
}
