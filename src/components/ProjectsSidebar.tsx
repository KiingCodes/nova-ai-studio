import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, X, Trash2, Plus, FileText, GitFork, ImageOff } from 'lucide-react';
import type { ProjectRecord } from '@/lib/projectStore';

interface Props {
  open: boolean;
  onClose: () => void;
  projects: ProjectRecord[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onImportRepo?: () => void;
}

function ProjectThumb({ html }: { html?: string }) {
  if (!html) {
    return (
      <div className="w-full aspect-video rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground/40">
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border/60 bg-card pointer-events-none shadow-lg">
      <iframe
        title="thumbnail"
        sandbox=""
        srcDoc={html}
        loading="lazy"
        className="absolute top-0 left-0"
        style={{
          width: '1440px',
          height: '900px',
          transform: 'scale(0.21)',
          transformOrigin: 'top left',
          border: 0,
          imageRendering: 'crisp-edges',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-background/10 via-transparent to-primary/10 ring-1 ring-inset ring-primary/10" />
    </div>
  );
}

export default function ProjectsSidebar({ open, onClose, projects, activeId, onOpen, onDelete, onNew, onImportRepo }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: -360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -360, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[88vw] max-w-[360px] glass-panel-strong border-r border-border/50 flex flex-col page-brand-bg"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Your projects</h3>
                <span className="text-[10px] text-muted-foreground">({projects.length})</span>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>

            <div className="m-3 grid grid-cols-2 gap-2">
              <button onClick={onNew} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl gradient-gold text-primary-foreground text-xs font-semibold hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /> New
              </button>
              <button onClick={onImportRepo} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-secondary hover:bg-muted text-foreground text-xs font-semibold">
                <GitFork className="w-3.5 h-3.5" /> Clone repo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
              {projects.length === 0 && (
                <div className="text-center py-12 px-4">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No projects yet. Generate your first site!</p>
                </div>
              )}
              {projects.map((p) => {
                const active = p.id === activeId;
                const latest = p.versions[p.versions.length - 1]?.html;
                return (
                  <div key={p.id} className={`group rounded-xl border transition-all overflow-hidden ${
                    active ? 'border-primary/60 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]' : 'border-border bg-card/60 hover:border-border/80 hover:bg-secondary/50'
                  }`}>
                    <button onClick={() => onOpen(p.id)} className="w-full text-left p-2">
                      <ProjectThumb html={latest} />
                      <div className="flex items-center gap-1.5 mt-2 px-1">
                        <span className="text-xs font-semibold truncate flex-1">{p.name}</span>
                        <span className="text-[10px] text-primary font-mono">v{p.versions.length}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5 px-1">{p.initialPrompt}</p>
                      <div className="flex items-center justify-between mt-1 px-1">
                        <p className="text-[10px] text-muted-foreground/70 font-mono">
                          {new Date(p.updatedAt).toLocaleDateString()}
                        </p>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${p.name}"? This cannot be undone.`)) onDelete(p.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          aria-label="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
