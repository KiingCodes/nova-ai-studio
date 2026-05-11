import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Code2, ShieldCheck, Sparkles, Check, RotateCw, Loader2, Circle } from 'lucide-react';
import type { GenStage, BuildSection } from '@/lib/useStreamingGenerator';

interface Props {
  stage: GenStage;
  bytes: number;
  prompt: string;
  attempt?: number;
  maxAttempts?: number;
  retryReason?: string;
  sections?: BuildSection[];
}

const STAGE_ORDER: GenStage[] = ['thinking', 'streaming', 'validating', 'done'];
const stageIndex = (s: GenStage) => {
  if (s === 'retrying') return 1;
  return STAGE_ORDER.indexOf(s);
};

export default function GenerationProcess({ stage, bytes, prompt, attempt = 0, maxAttempts = 1, retryReason, sections = [] }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const visible = stage !== 'idle' && stage !== 'done' && stage !== 'error';

  useEffect(() => {
    if (!visible) { setElapsed(0); return; }
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 100) / 10), 100);
    return () => clearInterval(t);
  }, [visible]);

  const idx = stageIndex(stage);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(640px,calc(100%-2rem))] glass-panel-strong rounded-2xl p-4 shadow-xl"
        >
          {/* header */}
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
            />
            <p className="text-xs font-mono text-muted-foreground truncate flex-1">"{prompt}"</p>
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{elapsed.toFixed(1)}s</span>
          </div>

          {/* retry banner */}
          {stage === 'retrying' && (
            <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-amber-500/10 text-amber-700 text-[11px]">
              <RotateCw className="w-3.5 h-3.5 mt-0.5 animate-spin flex-shrink-0" />
              <div>
                <span className="font-semibold">Retry {attempt}/{maxAttempts - 1}</span>
                {retryReason && <span className="block text-amber-700/80 mt-0.5">{retryReason}</span>}
              </div>
            </div>
          )}

          {/* stage list */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
            {[
              { i: 0, label: 'Analyzing prompt', icon: Brain },
              { i: 1, label: 'Generating HTML', icon: Code2, suffix: stage === 'streaming' || stage === 'retrying' ? `${(bytes / 1024).toFixed(1)} kb` : undefined },
              { i: 2, label: 'Validating output', icon: ShieldCheck },
              { i: 3, label: 'Polishing', icon: Sparkles },
            ].map(({ i, label, icon: Icon, suffix }) => {
              const active = i === idx;
              const done = i < idx;
              return (
                <div key={i} className={`flex items-center gap-2 text-xs ${active ? 'text-foreground font-medium' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${done ? 'bg-primary/20 text-primary' : active ? 'bg-primary/15 text-primary' : 'bg-muted'}`}>
                    {done ? <Check className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
                  </div>
                  <span className="flex-1 truncate">{label}</span>
                  {suffix && active && <span className="text-[10px] font-mono text-primary tabular-nums">{suffix}</span>}
                </div>
              );
            })}
          </div>

          {/* file-by-file build view */}
          {(stage === 'streaming' || stage === 'retrying' || stage === 'validating') && sections.length > 0 && (
            <div className="border-t border-border/50 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Building sections</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {sections.filter(s => s.status === 'done').length} / {sections.length}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                {sections.map((s) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono ${
                      s.status === 'done' ? 'bg-emerald-500/10 text-emerald-700' :
                      s.status === 'building' ? 'bg-primary/10 text-primary' :
                      'text-muted-foreground/50'
                    }`}
                  >
                    {s.status === 'done' ? <Check className="w-2.5 h-2.5 flex-shrink-0" /> :
                     s.status === 'building' ? <Loader2 className="w-2.5 h-2.5 animate-spin flex-shrink-0" /> :
                     <Circle className="w-2 h-2 flex-shrink-0" />}
                    <span className="truncate">{s.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
