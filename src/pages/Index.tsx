import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Download, Github, Code2, Crown } from 'lucide-react';
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
                <Github className="w-3.5 h-3.5" />
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
