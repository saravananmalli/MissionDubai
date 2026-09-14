import type { ApplicationEvent } from '@/domains/applications/api';

/** Spec §11's chronological journey view — rendered straight from real `application_events` rows, nothing synthesized here. */
export function ApplicationTimeline({ events }: { events: ApplicationEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-text-secondary">No activity yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {events.map((event) => (
        <li key={event.id} className="flex flex-col border-l-2 border-border pl-3 text-sm">
          <span className="font-medium text-text-primary">{new Date(event.occurred_at).toLocaleDateString()}</span>
          <span className="text-text-secondary">{event.description}</span>
        </li>
      ))}
    </ol>
  );
}
