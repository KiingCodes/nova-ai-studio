import { useMemo, useState } from 'react';
import { diffLines } from 'diff';
import { motion } from 'framer-motion';
import { X, GitCompare } from 'lucide-react';
import type { ProjectVersion } from '@/lib/projectStore';

interface Props {
  open: boolean;
  onClose: () => void;
  versions: ProjectVersion[];
  initialFromId?: string;
  initialToId?: string;
}

export default function DiffView({ open, onClose, versions, initialFromId, initialToId }: Props) {
  const [fromId, setFromId] = useState(initialFromId ?? versions[versions.length - 2]?.id ?? versions[0]?.id);
  const [toId, setToId] = useState(initialToId ?? versions[versions.length - 1]?.id);

  const from = versions.find(v => v.id === fromId);
  const to = versions.find(v => v.id === toId);

  const parts = useMemo(() => {
    if (!from || !to) return [];
    return diffLines(from.html, to.html);
  }, [from, to]);

  const stats = useMemo(() => {
    let added = 0, removed = 0;
    for (const p of parts) {
      const lines = p.value.split('\n').length - 1;
      if (p.added) added += lines;
      else if (p.removed) removed += lines;
    }
    return { added, removed };
  }, [parts]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="glass-panel-strong rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Compare versions</h3>
            <span className="text-xs font-mono text-muted-foreground ml-2">
              <span className="text-emerald-600">+{stats.added}</span> <span className="text-rose-600">−{stats.removed}</span>
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50 bg-muted/30 text-xs">
          <select value={fromId} onChange={e => setFromId(e.target.value)} className="px-2 py-1.5 rounded-lg bg-card border border-border text-xs">
            {versions.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          <span className="text-muted-foreground">→</span>
          <select value={toId} onChange={e => setToId(e.target.value)} className="px-2 py-1.5 rounded-lg bg-card border border-border text-xs">
            {versions.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed bg-muted/20">
          {!from || !to ? (
            <p className="text-muted-foreground">Select two versions to compare.</p>
          ) : (
            <pre className="whitespace-pre-wrap break-all">
              {parts.map((p, i) => (
                <span
                  key={i}
                  className={
                    p.added ? 'block bg-emerald-500/15 text-emerald-700 border-l-2 border-emerald-500 pl-2' :
                    p.removed ? 'block bg-rose-500/15 text-rose-700 border-l-2 border-rose-500 pl-2' :
                    'block text-muted-foreground/70'
                  }
                >
                  {p.added ? '+ ' : p.removed ? '- ' : '  '}{p.value.replace(/\n$/, '')}
                </span>
              ))}
            </pre>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
