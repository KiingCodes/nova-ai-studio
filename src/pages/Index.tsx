import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Download, History, GitCompare, Plus, FolderOpen, Settings, FileCheck, LogOut, Package } from 'lucide-react';
import { toast } from 'sonner';
import PromptInput from '@/components/PromptInput';
import PreviewPanel from '@/components/PreviewPanel';
import ChatPanel from '@/components/ChatPanel';
import GenerationProcess from '@/components/GenerationProcess';
import VersionsPanel from '@/components/VersionsPanel';
import DiffView from '@/components/DiffView';
import ProjectsSidebar from '@/components/ProjectsSidebar';
import { useStreamingGenerator } from '@/lib/useStreamingGenerator';
import { projectStore, getActiveVersion, type ProjectRecord } from '@/lib/projectStore';
import { downloadReport } from '@/lib/validationReport';
import { exportProjectZip } from '@/lib/exportZip';
import { useAuth } from '@/lib/auth';

const extractName = (prompt: string): string => {
  const m = prompt.match(/(?:called|named)\s+([A-Z][a-zA-Z0-9]+)/);
  if (m) return m[1];
  const w = prompt.split(/\s+/).filter(x => /^[A-Z][a-z]+/.test(x))[0];
  return w || prompt.split(/\s+/)[0]?.slice(0, 24) || 'Project';
};

