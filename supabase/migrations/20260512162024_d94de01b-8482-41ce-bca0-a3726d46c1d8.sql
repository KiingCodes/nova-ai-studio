
CREATE TABLE public.project_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL DEFAULT 'contact',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_submissions_project ON public.project_submissions(project_id, created_at DESC);

ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit"
ON public.project_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Owners view submissions"
ON public.project_submissions FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

CREATE POLICY "Owners delete submissions"
ON public.project_submissions FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
