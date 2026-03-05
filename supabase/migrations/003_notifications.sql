-- Jarvis notification bar — tracks AI actions for display

CREATE TABLE jarvis_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('schedule', 'reschedule', 'complete', 'reminder', 'briefing')),
  related_block_id uuid REFERENCES blocks(id) ON DELETE SET NULL,
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON jarvis_notifications(user_id, dismissed, created_at DESC);

ALTER TABLE jarvis_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON jarvis_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON jarvis_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON jarvis_notifications
  FOR UPDATE USING (auth.uid() = user_id);
