// Background regeneration worker. Creates a job, runs streamText, updates progress, writes new version.
import { streamText } from "npm:ai@6.0.177";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@2.0.47";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an expert web designer-engineer. Modify the existing HTML according to the instruction. Return the COMPLETE updated single-file HTML5 document. Start with <!DOCTYPE html> and end with </html>. No markdown fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { projectId, instruction } = await req.json();
    if (!projectId || !instruction) throw new Error("Missing projectId or instruction");

    // Fetch active version
    const { data: proj } = await supa.from("projects").select("active_version_id").eq("id", projectId).single();
    const { data: ver } = await supa.from("project_versions").select("html").eq("id", proj!.active_version_id!).single();
    const previousHtml = ver?.html ?? "";

    // Create job
    const { data: job, error: je } = await supa.from("regen_jobs").insert({
      user_id: user.id, project_id: projectId, instruction, status: "running", progress: 5,
    }).select().single();
    if (je) throw je;

    // Run async — return immediately so the request doesn't block.
    (async () => {
      try {
        const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
        const gateway = createOpenAICompatible({
          name: "lovable", baseURL: "https://ai.gateway.lovable.dev/v1",
          headers: { "Lovable-API-Key": apiKey },
        });
        const result = streamText({
          model: gateway("google/gemini-2.5-pro"),
          system: SYSTEM,
          prompt: `Instruction: ${instruction}\n\nEXISTING HTML:\n${previousHtml}`,
          maxOutputTokens: 16000,
          temperature: 0.7,
        });
        let acc = "";
        let lastTick = 0;
        for await (const chunk of result.textStream) {
          acc += chunk;
          const now = Date.now();
          if (now - lastTick > 1500) {
            lastTick = now;
            const pct = Math.min(95, 10 + Math.floor(acc.length / 800));
            await supa.from("regen_jobs").update({ progress: pct }).eq("id", job.id);
          }
        }
        // Extract HTML
        const m = acc.match(/<!DOCTYPE[\s\S]*<\/html>/i);
        const html = m ? m[0] : acc;
        // Write new version
        const summary = instruction.length > 32 ? instruction.slice(0, 32) + "…" : instruction;
        const { count } = await supa.from("project_versions").select("*", { count: "exact", head: true }).eq("project_id", projectId);
        const label = `v${(count ?? 1) + 1} — ${summary}`;
        const { data: nv } = await supa.from("project_versions").insert({
          project_id: projectId, user_id: user.id, label, prompt: instruction, html,
        }).select().single();
        await supa.from("projects").update({ active_version_id: nv!.id }).eq("id", projectId);
        await supa.from("regen_jobs").update({ status: "done", progress: 100, result_html: html }).eq("id", job.id);
      } catch (err: any) {
        await supa.from("regen_jobs").update({ status: "failed", error: String(err?.message || err) }).eq("id", job.id);
      }
    })();

    return new Response(JSON.stringify({ jobId: job.id }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
