import { useState, type FormEvent } from 'react';
import { Card } from '@/components/Card';
import { PrimaryButton, TertiaryButton } from '@/components/Button';
import { useSubmitVisaEdit, type Visa } from '@/domains/travel/api';
import type { VisaTypeChoice } from '@/domains/travel/types';
import type { VisaStatus } from '@/lib/database.types';

const INPUT_CLASS = 'min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary';
const LABEL_CLASS = 'flex flex-col gap-1 text-sm text-text-secondary';

/** Plain controlled form, not a chat-flow wizard — same rationale as ApplicationEditForm: "add via conversation" and "edit via structured UI" are two distinct modes. */
export function VisaEditForm({
  visa,
  tripId,
  onSaved,
  onCancel,
}: {
  visa: Visa;
  tripId: string | undefined;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [visaType, setVisaType] = useState<VisaTypeChoice>(visa.visa_type);
  const [feeAed, setFeeAed] = useState(visa.fee_aed.toString());
  const [durationDays, setDurationDays] = useState(visa.duration_days.toString());
  const [issueDate, setIssueDate] = useState(visa.issue_date);
  const [expiryDate, setExpiryDate] = useState(visa.expiry_date);
  const [status, setStatus] = useState<VisaStatus>(visa.status);

  const mutation = useSubmitVisaEdit(tripId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        visaId: visa.id,
        answers: {
          visaType,
          feeAed: Number(feeAed),
          durationDays: Number(durationDays),
          issueDate,
          expiryDate,
          status,
        },
      },
      { onSuccess: onSaved },
    );
  }

  return (
    <Card title="Edit Visa">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className={LABEL_CLASS} htmlFor="edit-visa-type">
          Visa type
          <select id="edit-visa-type" className={INPUT_CLASS} value={visaType} onChange={(e) => setVisaType(e.target.value as VisaTypeChoice)}>
            <option value="visit">Visit</option>
            <option value="work">Work</option>
            <option value="student">Student</option>
          </select>
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-visa-status">
          Status
          <select id="edit-visa-status" className={INPUT_CLASS} value={status} onChange={(e) => setStatus(e.target.value as VisaStatus)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-visa-fee">
          Fee (AED)
          <input id="edit-visa-fee" type="number" className={INPUT_CLASS} value={feeAed} onChange={(e) => setFeeAed(e.target.value)} required />
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-visa-duration">
          Duration (days)
          <input
            id="edit-visa-duration"
            type="number"
            className={INPUT_CLASS}
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            required
          />
        </label>
        <div className="flex gap-3">
          <label className={LABEL_CLASS} htmlFor="edit-visa-issue">
            Issue date
            <input
              id="edit-visa-issue"
              type="date"
              className={INPUT_CLASS}
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </label>
          <label className={LABEL_CLASS} htmlFor="edit-visa-expiry">
            Expiry date
            <input
              id="edit-visa-expiry"
              type="date"
              className={INPUT_CLASS}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              required
            />
          </label>
        </div>

        {mutation.isError && <p role="alert" className="text-sm text-error">Couldn't save your changes. Try again.</p>}

        <div className="flex gap-2">
          <PrimaryButton type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </PrimaryButton>
          <TertiaryButton type="button" onClick={onCancel}>
            Cancel
          </TertiaryButton>
        </div>
      </form>
    </Card>
  );
}
