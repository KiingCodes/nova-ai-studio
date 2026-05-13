
-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.workspace_role AS ENUM ('owner','editor','viewer');

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Membership helper (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws UUID, _uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id=_ws AND user_id=_uid)
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_ws UUID, _uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspaces WHERE id=_ws AND owner_id=_uid)
$$;

CREATE POLICY "members view workspace" ON public.workspaces FOR SELECT USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "users create workspace" ON public.workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owners update workspace" ON public.workspaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "owners delete workspace" ON public.workspaces FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "members view members" ON public.workspace_members FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "owners add members" ON public.workspace_members FOR INSERT WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "owners remove members" ON public.workspace_members FOR DELETE USING (public.is_workspace_owner(workspace_id, auth.uid()) OR user_id = auth.uid());

-- Add workspace_id to projects
ALTER TABLE public.projects ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill: a personal workspace for every existing user with projects
DO $$
DECLARE u RECORD;
DECLARE ws_id UUID;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.projects LOOP
    INSERT INTO public.workspaces (name, owner_id) VALUES ('Personal', u.user_id) RETURNING id INTO ws_id;
    INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, u.user_id, 'owner');
    UPDATE public.projects SET workspace_id = ws_id WHERE user_id = u.user_id AND workspace_id IS NULL;
  END LOOP;
END $$;

-- Auto-create personal workspace for new users
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, owner_id) VALUES ('Personal', NEW.id) RETURNING id INTO ws_id;
  INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES (ws_id, NEW.id, 'owner');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- Update projects RLS to include workspace members
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "ws members view projects" ON public.projects FOR SELECT
  USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())));
CREATE POLICY "ws members insert projects" ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ws members update projects" ON public.projects FOR UPDATE
  USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())));
CREATE POLICY "owners delete projects" ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Regen jobs
CREATE TABLE public.regen_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | running | done | failed
  progress INT NOT NULL DEFAULT 0,
  result_html TEXT,
  result_validation JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regen_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners view regen" ON public.regen_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners create regen" ON public.regen_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners update regen" ON public.regen_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete regen" ON public.regen_jobs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_regen_updated BEFORE UPDATE ON public.regen_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_regen_project ON public.regen_jobs(project_id);
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.regen_jobs;
