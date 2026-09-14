import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Smoothly scrolls to the element matching the URL hash once the page's data is `ready` — lets an agent card's second button jump straight to a specific section instead of just landing on top of the page. */
export function useScrollToHash(ready: boolean) {
  const location = useLocation();
  useEffect(() => {
    if (!ready || !location.hash) return;
    const element = document.getElementById(location.hash.slice(1));
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [ready, location.hash]);
}
