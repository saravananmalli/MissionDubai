export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'custom';
export type AirlineChoice = 'Emirates' | 'Flydubai' | 'Etihad' | 'other';
export type VisaTypeChoice = 'visit' | 'work' | 'student';

export interface TravelFlowAnswers extends Record<string, unknown> {
  departureDate: string;
  departureTimePeriod: TimePeriod;
  departureTimeCustom?: string;
  airline: AirlineChoice;
  airlineOther?: string;
  flightNumber: string;
  flightCostAed: number;
  visaType: VisaTypeChoice;
  visaFeeAed: number;
  pgName: string;
  pgAddress: string;
  pgMonthlyRentAed: number;
}
