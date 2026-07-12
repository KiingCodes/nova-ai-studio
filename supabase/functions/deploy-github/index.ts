import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY = 'https://connector-gateway.lovable.dev/github';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'my-project';

function clientForRequest(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
}

async function requireUser(req: Request) {
  const sb = clientForRequest(req);
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return { sb, user };
}

async function putFile(owner: string, repoName: string, branch: string, path: string, content: string, message: string) {
  let sha: string | undefined;
  try {
    const existing = await gh(`/repos/${owner}/${repoName}/contents/${path}?ref=${branch}`);
    sha = existing?.sha;
  } catch { /* not found */ }
  await gh(`/repos/${owner}/${repoName}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: b64(content), branch, sha }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { action, repoName, isPrivate, html, projectName, projectId } = await req.json();

    if (action === 'whoami') {
      const user = await gh('/user');
      return json({ login: user.login, avatar: user.avatar_url, name: user.name });
    }

    if (action !== 'deploy' && action !== 'sync') {
      return json({ error: 'Unknown action' }, 400);
    }

    if (typeof html !== 'string' || html.length === 0) {
      return json({ error: 'Missing html' }, 400);
    }

    const { sb, user: appUser } = await requireUser(req);

    if (action === 'sync') {
      if (!projectId || typeof projectId !== 'string') return json({ error: 'Missing projectId' }, 400);

      const { data: linked, error: linkError } = await sb
        .from('github_repos')
        .select('owner, repo, default_branch, html_url')
        .eq('project_id', projectId)
        .eq('user_id', appUser.id)
        .maybeSingle();

      if (linkError) throw linkError;
      if (!linked) return json({ skipped: true, reason: 'No GitHub repository connected' });

      await putFile(
        linked.owner,
        linked.repo,
        linked.default_branch || 'main',
        'index.html',
        html,
        'feature update by kinging.dev',
      );
      await putFile(
        linked.owner,
        linked.repo,
        linked.default_branch || 'main',
        'README.md',
        README(projectName || linked.repo, linked.html_url || `https://${linked.owner}.github.io/${linked.repo}/`),
        'docs: update project metadata',
      );

      await sb
        .from('github_repos')
        .update({ last_pushed_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('user_id', appUser.id);

      return json({
        synced: true,
        owner: linked.owner,
        repo: linked.repo,
        repoUrl: `https://github.com/${linked.owner}/${linked.repo}`,
        liveUrl: linked.html_url,
        defaultBranch: linked.default_branch || 'main',
      });
    }

    if (!repoName || typeof repoName !== 'string' || !/^[a-z0-9._-]{1,100}$/i.test(repoName)) {
      return json({ error: 'Invalid repo name' }, 400);
    }

    // 1. whoami
    const user = await gh('/user');
    const owner = user.login as string;
    const cleanRepo = slug(repoName);

    // 2. create repo (auto_init so we have a default branch)
    let repo: any;
    try {
      repo = await gh('/user/repos', {
        method: 'POST',
        body: JSON.stringify({
          name: cleanRepo,
          description: `${projectName || cleanRepo} — built with kinging.dev`,
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
      repo = await gh(`/repos/${owner}/${cleanRepo}`);
    }

    const defaultBranch = repo.default_branch || 'main';

    // 3. push index.html and README
    const liveUrlGuess = `https://${owner}.github.io/${cleanRepo}/`;
    await putFile(owner, cleanRepo, defaultBranch, 'index.html', html, 'Initial commit / feature update by kinging.dev');
    await putFile(owner, cleanRepo, defaultBranch, 'README.md', README(projectName || cleanRepo, liveUrlGuess), 'docs: readme');

    // 4. Provision Pages (edge routing)
    let liveUrl = liveUrlGuess;
    try {
      const pages = await gh(`/repos/${owner}/${cleanRepo}/pages`, {
        method: 'POST',
        body: JSON.stringify({ source: { branch: defaultBranch, path: '/' } }),
      });
      if (pages?.html_url) liveUrl = pages.html_url;
    } catch {
      // If already enabled, fetch current pages info
      try {
        const pages = await gh(`/repos/${owner}/${cleanRepo}/pages`);
        if (pages?.html_url) liveUrl = pages.html_url;
      } catch { /* ignore */ }
    }

    if (projectId && typeof projectId === 'string') {
      const { error: upsertError } = await sb.from('github_repos').upsert({
        project_id: projectId,
        user_id: appUser.id,
        owner,
        repo: cleanRepo,
        default_branch: defaultBranch,
        html_url: liveUrl,
        last_pushed_at: new Date().toISOString(),
      }, { onConflict: 'project_id' });
      if (upsertError) throw upsertError;
    }

    return json({
      owner,
      repo: cleanRepo,
      repoUrl: repo.html_url,
      liveUrl,
      defaultBranch,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('deploy-github error:', message);
    return json({ error: message }, /Unauthorized/i.test(message) ? 401 : 500);
  }
});