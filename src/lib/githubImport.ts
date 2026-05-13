import { supabase } from '@/integrations/supabase/client';

export async function importGithubRepo(url: string, workspaceId?: string): Promise<{ projectId: string; source: string }> {
  const FN = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/github-import`;
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ url, workspaceId }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Import failed');
  return j;
}
