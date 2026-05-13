import { supabase } from '@/integrations/supabase/client';

export interface RegenJob {
  id: string;
  projectId: string;
  instruction: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: number;
  error?: string | null;
  createdAt: number;
}

const map = (r: any): RegenJob => ({
  id: r.id, projectId: r.project_id, instruction: r.instruction, status: r.status,
  progress: r.progress, error: r.error, createdAt: new Date(r.created_at).getTime(),
});

export const regenJobs = {
  async start(projectId: string, instruction: string): Promise<string> {
    const FN = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/regen-job`;
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch(FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ projectId, instruction }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Failed to start job');
    return j.jobId;
  },

  async listActive(): Promise<RegenJob[]> {
    const { data } = await supabase.from('regen_jobs').select('*').in('status', ['queued', 'running']).order('created_at', { ascending: false });
    return (data ?? []).map(map);
  },

  subscribe(onChange: (job: RegenJob) => void) {
    const ch = supabase
      .channel('regen-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regen_jobs' }, (payload) => {
        if (payload.new) onChange(map(payload.new));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  },
};
