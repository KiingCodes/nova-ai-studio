import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Download, Code2, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';
import PromptInput from '@/components/PromptInput';
import PreviewPanel from '@/components/PreviewPanel';
import ChatPanel from '@/components/ChatPanel';
import { generateProject, type GeneratedProject } from '@/lib/templates';

const Index = () => {
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [view, setView] = useState<'prompt' | 'editor'>('prompt');

  const handleGenerate = useCallback((prompt: string) => {
    setIsGenerating(true);
    setView('editor');
    setChatOpen(false);

    setTimeout(() => {
      const generated = generateProject(prompt);
      setProject(generated);
      setIsGenerating(false);
    }, 2000);
  }, []);

  const handleChatCommand = useCallback((command: string) => {
    if (!project) return;
    setIsGenerating(true);
    setTimeout(() => {
      const updated = generateProject(project.prompt + ' ' + command);
      setProject({ ...updated, id: project.id });
      setIsGenerating(false);
    }, 1200);
  }, [project]);

  const handleDownload = () => {
    if (!project) return;
    const blob = new Blob([project.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase()}-project.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/60 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('prompt')}>
          {view === 'editor' && (
            <ArrowLeft className="w-4 h-4 text-muted-foreground md:hidden" />
          )}
          <img src={logo} alt="kinging.dev" className="h-7 object-contain" />
        </div>

        {project && view === 'editor' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                chatOpen
                  ? 'gradient-gold text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted text-xs font-medium transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted text-xs font-medium transition-all">
              <Code2 className="w-3.5 h-3.5" />
              Code
            </button>
          </div>
        )}

        <span className="text-[10px] text-muted-foreground font-medium hidden sm:block">v1.0 Beta</span>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'prompt' ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center p-4 relative overflow-auto"
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
              </div>
              <PromptInput onGenerate={handleGenerate} isGenerating={isGenerating} />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              <PreviewPanel html={project?.html || ''} isGenerating={isGenerating} />
              {/* Chat panel only on larger screens or overlay on mobile */}
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
    </div>
  );
};

export default Index;
