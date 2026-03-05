# ⚡ CLOUDKING OS — Personal Command Center
## Complete Build Specification for OpenClaw

---

## PROJECT OVERVIEW

Build a personal AI operating system for a Solana ecosystem founder. This is not a productivity app — it is an accountability engine with real financial stakes (SOL), Jarvis-style AI intelligence, public consequences (X/Twitter callouts), and gamified progression. The user has chaotic, unstructured days and needs the AI to fully own their schedule, execute tasks where possible, and keep them accountable with real consequences.

**The user is CloudKing** — OG Solana builder, founder of SagaDAO House (creator house at Solana conferences), running community events, building dApps, managing sponsorships, organizing The Vibe Lab (twice-weekly vibecoding sessions), and attending major Solana conferences including Solana Accelerate Miami (May 2026).

---

## TECH STACK

```
Frontend:     Next.js 14+ (App Router) — PWA, Android-first, fully responsive desktop
Styling:      Tailwind CSS + custom CSS variables
Database:     Supabase (PostgreSQL + Realtime + Auth + Edge Functions)
AI:           Anthropic Claude API (claude-sonnet-4-20250514)
Blockchain:   Solana — Anchor framework (smart contract), Phantom/Backpack wallet adapter
Scheduling:   Supabase pg_cron for timed triggers (morning briefing, EOD wrap, follow-up timers)
Transcripts:  Fireflies.ai REST API (webhook on meeting end)
Auth:         Supabase Auth + wallet signature verification
Hosting:      Vercel
```

---

## DESIGN DIRECTION

**Aesthetic:** Dark, crypto-native, premium. Think command center / war room. Not generic SaaS.

- Background: #080810 near-black with subtle grid or noise texture
- Primary accent: Electric violet #7c3aed to #a855f7
- Secondary accents: Emerald #10b981 (calls/completed), Amber #f59e0b (warnings/reminders), Blue #3b82f6 (tasks), Gold #eab308 (AI-executed blocks)
- Font: Display — Syne or Space Grotesk for headers. Body — JetBrains Mono for data/stats, Inter for copy
- Motion: Smooth, purposeful. Block transitions, XP bar fills, streak counters animating
- Mobile: Bottom nav bar, large touch targets (min 44px), swipe gestures on calendar blocks
- Desktop: Left sidebar navigation, full calendar view, split panels

**Key principle:** Every screen should feel like you're piloting something, not filling in a to-do list.

---

## DATABASE SCHEMA

### users
```sql
id uuid PRIMARY KEY
wallet_address text UNIQUE
x_handle text
telegram_handle text
discord_handle text
fireflies_api_key text
xp_total integer DEFAULT 0
level integer DEFAULT 1
current_streak integer DEFAULT 0
longest_streak integer DEFAULT 0
streak_shields integer DEFAULT 0
sol_won_total decimal DEFAULT 0
sol_lost_total decimal DEFAULT 0
completion_rate decimal DEFAULT 0
avg_quality_score decimal DEFAULT 0
unlocked_themes text[] DEFAULT ARRAY['default']
active_theme text DEFAULT 'default'
morning_briefing_time time DEFAULT '09:00'
eod_wrap_time time DEFAULT '21:00'
timezone text DEFAULT 'America/New_York'
created_at timestamptz DEFAULT now()
```

### blocks
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES users(id)
title text NOT NULL
description text
type text CHECK (type IN ('task', 'event', 'call', 'reminder', 'meeting'))
priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium'
status text CHECK (status IN ('pending', 'in_progress', 'completed', 'late', 'missed')) DEFAULT 'pending'
start_time timestamptz NOT NULL
end_time timestamptz
all_day boolean DEFAULT false

-- Staking
sol_stake_amount decimal DEFAULT 0
sol_stake_tx text
sol_stake_status text CHECK (sol_stake_status IN ('none', 'staked', 'returned', 'slashed'))
daily_penalty_pct decimal DEFAULT 10
stake_deadline timestamptz

