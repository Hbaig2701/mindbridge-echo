// Shared domain types for MindBridge Echo.
// Kept hand-written (rather than generated) so the pilot stays readable.

export type CaregiverType = 'family' | 'professional';

export type SessionMode = 'care_recipient' | 'caregiver';

export type MessageRole = 'user' | 'assistant' | 'system';

export type InputChannel = 'voice' | 'text';

export type MemoryKind = 'worked' | 'didnt_work' | 'caregiver_note';

export type FlagType = 'safety' | 'uncertainty' | 'medical';

export type DistressType =
  | 'none'
  | 'agitation'
  | 'repetition_loop'
  | 'confusion'
  | 'distress_other';

export type SafetyType =
  | 'none'
  | 'medical'
  | 'self_harm'
  | 'unknown_command'
  | 'other';

// ---- Life story profile shape (profiles.life_story jsonb) ----

export interface FamilyMember {
  name: string;
  relationship: string;
  notes: string;
}

export interface LifeStory {
  background: { birthplace: string; upbringing: string; languages: string[] };
  family: FamilyMember[];
  work: { occupation: string; career_notes: string };
  interests: string[];
  music: string[];
  comfort_topics: string[];
  key_people: string[];
  important_places: string[];
  routines: string[];
  communication_notes: string;
}

export function emptyLifeStory(): LifeStory {
  return {
    background: { birthplace: '', upbringing: '', languages: [] },
    family: [],
    work: { occupation: '', career_notes: '' },
    interests: [],
    music: [],
    comfort_topics: [],
    key_people: [],
    important_places: [],
    routines: [],
    communication_notes: '',
  };
}

// ---- Row types (mirror supabase/migrations/0001_init.sql) ----

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  life_story: LifeStory;
  known_triggers: string[];
  known_calming_strategies: string[];
  is_fictional: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  profile_id: string;
  mode: SessionMode;
  started_at: string;
  ended_at: string | null;
  respite_seconds: number;
  test_scenario_id: string | null;
}

export interface Message {
  id: string;
  user_id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  input_channel: InputChannel;
  created_at: string;
}

export interface Assessment {
  id: string;
  user_id: string;
  message_id: string;
  distress: boolean;
  distress_type: DistressType;
  safety_concern: boolean;
  safety_type: SafetyType;
  uncertainty: boolean;
  confidence: number;
  raw: AssessmentResult | null;
}

export interface MemoryEntry {
  id: string;
  user_id: string;
  profile_id: string;
  session_id: string | null;
  kind: MemoryKind;
  content: string;
  score: number | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  session_id: string;
  score: number;
  verbal_note: string | null;
  created_at: string;
}

export interface Flag {
  id: string;
  user_id: string;
  session_id: string | null;
  message_id: string | null;
  type: FlagType;
  reason: string;
  resolved: boolean;
  created_at: string;
}

export interface ProgressLog {
  id: string;
  user_id: string;
  profile_id: string;
  session_id: string | null;
  logged_at: string;
  source: 'caregiver' | 'auto';
  agitation_episode: boolean;
  time_to_calm_min: number | null;
  respite_min: number | null;
  companion_helpful: number | null;
  note: string | null;
}

export interface Consent {
  user_id: string;
  caregiver_type: CaregiverType | null;
  agreed: boolean;
  version: string;
  agreed_at: string;
}

// ---- Service payloads ----

// Output of AssessmentService.assessTurn() — matches prompt 6.2 strict JSON.
export interface AssessmentResult {
  distress: boolean;
  distress_type: DistressType;
  safety_concern: boolean;
  safety_type: SafetyType;
  uncertainty: boolean;
  confidence: number;
}

export interface TurnFlag {
  type: FlagType;
  reason: string;
}

// Response of /api/message.
export interface MessageTurnResponse {
  reply: string;
  assessment: AssessmentResult;
  flags: TurnFlag[];
  handoff: boolean; // true when the companion stepped back for a human
}
