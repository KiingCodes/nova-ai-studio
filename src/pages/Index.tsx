import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Download, Code2 } from 'lucide-react';
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

    // Simulate generation delay
    setTimeout(() => {
      const generated = generateProject(prompt);
      setProject(generated);
      setIsGenerating(false);
    }, 2000);
  }, []);

  const handleChatCommand = useCallback((command: string) => {
    if (!project) return;
    // For now, regenerate with modified prompt
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
      <header className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-card/40 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('prompt'); }}>
          <img src={logo} alt="kinging.dev" className="h-8 object-contain" />
        </div>

        <AnimatePresence>
          {project && view === 'editor' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  chatOpen ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium transition-all">
                <Code2 className="w-3.5 h-3.5" />
                Code
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">v1.0 Beta</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'prompt' ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
            >
              {/* Background effects */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
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
              <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} onCommand={handleChatCommand} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
