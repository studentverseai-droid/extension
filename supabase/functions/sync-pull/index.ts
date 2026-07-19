import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { accessToken, sinceSequence, sinceServerUpdatedAt, sinceUpdatedAt } = await req.json().catch(() => ({}));
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Missing accessToken" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  const since = Number(sinceSequence ?? sinceServerUpdatedAt ?? sinceUpdatedAt) || 0;

  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("*")
    .eq("email", email)
    .gt("sync_sequence", since)
    .order("sync_sequence", { ascending: true })
    .limit(200);
  if (notesError) {
    return new Response(JSON.stringify({ error: notesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("email", email)
    .gt("sync_sequence", since)
    .order("sync_sequence", { ascending: true })
    .limit(200);
  if (categoriesError) {
    return new Response(JSON.stringify({ error: categoriesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ notes: notes ?? [], categories: categories ?? [] }),
    { headers: { "Content-Type": "application/json" } },
  );
});
