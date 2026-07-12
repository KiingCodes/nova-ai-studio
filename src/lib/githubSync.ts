import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { compileGeneratedHtml } from './htmlCompiler';

export type GitHubSyncResult =
  | { synced: true; repoUrl?: string; liveUrl?: string; defaultBranch?: string }
  | { synced: false; skipped: true; reason?: string };

export async function syncLinkedGitHubProject(opts: {
  projectId: string;
  projectName?: string;
  html: string;
}): Promise<GitHubSyncResult> {
  const { data, error } = await supabase.functions.invoke('deploy-github', {
    body: {
      action: 'sync',
      projectId: opts.projectId,
      projectName: opts.projectName,
      html: compileGeneratedHtml(opts.html),
    },
  });

  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    let parsed: any = null;
    try { parsed = JSON.parse(details); } catch { /* noop */ }
    throw new Error(parsed?.error || details || 'GitHub sync failed');
  }

  if (data?.skipped) return { synced: false, skipped: true, reason: data.reason };
  return {
    synced: true,
    repoUrl: data?.repoUrl,
    liveUrl: data?.liveUrl,
    defaultBranch: data?.defaultBranch,
  };
}