-- AI Execution
ai_executable boolean DEFAULT false
ai_output text
ai_output_type text
ai_confidence_score decimal
ai_executed_at timestamptz

-- Task Review
review_file_url text
review_submission_text text
quality_score integer
quality_feedback text
reviewed_at timestamptz
xp_awarded integer DEFAULT 0

-- Follow-up (calls/meetings)
followup_message text
followup_platform text CHECK (followup_platform IN ('telegram', 'x', 'discord'))
followup_sent boolean DEFAULT false
followup_sent_at timestamptz
fireflies_transcript_id text
fireflies_transcript_summary text
call_context_notes text

-- Scheduling meta
scheduled_by text CHECK (scheduled_by IN ('user', 'ai')) DEFAULT 'user'
rescheduled_from timestamptz
reschedule_reason text

created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

### accountability_log
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES users(id)
block_id uuid REFERENCES blocks(id)
type text CHECK (type IN ('callout', 'redemption'))
x_post_url text
x_post_content text
sol_lost decimal
days_late integer
created_at timestamptz DEFAULT now()
```

### xp_events
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES users(id)
block_id uuid REFERENCES blocks(id)
event_type text
xp_amount integer
multiplier decimal DEFAULT 1.0
created_at timestamptz DEFAULT now()
```

### daily_briefings
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES users(id)
type text CHECK (type IN ('morning', 'eod'))
content text
day_date date
sol_at_risk decimal
tasks_completed integer
tasks_missed integer
xp_earned integer
streak_status text
created_at timestamptz DEFAULT now()
```

### reschedule_log
```sql
id uuid PRIMARY KEY
user_id uuid REFERENCES users(id)
block_id uuid REFERENCES blocks(id)
old_start_time timestamptz
new_start_time timestamptz
reason text
triggered_by_block_id uuid
created_at timestamptz DEFAULT now()
```

---

## CORE FEATURES — DETAILED SPEC

---

### 1. INTELLIGENT SCHEDULING ENGINE

The AI completely owns the calendar. Users describe what they need in natural language. The AI assigns a time slot, checks for conflicts, rearranges lower-priority items if needed, and notifies the user of every change like Jarvis. Never silent.

**Add task flow:**
1. User types: "I need to finish the SagaDAO House sponsor deck by tomorrow EOD, it'll take about 3 hours"
2. AI analyzes: current calendar, priority level, existing blocks, working hours (8am-midnight)
3. AI schedules it, checks conflicts
4. If conflict: AI moves lower-priority block, logs the reschedule
5. Jarvis notification: "Scheduled: Sponsor Deck — tomorrow 2pm-5pm. Moved your Vibe Lab prep from 3pm to 6pm to make room — it's lower priority. Want different options?"
6. If user says "give me options" — AI presents 2-3 alternatives

**Conflict resolution rules:**
- Priority order: Critical > High > Medium > Low
- Calls/meetings with other people = immovable, flag to user instead
- Never schedule before 8am or past midnight without explicit permission
- Auto-add 15min buffer between back-to-back blocks
- Always notify user of any reschedule

**System prompt for scheduling (include in every scheduling API call):**
```
You are Jarvis — CloudKing's personal AI scheduler and chief of staff.

CloudKing context:
- Founder of SagaDAO House (creator house at Solana conferences)
- Running Solana Accelerate Miami event (May 2026)
- Runs The Vibe Lab — Tuesdays + Fridays on Discord for SagaMobileDAO
- Building multiple Solana dApps simultaneously
- Managing sponsors, community, builders
- Day starts 8-10am, no hard end time
- Days are chaotic — you must structure them

Scheduling rules:
- Own the calendar fully. Make decisions, always notify user.
- Never schedule before 8am or after midnight without permission
- Auto-buffer 15min between blocks
- Priority: Critical > High > Medium > Low
- Meetings with others = immovable, flag conflicts
- When you reschedule, explain what moved, what caused it, and why

