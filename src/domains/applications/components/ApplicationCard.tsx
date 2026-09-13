import { useMemo, useState } from 'react';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { SecondaryButton } from '@/components/Button';
import { createVisitFlow } from '@/domains/applications/visitFlowConfig';
import type { ApplicationWithVisits } from '@/domains/applications/api';

export function ApplicationCard({
  application,
  onVisitAdded,
}: {
  application: ApplicationWithVisits;
  onVisitAdded: () => void;
}) {
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const visitFlow = useMemo(() => createVisitFlow(application.id), [application.id]);

  return (
    <Card title={application.company_name}>
      <p className="text-base font-medium text-text-primary">{application.position_title}</p>
      <p className="text-sm text-text-secondary">
        Applied {application.applied_date} · {application.status}
      </p>

      <div className="flex flex-col gap-2 text-sm text-text-secondary">
        {application.salary_status === 'will_update_later' ? (
          <Chip tone="warning">⚠️ Salary: (Will update later)</Chip>
        ) : (
          <p>
            Salary: {application.salary_min_aed?.toLocaleString()}–{application.salary_max_aed?.toLocaleString()} AED
          </p>
        )}
        {application.visa_sponsorship === 'need_to_ask' ? (
          <Chip tone="warning">⚠️ Visa sponsorship: (Need to ask)</Chip>
        ) : (
          <p className="capitalize">Visa sponsorship: {application.visa_sponsorship}</p>
        )}
        {!application.contact_name ? (
          <Chip tone="warning">⚠️ Contact: (Not added)</Chip>
        ) : (
          <p>Contact: {application.contact_name}</p>
        )}
      </div>

      {application.visits.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border pt-2 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">Company Visits</p>
          {application.visits.map((visit) => (
            <p key={visit.id}>
              {visit.visit_date} · {visit.purpose.replace('_', ' ')}
              {visit.photos.length > 0 && ` · ${visit.photos.length} photo${visit.photos.length === 1 ? '' : 's'}`}
            </p>
          ))}
        </div>
      )}

      {isAddingVisit ? (
        <ChatFlow
          flow={visitFlow}
          onFinished={() => {
            setIsAddingVisit(false);
            onVisitAdded();
          }}
        />
      ) : (
        <SecondaryButton type="button" onClick={() => setIsAddingVisit(true)} className="self-start">
          + Add Visit
        </SecondaryButton>
      )}
    </Card>
  );
}
