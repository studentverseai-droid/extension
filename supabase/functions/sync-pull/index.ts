import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { accessToken, sinceSequence, sinceServerUpdatedAt, sinceUpdatedAt } = await req.json().catch(() => ({}));
    if (!accessToken) {
      return json({ error: "Missing accessToken" }, 400);
    }

    const googleResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!googleResponse.ok) {
      return json({ error: "Invalid Google token" }, 401);
    }
    const profile = await googleResponse.json();
    const email = profile.email;
    if (!email) {
      return json({ error: "No email on Google account" }, 400);
    }

    const since = Number(sinceSequence ?? sinceServerUpdatedAt ?? sinceUpdatedAt) || 0;

    const { data: notes, error: notesError } = await supabase
      .from("notes")
      .select("*")
      .eq("email", email)
      .gt("sync_sequence", since)
      .order("sync_sequence", { ascending: true })
      .limit(200);
    if (notesError) {
      return json({ error: notesError.message }, 500);
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("email", email)
      .gt("sync_sequence", since)
      .order("sync_sequence", { ascending: true })
      .limit(200);
    if (categoriesError) {
      return json({ error: categoriesError.message }, 500);
    }

    return json({ notes: notes ?? [], categories: categories ?? [] });
  } catch (err) {
    return json({ error: err?.message || "Sync pull failed" }, 500);
  }
});
