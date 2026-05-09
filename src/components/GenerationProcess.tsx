import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Code2, ShieldCheck, Sparkles, Check } from 'lucide-react';
import type { GenStage } from '@/lib/useStreamingGenerator';

interface Props {
  stage: GenStage;
  bytes: number;
  prompt: string;
}

const STEPS: { key: GenStage | 'analyzing'; label: string; icon: typeof Brain; match: GenStage[] }[] = [
  { key: 'analyzing', label: 'Analyzing your prompt', icon: Brain, match: ['thinking'] },
  { key: 'streaming', label: 'Designing & writing HTML', icon: Code2, match: ['streaming'] },
  { key: 'validating', label: 'Validating output', icon: ShieldCheck, match: ['validating'] },
  { key: 'done', label: 'Polishing & ready', icon: Sparkles, match: ['done'] },
];

const stageIndex = (s: GenStage) => {
  if (s === 'thinking') return 0;
  if (s === 'streaming') return 1;
  if (s === 'validating') return 2;
  if (s === 'done') return 3;
  return -1;
};

export default function GenerationProcess({ stage, bytes, prompt }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const idx = stageIndex(stage);

  useEffect(() => {
    if (stage === 'idle' || stage === 'done' || stage === 'error') return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 100) / 10), 100);
    return () => clearInterval(t);
  }, [stage]);

  return (
    <AnimatePresence>
      {stage !== 'idle' && stage !== 'done' && stage !== 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(540px,calc(100%-2rem))] glass-panel-strong rounded-2xl p-4 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
            />
            <p className="text-xs font-mono text-muted-foreground truncate flex-1">"{prompt}"</p>
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{elapsed.toFixed(1)}s</span>
          </div>

          <div className="space-y-1.5">
            {STEPS.map((step, i) => {
              const active = i === idx;
              const done = i < idx;
              const Icon = step.icon;
              return (
                <div key={step.key} className={`flex items-center gap-2.5 text-xs transition-all ${
                  active ? 'text-foreground font-medium' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-primary/20 text-primary' : active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground/50'
                  }`}>
                    {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  </div>
                  <span className="flex-1">{step.label}</span>
                  {active && step.key === 'streaming' && (
                    <span className="text-[10px] font-mono tabular-nums text-primary">{(bytes / 1024).toFixed(1)} kb</span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
