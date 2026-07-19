import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { accessToken } = await req.json().catch(() => ({}));
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Missing accessToken" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ask Google directly who this token actually belongs to - never trust a
  // client-supplied email, since anyone could type in someone else's email.
  const googleResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!googleResponse.ok) {
    return new Response(JSON.stringify({ error: "Invalid Google token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const profile = await googleResponse.json();
  const email = profile.email;
  if (!email) {
    return new Response(JSON.stringify({ error: "No email on Google account" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: row } = await supabase
    .from("paid_users")
    .select("status, plan, current_period_end, monthly_started_at, yearly_started_at, pending_yearly_transition, bonus_month_pending")
    .eq("email", email)
    .maybeSingle();

  const now = new Date();
  const periodEnd = row?.current_period_end ? new Date(row.current_period_end) : null;
  const isPaid = row?.status === "active" && periodEnd !== null && periodEnd > now;

  return new Response(
    JSON.stringify({
      email,
      isPaid,
      plan: row?.plan ?? null,
      currentPeriodEnd: row?.current_period_end ?? null,
      monthlyStartedAt: row?.monthly_started_at ?? null,
      yearlyStartedAt: row?.yearly_started_at ?? null,
      pendingYearlyTransition: row?.pending_yearly_transition === true,
      bonusMonthPending: row?.bonus_month_pending === true,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
