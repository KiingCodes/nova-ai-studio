import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { regenJobs, type RegenJob } from '@/lib/regenJobs';
import { toast } from 'sonner';

interface Props { onJobDone?: (job: RegenJob) => void }

export default function RegenStatus({ onJobDone }: Props) {
  const [jobs, setJobs] = useState<Record<string, RegenJob>>({});

  useEffect(() => {
    regenJobs.listActive().then(list => {
      setJobs(Object.fromEntries(list.map(j => [j.id, j])));
    });
    const unsub = regenJobs.subscribe((job) => {
      setJobs(prev => {
        const next = { ...prev, [job.id]: job };
        if (job.status === 'done') {
          toast.success('Background regen complete');
          onJobDone?.(job);
          setTimeout(() => setJobs(c => { const { [job.id]: _, ...rest } = c; return rest; }), 4000);
        } else if (job.status === 'failed') {
          toast.error(`Regen failed: ${job.error || 'unknown'}`);
          setTimeout(() => setJobs(c => { const { [job.id]: _, ...rest } = c; return rest; }), 6000);
        }
        return next;
      });
    });
    return unsub;
  }, [onJobDone]);

  const active = Object.values(jobs).filter(j => j.status === 'running' || j.status === 'queued' || j.status === 'done' || j.status === 'failed');
  if (!active.length) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2 max-w-xs">
      <AnimatePresence>
        {active.map(job => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-3"
          >
            <div className="flex items-start gap-2">
              {job.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> :
               job.status === 'failed' ? <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" /> :
               <Loader2 className="w-4 h-4 text-primary animate-spin mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {job.status === 'done' ? 'Regen complete' :
                   job.status === 'failed' ? 'Regen failed' :
                   'Regenerating in background…'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{job.instruction}</p>
                {(job.status === 'running' || job.status === 'queued') && (
                  <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${job.progress}%` }} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
