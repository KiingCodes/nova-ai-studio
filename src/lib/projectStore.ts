// Cloud-backed project store (Supabase). Replaces former localStorage version.
import { supabase } from '@/integrations/supabase/client';
import { type HtmlValidationResult } from './htmlValidator';
import { injectBackend } from './backendInject';
import { compileGeneratedHtml } from './htmlCompiler';

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
  workspaceId?: string | null;
  createdAt: number;
  updatedAt: number;
}

const ACTIVE_KEY = 'kinging.activeProjectId.v2';
const CACHE_KEY = 'kinging.projects.cache.v2';

const readCache = (): ProjectRecord[] => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
};

const writeCache = (records: ProjectRecord[]) => localStorage.setItem(CACHE_KEY, JSON.stringify(records));

const upsertCache = (rec: ProjectRecord) => {
  const rest = readCache().filter(p => p.id !== rec.id);
  writeCache([rec, ...rest].sort((a, b) => b.updatedAt - a.updatedAt));
};

const removeCache = (id: string) => writeCache(readCache().filter(p => p.id !== id));

const mapVersion = (r: any): ProjectVersion => ({
  id: r.id, label: r.label, prompt: r.prompt, html: r.html,
  createdAt: new Date(r.created_at).getTime(), validation: r.validation ?? undefined,
});

const mapProject = (p: any): ProjectRecord => ({
  id: p.id,
  name: p.name,
  initialPrompt: p.initial_prompt,
  activeVersionId: p.active_version_id ?? '',
  workspaceId: p.workspace_id ?? null,
  createdAt: new Date(p.created_at).getTime(),
  updatedAt: new Date(p.updated_at).getTime(),
  versions: (p.project_versions ?? []).map(mapVersion).sort((a: ProjectVersion, b: ProjectVersion) => a.createdAt - b.createdAt),
});

const ensureWorkspace = async (userId: string, preferredId?: string): Promise<string | undefined> => {
  if (preferredId && preferredId !== 'local-personal') return preferredId;
  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1);
  if (membershipError) throw membershipError;
  if (memberships?.[0]?.workspace_id) return memberships[0].workspace_id;

  const { data: ws, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({ name: 'Personal', owner_id: userId })
    .select('id')
    .single();
  if (workspaceError) throw workspaceError;
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: ws.id, user_id: userId, role: 'owner' });
  if (memberError) throw memberError;
  return ws.id;
};

