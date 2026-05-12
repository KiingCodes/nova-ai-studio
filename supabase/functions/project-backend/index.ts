// Public backend for generated projects: receives form submissions, persists them
// behind RLS using the service role. Generated sites POST here with their projectId.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "").trim();
    const formName = String(body.formName || "contact").slice(0, 64);
    const data = body.data && typeof body.data === "object" ? body.data : {};
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
      return new Response(JSON.stringify({ error: "invalid projectId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Soft size cap
    const json = JSON.stringify(data);
    if (json.length > 8000) {
      return new Response(JSON.stringify({ error: "payload too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    // Validate project exists
    const { data: proj } = await sb.from("projects").select("id").eq("id", projectId).maybeSingle();
    if (!proj) {
      return new Response(JSON.stringify({ error: "unknown project" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;
    const { error } = await sb.from("project_submissions").insert({
      project_id: projectId, form_name: formName, data, user_agent: ua,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
