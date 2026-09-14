// Hand-maintained until a local Supabase CLI instance exists.
// Regenerate then with: supabase gen types typescript --local > src/lib/database.types.ts
// Keep in sync with supabase/migrations/*.sql — this is the compile-time
// contract for every `.from(...)` call in the app.

export type TripStatus = 'planning' | 'active' | 'completed';
export type FlightDirection = 'outbound' | 'return';
export type VisaType = 'visit' | 'work' | 'student';
export type VisaStatus = 'pending' | 'approved' | 'rejected';
export type ApplicationSource = 'linkedin' | 'job_board' | 'company_site' | 'referral' | 'other' | 'naukrigulf' | 'gulftalent';
export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'withdrawn'
  | 'saved'
  | 'waiting_response'
  | 'response_received'
  | 'hired'
  | 'no_response'
  | 'candidate_rejected'
  | 'on_hold'
  | 'closed';
export type FinalOutcome =
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_declined'
  | 'company_rejected'
  | 'candidate_rejected'
  | 'withdrawn'
  | 'no_response'
  | 'position_closed';
export type ResumeStatus = 'not_submitted' | 'submitted' | 'submitted_with_cover_letter' | 'resume_requested' | 'resume_updated_resubmitted';
export type SalaryStatus = 'provided' | 'will_update_later';
export type VisaSponsorshipStatus = 'yes' | 'no' | 'unsure' | 'need_to_ask';
export type VisitPurpose = 'interview' | 'office_tour' | 'meeting' | 'recruiting_fair' | 'other';
export type InterviewType =
  | 'phone'
  | 'video'
  | 'in_person'
  | 'hr_screening'
  | 'recruiter_call'
  | 'technical'
  | 'design'
  | 'portfolio_review'
  | 'hiring_manager'
  | 'final'
  | 'other';
