
-- ============== brand_assets ==============
CREATE TABLE public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  logo_url text,
  palette jsonb NOT NULL DEFAULT '[]'::jsonb,
  fonts jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_assets TO authenticated;
GRANT ALL ON public.brand_assets TO service_role;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage brand_assets" ON public.brand_assets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_brand_assets_updated BEFORE UPDATE ON public.brand_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_brand_assets_project ON public.brand_assets(project_id);

-- ============== style_memory ==============
CREATE TABLE public.style_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.style_memory TO authenticated;
GRANT ALL ON public.style_memory TO service_role;
ALTER TABLE public.style_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own style_memory" ON public.style_memory
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_style_memory_updated BEFORE UPDATE ON public.style_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== github_repos ==============
CREATE TABLE public.github_repos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  owner text NOT NULL,
  repo text NOT NULL,
  default_branch text NOT NULL DEFAULT 'main',
  html_url text,
  last_pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.github_repos TO authenticated;
GRANT ALL ON public.github_repos TO service_role;
ALTER TABLE public.github_repos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage github_repos" ON public.github_repos
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_github_repos_updated BEFORE UPDATE ON public.github_repos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== project_tables (AI-inferred schemas) ==============
CREATE TABLE public.project_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tables TO authenticated;
GRANT ALL ON public.project_tables TO service_role;
ALTER TABLE public.project_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage project_tables" ON public.project_tables
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_project_tables_updated BEFORE UPDATE ON public.project_tables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_project_tables_project ON public.project_tables(project_id);

-- ============== project_rows (generic rows per project_table) ==============
CREATE TABLE public.project_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.project_tables(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_rows TO authenticated;
GRANT ALL ON public.project_rows TO service_role;
ALTER TABLE public.project_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners view project_rows" ON public.project_rows
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_rows.project_id AND p.user_id = auth.uid()));
CREATE POLICY "owners delete project_rows" ON public.project_rows
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_rows.project_id AND p.user_id = auth.uid()));
CREATE INDEX idx_project_rows_table ON public.project_rows(table_id);
CREATE INDEX idx_project_rows_project ON public.project_rows(project_id);
