DROP POLICY IF EXISTS "members view members" ON public.workspace_members;
DROP POLICY IF EXISTS "owners add members" ON public.workspace_members;
DROP POLICY IF EXISTS "owners remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "members view workspace" ON public.workspaces;
DROP POLICY IF EXISTS "ws members view projects" ON public.projects;
DROP POLICY IF EXISTS "ws members update projects" ON public.projects;

CREATE POLICY "users view own membership rows"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users create own owner membership"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "users remove own membership rows"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "owners and members view workspace"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace members view projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace members update projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
  )
);