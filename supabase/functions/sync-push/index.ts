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
    const body = await req.json().catch(() => ({}));
    const { accessToken, notes, categories, deletedNoteIds, deletedCategoryNames } = body;
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
        appliedNotes[String(note.id)] = { status: "error", error: error.message };
      } else {
        appliedNotes[String(note.id)] = data ?? null;
      }
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
        appliedCategories[category.name] = { status: "error", error: error.message };
      } else {
        appliedCategories[category.name] = data ?? null;
      }
    }

    for (const item of deletedNoteIds ?? []) {
      const { data, error } = await supabase.rpc("delete_note_if_revision", {
        p_id: String(item.id),
        p_email: email,
        p_base_server_revision: Number(item.baseServerRevision || 0),
      });
      if (error) {
        appliedNotes[String(item.id)] = { status: "error", error: error.message };
      } else {
        appliedNotes[String(item.id)] = data ?? null;
      }
    }

    for (const item of deletedCategoryNames ?? []) {
      const { data, error } = await supabase.rpc("delete_category_if_revision", {
        p_email: email,
        p_name: item.name,
        p_base_server_revision: Number(item.baseServerRevision || 0),
      });
      if (error) {
        appliedCategories[item.name] = { status: "error", error: error.message };
      } else {
        appliedCategories[item.name] = data ?? null;
      }
    }

    return json({ ok: true, appliedNotes, appliedCategories });
  } catch (err) {
    return json({ error: err?.message || "Sync push failed" }, 500);
  }
});
