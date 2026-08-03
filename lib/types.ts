// Row types matching supabase/schema.sql

export type Profile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  school: string | null;
  major: string | null;
  minor: string | null;
  grad_year: number | null;
  grad_month: number | null;
  standing: string | null;
  gpa: string | null;
  city: string | null;
  phone: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  target_industries: string[];
  clubs: string | null;
  professional_summary: string | null;
  personal_interests: string | null;
  fun_facts: string | null;
  tier: string | null;
  is_admin: boolean;
  majors: string[];
  minors: string[];
  certificates: string[];
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  location: string | null;
  industry: string | null;
  how_met: string | null;
  connection_strength: number;
  relationship: string | null;
  shared_interests: string | null;
  alma_mater: string | null;
  notes: string | null;
  tags: string[];
  last_contacted: string | null;
  followup_interval_days: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Application = {
  id: string;
  user_id: string;
  company: string;
  position: string | null;
  industry: string;
  sector: string | null;
  tier: string | null;
  location: string | null;
  work_type: string | null;
  employment_type: string;
  season: string | null;
  hours_per_week: string | null;
  pay: string | null;
  status: string;
  outcome: string;
  priority: string;
  deadline: string | null;
  date_applied: string | null;
  application_link: string | null;
  posting_link: string | null;
  referral_contact_id: string | null;
  networked: boolean;
  resume_status: string;
  cover_letter_status: string;
  materials_needed: string | null;
  missing_items: string | null;
  interview_notes: string | null;
  open_questions: string | null;
  next_step: string | null;
  next_step_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  location_type: string | null; // 'virtual' | 'in_person'
  meeting_link: string | null;
  contact_id: string | null;
  application_id: string | null;
  completed: boolean;
  source: string;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  user_id: string;
  name: string;
  doc_type: string;
  industry_target: string | null;
  file_path: string | null;
  content_text: string | null;
  notes: string | null;
  ai_feedback: {
    overview?: string;
    strengths?: string[];
    improvements?: string[];
    verdict?: string;
  } | null;
  ai_feedback_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Experience = {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  role_type: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location: string | null;
  description: string | null;
  bullets: string | null;
  skills: string[];
  link: string | null;
  created_at: string;
  updated_at: string;
};

export type Story = {
  id: string;
  user_id: string;
  question: string;
  category: string;
  answer: string | null;
  notes: string | null;
  strength: string;
  tags: string[];
  firm: string | null;
  created_at: string;
  updated_at: string;
};

export type Opportunity = {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  industry: string | null;
  location: string | null;
  link: string | null;
  source: string | null;
  deadline: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Plan = {
  id: string;
  user_id: string;
  target_industry: string | null;
  grad_year: number | null;
  grad_month: number | null;
  standing: string | null;
  plan_markdown: string | null;
  generated_by: string;
  created_at: string;
  updated_at: string;
};
