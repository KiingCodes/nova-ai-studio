import { supabase } from '@/integrations/supabase/client';

export interface DebugIssue {
  severity: 'error' | 'warn' | 'info';
  category: string;
  title: string;
  explanation: string;
  fix: string;
}
export interface DebugReport {
  summary: string;
  issues: DebugIssue[];
  autoFixPrompt: string;
}

export async function runAiDebug(html: string, errors: any[], validation: any): Promise<DebugReport> {
  const FN = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ai-debug`;
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ html, errors, validation }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  // Extract JSON object from possibly streamed text
  const m = text.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : text);
}
