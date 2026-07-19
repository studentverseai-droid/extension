const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

import { createClient } from "npm:@supabase/supabase-js@2";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const UPGRADE_WINDOW_DAYS = 15;
const UPGRADE_PRICE_PAISE = 225000; // ₹2,250

// This function is called directly from the pricing.html webpage (browser fetch),
// which requires CORS headers on every response - including the preflight OPTIONS request.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const { accessToken } = await req.json().catch(() => ({}));
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Missing accessToken" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const googleResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!googleResponse.ok) {
    return new Response(JSON.stringify({ error: "Invalid Google token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const profile = await googleResponse.json();
  const email = profile.email;
  if (!email) {
    return new Response(JSON.stringify({ error: "No email on Google account" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: row } = await supabase
    .from("paid_users")
    .select("plan, status, monthly_started_at, pending_yearly_transition")
    .eq("email", email)
    .maybeSingle();

  if (!row || row.plan !== "monthly" || row.status !== "active") {
    return new Response(JSON.stringify({ error: "Founder's Upgrade is only available to active Monthly subscribers." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (row.pending_yearly_transition) {
    return new Response(JSON.stringify({ error: "You've already upgraded - Yearly will start automatically once your current Monthly period ends." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = row.monthly_started_at ? new Date(row.monthly_started_at) : null;
  const daysSinceStart = startedAt ? (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
  if (daysSinceStart > UPGRADE_WINDOW_DAYS) {
    return new Response(JSON.stringify({ error: "The Founder's Upgrade window (15 days from your Monthly start) has passed." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${razorpayAuth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: UPGRADE_PRICE_PAISE,
      currency: "INR",
      notes: { email, purpose: "founder_upgrade" },
    }),
  });

  if (!orderResponse.ok) {
    const errorBody = await orderResponse.text();
    return new Response(JSON.stringify({ error: "Could not start the upgrade order.", details: errorBody }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const order = await orderResponse.json();

  return new Response(
    JSON.stringify({
      orderId: order.id,
      amount: order.amount,
      keyId: RAZORPAY_KEY_ID,
      email,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