const Index = () => {
  const nav = useNavigate();
  const { user, loading, signOut } = useAuth();

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [view, setView] = useState<'prompt' | 'editor'>('prompt');
  const [livePrompt, setLivePrompt] = useState('');

  const { event, generate } = useStreamingGenerator();
  const isGenerating = ['thinking', 'streaming', 'validating', 'retrying'].includes(event.stage);

  // Auth gate
  useEffect(() => { if (!loading && !user) nav('/auth', { replace: true }); }, [user, loading, nav]);

  // Load projects + restore last
  const refreshProjects = useCallback(async () => {
    try {
      const list = await projectStore.list();
      setProjects(list);
      const id = projectStore.getActiveId();
      if (id) {
        const rec = list.find(p => p.id === id) ?? await projectStore.get(id);
        if (rec) { setProject(rec); setView('editor'); }
      }
    } catch (e: any) { console.error(e); }
  }, []);

  useEffect(() => { if (user) refreshProjects(); }, [user, refreshProjects]);

  const activeVersion = useMemo(() => project ? getActiveVersion(project) : null, [project]);

  const displayedHtml = isGenerating ? event.html : (activeVersion?.html ?? '');
  const displayedValidation = isGenerating ? event.validation : activeVersion?.validation;

  const handleGenerate = useCallback(async (prompt: string) => {
    if (!user) return nav('/auth');
    setLivePrompt(prompt);
    setView('editor');
    setChatOpen(false);
    try {
      const { html, validation } = await generate(prompt, undefined);
      const rec = await projectStore.create({ name: extractName(prompt), prompt, html, validation });
      setProject(rec);
      await refreshProjects();
      if (validation.errors.length > 0) toast.warning(`Generated with ${validation.errors.length} issue(s).`);
      else if (validation.warnings.length > 0) toast(`Generated · ${validation.warnings.length} suggestion(s).`);
      else toast.success('Generation complete ✨');
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed');
      if (!project) setView('prompt');
    }
  }, [generate, project, user, nav, refreshProjects]);

  const handleChatCommand = useCallback(async (command: string) => {
    if (!project || !activeVersion) return;
    setLivePrompt(command);
    try {
      const { html, validation } = await generate(command, activeVersion.html);
      const rec = await projectStore.addVersion(project.id, { prompt: command, html, validation });
      if (rec) setProject(rec);
      await refreshProjects();
      toast.success('Edit applied — new version saved.');
    } catch (e: any) { toast.error(e?.message || 'Edit failed'); }
  }, [project, activeVersion, generate, refreshProjects]);

  const handleDownload = () => {
    if (!activeVersion || !project) return;
    const blob = new Blob([activeVersion.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase()}-${activeVersion.label.replace(/\s.*/, '')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewProject = () => {
    projectStore.setActiveId(null);
    setProject(null);
    setView('prompt');
    setProjectsOpen(false);
  };

  const handleOpenProject = async (id: string) => {
    const rec = await projectStore.get(id);
    if (rec) { setProject(rec); setView('editor'); }
    setProjectsOpen(false);
  };

  const handleDeleteProject = async (id: string) => {
    await projectStore.remove(id);
    if (project?.id === id) { setProject(null); setView('prompt'); }
    await refreshProjects();
    toast.success('Project deleted');
  };

  const handleSelectVersion = async (versionId: string) => {
    if (!project) return;
    const rec = await projectStore.setActiveVersion(project.id, versionId);
    if (rec) setProject(rec);
    setVersionsOpen(false);
  };

  if (loading || !user) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setProjectsOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Projects</span>
          </button>
          {view === 'editor' && (
            <button onClick={handleNewProject} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
          <span className="text-xs font-mono text-muted-foreground hidden md:inline">kinging.dev</span>
          {project && view === 'editor' && (
            <span className="text-xs text-muted-foreground/70 hidden md:inline">/ {project.name} <span className="text-primary">{activeVersion?.label}</span></span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {project && view === 'editor' && (
            <>
              <button onClick={() => setVersionsOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all">
                <History className="w-3.5 h-3.5" /><span className="hidden sm:inline">{project.versions.length}</span>
              </button>
              {project.versions.length >= 2 && (
                <button onClick={() => setDiffOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all">
                  <GitCompare className="w-3.5 h-3.5" /><span className="hidden sm:inline">Diff</span>
                </button>
              )}
              {activeVersion && (
                <button onClick={() => downloadReport(project, activeVersion)} title="Export validation report" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all">
                  <FileCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setChatOpen(!chatOpen)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${chatOpen ? 'gradient-gold text-primary-foreground' : 'bg-secondary hover:bg-muted'}`}>
                <MessageSquare className="w-3.5 h-3.5" /><span className="hidden sm:inline">Edit</span>
              </button>
              <button onClick={handleDownload} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all">
                <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span>
              </button>
            </>
          )}
          <button onClick={() => nav('/account')} title="Account settings" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button onClick={async () => { await signOut(); nav('/auth'); }} title="Sign out" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {view === 'prompt' ? (
            <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center p-4 relative overflow-auto">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse-soft" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-accent/10 blur-3xl animate-pulse-soft" />
              </div>
              <PromptInput onGenerate={handleGenerate} isGenerating={isGenerating} />
            </motion.div>
          ) : (
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden relative">
              <PreviewPanel
                html={displayedHtml}
                isGenerating={isGenerating}
                streaming={event.stage === 'streaming' || event.stage === 'thinking' || event.stage === 'retrying'}
                validation={displayedValidation}
              />
              <GenerationProcess
                stage={event.stage} bytes={event.bytes} prompt={livePrompt}
                attempt={event.attempt} maxAttempts={event.maxAttempts}
                retryReason={event.retryReason} sections={event.sections}
              />
              <div className={`${chatOpen ? 'fixed inset-0 z-40 md:relative md:inset-auto' : 'hidden'}`}>
                <div className="md:hidden absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setChatOpen(false)} />
                <div className="absolute right-0 top-0 bottom-0 md:relative">
                  <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} onCommand={handleChatCommand} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProjectsSidebar
        open={projectsOpen} onClose={() => setProjectsOpen(false)}
        projects={projects} activeId={project?.id ?? null}
        onOpen={handleOpenProject} onDelete={handleDeleteProject} onNew={handleNewProject}
      />

      {project && (
        <>
          <VersionsPanel
            open={versionsOpen} onClose={() => setVersionsOpen(false)}
            versions={project.versions} activeVersionId={project.activeVersionId}
            onSelect={handleSelectVersion}
            onCompare={() => { setVersionsOpen(false); setDiffOpen(true); }}
          />
          <AnimatePresence>
            {diffOpen && (
              <DiffView open={diffOpen} onClose={() => setDiffOpen(false)} versions={project.versions} />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default Index;
