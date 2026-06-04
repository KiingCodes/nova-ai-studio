import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Code2, ShieldCheck, Sparkles, Check, RotateCw, Loader2, Circle, X, Image as ImageIcon, Timer } from 'lucide-react';
import type { GenStage, BuildSection } from '@/lib/useStreamingGenerator';

interface Props {
  stage: GenStage;
  bytes: number;
  prompt: string;
  attempt?: number;
  maxAttempts?: number;
  retryReason?: string;
  sections?: BuildSection[];
  onCancel?: () => void;
  onRetry?: () => void;
}

const STAGE_ORDER: GenStage[] = ['thinking', 'streaming', 'validating', 'done'];
const stageIndex = (s: GenStage) => (s === 'retrying' ? 1 : STAGE_ORDER.indexOf(s));

// Rough estimate: premium gen lands around ~32s
const TARGET_MS = 32000;

export default function GenerationProcess({
  stage, bytes, prompt, attempt = 0, maxAttempts = 1, retryReason, sections = [],
  onCancel, onRetry,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const visible = stage !== 'idle' && stage !== 'done';
  const isError = stage === 'error';
  const startRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<{ t: number; msg: string }[]>([]);
  const lastSig = useRef<string>('');

  useEffect(() => {
    if (!visible) { setElapsed(0); startRef.current = null; setLogs([]); lastSig.current = ''; return; }
    if (startRef.current == null) startRef.current = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 100) / 10), 100);
    return () => clearInterval(t);
  }, [visible]);

  // Append log lines as sections move to building/done
  useEffect(() => {
    if (!visible) return;
    const sig = sections.map(s => `${s.name}:${s.status}`).join('|') + '|' + stage + '|' + attempt;
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    const lines: string[] = [];
    if (stage === 'thinking') lines.push('Analyzing prompt & planning brand…');
    if (stage === 'retrying') lines.push(`Retrying (${attempt}/${maxAttempts - 1})${retryReason ? ' — ' + retryReason : ''}`);
    for (const s of sections) {
      if (s.status === 'building') lines.push(`→ Building ${s.name}…`);
      else if (s.status === 'done') lines.push(`✓ ${s.name}`);
    }
    if (stage === 'validating') lines.push('Validating HTML & polishing…');
    if (lines.length) {
      setLogs(prev => {
        const seen = new Set(prev.map(l => l.msg));
        const fresh = lines.filter(l => !seen.has(l)).map(msg => ({ t: Date.now(), msg }));
        return [...prev, ...fresh].slice(-30);
      });
    }
  }, [sections, stage, attempt, maxAttempts, retryReason, visible]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  const idx = stageIndex(stage);
  const eta = Math.max(0, (TARGET_MS / 1000) - elapsed);
  const pct = Math.min(100, Math.round((elapsed * 1000 / TARGET_MS) * 100));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-30 sm:w-[min(640px,calc(100%-2rem))] glass-panel-strong rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl border border-primary/20"
        >
          {/* header */}
          <div className="flex items-center gap-2 mb-2">
            {isError ? (
              <div className="w-6 h-6 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </div>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
              />
            )}
            <p className="text-[11px] font-mono text-muted-foreground truncate flex-1">"{prompt}"</p>
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground tabular-nums">
              <Timer className="w-3 h-3" />
              <span>{elapsed.toFixed(1)}s</span>
              {!isError && stage !== 'validating' && <span className="text-primary">· ~{eta.toFixed(0)}s left</span>}
            </div>
          </div>

          {/* progress bar */}
          {!isError && (
            <div className="h-1 rounded-full bg-muted overflow-hidden mb-3">
              <motion.div
                className="h-full gradient-gold"
                animate={{ width: `${pct}%` }}
                transition={{ ease: 'linear', duration: 0.4 }}
              />
            </div>
          )}

          {/* retry banner */}
          {stage === 'retrying' && (
            <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-amber-500/10 text-amber-300 text-[11px] border border-amber-500/20">
              <RotateCw className="w-3.5 h-3.5 mt-0.5 animate-spin flex-shrink-0" />
              <div>
                <span className="font-semibold">Retry {attempt}/{maxAttempts - 1}</span>
                {retryReason && <span className="block opacity-80 mt-0.5">{retryReason}</span>}
              </div>
            </div>
          )}

          {/* error banner */}
          {isError && (
            <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-[11px] border border-destructive/20">
              <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Generation failed</span>
                <span className="block opacity-80 mt-0.5">Tap Retry to try again, or cancel to start over.</span>
              </div>
            </div>
          )}

          {/* stage list */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
            {[
              { i: 0, label: 'Analyzing prompt', icon: Brain },
              { i: 1, label: 'Processing logo & brand', icon: ImageIcon, suffix: sections.find(s => s.name === 'brand & logo')?.status === 'done' ? 'done' : undefined },
              { i: 1, label: 'Generating HTML', icon: Code2, suffix: stage === 'streaming' || stage === 'retrying' ? `${(bytes / 1024).toFixed(1)} kb` : undefined },
              { i: 2, label: 'Validating output', icon: ShieldCheck },
              { i: 3, label: 'Polishing', icon: Sparkles },
            ].map(({ i, label, icon: Icon, suffix }, k) => {
              const active = i === idx;
              const done = i < idx;
              return (
                <div key={k} className={`flex items-center gap-2 text-xs ${active ? 'text-foreground font-medium' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${done ? 'bg-primary/20 text-primary' : active ? 'bg-primary/15 text-primary' : 'bg-muted'}`}>
                    {done ? <Check className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
                  </div>
                  <span className="flex-1 truncate">{label}</span>
                  {suffix && (active || done) && <span className="text-[10px] font-mono text-primary tabular-nums">{suffix}</span>}
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-28 overflow-y-auto no-scrollbar">
                {sections.map((s) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono ${
                      s.status === 'done' ? 'bg-emerald-500/10 text-emerald-300' :
                      s.status === 'building' ? 'bg-primary/15 text-primary' :
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

          {/* Live log feed */}
          {logs.length > 0 && (
            <div className="border-t border-border/50 mt-3 pt-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Logs</div>
              <div ref={logRef} className="max-h-20 overflow-y-auto no-scrollbar font-mono text-[10px] space-y-0.5 text-muted-foreground/90">
                {logs.map((l, i) => (
                  <div key={i} className="truncate">
                    <span className="text-primary/70">{((l.t - (startRef.current ?? l.t)) / 1000).toFixed(1)}s</span> {l.msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {(onCancel || onRetry) && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
              {onCancel && !isError && (
                <button
                  onClick={onCancel}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-muted text-xs font-medium transition-all"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  disabled={!isError && stage !== 'retrying'}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg gradient-gold text-primary-foreground text-xs font-semibold disabled:opacity-40"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Retry
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