When scheduling, respond conversationally then include this JSON:

<schedule_action>
{
  "action": "create",
  "block": {
    "title": "",
    "type": "task|event|call|reminder|meeting",
    "priority": "low|medium|high|critical",
    "start_time": "ISO8601",
    "end_time": "ISO8601",
    "description": "",
    "ai_executable": true,
    "suggested_stake": 0.0
  },
  "rescheduled": [
    { "block_id": "", "old_time": "ISO8601", "new_time": "ISO8601", "reason": "" }
  ]
}
</schedule_action>
```

---

### 2. SOL STAKING SYSTEM

**Smart Contract (Anchor/Solana):**
```rust
// Escrow program — PDAs seeded by [user_pubkey, task_id]

pub fn stake_task(ctx: Context<StakeTask>, task_id: String, amount: u64, deadline: i64) -> Result<()>
// Locks SOL in PDA escrow

pub fn complete_task(ctx: Context<CompleteTask>, task_id: String) -> Result<()>
// Called by backend after AI approves completion
// Returns full stake to user

pub fn slash_stake(ctx: Context<SlashStake>, task_id: String, days_late: u64) -> Result<()>
// Called by daily cron for overdue staked tasks
// Burns 10% per day to SagaDAO community pool
```

**Frontend staking flow:**
1. Stake toggle when creating a task
2. Default: ~$2 USD equivalent in SOL (fetch live price from CoinGecko API)
3. User adjusts amount if desired
4. Confirm: wallet signature → smart contract → store tx sig in block record
5. Show stake badge on block: "◎ 0.025 SOL"

**Daily penalty cron (Supabase Edge Function, runs at midnight):**
```
For each block where:
  sol_stake_status = 'staked'
  AND stake_deadline < now()
  AND status != 'completed'

Slash 10% of remaining stake, update DB
If sol_stake_amount reaches 0: set status 'missed', sol_stake_status 'slashed'
Trigger X callout on day 1 missed
```

---

### 3. X CALLOUT SYSTEM

**Trigger:** Staked task missed by 24+ hours

**Callout post format:**
```
CloudKing staked ◎[AMOUNT] SOL that he'd [TASK TITLE] by [DEADLINE].

It's been [X] day(s).

The chain doesn't lie.

🪦 [TASK TITLE]
◎[LOST SO FAR] gone. ◎[REMAINING] still at risk.

— his own accountability bot
```

**Redemption post format:**
```
Update: CloudKing finally [COMPLETED TASK] — [X] days late.

◎[AMOUNT LOST] burned. Lesson learned.

Back on track. 🔥
```

**Implementation:**
- X API v2, OAuth 2.0 PKCE flow
- Access + refresh tokens stored in Supabase vault (encrypted)
- POST /2/tweets endpoint
- Requires X Basic tier ($100/mo) — document in setup guide
- Every post URL stored in accountability_log table
- User must approve callout format on first setup, auto-posts after

---

### 4. FOLLOW-UP ENGINE

**Flow:**
1. Call block reaches end_time
2. Supabase Edge Function fires after 10 minutes
3. If fireflies_transcript_id exists: fetch transcript via Fireflies GraphQL
4. Send to Claude: transcript + user context notes
5. Generate platform-specific follow-up
6. Store in followup_message on block
7. Push notification: "Follow-up ready for [Call Name] — tap to copy"

**Fireflies API:**
```javascript
POST https://api.fireflies.ai/graphql
Headers: { Authorization: `Bearer ${FIREFLIES_API_KEY}` }
Body: {
  query: `{
    transcript(id: "${transcriptId}") {
      title
      summary { overview action_items }
      sentences { text speaker_name }
    }
  }`
}
```

**Follow-up generation prompt:**
```
Write a follow-up message for CloudKing to send after a call.

Call transcript summary:
[TRANSCRIPT SUMMARY]

Action items from call:
[ACTION ITEMS]

