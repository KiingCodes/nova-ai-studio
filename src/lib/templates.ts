import { supabase } from '@/integrations/supabase/client';

export type TemplateType = 'saas' | 'agency' | 'landing' | 'dashboard' | 'booking';

export interface GeneratedProject {
  id: string;
  name: string;
  template: TemplateType;
  prompt: string;
  html: string;
  timestamp: number;
}

const detectTemplate = (prompt: string): TemplateType => {
  const p = prompt.toLowerCase();
  if (p.includes('dashboard') || p.includes('admin') || p.includes('analytics')) return 'dashboard';
  if (p.includes('booking') || p.includes('appointment') || p.includes('schedule')) return 'booking';
  if (p.includes('agency') || p.includes('studio') || p.includes('firm')) return 'agency';
  if (p.includes('landing') || p.includes('waitlist') || p.includes('launch')) return 'landing';
  return 'saas';
};

const extractName = (prompt: string): string => {
  const m = prompt.match(/(?:called|named)\s+([A-Z][a-zA-Z0-9]+)/);
  if (m) return m[1];
  const words = prompt.split(/\s+/).filter(w => /^[A-Z][a-z]+/.test(w));
  return words[0] || 'Nova';
};

export async function generateProject(prompt: string, previousHtml?: string): Promise<GeneratedProject> {
  const fullPrompt = previousHtml
    ? `Modify the existing website according to this instruction: "${prompt}".\n\nReturn the FULL updated HTML file. Keep the existing brand identity and structure where possible — only change what's requested. Existing HTML:\n\n${previousHtml}`
    : prompt;

  const { data, error } = await supabase.functions.invoke('generate-site', {
    body: { prompt: fullPrompt },
  });

  if (error) throw new Error(error.message || 'AI generation failed');
  if (!data?.html) throw new Error(data?.error || 'No HTML returned');

  return {
    id: crypto.randomUUID(),
    name: extractName(prompt),
    template: detectTemplate(prompt),
    prompt,
    html: data.html,
    timestamp: Date.now(),
  };
}
