-- CloudKing OS — Initial Schema Migration
-- All 7 core tables + indexes + RLS + triggers

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE,
  email text UNIQUE,
  x_handle text,
  telegram_handle text,
  discord_handle text,
  xp_total integer DEFAULT 0,
  level integer DEFAULT 1,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  streak_shields integer DEFAULT 0,
  sol_won_total decimal DEFAULT 0,
  sol_lost_total decimal DEFAULT 0,
  completion_rate decimal DEFAULT 0,
  avg_quality_score decimal DEFAULT 0,
  unlocked_themes text[] DEFAULT ARRAY['default'],
  active_theme text DEFAULT 'default',
  morning_briefing_time time DEFAULT '09:00',
  eod_wrap_time time DEFAULT '21:00',
  timezone text DEFAULT 'America/New_York',
  x_callout_approved boolean DEFAULT false,
  -- GCal tokens (Phase 1: stored in columns; Phase 2: migrate to Supabase Vault)
  gcal_access_token text,
  gcal_refresh_token text,
  gcal_token_expiry timestamptz,
  gcal_calendar_id text,
  created_at timestamptz DEFAULT now()
);

-- Blocks table (tasks, events, calls, reminders, meetings)
CREATE TABLE blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('task', 'event', 'call', 'reminder', 'meeting')),
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'late', 'missed')) DEFAULT 'pending',
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  all_day boolean DEFAULT false,

  -- Staking
  sol_stake_amount decimal DEFAULT 0,
  sol_stake_tx text,
  sol_stake_status text CHECK (sol_stake_status IN ('none', 'staked', 'returned', 'slashed')) DEFAULT 'none',
  stake_deadline timestamptz,

  -- AI Execution
  ai_executable boolean DEFAULT false,
  ai_output text,
  ai_output_type text,
  ai_confidence_score decimal,
  ai_executed_at timestamptz,

  -- Task Review
  review_file_url text,
  review_submission_text text,
  quality_score integer,
  quality_feedback text,
  reviewed_at timestamptz,
  xp_awarded integer DEFAULT 0,

  -- Follow-up (calls/meetings)
  followup_message text,
  followup_platform text CHECK (followup_platform IN ('telegram', 'x', 'discord')),
  followup_sent boolean DEFAULT false,
  followup_sent_at timestamptz,
  fireflies_transcript_id text,
  fireflies_transcript_summary text,
  call_context_notes text,

  -- Scheduling meta
  scheduled_by text CHECK (scheduled_by IN ('user', 'ai')) DEFAULT 'user',
  rescheduled_from timestamptz,
  reschedule_reason text,
  gcal_event_id text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Accountability log (X callouts and redemptions)
CREATE TABLE accountability_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  block_id uuid REFERENCES blocks(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('callout', 'redemption')),
  x_post_url text,
  x_post_content text,
  sol_lost decimal,
  days_late integer,
  created_at timestamptz DEFAULT now()
);

-- XP events log
CREATE TABLE xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  block_id uuid REFERENCES blocks(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  xp_amount integer NOT NULL,
  multiplier decimal DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

-- Daily briefings (morning + EOD)
CREATE TABLE daily_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('morning', 'eod')),
  content text NOT NULL,
  day_date date NOT NULL,
  sol_at_risk decimal,
  tasks_completed integer,
  tasks_missed integer,
  xp_earned integer,
  streak_status text,
  created_at timestamptz DEFAULT now()
);

-- Reschedule log (tracks every AI or manual reschedule)
CREATE TABLE reschedule_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  block_id uuid REFERENCES blocks(id) ON DELETE SET NULL,
  old_start_time timestamptz NOT NULL,
  new_start_time timestamptz NOT NULL,
  reason text,
  triggered_by_block_id uuid REFERENCES blocks(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- SOL price cache (CoinGecko, 5-min TTL)
CREATE TABLE sol_price_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_usd decimal NOT NULL,
  fetched_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Core block queries
CREATE INDEX idx_blocks_user_id ON blocks(user_id);
CREATE INDEX idx_blocks_start_time ON blocks(start_time);
CREATE INDEX idx_blocks_status ON blocks(status);
CREATE INDEX idx_blocks_sol_stake_status ON blocks(sol_stake_status);
CREATE INDEX idx_blocks_user_start ON blocks(user_id, start_time);
CREATE INDEX idx_blocks_gcal_event_id ON blocks(gcal_event_id);

-- Daily penalty cron query
CREATE INDEX idx_blocks_staked_overdue ON blocks(sol_stake_status, stake_deadline, status)
  WHERE sol_stake_status = 'staked' AND status != 'completed';

-- Fireflies matching
CREATE INDEX idx_blocks_transcript_id ON blocks(fireflies_transcript_id);
CREATE INDEX idx_blocks_type_time ON blocks(type, start_time)
  WHERE type IN ('call', 'meeting');

-- XP and accountability lookups
CREATE INDEX idx_xp_events_user ON xp_events(user_id);
CREATE INDEX idx_accountability_user ON accountability_log(user_id);
CREATE INDEX idx_daily_briefings_user_date ON daily_briefings(user_id, day_date);
CREATE INDEX idx_reschedule_log_block ON reschedule_log(block_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on blocks
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sol_price_cache ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update own row
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Blocks: full CRUD on own rows
CREATE POLICY "Users can view own blocks" ON blocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocks" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocks" ON blocks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocks" ON blocks
  FOR DELETE USING (auth.uid() = user_id);

-- Accountability log: read own
CREATE POLICY "Users can view own accountability" ON accountability_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accountability" ON accountability_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- XP events: read own
CREATE POLICY "Users can view own xp events" ON xp_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xp events" ON xp_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily briefings: read/insert own
CREATE POLICY "Users can view own briefings" ON daily_briefings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefings" ON daily_briefings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reschedule log: read/insert own
CREATE POLICY "Users can view own reschedule log" ON reschedule_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reschedule log" ON reschedule_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SOL price cache: all authenticated users can read, only service role can write
CREATE POLICY "Authenticated users can read sol price" ON sol_price_cache
  FOR SELECT TO authenticated USING (true);
