import { supabase } from '@/integrations/supabase/client';

export interface Workspace { id: string; name: string; ownerId: string }

const KEY = 'kinging.activeWorkspaceId';

export const workspaceStore = {
  getActiveId(): string | null { return localStorage.getItem(KEY); },
  setActiveId(id: string | null) { id ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY); },

  async list(): Promise<Workspace[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    // Membership-driven list
    const { data: memberships } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id);
    const ids = (memberships ?? []).map(m => m.workspace_id);
    if (!ids.length) return [];
    const { data: ws } = await supabase.from('workspaces').select('id,name,owner_id').in('id', ids).order('created_at');
    return (ws ?? []).map((w: any) => ({ id: w.id, name: w.name, ownerId: w.owner_id }));
  },

  async create(name: string): Promise<Workspace> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data: ws, error } = await supabase.from('workspaces').insert({ name, owner_id: user.id }).select().single();
    if (error) throw error;
    await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' });
    return { id: ws.id, name: ws.name, ownerId: ws.owner_id };
  },

  async ensureDefault(): Promise<string> {
    const list = await this.list();
    if (list.length) return list[0].id;
    const w = await this.create('Personal');
    return w.id;
  },
};
