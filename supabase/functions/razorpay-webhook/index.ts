import { createClient } from "npm:@supabase/supabase-js@2";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// PLAN_IDS/TOTAL_COUNT.yearly are intentionally kept identical to create-subscription/index.ts -
// duplicated because separate Edge Functions deployed via the dashboard editor can't share a module.
const PLAN_IDS: Record<string, string> = {
  monthly: "plan_TDFhma48A18aUx",
  yearly: "plan_TDFpZCKqWgEMiq",
};
const TOTAL_COUNT: Record<string, number> = {
  monthly: 120,
  yearly: 20,
};

async function verifySignature(body: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

// deno-lint-ignore no-explicit-any
async function handleFounderUpgradePayment(event: any) {
  const orderNotes = event.payload?.order?.entity?.notes || event.payload?.payment?.entity?.notes || {};
  if (orderNotes.purpose !== "founder_upgrade" || !orderNotes.email) return;

  const email = orderNotes.email;
  const { data: row } = await supabase
    .from("paid_users")
    .select("plan, subscription_id, current_period_end")
    .eq("email", email)
    .maybeSingle();
  if (!row || !row.subscription_id || !row.current_period_end) return;

  const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  // Let the current Monthly cycle finish normally - just stop it from renewing again.
  await fetch(`https://api.razorpay.com/v1/subscriptions/${row.subscription_id}/cancel`, {
    method: "POST",
    headers: { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cancel_at_cycle_end: 1 }),
  });

  const monthlyEnd = new Date(row.current_period_end);
  const startAtSeconds = Math.floor(monthlyEnd.getTime() / 1000);

  // Starts right when the Monthly period ends and runs its normal 12-month cycle.
  // The bonus month is appended AFTER that first cycle by the apply-bonus-months
  // scheduled job, not here - see that function for how the bonus is actually granted.
  await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: PLAN_IDS.yearly,
      customer_notify: 1,
      total_count: TOTAL_COUNT.yearly,
      start_at: startAtSeconds,
      notes: { email, plan_type: "yearly" },
    }),
  });

  await supabase.from("paid_users").update({
    previous_plan: row.plan,
    previous_subscription_id: row.subscription_id,
    pending_yearly_transition: true,
    bonus_month_pending: true,
    current_period_end: monthlyEnd.toISOString(),
  }).eq("email", email);
}

Deno.serve(async (req) => {
  const signature = req.headers.get("x-razorpay-signature") || "";
  const rawBody = await req.text();

  const valid = await verifySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event;

  if (eventType === "payment.captured") {
    await handleFounderUpgradePayment(event);
    return new Response("OK", { status: 200 });
  }

  const subscriptionEntity = event.payload?.subscription?.entity;

  if (!subscriptionEntity) {
    return new Response("Ignored: no subscription in payload", { status: 200 });
  }

  const subscriptionId = subscriptionEntity.id;
  const notes = subscriptionEntity.notes || {};
  const email = notes.email;

  if (!email) {
    return new Response("Ignored: no email in subscription notes", { status: 200 });
  }

  if (eventType === "subscription.charged") {
    const currentPeriodEnd = new Date(subscriptionEntity.current_end * 1000).toISOString();
    const isFirstCharge = subscriptionEntity.paid_count === 1;

    const updates: Record<string, unknown> = {
      email,
      subscription_id: subscriptionId,
      status: "active",
      current_period_end: currentPeriodEnd,
    };

    if (notes.plan_type === "monthly") {
      updates.plan = "monthly";
      if (isFirstCharge) updates.monthly_started_at = new Date().toISOString();
    } else if (notes.plan_type === "yearly") {
      updates.plan = "yearly";
      if (isFirstCharge) {
        updates.yearly_started_at = new Date().toISOString();
        updates.pending_yearly_transition = false;
      }
    }

    await supabase.from("paid_users").upsert(updates, { onConflict: "email" });
  }

  // subscription.cancelled means the customer chose to stop auto-renewal - it does NOT
  // mean access should end right now. current_period_end already holds the date their
  // last payment covers, and the isPaid check in check-pro-status already only looks at
  // status === "active" && current_period_end > now, so leaving status untouched here
  // means access naturally continues until that already-paid period runs out, matching
  // the Refund & Cancellation Policy. Nothing needs to change in the database for this event.

  // subscription.halted means Razorpay tried and failed to collect a renewal payment
  // after retries - this is a real payment failure, not a graceful cancellation, so
  // access is cut off immediately.
  if (eventType === "subscription.halted") {
    await supabase
      .from("paid_users")
      .update({ status: "cancelled" })
      .eq("subscription_id", subscriptionId);
  }

  return new Response("OK", { status: 200 });
});
