// Generates a complete single-file HTML website from a natural-language prompt
// using Lovable AI Gateway (no API key required from the user).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an elite web designer and front-end engineer. Generate a COMPLETE, production-ready, single-file HTML5 website based on the user's prompt.

REQUIREMENTS:
- Output ONLY raw HTML. No markdown fences, no commentary, no explanations.
- Single self-contained file: <!DOCTYPE html> ... </html>.
- Use Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Load Google Fonts (Inter + a tasteful display font like Playfair Display, Space Grotesk, or DM Serif Display depending on the brand vibe).
- Use real, brand-appropriate copy (no Lorem Ipsum). Invent a brand name based on the prompt.
- Use high-quality Unsplash images via https://images.unsplash.com/photo-... (real photo IDs) OR use elegant SVG illustrations and gradients. Always include alt text.
- Beautiful, modern, agency-quality design. Generous spacing, refined typography, subtle gradients, soft shadows, glassmorphism where appropriate.
- LIGHT THEME by default unless the prompt specifies dark.
- Fully responsive (mobile-first). Use Tailwind responsive utilities.
- Sections to include (when relevant): sticky nav, hero with strong CTA, features/benefits grid, social proof / testimonials, pricing or services, FAQ, footer.
- Smooth scroll, hover transitions, subtle entrance animations using CSS keyframes.
- Semantic HTML, accessible, SEO meta tags (title, description), favicon emoji.
- Working anchor navigation between sections.

Make it look like a $20k agency project. Be bold and opinionated with the design.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
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

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    let html: string = data?.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if model added them
    html = html.trim();
    if (html.startsWith("```")) {
      html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
    }
    // If model wrapped in extra text, extract <!DOCTYPE...> block
    const docIdx = html.search(/<!DOCTYPE/i);
    if (docIdx > 0) html = html.slice(docIdx);

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
