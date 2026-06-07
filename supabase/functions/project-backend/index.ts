// Public backend for generated projects.
// - POST { projectId, formName, data }            -> insert into project_submissions
// - POST { projectId, table, data }               -> insert into project_rows (table auto-created)
// - GET  ?projectId=...&table=...                 -> list rows for a table (public read)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);

  try {
    if (req.method === "GET") {
      const u = new URL(req.url);
      const projectId = (u.searchParams.get("projectId") ?? "").trim();
      const table = (u.searchParams.get("table") ?? "").trim().toLowerCase();
      if (!isUuid(projectId) || !table) return json({ error: "bad request" }, 400);
      const { data: t } = await sb.from("project_tables")
        .select("id").eq("project_id", projectId).eq("name", table).maybeSingle();
      if (!t) return json({ rows: [] });
      const { data: rows, error } = await sb.from("project_rows")
        .select("id, data, created_at").eq("table_id", t.id)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return json({ rows });
    }

    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "").trim();
    if (!isUuid(projectId)) return json({ error: "invalid projectId" }, 400);

    const data = body.data && typeof body.data === "object" ? body.data : {};
    if (JSON.stringify(data).length > 8000) return json({ error: "payload too large" }, 413);

    const { data: proj } = await sb.from("projects").select("id, user_id").eq("id", projectId).maybeSingle();
    if (!proj) return json({ error: "unknown project" }, 404);

    const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    // Generic table write
    if (body.table) {
      const table = String(body.table).trim().toLowerCase().slice(0, 64);
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(table)) return json({ error: "bad table name" }, 400);

      let { data: t } = await sb.from("project_tables")
        .select("id").eq("project_id", projectId).eq("name", table).maybeSingle();
      if (!t) {
        const columns = Object.keys(data).slice(0, 32).map((k) => ({
          name: k, type: typeof (data as any)[k] === "number" ? "number"
            : typeof (data as any)[k] === "boolean" ? "boolean" : "text",
        }));
        const ins = await sb.from("project_tables").insert({
          project_id: projectId, user_id: proj.user_id, name: table, columns,
        }).select("id").single();
        if (ins.error) throw ins.error;
        t = ins.data;
      }
      const { error } = await sb.from("project_rows").insert({
        table_id: t!.id, project_id: projectId, data: { ...data, _ua: ua },
      });
      if (error) throw error;
      return json({ ok: true });
    }

    // Default: form submission
    const formName = String(body.formName || "contact").slice(0, 64);
    const { error } = await sb.from("project_submissions").insert({
      project_id: projectId, form_name: formName, data, user_agent: ua,
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
