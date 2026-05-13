import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2, AlertTriangle, Zap, Lock, Eye, Search, Bug } from 'lucide-react';
import { runAiDebug, type DebugReport } from '@/lib/aiDebug';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  html: string;
  errors: any[];
  validation: any;
  onApplyFix?: (autoFixPrompt: string) => void;
}

const ICON: Record<string, any> = {
  'broken-import': AlertTriangle,
  'performance': Zap,
  'security': Lock,
  'accessibility': Eye,
  'seo': Search,
  'runtime': Bug,
  'layout': Sparkles,
};

export default function AiDebugPanel({ open, onClose, html, errors, validation, onApplyFix }: Props) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DebugReport | null>(null);

  const run = async () => {
    setLoading(true); setReport(null);
    try {
      const r = await runAiDebug(html, errors, validation);
      setReport(r);
    } catch (e: any) {
      toast.error(e?.message || 'Debug failed');
    } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm" />
          <motion.div
            initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] glass-panel-strong border-l border-border/50 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">AI Debugger</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 border-b border-border/50">
              <button
                onClick={run}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl gradient-gold text-primary-foreground text-xs font-semibold disabled:opacity-50"
              >
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</> : <><Sparkles className="w-3.5 h-3.5" /> Analyze with AI</>}
              </button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Detects broken imports, perf issues, a11y problems, security risks & runtime errors.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!report && !loading && (
                <div className="text-center text-xs text-muted-foreground py-12">
                  Click "Analyze with AI" to run a full diagnostic.
                </div>
              )}
              {report && (
                <>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-semibold mb-1">Diagnosis</p>
                    <p className="text-xs text-foreground/80">{report.summary}</p>
                  </div>
                  {report.issues.map((iss, i) => {
                    const Icon = ICON[iss.category] || Bug;
                    return (
                      <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${
                            iss.severity === 'error' ? 'text-rose-500' :
                            iss.severity === 'warn' ? 'text-amber-500' : 'text-sky-500'
                          }`} />
                          <span className="text-xs font-semibold">{iss.title}</span>
                          <span className="ml-auto text-[10px] uppercase font-mono text-muted-foreground">{iss.category}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{iss.explanation}</p>
                        <p className="text-[11px] text-foreground/80 bg-secondary/50 rounded p-2 font-mono">{iss.fix}</p>
                      </div>
                    );
                  })}
                  {report.autoFixPrompt && onApplyFix && (
                    <button
                      onClick={() => { onApplyFix(report.autoFixPrompt); onClose(); }}
                      className="w-full px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                    >
                      ✨ Auto-fix all issues
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
