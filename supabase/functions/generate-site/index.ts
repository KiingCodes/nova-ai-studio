// Streams a complete HTML5 website from a prompt using Lovable AI Gateway + Vercel AI SDK.
import { streamText } from "npm:ai@6.0.177";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@2.0.47";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "x-stream-id",
};

const SYSTEM_PROMPT = `You are an elite web designer and front-end engineer at a $200/hr agency.

Generate a COMPLETE, production-ready, single-file HTML5 website based on the user's prompt.

OUTPUT RULES (STRICT — VIOLATION = FAILURE):
- Output ONLY raw HTML. No markdown fences, no commentary, no preamble, no postamble.
- Start your response with "<!DOCTYPE html>" and end with "</html>".
- The document MUST be fully closed: </body></html>. Never stop mid-tag.
- Single self-contained file. Keep total size under ~45KB.

TECH:
- Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Google Fonts: Inter + a tasteful display font (Playfair Display, Space Grotesk, DM Serif Display) chosen to match the brand vibe.
- Lucide icons via CDN if needed: <script src="https://unpkg.com/lucide@latest"></script> then lucide.createIcons().
- Real Unsplash photos via https://images.unsplash.com/photo-... OR refined SVG/gradients. Always alt text.
- All <script> blocks MUST be syntactically valid. Wrap any DOM access in DOMContentLoaded. Never throw at parse time.

DESIGN:
- LIGHT theme by default unless prompt says otherwise.
- Agency-quality: bold typography, generous whitespace, soft shadows, subtle gradients, glassmorphism where it fits.
- Real brand-appropriate copy. Invent a brand name from the prompt. NO Lorem Ipsum.
- Sections (when relevant): sticky nav with smooth-scroll links, hero w/ strong CTA, features grid, social proof / testimonials, pricing or services, FAQ, footer.
- Subtle CSS keyframe animations on entrance + hover transitions.
- Fully responsive mobile-first. Semantic HTML, accessible, SEO meta tags (title, description), favicon emoji.

Be concise but bold. Ship something that looks like a $20k project.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, previousHtml } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });

    const userMessage = previousHtml
      ? `Modify the existing website according to this instruction: "${prompt}".

Return the FULL updated HTML file (no partial diffs). Preserve the brand identity, tone, and overall structure — only change what's requested. The document MUST end with </body></html>.

EXISTING HTML:
${previousHtml}`
      : prompt;

    const result = streamText({
      model: gateway("google/gemini-2.5-pro"),
      system: SYSTEM_PROMPT,
      prompt: userMessage,
      maxOutputTokens: 16000,
      temperature: 0.7,
    });

    return result.toTextStreamResponse({ headers: corsHeaders });
  } catch (err) {
    console.error("generate-site error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
