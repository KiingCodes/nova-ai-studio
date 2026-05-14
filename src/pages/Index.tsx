import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Download, History, GitCompare, Plus, FolderOpen, Settings, FileCheck, LogOut, Package, Sparkles, Clock, Image as ImageIcon, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import PromptInput from '@/components/PromptInput';
import PreviewPanel from '@/components/PreviewPanel';
import ChatPanel from '@/components/ChatPanel';
import GenerationProcess from '@/components/GenerationProcess';
import VersionsPanel from '@/components/VersionsPanel';
import DiffView from '@/components/DiffView';
import ProjectsSidebar from '@/components/ProjectsSidebar';
import ImportRepoDialog from '@/components/ImportRepoDialog';
import WorkspaceSelector from '@/components/WorkspaceSelector';
import RegenStatus from '@/components/RegenStatus';
import AiDebugPanel from '@/components/AiDebugPanel';
import MediaPicker from '@/components/MediaPicker';
import { openInVSCode } from '@/lib/openInVscode';
import { useStreamingGenerator } from '@/lib/useStreamingGenerator';
import { projectStore, getActiveVersion, type ProjectRecord } from '@/lib/projectStore';
import { workspaceStore } from '@/lib/workspaces';
import { regenJobs } from '@/lib/regenJobs';
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
  const [workspaceId, setWorkspaceId] = useState<string | null>(workspaceStore.getActiveId());
  const [chatOpen, setChatOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugErrors, setDebugErrors] = useState<any[]>([]);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [view, setView] = useState<'prompt' | 'editor'>('prompt');
  const [livePrompt, setLivePrompt] = useState('');

  const { event, generate } = useStreamingGenerator();
  const isGenerating = ['thinking', 'streaming', 'validating', 'retrying'].includes(event.stage);

  useEffect(() => { if (!loading && !user) nav('/auth', { replace: true }); }, [user, loading, nav]);

  // Ensure workspace
  useEffect(() => {
    if (!user) return;
    (async () => {
      const id = workspaceId ?? await workspaceStore.ensureDefault();
      if (!workspaceId) { workspaceStore.setActiveId(id); setWorkspaceId(id); }
    })();
  }, [user, workspaceId]);

  const refreshProjects = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const list = await projectStore.list(workspaceId);
      setProjects(list);
      const id = projectStore.getActiveId();
      if (id) {
        const rec = list.find(p => p.id === id) ?? await projectStore.get(id);
        if (rec) { setProject(rec); setView('editor'); }
      }
    } catch (e: any) { console.error(e); }
  }, [workspaceId]);

  useEffect(() => { if (user && workspaceId) refreshProjects(); }, [user, workspaceId, refreshProjects]);

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
      const rec = await projectStore.create({ name: extractName(prompt), prompt, html, validation, workspaceId: workspaceId ?? undefined });
      setProject(rec);
      await refreshProjects();
      if (validation.errors.length > 0) toast.warning(`Generated with ${validation.errors.length} issue(s).`);
      else if (validation.warnings.length > 0) toast(`Generated · ${validation.warnings.length} suggestion(s).`);
      else toast.success('Generation complete ✨');
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed');
      if (!project) setView('prompt');
    }
  }, [generate, project, user, nav, refreshProjects, workspaceId]);

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

  const handleBackgroundRegen = useCallback(async (instruction: string) => {
    if (!project) return;
    try {
      await regenJobs.start(project.id, instruction);
      toast.success('Regeneration queued — runs in background');
    } catch (e: any) { toast.error(e?.message || 'Failed to queue'); }
  }, [project]);

  const handleDownloadHtml = () => {
    if (!activeVersion || !project) return;
    const blob = new Blob([activeVersion.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase()}-${activeVersion.label.replace(/\s.*/, '')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    if (!activeVersion || !project) return;
    try { await exportProjectZip(project, activeVersion); toast.success('ZIP downloaded'); }
    catch (e: any) { toast.error(e?.message || 'Export failed'); }
  };

  const handleNewProject = () => { projectStore.setActiveId(null); setProject(null); setView('prompt'); setProjectsOpen(false); };

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

  const handleAiDebug = (errs: any[]) => { setDebugErrors(errs); setDebugOpen(true); };

  const handleApplyAiFix = (fixPrompt: string) => { handleChatCommand(fixPrompt); };

  const handleWorkspaceChange = (id: string) => {
    workspaceStore.setActiveId(id);
    setWorkspaceId(id);
    setProject(null); setView('prompt');
  };

  if (loading || !user) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="flex items-center justify-between gap-2 px-2 sm:px-3 py-2 border-b border-border bg-card/60 backdrop-blur-xl z-10 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button onClick={handleNewProject} title="Home / New project" className="flex items-center justify-center w-8 h-8 rounded-lg gradient-gold text-primary-foreground font-bold text-xs shrink-0">
            K
          </button>
          <WorkspaceSelector activeId={workspaceId} onChange={handleWorkspaceChange} />
          <button onClick={() => setProjectsOpen(true)} className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Projects</span>
          </button>
          {view === 'editor' && (
            <button onClick={handleNewProject} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
          {project && view === 'editor' && (
            <span className="text-xs text-muted-foreground/70 hidden md:inline">/ {project.name} <span className="text-primary">{activeVersion?.label}</span></span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
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
              <button onClick={() => { setDebugErrors([]); setDebugOpen(true); }} title="AI debug" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all">
                <Sparkles className="w-3.5 h-3.5" /><span className="hidden sm:inline">Debug</span>
              </button>
              <button
                onClick={() => {
                  const inst = window.prompt('Background regen instruction (runs without blocking the UI):');
                  if (inst?.trim()) handleBackgroundRegen(inst.trim());
                }}
                title="Queue background regeneration"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
              {activeVersion && (
                <button onClick={() => downloadReport(project, activeVersion)} title="Export validation report" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all">
                  <FileCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setChatOpen(!chatOpen)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${chatOpen ? 'gradient-gold text-primary-foreground' : 'bg-secondary hover:bg-muted'}`}>
                <MessageSquare className="w-3.5 h-3.5" /><span className="hidden sm:inline">Edit</span>
              </button>
              <button onClick={handleDownloadHtml} title="Download single HTML file" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all">
                <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">HTML</span>
              </button>
              <button onClick={handleDownloadZip} title="Download as ZIP (deploy-ready)" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg gradient-gold text-primary-foreground text-xs font-semibold transition-all hover:opacity-90">
                <Package className="w-3.5 h-3.5" /><span className="hidden sm:inline">ZIP</span>
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
                onAiDebug={handleAiDebug}
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
        onImportRepo={() => { setProjectsOpen(false); setImportOpen(true); }}
      />

      <ImportRepoDialog
        open={importOpen} onClose={() => setImportOpen(false)}
        workspaceId={workspaceId ?? undefined}
        onImported={async (id) => { await refreshProjects(); await handleOpenProject(id); }}
      />

      <AiDebugPanel
        open={debugOpen} onClose={() => setDebugOpen(false)}
        html={displayedHtml} errors={debugErrors} validation={displayedValidation}
        onApplyFix={handleApplyAiFix}
      />

      <RegenStatus onJobDone={() => { if (project) projectStore.get(project.id).then(r => r && setProject(r)); }} />

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