export const projectStore = {
  getActiveId(): string | null { return localStorage.getItem(ACTIVE_KEY); },
  setActiveId(id: string | null) {
    if (id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY);
  },

  async list(workspaceId?: string): Promise<ProjectRecord[]> {
    try {
      let q = supabase.from('projects').select('*, project_versions(*)').order('last_opened_at', { ascending: false });
      if (workspaceId) q = q.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
      const { data: projects, error } = await q;
      if (error) throw error;
      const mapped = (projects ?? []).map(mapProject);
      mapped.forEach(upsertCache);
      return mapped.length ? mapped : readCache().filter(p => !workspaceId || !p.workspaceId || p.workspaceId === workspaceId);
    } catch (error) {
      console.warn('Using cached projects because cloud projects could not load', error);
      return readCache().filter(p => !workspaceId || !p.workspaceId || p.workspaceId === workspaceId);
    }
  },

  async get(id: string): Promise<ProjectRecord | null> {
    const { data: p, error } = await supabase
      .from('projects').select('*, project_versions(*)').eq('id', id).maybeSingle();
    if (error || !p) return readCache().find(x => x.id === id) ?? null;
    await supabase.from('projects').update({ last_opened_at: new Date().toISOString() }).eq('id', id);
    const rec = mapProject(p);
    upsertCache(rec);
    return rec;
  },

  async create(opts: { name: string; prompt: string; html: string; validation?: HtmlValidationResult; workspaceId?: string }): Promise<ProjectRecord> {
    const makeLocal = (): ProjectRecord => {
      const now = Date.now();
      const id = `local-${crypto.randomUUID()}`;
      const version: ProjectVersion = { id: `local-version-${crypto.randomUUID()}`, label: 'v1', prompt: opts.prompt, html: injectBackend(compileGeneratedHtml(opts.html), id), createdAt: now, validation: opts.validation };
      const rec: ProjectRecord = { id, name: opts.name, initialPrompt: opts.prompt, versions: [version], activeVersionId: version.id, workspaceId: opts.workspaceId ?? null, createdAt: now, updatedAt: now };
      upsertCache(rec); localStorage.setItem(ACTIVE_KEY, id);
      return rec;
    };
    let user;
    try {
      const res = await supabase.auth.getUser();
      user = res.data.user;
    } catch { return makeLocal(); }
    if (!user) return makeLocal();
    let wsId = opts.workspaceId;
    try { wsId = await ensureWorkspace(user.id, wsId); }
    catch (error) { console.warn('Could not ensure workspace before save', error); wsId = undefined; }
    const { data: proj, error: e1 } = await supabase.from('projects')
      .insert({ user_id: user.id, name: opts.name, initial_prompt: opts.prompt, workspace_id: wsId }).select().single();
    if (e1) { console.error('Project save failed', e1); return makeLocal(); }
    const finalHtml = injectBackend(compileGeneratedHtml(opts.html), proj.id);
    const { data: ver, error: e2 } = await supabase.from('project_versions').insert({
      project_id: proj.id, user_id: user.id, label: 'v1', prompt: opts.prompt, html: finalHtml,
      validation: opts.validation as any,
    }).select().single();
    if (e2) { console.error('Project version save failed', e2); return makeLocal(); }
    await supabase.from('projects').update({ active_version_id: ver.id }).eq('id', proj.id);
    localStorage.setItem(ACTIVE_KEY, proj.id);
    const rec = (await this.get(proj.id))!;
    upsertCache(rec);
    return rec;
  },

  async addVersion(projectId: string, opts: { prompt: string; html: string; validation?: HtmlValidationResult }): Promise<ProjectRecord | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const current = await this.get(projectId);
    if (!current) return null;
    const summary = opts.prompt.length > 32 ? opts.prompt.slice(0, 32) + '…' : opts.prompt;
    const label = `v${current.versions.length + 1} — ${summary}`;
    const finalHtml = injectBackend(compileGeneratedHtml(opts.html), projectId);
    const localVersion: ProjectVersion = { id: `local-version-${crypto.randomUUID()}`, label, prompt: opts.prompt, html: finalHtml, createdAt: Date.now(), validation: opts.validation };
    const localRec = { ...current, versions: [...current.versions, localVersion], activeVersionId: localVersion.id, updatedAt: Date.now() };
    const { data: ver, error } = await supabase.from('project_versions').insert({
      project_id: projectId, user_id: user.id, label, prompt: opts.prompt, html: finalHtml,
      validation: opts.validation as any,
    }).select().single();
    if (error) { upsertCache(localRec); return localRec; }
    await supabase.from('projects').update({ active_version_id: ver.id, last_opened_at: new Date().toISOString() }).eq('id', projectId);
    const rec = await this.get(projectId);
    if (rec) upsertCache(rec);
    return rec;
  },

  async setActiveVersion(projectId: string, versionId: string): Promise<ProjectRecord | null> {
    await supabase.from('projects').update({ active_version_id: versionId }).eq('id', projectId);
    return await this.get(projectId);
  },

  async remove(projectId: string) {
    removeCache(projectId);
    if (!projectId.startsWith('local-')) await supabase.from('projects').delete().eq('id', projectId);
    if (localStorage.getItem(ACTIVE_KEY) === projectId) localStorage.removeItem(ACTIVE_KEY);
  },

  async rename(projectId: string, name: string) {
    await supabase.from('projects').update({ name }).eq('id', projectId);
  },
};

export function getActiveVersion(rec: ProjectRecord): ProjectVersion | null {
  return rec.versions.find(v => v.id === rec.activeVersionId) ?? rec.versions[rec.versions.length - 1] ?? null;
}
