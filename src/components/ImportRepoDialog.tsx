import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitFork, X, Loader2, Download } from 'lucide-react';
import { importGithubRepo } from '@/lib/githubImport';
import { toast } from 'sonner';

interface Props { open: boolean; onClose: () => void; workspaceId?: string; onImported: (id: string) => void }

export default function ImportRepoDialog({ open, onClose, workspaceId, onImported }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const { projectId, source } = await importGithubRepo(url.trim(), workspaceId);
      toast.success(`Cloned from ${source}`);
      onImported(projectId);
      setUrl('');
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Import failed');
    } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md rounded-2xl glass-panel-strong border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><GitFork className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">Clone from GitHub</h3></div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Paste any public GitHub repo URL. We'll pull the entry HTML and create a new project you can edit with AI.
            </p>
            <input
              value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="https://github.com/owner/repo"
              className="w-full bg-secondary rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={submit} disabled={busy || !url.trim()}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl gradient-gold text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cloning…</> : <><Download className="w-3.5 h-3.5" /> Clone repo</>}
            </button>
            <p className="text-[10px] text-muted-foreground mt-3">
              Tip: works with static sites & landing pages. For app repos, we'll create a wrapper you can convert with chat.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
