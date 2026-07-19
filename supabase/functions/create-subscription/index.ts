const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const PLAN_IDS: Record<string, string> = {
  monthly: "plan_TDFhma48A18aUx",
  yearly: "plan_TDFpZCKqWgEMiq",
};

const TOTAL_COUNT: Record<string, number> = {
  monthly: 120,
  yearly: 20,
};

// This function is called directly from the pricing.html webpage (browser
// fetch), which requires CORS headers on every response - including the
// preflight OPTIONS request the browser sends before the real POST.
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

  const { accessToken, planType } = await req.json().catch(() => ({}));
  const planId = PLAN_IDS[planType];
  if (!accessToken || !planId) {
    return new Response(JSON.stringify({ error: "Missing accessToken or invalid planType" }), {
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

  const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${razorpayAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      customer_notify: 1,
      total_count: TOTAL_COUNT[planType],
      notes: { email, plan_type: planType },
    }),
  });

  if (!subscriptionResponse.ok) {
    const errorBody = await subscriptionResponse.text();
    return new Response(JSON.stringify({ error: "Razorpay subscription creation failed", details: errorBody }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const subscription = await subscriptionResponse.json();

  return new Response(
    JSON.stringify({
      subscriptionId: subscription.id,
      keyId: RAZORPAY_KEY_ID,
      email,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
