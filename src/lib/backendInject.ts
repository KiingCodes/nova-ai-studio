// Inject backend URL + projectId into generated HTML (substitutes the
// __BACKEND_URL__ / __PROJECT_ID__ placeholders the model embeds in <head>).
const BACKEND_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/project-backend`;

export function injectBackend(html: string, projectId: string): string {
  let out = html;
  out = out.split('__BACKEND_URL__').join(BACKEND_URL);
  out = out.split('__PROJECT_ID__').join(projectId);
  // If the model forgot the bootstrap, inject it ourselves so forms still work.
  if (!/window\.__KINGING_BACKEND__/.test(out)) {
    const tag = `<script>window.__KINGING_BACKEND__=${JSON.stringify(BACKEND_URL)};window.__KINGING_PROJECT_ID__=${JSON.stringify(projectId)};</script>`;
    out = out.replace(/<head[^>]*>/i, m => `${m}\n${tag}`);
  }
  return out;
}

export function backendUrl(): string { return BACKEND_URL; }
