// Cloud-backed project store (Supabase). Replaces former localStorage version.
import { supabase } from '@/integrations/supabase/client';
import { type HtmlValidationResult } from './htmlValidator';

export interface ProjectVersion {
  id: string;
  label: string;
  prompt: string;
  html: string;
  createdAt: number;
  validation?: HtmlValidationResult;
}

export interface ProjectRecord {
  id: string;
  name: string;
  initialPrompt: string;
  versions: ProjectVersion[];
  activeVersionId: string;
  createdAt: number;
  updatedAt: number;
}

const ACTIVE_KEY = 'kinging.activeProjectId.v2';

const mapVersion = (r: any): ProjectVersion => ({
  id: r.id, label: r.label, prompt: r.prompt, html: r.html,
  createdAt: new Date(r.created_at).getTime(), validation: r.validation ?? undefined,
});

export const projectStore = {
  getActiveId(): string | null { return localStorage.getItem(ACTIVE_KEY); },
  setActiveId(id: string | null) {
    if (id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY);
  },

  async list(): Promise<ProjectRecord[]> {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*, project_versions(*)')
      .order('last_opened_at', { ascending: false });
    if (error) throw error;
    return (projects ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      initialPrompt: p.initial_prompt,
      activeVersionId: p.active_version_id,
      createdAt: new Date(p.created_at).getTime(),
      updatedAt: new Date(p.updated_at).getTime(),
      versions: (p.project_versions ?? []).map(mapVersion).sort((a: ProjectVersion, b: ProjectVersion) => a.createdAt - b.createdAt),
    }));
  },

  async get(id: string): Promise<ProjectRecord | null> {
    const { data: p, error } = await supabase
      .from('projects').select('*, project_versions(*)').eq('id', id).maybeSingle();
    if (error || !p) return null;
    await supabase.from('projects').update({ last_opened_at: new Date().toISOString() }).eq('id', id);
    return {
      id: p.id, name: p.name, initialPrompt: p.initial_prompt,
      activeVersionId: p.active_version_id ?? '',
      createdAt: new Date(p.created_at).getTime(), updatedAt: new Date(p.updated_at).getTime(),
      versions: ((p as any).project_versions ?? []).map(mapVersion).sort((a: ProjectVersion, b: ProjectVersion) => a.createdAt - b.createdAt),
    };
  },

  async create(opts: { name: string; prompt: string; html: string; validation?: HtmlValidationResult }): Promise<ProjectRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data: proj, error: e1 } = await supabase.from('projects')
      .insert({ user_id: user.id, name: opts.name, initial_prompt: opts.prompt }).select().single();
    if (e1) throw e1;
    const { data: ver, error: e2 } = await supabase.from('project_versions').insert({
      project_id: proj.id, user_id: user.id, label: 'v1', prompt: opts.prompt, html: opts.html,
      validation: opts.validation as any,
    }).select().single();
    if (e2) throw e2;
    await supabase.from('projects').update({ active_version_id: ver.id }).eq('id', proj.id);
    localStorage.setItem(ACTIVE_KEY, proj.id);
    return (await this.get(proj.id))!;
  },

  async addVersion(projectId: string, opts: { prompt: string; html: string; validation?: HtmlValidationResult }): Promise<ProjectRecord | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const current = await this.get(projectId);
    if (!current) return null;
    const summary = opts.prompt.length > 32 ? opts.prompt.slice(0, 32) + '…' : opts.prompt;
    const label = `v${current.versions.length + 1} — ${summary}`;
    const { data: ver, error } = await supabase.from('project_versions').insert({
      project_id: projectId, user_id: user.id, label, prompt: opts.prompt, html: opts.html,
      validation: opts.validation as any,
    }).select().single();
    if (error) throw error;
    await supabase.from('projects').update({ active_version_id: ver.id, last_opened_at: new Date().toISOString() }).eq('id', projectId);
    return await this.get(projectId);
  },

  async setActiveVersion(projectId: string, versionId: string): Promise<ProjectRecord | null> {
    await supabase.from('projects').update({ active_version_id: versionId }).eq('id', projectId);
    return await this.get(projectId);
  },

  async remove(projectId: string) {
    await supabase.from('projects').delete().eq('id', projectId);
    if (localStorage.getItem(ACTIVE_KEY) === projectId) localStorage.removeItem(ACTIVE_KEY);
  },

  async rename(projectId: string, name: string) {
    await supabase.from('projects').update({ name }).eq('id', projectId);
  },
};

export function getActiveVersion(rec: ProjectRecord): ProjectVersion | null {
  return rec.versions.find(v => v.id === rec.activeVersionId) ?? rec.versions[rec.versions.length - 1] ?? null;
}
