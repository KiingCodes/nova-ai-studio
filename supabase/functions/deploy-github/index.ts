import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY = 'https://connector-gateway.lovable.dev/github';

async function gh(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GITHUB_API_KEY = Deno.env.get('GITHUB_API_KEY');
  if (!LOVABLE_API_KEY || !GITHUB_API_KEY) throw new Error('GitHub connector not configured');
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GITHUB_API_KEY,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || `GitHub ${res.status}`;
    throw new Error(`[${res.status}] ${msg}`);
  }
  return body;
}

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

const README = (name: string, live: string) =>
  `# ${name}\n\nGenerated with [kinging.dev](https://kinging.dev) 👑\n\nLive: ${live}\n`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { action, repoName, isPrivate, html, projectName } = await req.json();

    if (action === 'whoami') {
      const user = await gh('/user');
      return new Response(JSON.stringify({ login: user.login, avatar: user.avatar_url, name: user.name }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action !== 'deploy') {
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!repoName || typeof repoName !== 'string' || !/^[a-z0-9._-]{1,100}$/i.test(repoName)) {
      return new Response(JSON.stringify({ error: 'Invalid repo name' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof html !== 'string' || html.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing html' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. whoami
    const user = await gh('/user');
    const owner = user.login as string;

    // 2. create repo (auto_init so we have a default branch)
    let repo: any;
    try {
      repo = await gh('/user/repos', {
        method: 'POST',
        body: JSON.stringify({
          name: repoName,
          description: `${projectName || repoName} — built with kinging.dev`,
          private: !!isPrivate,
          auto_init: true,
          has_issues: false,
          has_wiki: false,
        }),
      });
    } catch (e) {
      // If it already exists, continue with existing repo
      const msg = String((e as Error).message || '');
      if (!/422|already exists|name already exists/i.test(msg)) throw e;
      repo = await gh(`/repos/${owner}/${repoName}`);
    }

    const defaultBranch = repo.default_branch || 'main';

    // 3. push index.html and README (upsert with sha if exists)
    const putFile = async (path: string, content: string, message: string) => {
      let sha: string | undefined;
      try {
        const existing = await gh(`/repos/${owner}/${repoName}/contents/${path}?ref=${defaultBranch}`);
        sha = existing?.sha;
      } catch { /* not found */ }
      await gh(`/repos/${owner}/${repoName}/contents/${path}`, {
        method: 'PUT',
        body: JSON.stringify({ message, content: b64(content), branch: defaultBranch, sha }),
      });
    };

    const liveUrlGuess = `https://${owner}.github.io/${repoName}/`;
    await putFile('index.html', html, 'feat: initial site from kinging.dev');
    await putFile('README.md', README(projectName || repoName, liveUrlGuess), 'docs: readme');

    // 4. Provision Pages (edge routing)
    let liveUrl = liveUrlGuess;
    try {
      const pages = await gh(`/repos/${owner}/${repoName}/pages`, {
        method: 'POST',
        body: JSON.stringify({ source: { branch: defaultBranch, path: '/' } }),
      });
      if (pages?.html_url) liveUrl = pages.html_url;
    } catch (e) {
      // If already enabled, fetch current pages info
      try {
        const pages = await gh(`/repos/${owner}/${repoName}/pages`);
        if (pages?.html_url) liveUrl = pages.html_url;
      } catch { /* ignore */ }
    }

    return new Response(
      JSON.stringify({
        owner,
        repo: repoName,
        repoUrl: repo.html_url,
        liveUrl,
        defaultBranch,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('deploy-github error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