User added context:
[CALL_CONTEXT_NOTES if any]

Platform: [telegram|x|discord]

Rules:
- Warm but direct
- Reference 1-2 specific things from the call
- Clear next step or CTA
- Platform tone: Telegram = casual, X = punchy, Discord = community-friendly
- Sound like CloudKing, not corporate
- Under 200 words
- Output only the message
```

**UI inside Block Detail modal:**
- Follow-up tab (visible on call/meeting blocks only)
- Generated message displayed
- Platform selector: Telegram / X / Discord
- Copy button
- "Add Context" → textarea → regenerates
- "Pull Transcript" button if not auto-fetched

---

### 5. AI TASK EXECUTION

**Executable task types:**

| Task Type | Trigger Keywords | Output Delivered |
|---|---|---|
| Sponsor research | find sponsors, sponsor list, potential sponsors | Ranked list: company, contact, socials, fit for SagaDAO House, budget tier |
| Follow-up draft | write follow-up, message to [person] | Platform-specific message, copy-ready |
| X thread | write thread, CT post, announcement | Numbered thread with hook + body + CTA |
| Discord announcement | discord post, community announcement | Formatted with @mention structure |
| Market research | research [topic], competitor analysis | Structured report: findings, players, opportunities |
| Meeting summary | summarize, recap | Action items, decisions, next steps |
| Event copy | event description, write the copy | Full description for Luma/socials |

**Decision logic before executing:**
```
Execute only if ALL true:
1. Task type is in executable set
2. AI confidence >85% it can deliver quality output
3. No private relationships or personal info required
4. Bad output would not cause real damage

If uncertain: "I can start this but need more context on [X]. Add it?"
If risky: "This needs your judgment. Here's the approach — you take it from here."
```

**Use web search tool for research tasks:**
```javascript
tools: [{
  type: "web_search_20250305",
  name: "web_search"
}]
// For sponsor research: search crypto-native brands, web3 companies, Solana ecosystem projects
// that have sponsored Breakpoint, Solana Hacker House, similar events
// Output: Name, Website, Twitter/X, Contact, Sponsorship history, Fit score 1-10
```

---

### 6. GAMIFICATION SYSTEM

**XP Table:**
```
Complete task on time:          +100 XP
Quality score 90-100:           +75 XP bonus
Quality score 75-89:            +25 XP bonus
Quality score below 50:         -25 XP
Complete staked task:           +150 XP
3-day streak bonus:             +200 XP
7-day streak bonus:             +500 XP
30-day streak bonus:            +2000 XP
Late completion (staked):       +30 XP (no multiplier applied)
Miss staked task:               Streak wipe, multiplier reset
AI-executed task:               +50 XP
```

**Streak multipliers:**
```
Day 3+:   1.5x XP on all completions
Day 7+:   2x XP on all completions
Day 30+:  3x XP on all completions
Break:    Back to 1x, restart counter
```

**Levels:**
```
Level 1 — Lurker        0 XP
Level 2 — Builder       500 XP       Unlock: Neon theme, 1 streak shield/month
Level 3 — Operator      2,000 XP     Unlock: Cyberpunk theme, custom AI persona name
Level 4 — Architect     7,000 XP     Unlock: Gold theme, 2 shields/month, public profile card
Level 5 — Sovereign     20,000 XP    Unlock: All themes, 5 shields/month, custom callout templates
Level 6 — Legend        50,000 XP    Unlock: White-label setup, Discord flex role
```

**Streak shield:**
- Earned at level milestones, not purchasable
- Activating a shield absorbs 1 missed day — streak continues
- Visual: shield icon on streak counter, tap to use
- Once used, gone until next earn

**Quality scoring rubric (task review):**
```
90-100: Exceptional — complete, high quality, exceeds requirements
75-89:  Good — complete, meets requirements
50-74:  Acceptable — mostly complete, some gaps
25-49:  Incomplete — significant missing pieces
0-24:   Failed — does not meet task requirements
```

---

### 7. MORNING BRIEFING — 9am daily (Supabase cron)

**Generation prompt:**
```
Generate CloudKing's morning briefing for [DATE].

