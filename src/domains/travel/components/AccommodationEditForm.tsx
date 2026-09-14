import { useState, type FormEvent } from 'react';
import { Card } from '@/components/Card';
import { PrimaryButton, TertiaryButton } from '@/components/Button';
import { useSubmitAccommodationEdit, type Accommodation } from '@/domains/travel/api';

const INPUT_CLASS = 'min-h-11 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary';
const LABEL_CLASS = 'flex flex-col gap-1 text-sm text-text-secondary';

/** Plain controlled form, not a chat-flow wizard — same rationale as ApplicationEditForm: "add via conversation" and "edit via structured UI" are two distinct modes. */
export function AccommodationEditForm({
  accommodation,
  tripId,
  onSaved,
  onCancel,
}: {
  accommodation: Accommodation;
  tripId: string | undefined;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(accommodation.name);
  const [address, setAddress] = useState(accommodation.address);
  const [checkInDate, setCheckInDate] = useState(accommodation.check_in_date);
  const [checkOutDate, setCheckOutDate] = useState(accommodation.check_out_date ?? '');
  const [monthlyRentAed, setMonthlyRentAed] = useState(accommodation.monthly_rent_aed.toString());

  const mutation = useSubmitAccommodationEdit(tripId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        accommodationId: accommodation.id,
        answers: {
          name,
          address,
          checkInDate,
          checkOutDate: checkOutDate || null,
          monthlyRentAed: Number(monthlyRentAed),
        },
      },
      { onSuccess: onSaved },
    );
  }

  return (
    <Card title="Edit PG Accommodation">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className={LABEL_CLASS} htmlFor="edit-pg-name">
          Name
          <input id="edit-pg-name" className={INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className={LABEL_CLASS} htmlFor="edit-pg-address">
          Address
          <input id="edit-pg-address" className={INPUT_CLASS} value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>
        <div className="flex gap-3">
          <label className={LABEL_CLASS} htmlFor="edit-pg-checkin">
            Check-in date
            <input
              id="edit-pg-checkin"
              type="date"
              className={INPUT_CLASS}
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              required
            />
          </label>
          <label className={LABEL_CLASS} htmlFor="edit-pg-checkout">
            Check-out date (optional)
            <input id="edit-pg-checkout" type="date" className={INPUT_CLASS} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
          </label>
        </div>
        <label className={LABEL_CLASS} htmlFor="edit-pg-rent">
          Monthly rent (AED)
          <input
            id="edit-pg-rent"
            type="number"
            className={INPUT_CLASS}
            value={monthlyRentAed}
            onChange={(e) => setMonthlyRentAed(e.target.value)}
            required
          />
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
