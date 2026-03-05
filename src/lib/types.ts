export type BlockType = "task" | "event" | "call" | "reminder" | "meeting";
export type BlockPriority = "low" | "medium" | "high" | "critical";
export type BlockStatus = "pending" | "in_progress" | "completed" | "late" | "missed";
export type StakeStatus = "none" | "staked" | "returned" | "slashed";
export type ScheduledBy = "user" | "ai";
export type FollowupPlatform = "telegram" | "x" | "discord";
export type AccountabilityType = "callout" | "redemption";
export type BriefingType = "morning" | "eod";

export interface User {
  id: string;
  wallet_address: string | null;
  x_handle: string | null;
  telegram_handle: string | null;
  discord_handle: string | null;
  xp_total: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  streak_shields: number;
  sol_won_total: number;
  sol_lost_total: number;
  completion_rate: number;
  avg_quality_score: number;
  unlocked_themes: string[];
  active_theme: string;
  morning_briefing_time: string;
  eod_wrap_time: string;
  timezone: string;
  x_callout_approved: boolean;
  gcal_access_token: string | null;
  gcal_refresh_token: string | null;
  gcal_token_expiry: string | null;
  gcal_calendar_id: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: BlockType;
  priority: BlockPriority;
  status: BlockStatus;
  start_time: string;
  end_time: string | null;
  all_day: boolean;

  // Staking
  sol_stake_amount: number;
  sol_stake_tx: string | null;
  sol_stake_status: StakeStatus;
  stake_deadline: string | null;

  // AI Execution
  ai_executable: boolean;
  ai_output: string | null;
  ai_output_type: string | null;
  ai_confidence_score: number | null;
  ai_executed_at: string | null;

  // Task Review
  review_file_url: string | null;
  review_submission_text: string | null;
  quality_score: number | null;
  quality_feedback: string | null;
  reviewed_at: string | null;
  xp_awarded: number;

  // Follow-up
  followup_message: string | null;
  followup_platform: FollowupPlatform | null;
  followup_sent: boolean;
  followup_sent_at: string | null;
  fireflies_transcript_id: string | null;
  fireflies_transcript_summary: string | null;
  call_context_notes: string | null;

  // Scheduling meta
  scheduled_by: ScheduledBy;
  rescheduled_from: string | null;
  reschedule_reason: string | null;
  gcal_event_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface AccountabilityLog {
  id: string;
  user_id: string;
  block_id: string;
  type: AccountabilityType;
  x_post_url: string | null;
  x_post_content: string | null;
  sol_lost: number | null;
  days_late: number | null;
  created_at: string;
}

export interface XPEvent {
  id: string;
  user_id: string;
  block_id: string | null;
  event_type: string;
  xp_amount: number;
  multiplier: number;
  created_at: string;
}

export interface DailyBriefing {
  id: string;
  user_id: string;
  type: BriefingType;
  content: string;
  day_date: string;
  sol_at_risk: number | null;
  tasks_completed: number | null;
  tasks_missed: number | null;
  xp_earned: number | null;
  streak_status: string | null;
  created_at: string;
}

export interface RescheduleLog {
  id: string;
  user_id: string;
  block_id: string;
  old_start_time: string;
  new_start_time: string;
  reason: string | null;
  triggered_by_block_id: string | null;
  created_at: string;
}

export interface SolPriceCache {
  id: string;
  price_usd: number;
  fetched_at: string;
}

export interface JarvisNotification {
  id: string;
  user_id: string;
  message: string;
  type: "schedule" | "reschedule" | "complete" | "reminder" | "briefing";
  related_block_id: string | null;
  dismissed: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: unknown; // JSONB — can be string or content blocks array
  created_at: string;
}
