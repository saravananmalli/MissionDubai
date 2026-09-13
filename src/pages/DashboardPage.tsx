import { useAuth } from '@/app/auth-context';
import { VisaCountdownCard } from '@/domains/travel/components/VisaCountdownCard';
import { SecondaryButton } from '@/components/Button';

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <main className="flex flex-col gap-5 px-4 py-6">
      <div>
        <span aria-hidden="true" className="mb-2 block h-1 w-8 rounded-full bg-cta" />
        <h1 className="font-sans text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">Signed in as {user?.email}</p>
      </div>

      <VisaCountdownCard />

      <SecondaryButton type="button" onClick={() => void signOut()} className="mt-2 self-start">
        Log out
      </SecondaryButton>
    </main>
  );
}