export type InterviewOutcome = 'pending' | 'very_good' | 'good' | 'ok' | 'bad';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled';
export type RoundResult = 'pending' | 'passed' | 'failed' | 'waiting_for_result';
export type FollowUpStatus = 'pending' | 'completed' | 'skipped';
export type ExpenseCategory = 'meals' | 'transport' | 'clothes' | 'shopping' | 'activities' | 'pg_rent' | 'flight' | 'visa' | 'other';
export type PaymentMethod = 'cash' | 'card' | 'other';
export type VisaCostResponsibility = 'company' | 'employee';
export type OfferStatus = 'pending' | 'accepted' | 'rejected';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; last_daily_summary_shown_on: string | null; created_at: string };
        Insert: {
          id: string;
          display_name?: string | null;
          last_daily_summary_shown_on?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          last_daily_summary_shown_on?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          start_date: string;
          target_end_date: string | null;
          status: TripStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          label: string;
          start_date: string;
          target_end_date?: string | null;
          status?: TripStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trips']['Insert']>;
        Relationships: [];
      };
      flights: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          direction: FlightDirection;
          departure_date: string;
          departure_time: string;
          airline: string;
          flight_number: string;
          cost_aed: number;
          seat_number: string | null;
          booking_reference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          trip_id: string;
          direction?: FlightDirection;
          departure_date: string;
          departure_time: string;
          airline: string;
          flight_number: string;
          cost_aed: number;
          seat_number?: string | null;
          booking_reference?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['flights']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'flights_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      visas: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          visa_type: VisaType;
          fee_aed: number;
          duration_days: number;
          issue_date: string;
          expiry_date: string;
          status: VisaStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          trip_id: string;
          visa_type: VisaType;
          fee_aed: number;
          duration_days?: number;
          issue_date: string;
          expiry_date: string;
          status?: VisaStatus;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['visas']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'visas_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      accommodations: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          name: string;
          address: string;
          check_in_date: string;
          check_out_date: string | null;
          monthly_rent_aed: number;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          trip_id: string;
          name: string;
          address: string;
          check_in_date: string;
          check_out_date?: string | null;
          monthly_rent_aed: number;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['accommodations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'accommodations_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          company_name: string;
          position_title: string;
          location: string | null;
          source: ApplicationSource;
          source_name: string | null;
          status: ApplicationStatus;
          final_outcome: FinalOutcome | null;
          applied_date: string;
          salary_min_aed: number | null;
          salary_max_aed: number | null;
          salary_status: SalaryStatus;
          visa_sponsorship: VisaSponsorshipStatus;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          resume_status: ResumeStatus;
          resume_version: string | null;
          resume_submitted_date: string | null;
          cover_letter_submitted: boolean;
          application_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          trip_id: string;
          company_name: string;
          position_title: string;
          location?: string | null;
          source: ApplicationSource;
          source_name?: string | null;
          status?: ApplicationStatus;
          final_outcome?: FinalOutcome | null;
          applied_date?: string;
          salary_min_aed?: number | null;
          salary_max_aed?: number | null;
          salary_status?: SalaryStatus;
          visa_sponsorship?: VisaSponsorshipStatus;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          resume_status?: ResumeStatus;
          resume_version?: string | null;
          resume_submitted_date?: string | null;
          cover_letter_submitted?: boolean;
          application_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['applications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'applications_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      company_visits: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          visit_date: string;
          visit_time: string;
          purpose: VisitPurpose;
          notes: string | null;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          application_id: string;
          visit_date: string;
          visit_time: string;
          purpose: VisitPurpose;
          notes?: string | null;
          lat?: number | null;
          lng?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['company_visits']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'company_visits_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      visit_photos: {
        Row: {
          id: string;
          user_id: string;
          visit_id: string;
          storage_path: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          visit_id: string;
          storage_path: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['visit_photos']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'visit_photos_visit_id_fkey';
            columns: ['visit_id'];
            isOneToOne: false;
            referencedRelation: 'company_visits';
            referencedColumns: ['id'];
          },
        ];
      };
      interviews: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          interview_date: string;
          interview_time: string;
          type: InterviewType;
          round_number: number;
          interview_status: InterviewStatus;
          round_result: RoundResult;
          interviewer_name: string | null;
          interviewer_role: string | null;
          meeting_link: string | null;
          reminder_24h: boolean;
          reminder_1h: boolean;
          reminder_15min: boolean;
          reminder_daily_until: boolean;
          outcome: InterviewOutcome;
          confidence_rating: number | null;
          feedback_notes: string | null;
          prep_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          application_id: string;
          interview_date: string;
          interview_time: string;
          type: InterviewType;
          round_number?: number;
          interview_status?: InterviewStatus;
          round_result?: RoundResult;
          interviewer_name?: string | null;
          interviewer_role?: string | null;
          meeting_link?: string | null;
          reminder_24h?: boolean;
          reminder_1h?: boolean;
          reminder_15min?: boolean;
          reminder_daily_until?: boolean;
          outcome?: InterviewOutcome;
          confidence_rating?: number | null;
          feedback_notes?: string | null;
          prep_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['interviews']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'interviews_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      budgets: {
        Row: { id: string; user_id: string; trip_id: string; amount_aed: number; created_at: string; updated_at: string };
        Insert: {
          id?: string;
          user_id?: string;
          trip_id: string;
          amount_aed: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'budgets_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: true;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string;
          category: ExpenseCategory;
          amount_aed: number;
          expense_date: string;
          description: string | null;
          receipt_photo_path: string | null;
          location: string | null;
          payment_method: PaymentMethod | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          trip_id: string;
          category: ExpenseCategory;
          amount_aed: number;
          expense_date: string;
          description?: string | null;
          receipt_photo_path?: string | null;
          location?: string | null;
          payment_method?: PaymentMethod | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'expenses_trip_id_fkey';
            columns: ['trip_id'];
            isOneToOne: false;
            referencedRelation: 'trips';
            referencedColumns: ['id'];
          },
        ];
      };
      offers: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          salary_aed: number;
          bonus_percent: number | null;
          leave_days: number | null;
          visa_sponsorship: boolean;
          visa_cost_responsibility: VisaCostResponsibility | null;
          location: string | null;
          growth_rating: number | null;
          status: OfferStatus;
          received_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          application_id: string;
          salary_aed: number;
          bonus_percent?: number | null;
          leave_days?: number | null;
          visa_sponsorship?: boolean;
          visa_cost_responsibility?: VisaCostResponsibility | null;
          location?: string | null;
          growth_rating?: number | null;
          status?: OfferStatus;
          received_date?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['offers']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'offers_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: true;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      application_events: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          event_type: string;
          description: string;
          metadata: Record<string, unknown> | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          application_id: string;
          event_type: string;
          description: string;
          metadata?: Record<string, unknown> | null;
          occurred_at?: string;
        };
        Update: Partial<Database['public']['Tables']['application_events']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'application_events_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      follow_ups: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          due_date: string;
          status: FollowUpStatus;
          notes: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          application_id: string;
          due_date: string;
          status?: FollowUpStatus;
          notes?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['follow_ups']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'follow_ups_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
        ];
      };
      suggestion_dismissals: {
        Row: { id: string; user_id: string; suggestion_id: string; dismissed_at: string };
        Insert: { id?: string; user_id?: string; suggestion_id: string; dismissed_at?: string };
        Update: Partial<Database['public']['Tables']['suggestion_dismissals']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
