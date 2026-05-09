import { motion, AnimatePresence } from 'framer-motion';
import { History, X, GitCompare, Check } from 'lucide-react';
import type { ProjectVersion } from '@/lib/projectStore';

interface Props {
  open: boolean;
  onClose: () => void;
  versions: ProjectVersion[];
  activeVersionId: string;
  onSelect: (id: string) => void;
  onCompare: () => void;
}

export default function VersionsPanel({ open, onClose, versions, activeVersionId, onSelect, onCompare }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -340, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[320px] glass-panel-strong border-r border-border/50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Version history</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {versions.length === 0 && <p className="text-xs text-muted-foreground p-3">No versions yet.</p>}
              {[...versions].reverse().map((v) => {
                const active = v.id === activeVersionId;
                return (
                  <button
                    key={v.id}
                    onClick={() => onSelect(v.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      active ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-border/80 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{v.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{v.prompt}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-muted-foreground/80">
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                      {v.validation && (
                        <span className={v.validation.ok ? 'text-emerald-600' : 'text-amber-600'}>
                          • {v.validation.stats.sizeKb}kb
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {versions.length >= 2 && (
              <div className="p-3 border-t border-border/50">
                <button
                  onClick={onCompare}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl gradient-gold text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <GitCompare className="w-3.5 h-3.5" /> Compare versions
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
