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

export type AccommodationEditAnswers = Partial<{
  name: string;
  address: string;
  checkInDate: string;
  checkOutDate: string | null;
  monthlyRentAed: number;
}>;

export type VisaEditAnswers = Partial<{
  visaType: VisaTypeChoice;
  feeAed: number;
  durationDays: number;
  issueDate: string;
  expiryDate: string;
  status: 'pending' | 'approved' | 'rejected';
}>;
