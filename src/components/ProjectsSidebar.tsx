import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, X, Trash2, Plus, FileText, GitFork } from 'lucide-react';
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

export default function ProjectsSidebar({ open, onClose, projects, activeId, onOpen, onDelete, onNew, onImportRepo }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: -360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -360, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[340px] glass-panel-strong border-r border-border/50 flex flex-col"
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

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {projects.length === 0 && (
                <div className="text-center py-12 px-4">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No projects yet. Generate your first site!</p>
                </div>
              )}
              {projects.map((p) => {
                const active = p.id === activeId;
                return (
                  <div key={p.id} className={`group flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                    active ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-border/80 hover:bg-secondary/50'
                  }`}>
                    <button onClick={() => onOpen(p.id)} className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate">{p.name}</span>
                        <span className="text-[10px] text-primary font-mono">v{p.versions.length}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{p.initialPrompt}</p>
                      <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${p.name}"? This cannot be undone.`)) onDelete(p.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      aria-label="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
