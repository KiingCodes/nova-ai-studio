import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles, Terminal } from 'lucide-react';
import type { BuildSection, GenStage } from '@/lib/useStreamingGenerator';
import crownLogo from '@/assets/crown-logo.png';

interface Props {
  sections: BuildSection[];
  stage: GenStage | string;
  bytes: number;
  html?: string;
}

// Naive syntax highlight for the streaming terminal — cheap, no deps.
function highlight(src: string): { text: string; cls: string }[] {
  const out: { text: string; cls: string }[] = [];
  const re = /(<\/?[\w-]+)|([="'][^"'<>]*["'])|(\{[^}]*\})|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index), cls: 'text-amber-100/70' });
    let cls = 'text-amber-100/70';
    if (m[1]) cls = 'text-amber-400';
    else if (m[2]) cls = 'text-amber-300/90';
    else if (m[3]) cls = 'text-amber-200/80';
    else if (m[4]) cls = 'text-zinc-500 italic';
    out.push({ text: m[0], cls });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last), cls: 'text-amber-100/70' });
  return out;
}

function GlowSpinner({ active }: { active: boolean }) {
  return (
    <div className="relative w-14 h-14">
      <svg viewBox="0 0 60 60" className="w-full h-full drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]">
        <defs>
          <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(251,191,36,0.12)" strokeWidth="4" />
        <motion.circle
          cx="30" cy="30" r="24" fill="none"
          stroke="url(#arc)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray="60 150"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: active ? 1.1 : 2.4, ease: 'linear' }}
          style={{ transformOrigin: '30px 30px' }}
        />
      </svg>
      <img src={crownLogo} alt="" className="absolute inset-0 m-auto w-6 h-6 opacity-90" />
    </div>
  );
}

function PulseBlock({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={`rounded-lg bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 bg-[length:200%_100%] animate-pulse ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

export default function PreviewSkeleton({ sections, stage, bytes, html = '' }: Props) {
  const termRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number>(Date.now());
  const bytesStartRef = useRef<number>(bytes);
  const [tps, setTps] = useState(0);

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [html]);

  // Tokens/sec rolling estimate (~4 chars per token)
  useEffect(() => {
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      if (elapsed < 0.4) return;
      const delta = Math.max(0, bytes - bytesStartRef.current);
      setTps(Math.round(delta / 4 / elapsed));
    }, 400);
    return () => window.clearInterval(id);
  }, [bytes]);

  const filesModified = Math.max(1, sections.filter(s => s.status === 'done').length);
  const linesCompiled = useMemo(() => (html ? html.split('\n').length : 0), [html]);

  // Tail of stream, ~1600 chars, syntax-tinted
  const tail = html ? html.slice(-1600) : '// waiting for stream…';
  const tokens = useMemo(() => highlight(tail), [tail]);

  const stageLabel =
    stage === 'thinking' ? 'Analyzing prompt'
    : stage === 'streaming' ? 'Generating HTML'
    : stage === 'validating' ? 'Polishing & validating'
    : stage === 'retrying' ? 'Refining output'
    : 'Preparing';

  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: 'Analyzing prompt', done: stage !== 'thinking' && stage !== 'idle', active: stage === 'thinking' },
    { label: 'Generating HTML', done: stage === 'validating' || stage === 'done', active: stage === 'streaming' || stage === 'retrying' },
    { label: 'Validating markup', done: stage === 'done', active: stage === 'validating' },
    { label: 'Mounting sandbox', done: stage === 'done', active: stage === 'done' },
  ];

  return (
    <div className="w-full h-full overflow-auto p-3 sm:p-6 flex items-start justify-center">
      <div className="w-full max-w-4xl space-y-4 relative">
        {/* Animated wireframe backdrop */}
        <div aria-hidden className="absolute inset-0 -z-10 opacity-40 pointer-events-none space-y-3">
          <div className="flex gap-3">
            <PulseBlock className="h-10 w-10" />
            <PulseBlock className="h-10 flex-1" />
          </div>
          <PulseBlock className="h-48" delay={120} />
          <div className="grid grid-cols-3 gap-3">
            <PulseBlock className="h-28" delay={240} />
            <PulseBlock className="h-28" delay={320} />
            <PulseBlock className="h-28" delay={400} />
          </div>
          <PulseBlock className="h-24" delay={520} />
          <div className="grid grid-cols-4 gap-3">
            <PulseBlock className="h-16" delay={620} />
            <PulseBlock className="h-16" delay={680} />
            <PulseBlock className="h-16" delay={740} />
            <PulseBlock className="h-16" delay={800} />
          </div>
        </div>

        {/* Premium status HUD */}
        <div className="rounded-2xl bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <GlowSpinner active={stage === 'streaming' || stage === 'retrying'} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80 font-semibold">KINGING · Live build</p>
              <p className="text-sm font-semibold text-zinc-100 truncate">{stageLabel}…</p>
            </div>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>

          {/* Live counters */}
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <Counter label="Files modified" value={filesModified} />
            <Counter label="Lines compiled" value={linesCompiled} />
            <Counter label="Tokens/sec" value={tps} />
          </div>

          {/* Terminal viewport */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mb-1.5">
              <Terminal className="w-3 h-3 text-amber-400" />
              <span>index.html</span>
              <span className="ml-auto">{(bytes / 1024).toFixed(1)} kb streamed</span>
            </div>
            <div
              ref={termRef}
              className="font-mono text-xs bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 h-32 overflow-hidden shadow-inner shadow-black/60 relative"
            >
              <pre className="whitespace-pre-wrap break-all leading-relaxed drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]">
                {tokens.map((t, i) => (
                  <span key={i} className={t.cls}>{t.text}</span>
                ))}
                <span className="inline-block w-1.5 h-3 align-middle bg-amber-400 animate-pulse ml-0.5" />
              </pre>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-zinc-950 to-transparent" />
            </div>
          </div>

          {/* Glowing metric badges */}
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {steps.map(s => (
              <li
                key={s.label}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  s.done
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : s.active
                    ? 'border-amber-400/50 bg-amber-400/10 text-amber-200 shadow-[0_0_18px_-4px_rgba(251,191,36,0.7)]'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
                }`}
              >
                {s.done ? (
                  <Check className="w-3 h-3" />
                ) : s.active ? (
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-75" />
                    <span className="relative rounded-full w-2 h-2 bg-amber-400" />
                  </span>
                ) : (
                  <Loader2 className="w-3 h-3 opacity-40" />
                )}
                {s.label}
              </li>
            ))}
          </ul>

          {/* Section progress bar */}
          {sections.length > 0 && (
            <div className="mt-4">
              <div className="h-1 rounded-full bg-zinc-900 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                  animate={{
                    width: `${Math.round(
                      (sections.filter(s => s.status === 'done').length / sections.length) * 100,
                    )}%`,
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</p>
      <p className="text-lg font-mono font-semibold text-amber-300 tabular-nums leading-tight">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
