import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const { accessToken, notes, categories, deletedNoteIds, deletedCategoryNames } = body;
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

  const appliedNotes: Record<string, Record<string, unknown> | null> = {};
  for (const note of notes ?? []) {
    const { data, error } = await supabase.rpc("upsert_note_if_newer", {
      p_id: String(note.id),
      p_email: email,
      p_title: note.title ?? "",
      p_content: note.content ?? "",
      p_content_html: note.contentHtml ?? "",
      p_image_data_url: note.imageDataUrl ?? "",
      p_category: note.category ?? "",
      p_type: note.type ?? "manual",
      p_metadata: note.metadata ?? {},
      p_pinned: note.pinned === true,
      p_created_at: note.createdAt,
      p_updated_at: note.updatedAt,
      p_base_server_revision: Number(note.baseServerRevision || 0),
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    appliedNotes[String(note.id)] = data ?? null;
  }

  const appliedCategories: Record<string, Record<string, unknown> | null> = {};
  for (const category of categories ?? []) {
    const { data, error } = await supabase.rpc("upsert_category_if_newer", {
      p_email: email,
      p_name: category.name,
      p_color: category.color ?? "blue",
      p_created_at: category.createdAt,
      p_base_server_revision: Number(category.baseServerRevision || 0),
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    appliedCategories[category.name] = data ?? null;
  }

  for (const item of deletedNoteIds ?? []) {
    const { data, error } = await supabase.rpc("delete_note_if_revision", {
      p_id: String(item.id),
      p_email: email,
      p_base_server_revision: Number(item.baseServerRevision || 0),
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    appliedNotes[String(item.id)] = data ?? null;
  }

  for (const item of deletedCategoryNames ?? []) {
    const { data, error } = await supabase.rpc("delete_category_if_revision", {
      p_email: email,
      p_name: item.name,
      p_base_server_revision: Number(item.baseServerRevision || 0),
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    appliedCategories[item.name] = data ?? null;
  }

  return new Response(JSON.stringify({ ok: true, appliedNotes, appliedCategories }), {
    headers: { "Content-Type": "application/json" },
  });
});
