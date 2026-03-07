import type { SupabaseClient } from "@supabase/supabase-js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export function getGCalAuthUrl(redirectUri: string, userId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent",
    state: userId,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGCalCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  return response.json();
}

export async function refreshGCalToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  return response.json();
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: user } = await supabase
    .from("users")
    .select("gcal_access_token, gcal_refresh_token, gcal_token_expiry")
    .eq("id", userId)
    .single();

  if (!user?.gcal_refresh_token) return null;

  // Check if token is still valid
  if (user.gcal_token_expiry && new Date(user.gcal_token_expiry) > new Date()) {
    return user.gcal_access_token;
  }

  // Refresh the token
  const { access_token, expires_in } = await refreshGCalToken(user.gcal_refresh_token);

  const expiry = new Date(Date.now() + expires_in * 1000);
  await supabase
    .from("users")
    .update({
      gcal_access_token: access_token,
      gcal_token_expiry: expiry.toISOString(),
    })
    .eq("id", userId);

  return access_token;
}

export async function fetchGCalEvents(
  accessToken: string,
  calendarId: string = "primary"
): Promise<Array<{ id: string; summary: string; start: string; end: string }>> {
  const now = new Date();
  const twoWeeksLater = new Date(now);
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: twoWeeksLater.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  if (!data.items) return [];

  return data.items.map((event: Record<string, unknown>) => ({
    id: event.id as string,
    summary: (event.summary as string) || "Untitled Event",
    start: (event.start as Record<string, string>)?.dateTime || (event.start as Record<string, string>)?.date || "",
    end: (event.end as Record<string, string>)?.dateTime || (event.end as Record<string, string>)?.date || "",
  }));
}

export async function syncGCalEvents(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const accessToken = await getValidAccessToken(supabase, userId);
  if (!accessToken) return 0;

  const { data: user } = await supabase
    .from("users")
    .select("gcal_calendar_id")
    .eq("id", userId)
    .single();

  const calendarId = user?.gcal_calendar_id || "primary";
  const events = await fetchGCalEvents(accessToken, calendarId);

  let synced = 0;
  for (const event of events) {
    if (!event.start || !event.end) continue;

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from("blocks")
      .select("id")
      .eq("gcal_event_id", event.id)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabase
        .from("blocks")
        .update({
          title: event.summary,
          start_time: event.start,
          end_time: event.end,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("blocks").insert({
        user_id: userId,
        title: event.summary,
        type: "event",
        priority: "medium",
        start_time: event.start,
        end_time: event.end,
        gcal_event_id: event.id,
        scheduled_by: "user",
      });
    }
    synced++;
  }

  return synced;
}
