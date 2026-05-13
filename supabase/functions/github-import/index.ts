// Imports a public GitHub repo as a kinging.dev project.
// Accepts a repo URL like https://github.com/owner/repo (optional /tree/branch/path).
// Pulls the most likely entry HTML (index.html, public/index.html, dist/index.html, or first .html in the tree).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportReq { url: string; workspaceId?: string }

function parse(url: string) {
  const m = url.replace(/\.git$/, "").match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?/i);
  if (!m) throw new Error("Not a valid GitHub URL");
  const [, owner, repo, branch = "main", subpath = ""] = m;
  return { owner, repo, branch, subpath };
}

async function tryFetch(owner: string, repo: string, branch: string, path: string) {
  const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`);
  return r.ok ? await r.text() : null;
}

async function listTree(owner: string, repo: string, branch: string) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!r.ok) return null;
  const j = await r.json();
  return (j.tree || []).filter((n: any) => n.type === "blob");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { url, workspaceId } = (await req.json()) as ImportReq;
    if (!url) throw new Error("Missing url");
    const { owner, repo, branch, subpath } = parse(url);
    const base = subpath ? subpath.replace(/\/$/, "") + "/" : "";

    // Try common entry points
    const candidates = [`${base}index.html`, `${base}public/index.html`, `${base}dist/index.html`, `${base}docs/index.html`];
    let html: string | null = null;
    let found = "";
    for (const c of candidates) {
      const t = await tryFetch(owner, repo, branch, c);
      if (t) { html = t; found = c; break; }
    }
    // Fall back: scan tree for any .html
    if (!html) {
      const tree = await listTree(owner, repo, branch);
      const htmlFile = tree?.find((n: any) => /\.html$/i.test(n.path) && (!base || n.path.startsWith(base)));
      if (htmlFile) { html = await tryFetch(owner, repo, branch, htmlFile.path); found = htmlFile.path; }
    }
    if (!html) {
      // Generate a wrapper that lists the repo
      html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${owner}/${repo}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-white p-12 font-sans"><h1 class="text-5xl font-bold mb-4">${owner}/${repo}</h1><p class="text-slate-400 mb-8">Imported from <a class="text-amber-400 underline" href="${url}">${url}</a></p><p>No HTML entry point found in this repo. Use chat to convert it into a website.</p></body></html>`;
      found = "(generated wrapper)";
    }

    // Create project
    const { data: ws } = await supa.from("workspaces").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
    const wsId = workspaceId ?? ws?.id;
    const { data: proj, error: pe } = await supa.from("projects").insert({
      user_id: user.id, name: `${owner}/${repo}`, initial_prompt: `Imported from ${url}`,
      workspace_id: wsId,
    }).select().single();
    if (pe) throw pe;
    const { data: ver, error: ve } = await supa.from("project_versions").insert({
      project_id: proj.id, user_id: user.id, label: "v1 — imported", prompt: `Imported from ${url} (${found})`, html,
    }).select().single();
    if (ve) throw ve;
    await supa.from("projects").update({ active_version_id: ver.id }).eq("id", proj.id);

    return new Response(JSON.stringify({ projectId: proj.id, source: found }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
