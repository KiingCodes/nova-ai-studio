import { useEffect, useRef, useState } from 'react';
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

const VIEWPORT_W = 1280;
const VIEWPORT_H = 720;

function ProjectThumb({ html }: { html?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / VIEWPORT_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!html) {
    return (
      <div className="w-full h-32 rounded-t-lg bg-zinc-900/60 flex items-center justify-center text-muted-foreground/40">
        <ImageOff className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div ref={ref} className="relative w-full h-32 rounded-t-lg overflow-hidden bg-zinc-950 pointer-events-none">
      <iframe
        title="thumbnail"
        sandbox="allow-same-origin"
        srcDoc={html}
        loading="lazy"
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: `${VIEWPORT_W}px`,
          height: `${VIEWPORT_H}px`,
          transform: `scale(${scale})`,
          border: 0,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-primary/10" />
    </div>
  );
}

export default function ProjectsSidebar({ open, onClose, projects, activeId, onOpen, onDelete, onNew, onImportRepo }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ x: -360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -360, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[88vw] max-w-[360px] bg-zinc-950/80 backdrop-blur-md border-r border-zinc-800/40 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40">
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
                    active ? 'border-primary/60 bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]' : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                  }`}>
                    <button onClick={() => onOpen(p.id)} className="w-full text-left">
                      <ProjectThumb html={latest} />
                      <div className="p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate flex-1">{p.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md text-amber-500 bg-amber-500/10 border border-amber-500/20">v{p.versions.length}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">{p.initialPrompt}</p>
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
