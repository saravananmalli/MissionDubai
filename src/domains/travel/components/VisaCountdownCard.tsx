import { Card } from '@/components/Card';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useTravelSummary } from '@/domains/travel/api';
import { daysUntil } from '@/domains/travel/utils';

export function VisaCountdownCard() {
  const tripQuery = useCurrentTrip();
  const summaryQuery = useTravelSummary(tripQuery.data?.id);
  const visa = summaryQuery.data?.visa;

  if (!visa) return null;

  const days = daysUntil(visa.expiry_date);
  const isExpired = days < 0;

  return (
    <Card title="Visa Status">
      <p className={`text-3xl font-bold ${isExpired ? 'text-error' : 'text-text-primary'}`}>
        {isExpired ? 'Expired' : `${days} day${days === 1 ? '' : 's'} left`}
      </p>
      <p className="text-sm text-text-secondary">Expires {visa.expiry_date}</p>
    </Card>
  );
}