Today's blocks:
[ALL BLOCKS WITH TIMES, TYPES, PRIORITIES]

Current stats:
- Streak: [X] days | Multiplier: [Xx]
- SOL at risk today: ◎[AMOUNT] across [N] staked tasks
- XP: [TOTAL] | Level [N] | [X] XP to next level

Output format:
1. One punchy opening line about the day (real talk, not cheerleading)
2. Priority stack: top 3 things that MUST happen today and why
3. Full schedule in time order
4. SOL at risk callout if staked tasks today
5. Streak status — push if going, warn if close to breaking
6. One tactical suggestion

Tone: Jarvis meets a ruthless COO. Direct. Smart. No fluff. CloudKing responds to honesty, not hype.
```

---

### 8. EOD WRAP — 9pm daily (Supabase cron)

**Generation prompt:**
```
Generate CloudKing's end-of-day wrap for [DATE].

Completed: [LIST]
Missed: [LIST]
Late completions: [LIST]
XP earned today: [AMOUNT]
SOL gained: ◎[AMOUNT] | SOL lost: ◎[AMOUNT]
Quality scores: [LIST]
Streak: [X] days

Tomorrow preview:
[TOMORROW'S BLOCKS]

Output format:
1. Verdict on the day — one honest line (good, bad, or ugly — say it straight)
2. Wins: what got done, quality scores if notable
3. Misses: what didn't happen and the real cost (SOL, XP, streak)
4. Tomorrow: top 3 priorities
5. Closing push — one line for tomorrow

Tone: Brutally honest. No participation trophies. If it was a bad day, name it. If it was good, acknowledge it without going soft.
```

---

## SCREEN BREAKDOWN

### Screen 1: Today View (Home)
```
TOP BAR:
- Date: "Wednesday, March 4"
- Streak counter: "🔥 8 days" + combo badge if active (e.g. "2x")
- XP progress bar (tap for level detail)
- Jarvis notification card (shows last AI action, dismissable with swipe)

MAIN CONTENT:
- Vertical timeline (8am → midnight, hourly grid)
- Each block shows:
  - Color-coded left border (purple=task, green=call, blue=event, amber=reminder, gold=AI-executed)
  - Title
  - Time range
  - Type badge
  - SOL stake badge if staked: "◎0.025"
  - Status dot (gray=pending, green=done, red=late)
  - Lightning bolt if AI-executed

BOTTOM NAV (mobile only):
- Today | Calendar | AI Chat | Stats | Profile
- Floating "+" FAB button → opens quick-add chat overlay

INTERACTIONS:
- Tap block → Block Detail Modal
- Swipe left → mark complete
- Swipe right → snooze 30min
- Long press → quick menu: complete / stake / reschedule / delete
```

### Screen 2: Block Detail Modal
```
HEADER:
- Title (inline editable)
- Type | Priority | Status badges
- Time range (tap to edit)
- Edit / Delete icons

TABS:
1. Details      — description, notes, editable fields
2. Stake        — stake amount, status, days late, tx link on Solscan, slash history
3. AI Output    — full AI-generated output if executed, copy button, regenerate
4. Follow-up    — generated message, platform selector (Telegram/X/Discord), copy, Add Context button
5. Review       — file upload or paste text, submit for AI grading, quality score display

ACTION BAR:
- Mark Complete | Stake SOL | Run AI | Reschedule
```

### Screen 3: AI Chat (Command Center)
```
- Full-screen chat with Claude (Jarvis persona)
- System prompt includes: CloudKing context + current calendar + user stats
- Parses <schedule_action> JSON from responses and applies to DB
- Quick chips: "Plan my day" | "What's most important?" | "Add a task" | "Reschedule everything"
- Chat history persisted in Supabase
- Shows Jarvis avatar, typing indicator, action confirmations inline
```

### Screen 4: Calendar View
```
- Week view default, month view toggle
- Each day: colored block chips + dot count
- Dot color indicates highest-priority item that day
- SOL at risk shown as amber glow on days with staked tasks
- Tap day → Today View for that date
- Desktop: drag blocks to reschedule → AI confirms and logs
```

### Screen 5: Stats & Reputation
```
- XP ring + level badge (prominent)
- 30-day completion heatmap (GitHub-style grid)
- SOL won vs lost chart (line graph)
- Completion rate by task type (donut)
- Avg quality score by category (bar)
- Accountability log: every X callout + redemption, links to posts
- Unlocked items gallery with lock icons on locked items
```

### Screen 6: Briefing Cards
```
- Morning: full-screen takeover on app open 8-10am (if not dismissed today)
- EOD: full-screen takeover on app open after 9pm
- Swipe down or X to dismiss
- Save button → archives to Stats
- Share button → share EOD wrap as image to X/Discord
```

---

## API INTEGRATIONS

### Claude API
```javascript
const CLAUDE_MODEL = "claude-sonnet-4-20250514"
const MAX_TOKENS = 2000

// Every API call must include in system:
// - Current date/time + user timezone
// - Full block list (today + next 7 days)
// - User stats: streak, XP, level, SOL at risk
// - CloudKing context block (see bottom of this doc)
```

### Fireflies.ai
```javascript
// Register webhook at: app.fireflies.ai > Integrations > Webhooks
// Webhook URL: POST /api/webhooks/fireflies
// Event: "Transcription completed"
// Payload: { meetingId, title, duration, startTime }

// On receipt: match to block by title similarity or time proximity (within 30min window)
// Fetch transcript, generate follow-up, store, push notification
```

### Solana Smart Contract
```
Phase 1: Devnet only — build and test
Phase 2: Security review before Mainnet deploy
Framework: Anchor
PDA seeds: [user_pubkey_bytes, task_id_bytes]
Community pool: SagaDAO multisig (address to be provided by CloudKing)
Slashing: 10% daily to community pool, remainder stays in escrow
```

### X API
```javascript
// Tier required: X Basic ($100/mo)
// Auth: OAuth 2.0 PKCE
// Post endpoint: POST https://api.twitter.com/2/tweets
// Store tokens: Supabase Vault (encrypted)
// Rate limit: 50 posts/day on Basic — sufficient
// First callout: show preview + require manual approval
// After approval: fully automated
```

---

## ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=

FIREFLIES_API_KEY=

X_CLIENT_ID=
X_CLIENT_SECRET=
X_BEARER_TOKEN=

NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_PROGRAM_ID=
COMMUNITY_POOL_ADDRESS=

COINGECKO_API_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

---

## BUILD ORDER (strict — do not skip phases)

### PHASE 1 — Core Loop (build this first, get daily habit before adding stakes)
- [ ] Next.js 14 project init, Supabase setup, Tailwind config
- [ ] Wallet auth (Phantom/Backpack connect → Supabase user creation)
- [ ] Full DB schema migration
- [ ] Today View UI — timeline, blocks, color coding
- [ ] Block Detail Modal — Details + Review tabs
- [ ] AI Chat screen — scheduling engine with Jarvis persona
- [ ] Jarvis notification bar (persisted in Supabase, dismissable)
- [ ] XP system + streak counter (local, no blockchain yet)
- [ ] Morning briefing + EOD wrap (manual trigger first, then cron)
- [ ] PWA manifest, service worker, mobile viewport optimization
- [ ] Bottom nav bar (mobile) + sidebar (desktop)

### PHASE 2 — Stakes & Accountability
- [ ] Simulated staking UI (build the full UX with fake SOL amounts)
- [ ] Anchor smart contract on Devnet
- [ ] Real wallet staking integration
- [ ] Daily penalty cron (Supabase Edge Function)
- [ ] X OAuth setup
- [ ] Callout + redemption post system
- [ ] Accountability log screen

### PHASE 3 — Intelligence Layer
- [ ] Fireflies webhook + transcript fetch
- [ ] Call follow-up generation engine
- [ ] AI task execution (research, drafts, outreach lists)
- [ ] Task review: file upload → Claude grades → quality score
- [ ] Web search integration for research tasks

### PHASE 4 — Polish
- [ ] Google Calendar read/write sync
- [ ] Unlock system (themes, badges, AI personas)
- [ ] Stats + Reputation dashboard full build
- [ ] Streak shields mechanic
- [ ] Drag-to-reschedule on desktop
- [ ] Push notifications (PWA)
- [ ] EOD wrap shareable image card

---

## CRITICAL IMPLEMENTATION NOTES

1. **No silent AI actions.** Every time AI reschedules, moves, or modifies anything → Jarvis notification bar must update. Log everything in reschedule_log.

2. **SOL price always live.** Fetch SOL/USD from CoinGecko before displaying any stake amounts or setting defaults. Never hardcode SOL prices.

3. **Fireflies is async.** Transcripts are not instant. Show "Waiting for transcript..." state in Follow-up tab. Update when webhook fires via Supabase Realtime.

4. **Smart contract: Devnet first.** Do not touch Mainnet until the full staking flow has been tested end-to-end on Devnet with real wallet interactions.

5. **X callout preview gate.** First time a callout would fire, show it to user for approval. After that, fully automated. Store approved: true in user record.

6. **Streak shields are earned, not purchased.** No buy mechanic. Shields come only from level milestones.

7. **AI execution confidence gate.** Always store ai_confidence_score before executing. If output is flagged as poor by user, decrement confidence threshold for that task_type automatically.

8. **Mobile-first always.** Every component built mobile-first. Target viewport: Android Pixel 7 / Solana Seeker. Desktop is an enhanced layout layer on top.

9. **Quality score is final.** Once AI grades a task submission, the score is locked. No re-grading same submission. User can submit a new/improved version as a separate attempt.

10. **Context window management.** When sending calendar state to Claude API, only send the next 7 days of blocks + today. Do not send full history — it will burn tokens unnecessarily.

---

## CLOUDKING CONTEXT BLOCK
*(Include verbatim in all AI system prompts)*

```
CLOUDKING CONTEXT:

Who he is:
- OG Solana ecosystem founder and community builder
- Based primarily on Solana Seeker (Android) + desktop
- Communicates on Telegram, X/Twitter DMs, Discord

Active projects:
- SagaDAO House: creator house / side event at major Solana conferences
  Abu Dhabi completed (Dec 2025). Miami / Solana Accelerate next (May 20, 2026).
- The Vibe Lab: twice-weekly vibecoding sessions on Discord for SagaMobileDAO (Tues + Fri)
- SolClaw: AI agents as Metaplex Core NFTs — agent state on Arweave, tradeable trained agents
- Solana Event Networking App: wallet + Twitter + Luma connect, AI profiles, QR/NFC live mode,
  mutual holdings reveal, post-event auto follow-ups. Debuting Solana Accelerate Miami.
- Epoch: wallet-aware planner for crypto-native users (earlier project)
- OpenClaw: AI coding agent framework (multi-agent, used for building)

Community:
- SagaMobileDAO
- The Vibe Lab members
- Solana Accelerate / Breakpoint builder network

Tools he uses:
- OpenClaw (AI coding agent)
- Solana Seeker phone (Android, key hardware platform)
- Claude API, Supabase, Next.js, Solana wallet adapters

Communication preferences:
- Direct, no fluff
- Crypto-native references are fine
- Treat as capable founder, not a beginner
- Real talk over cheerleading
- Jarvis energy: informative, decisive, occasionally dry wit
```

---

*CloudKing OS v1.0 — Build Specification*
*Generated March 2026*
