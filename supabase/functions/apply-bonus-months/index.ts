import { createClient } from "npm:@supabase/supabase-js@2";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BONUS_MONTHS = 1;

// Runs on a daily schedule (Supabase Cron). It's the only place that actually grants
// the Founder's Upgrade bonus month, in two steps a month apart:
//   1. When a Yearly subscription's normal first 12-month cycle ends, pause it before
//      Razorpay's real renewal charge fires, and extend current_period_end by a month
//      in our own records so Pro access keeps working through the bonus month.
//   2. A month after that pause, resume the subscription so the real renewal charge
//      happens on schedule again.
Deno.serve(async (_req) => {
  const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const now = new Date();

  const { data: dueForPause } = await supabase
    .from("paid_users")
    .select("email, subscription_id, current_period_end")
    .eq("bonus_month_pending", true)
    .is("bonus_started_at", null)
    .lte("current_period_end", now.toISOString());

  for (const row of dueForPause || []) {
    if (!row.subscription_id || !row.current_period_end) continue;

    await fetch(`https://api.razorpay.com/v1/subscriptions/${row.subscription_id}/pause`, {
      method: "POST",
      headers: { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pause_at: "now" }),
    });

    const bonusEnd = new Date(row.current_period_end);
    bonusEnd.setMonth(bonusEnd.getMonth() + BONUS_MONTHS);

    await supabase.from("paid_users").update({
      bonus_started_at: now.toISOString(),
      current_period_end: bonusEnd.toISOString(),
    }).eq("email", row.email);
  }

  const { data: dueForResume } = await supabase
    .from("paid_users")
    .select("email, subscription_id, bonus_started_at")
    .eq("bonus_month_pending", true)
    .not("bonus_started_at", "is", null);

  for (const row of dueForResume || []) {
    if (!row.subscription_id || !row.bonus_started_at) continue;

    const resumeDue = new Date(row.bonus_started_at);
    resumeDue.setMonth(resumeDue.getMonth() + BONUS_MONTHS);
    if (resumeDue > now) continue;

    await fetch(`https://api.razorpay.com/v1/subscriptions/${row.subscription_id}/resume`, {
      method: "POST",
      headers: { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ resume_at: "now" }),
    });

    await supabase.from("paid_users").update({
      bonus_month_pending: false,
      bonus_started_at: null,
    }).eq("email", row.email);
  }

  return new Response("OK", { status: 200 });
});
