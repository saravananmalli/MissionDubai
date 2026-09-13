import type { FlowDefinition } from '@/chat-flow/types';
import { nonNegativeAmount, requiredText } from '@/chat-flow/validators';
import { submitTravelFlow } from '@/domains/travel/api';
import type { TravelFlowAnswers } from '@/domains/travel/types';

export const travelFlow: FlowDefinition<TravelFlowAnswers> = {
  id: 'travel-visa-pg',
  onComplete: submitTravelFlow,
  steps: [
    {
      id: 'departureDate',
      type: 'date',
      prompt: "Let's start your journey! When do you depart?",
    },
    {
      id: 'departureTimePeriod',
      type: 'quick-tap',
      prompt: 'Departure time?',
      options: [
        { label: 'Morning', value: 'morning' },
        { label: 'Afternoon', value: 'afternoon' },
        { label: 'Evening', value: 'evening' },
        { label: 'Custom', value: 'custom' },
      ],
      next: (value) => (value === 'custom' ? 'departureTimeCustom' : 'airline'),
    },
    {
      id: 'departureTimeCustom',
      type: 'time',
      prompt: 'Exact departure time?',
      validate: requiredText('a time'),
    },
    {
      id: 'airline',
      type: 'quick-tap',
      prompt: 'Which airline?',
      options: [
        { label: 'Emirates', value: 'Emirates' },
        { label: 'Flydubai', value: 'Flydubai' },
        { label: 'Etihad', value: 'Etihad' },
        { label: 'Other', value: 'other' },
      ],
      next: (value) => (value === 'other' ? 'airlineOther' : 'flightNumber'),
    },
    {
      id: 'airlineOther',
      type: 'text',
      prompt: 'Airline name?',
      validate: requiredText('the airline name'),
    },
    {
      id: 'flightNumber',
      type: 'text',
      prompt: 'Flight number?',
      validate: requiredText('the flight number'),
    },
    {
      id: 'flightCostAed',
      type: 'number',
      prompt: 'Ticket cost (AED)?',
      validate: nonNegativeAmount,
    },
    {
      id: 'visaType',
      type: 'quick-tap',
      prompt: 'Now visa information! Visa type?',
      options: [
        { label: 'Visit Visa', value: 'visit' },
        { label: 'Work Visa', value: 'work' },
        { label: 'Student Visa', value: 'student' },
      ],
    },
    {
      id: 'visaFeeAed',
      type: 'number',
      prompt: 'Visa fee (AED)?',
      validate: nonNegativeAmount,
    },
    {
      id: 'pgName',
      type: 'text',
      prompt: 'Finally, PG details! PG name?',
      validate: requiredText('the PG name'),
    },
    {
      id: 'pgAddress',
      type: 'text',
      prompt: 'Location/Address?',
      validate: requiredText('the address'),
    },
    {
      id: 'pgMonthlyRentAed',
      type: 'number',
      prompt: 'Monthly rent (AED)?',
      validate: nonNegativeAmount,
    },
  ],
};
