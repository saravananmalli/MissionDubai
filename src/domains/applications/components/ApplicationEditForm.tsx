import { useState, type FormEvent } from 'react';
import { Card } from '@/components/Card';
import { PrimaryButton, TertiaryButton } from '@/components/Button';
import { useSubmitApplicationEdit, type Application } from '@/domains/applications/api';
import type { YesNoUnsureChoice } from '@/domains/applications/types';

const INPUT_CLASS = 'min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary';
const LABEL_CLASS = 'flex flex-col gap-1 text-sm text-text-secondary';

/**
 * Plain controlled form, not a chat-flow wizard: spec §15 treats "add via
 * conversation" and "edit via structured UI" as two distinct, intentional
 * modes, and useChatFlow has no "seed with existing answers" support to
 * extend cleanly for editing.
 */
export function ApplicationEditForm({
  application,
  tripId,
  onSaved,
  onCancel,
}: {
  application: Application;
  tripId: string | undefined;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [companyName, setCompanyName] = useState(application.company_name);
  const [positionTitle, setPositionTitle] = useState(application.position_title);
  const [location, setLocation] = useState(application.location ?? '');
  const [applicationUrl, setApplicationUrl] = useState(application.application_url ?? '');
  const [salaryMinAed, setSalaryMinAed] = useState(application.salary_min_aed?.toString() ?? '');
  const [salaryMaxAed, setSalaryMaxAed] = useState(application.salary_max_aed?.toString() ?? '');
  const [visaSponsorship, setVisaSponsorship] = useState<YesNoUnsureChoice>(application.visa_sponsorship);
  const [contactName, setContactName] = useState(application.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(application.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState(application.contact_phone ?? '');
  const [notes, setNotes] = useState(application.notes ?? '');

  const mutation = useSubmitApplicationEdit(tripId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        applicationId: application.id,
        answers: {
          companyName,
          positionTitle,
          location,
          applicationUrl,
          salaryMinAed: salaryMinAed ? Number(salaryMinAed) : null,
          salaryMaxAed: salaryMaxAed ? Number(salaryMaxAed) : null,
          visaSponsorship,
          contactName,
          contactEmail,
          contactPhone,
          notes,
        },
      },
      { onSuccess: onSaved },
    );
  }

  return (
    <Card title="Edit Application">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className={LABEL_CLASS} htmlFor="edit-company-name">
          Company name
          <input id="edit-company-name" className={INPUT_CLASS} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-position-title">
          Position title
          <input id="edit-position-title" className={INPUT_CLASS} value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} required />
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-location">
          Location
          <input id="edit-location" className={INPUT_CLASS} value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-application-url">
          Application URL
          <input id="edit-application-url" className={INPUT_CLASS} value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} />
        </label>
        <div className="flex gap-3">
          <label className={LABEL_CLASS} htmlFor="edit-salary-min">
            Salary min (AED)
            <input id="edit-salary-min" type="number" className={INPUT_CLASS} value={salaryMinAed} onChange={(e) => setSalaryMinAed(e.target.value)} />
          </label>
          <label className={LABEL_CLASS} htmlFor="edit-salary-max">
            Salary max (AED)
            <input id="edit-salary-max" type="number" className={INPUT_CLASS} value={salaryMaxAed} onChange={(e) => setSalaryMaxAed(e.target.value)} />
          </label>
        </div>
        <label className={LABEL_CLASS} htmlFor="edit-visa-sponsorship">
          Visa sponsorship
          <select
            id="edit-visa-sponsorship"
            className={INPUT_CLASS}
            value={visaSponsorship}
            onChange={(e) => setVisaSponsorship(e.target.value as YesNoUnsureChoice)}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="unsure">Unsure</option>
            <option value="need_to_ask">Need to ask</option>
          </select>
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-contact-name">
          Contact person name
          <input id="edit-contact-name" className={INPUT_CLASS} value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-contact-email">
          Contact email
          <input id="edit-contact-email" type="email" className={INPUT_CLASS} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-contact-phone">
          Contact phone
          <input id="edit-contact-phone" className={INPUT_CLASS} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-notes">
          Notes
          <textarea id="edit-notes" className={INPUT_CLASS} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

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
