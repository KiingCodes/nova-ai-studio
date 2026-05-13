// AI-powered debugger: analyzes HTML + runtime errors and returns suggested fixes.
import { streamText } from "npm:ai@6.0.177";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@2.0.47";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are an expert front-end debugger. Given an HTML document and runtime errors, identify root causes and produce concise, actionable fixes.

OUTPUT JSON ONLY (no prose, no markdown fences):
{
  "summary": "1-line plain-English diagnosis",
  "issues": [
    { "severity": "error"|"warn"|"info", "category": "broken-import"|"performance"|"security"|"accessibility"|"seo"|"runtime"|"layout", "title": "...", "explanation": "...", "fix": "concrete code or instruction" }
  ],
  "autoFixPrompt": "A complete instruction to send to a code generator that would fix every issue above"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { html, errors, validation } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("AI gateway not configured");
    const gateway = createOpenAICompatible({
      name: "lovable", baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": apiKey },
    });
    const ctx = `RUNTIME ERRORS:\n${(errors || []).map((e: any) => `- [${e.type}] ${e.message}${e.source ? ' @ ' + e.source : ''}`).join('\n') || '(none)'}\n\nVALIDATION:\n${JSON.stringify(validation || {}, null, 2).slice(0, 2000)}\n\nHTML (truncated to 18kb):\n${(html || '').slice(0, 18000)}`;
    const result = streamText({
      model: gateway("google/gemini-2.5-flash"),
      system: SYSTEM,
      prompt: ctx,
      maxOutputTokens: 2000,
      temperature: 0.2,
    });
    return result.toTextStreamResponse({ headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
