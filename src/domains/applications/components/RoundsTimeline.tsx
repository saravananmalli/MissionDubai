import { Link } from 'react-router-dom';
import { Chip } from '@/components/Chip';
import { formatEnumLabel } from '@/domains/applications/utils';
import type { Interview } from '@/domains/interviews/api';

function roundResultTone(result: Interview['round_result']): 'neutral' | 'success' | 'error' | 'warning' {
  if (result === 'passed') return 'success';
  if (result === 'failed') return 'error';
  if (result === 'waiting_for_result') return 'warning';
  return 'neutral';
}

/** Vertical stepper matching spec §4's "Round 1 -> Round 2 -> ... -> Final" example. No cap on how many rounds render. */
export function RoundsTimeline({ interviews }: { interviews: Interview[] }) {
  if (interviews.length === 0) {
    return <p className="text-sm text-text-secondary">No interview rounds yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {interviews.map((interview) => (
        <li key={interview.id} className="flex flex-col gap-1 border-l-2 border-border pl-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to={`/interviews/${interview.id}`} className="font-medium text-text-primary underline">
              Round {interview.round_number} — {formatEnumLabel(interview.type)}
            </Link>
            <Chip tone={roundResultTone(interview.round_result)}>{formatEnumLabel(interview.round_result)}</Chip>
          </div>
          <p className="text-sm text-text-secondary">
            {interview.interview_date} · {formatEnumLabel(interview.interview_status)}
          </p>
        </li>
      ))}
    </ol>
  );
}
