import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Copy, ExternalLink, Rocket, Lock, Globe, ShieldCheck } from 'lucide-react';

const Github = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.93c.57.1.78-.25.78-.55v-2.1c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.76.4-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.72 0-1.26.45-2.3 1.2-3.11-.12-.3-.52-1.48.11-3.08 0 0 .97-.31 3.2 1.19a11.02 11.02 0 0 1 5.82 0c2.22-1.5 3.19-1.19 3.19-1.19.63 1.6.23 2.78.11 3.08.75.81 1.2 1.85 1.2 3.11 0 4.45-2.7 5.42-5.27 5.71.41.36.78 1.07.78 2.16v3.2c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
  </svg>
);
import * as Switch from '@radix-ui/react-switch';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  projectName?: string;
}

type Phase = 'connect' | 'configure' | 'deploying' | 'done';

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'my-project';

const steps = [
  { key: 'repo', label: 'Creating GitHub repository' },
  { key: 'push', label: 'Pushing code tree & assets' },
  { key: 'edge', label: 'Provisioning global edge routing' },
  { key: 'verify', label: 'Verifying production build' },
];

export default function DeployDialog({ open, onClose, projectName }: Props) {
  const [phase, setPhase] = useState<Phase>('connect');
  const [username, setUsername] = useState('your-username');
  const [repo, setRepo] = useState(slug(projectName || 'my-project'));
  const [isPrivate, setIsPrivate] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [liveUrl, setLiveUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  useEffect(() => {
    if (open) {
      setPhase('connect');
      setStepIdx(0);
      setRepo(slug(projectName || 'my-project'));
    }
  }, [open, projectName]);

  useEffect(() => {
    if (phase !== 'deploying') return;
    setStepIdx(0);
    const timers: number[] = [];
    steps.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStepIdx(i + 1), (i + 1) * 900));
    });
    timers.push(
      window.setTimeout(() => {
        const url = `https://${repo}.kinging.app`;
        const gh = `https://github.com/${username}/${repo}`;
        setLiveUrl(url);
        setRepoUrl(gh);
        setPhase('done');
      }, steps.length * 900 + 400)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, repo, username]);

  const path = useMemo(() => `github.com/${username}/${slug(repo)}`, [username, repo]);

  const handleConnect = () => {
    // UI-only simulated connection
    setTimeout(() => {
      setUsername('kinging-user');
      setPhase('configure');
      toast.success('GitHub connected');
    }, 600);
  };

  const copy = async (v: string) => {
    await navigator.clipboard.writeText(v);
    toast.success('Copied to clipboard');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* accent glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-amber-400/5 blur-3xl pointer-events-none" />

            <div className="relative flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-amber-400/80 uppercase tracking-widest">
                  <Rocket className="w-3.5 h-3.5" /> Deployment
                </div>
                <h2 className="text-xl font-semibold text-zinc-50 mt-1">Ship to production</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Claim ownership on GitHub and deploy to the edge.</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* stepper */}
            <div className="relative flex items-center gap-2 mb-6">
              {['Connect', 'Configure', 'Deploy'].map((label, i) => {
                const active =
                  (phase === 'connect' && i === 0) ||
                  (phase === 'configure' && i === 1) ||
                  ((phase === 'deploying' || phase === 'done') && i === 2);
                const done =
                  (phase === 'configure' && i < 1) ||
                  ((phase === 'deploying' || phase === 'done') && i < 2);
                return (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                        done
                          ? 'bg-amber-500 border-amber-400 text-black'
                          : active
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {done ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className={`text-xs ${active || done ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
                    {i < 2 && <div className="flex-1 h-px bg-zinc-800/80" />}
                  </div>
                );
              })}
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                {phase === 'connect' && (
                  <motion.div key="connect" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <button
                      onClick={handleConnect}
                      className="group w-full relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-amber-500/60 hover:bg-gradient-to-br hover:from-amber-500/10 hover:to-amber-400/5 transition-all p-5 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 group-hover:border-amber-500/40 flex items-center justify-center transition">
                          <Github className="w-6 h-6 text-zinc-100 group-hover:text-amber-400 transition" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-zinc-50 group-hover:text-amber-100">
                            Connect GitHub to Claim Ownership
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            Authorize kinging.dev to push a fresh repository under your account.
                          </div>
                        </div>
                        <div className="text-xs font-medium text-zinc-500 group-hover:text-amber-400 transition">
                          Connect →
                        </div>
                      </div>
                    </button>

                    <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
                      OAuth scoped only to the repos you create here. Revoke anytime.
                    </div>
                  </motion.div>
                )}

                {phase === 'configure' && (
                  <motion.div key="configure" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs text-emerald-200">Connected as <b>@{username}</b></span>
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-zinc-500 font-medium">Repository name</label>
                      <input
                        value={repo}
                        onChange={(e) => setRepo(e.target.value)}
                        placeholder="my-project"
                        className="mt-1.5 w-full bg-zinc-900/70 border border-zinc-800 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 outline-none rounded-lg px-3 py-2 text-sm text-zinc-100 transition"
                      />
                    </div>

                    <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isPrivate ? 'bg-zinc-950 text-amber-400 border border-amber-500/30' : 'bg-zinc-950 text-emerald-400 border border-emerald-500/20'}`}>
                        {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-100">{isPrivate ? 'Private repository' : 'Public repository'}</div>
                        <div className="text-[11px] text-zinc-500">{isPrivate ? 'Only you and collaborators can see the code.' : 'Anyone can view — great for open source.'}</div>
                      </div>
                      <Switch.Root
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                        className="relative w-11 h-6 rounded-full bg-zinc-800 data-[state=checked]:bg-amber-500 transition outline-none"
                      >
                        <Switch.Thumb className="block w-5 h-5 bg-zinc-100 rounded-full shadow translate-x-0.5 data-[state=checked]:translate-x-[22px] transition-transform" />
                      </Switch.Root>
                    </div>

                    <div className="rounded-lg bg-black/40 border border-zinc-800 px-3 py-2.5 font-mono text-xs text-zinc-400 flex items-center gap-2 overflow-hidden">
                      <Github className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                      <span className="truncate">
                        {path.split('/').map((seg, i, arr) => (
                          <span key={i} className={i === arr.length - 1 ? 'text-amber-400' : ''}>
                            {seg}{i < arr.length - 1 ? '/' : ''}
                          </span>
                        ))}
                      </span>
                    </div>

                    <button
                      onClick={() => setPhase('deploying')}
                      disabled={!repo.trim()}
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-black text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_-10px_rgba(245,158,11,0.7)]"
                    >
                      Confirm & Deploy Production
                    </button>
                  </motion.div>
                )}

                {phase === 'deploying' && (
                  <motion.div key="deploying" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-2">
                    {steps.map((s, i) => {
                      const done = i < stepIdx;
                      const active = i === stepIdx;
                      return (
                        <div
                          key={s.key}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                            done
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : active
                              ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_24px_-8px_rgba(245,158,11,0.5)]'
                              : 'bg-zinc-900/30 border-zinc-800/60'
                          }`}
                        >
                          <div className="w-5 h-5 flex items-center justify-center">
                            {done ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : active ? (
                              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-zinc-700" />
                            )}
                          </div>
                          <span className={`text-sm ${done ? 'text-emerald-200' : active ? 'text-amber-100' : 'text-zinc-500'}`}>
                            {s.label}
                            {active && '…'}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {phase === 'done' && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-zinc-900/60 to-zinc-950 p-5">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_60%)] pointer-events-none" />
                      <div className="relative">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-emerald-400 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live in production
                        </div>
                        <div className="mt-2 text-lg font-semibold text-zinc-50">Your app is live 👑</div>
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 font-mono text-sm text-amber-300 hover:text-amber-200 break-all inline-flex items-center gap-1.5"
                        >
                          {liveUrl}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => copy(liveUrl)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 hover:border-amber-500/40 text-xs font-medium text-zinc-100 transition"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy link
                          </button>
                          <a
                            href={repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 hover:bg-white text-black text-xs font-semibold transition"
                          >
                            <Github className="w-3.5 h-3.5" /> View repository
                          </a>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={onClose}
                      className="w-full py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 transition"
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
