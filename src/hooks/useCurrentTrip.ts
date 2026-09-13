import { useQuery } from '@tanstack/react-query';
import { fetchCurrentTrip } from '@/lib/trips';

export function useCurrentTrip() {
  return useQuery({
    queryKey: ['trips', 'current'],
    queryFn: fetchCurrentTrip,
  });
}
