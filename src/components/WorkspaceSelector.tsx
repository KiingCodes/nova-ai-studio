import { useEffect, useState } from 'react';
import { ChevronDown, Plus, Briefcase, Check } from 'lucide-react';
import { workspaceStore, type Workspace } from '@/lib/workspaces';
import { toast } from 'sonner';

interface Props { activeId: string | null; onChange: (id: string) => void }

export default function WorkspaceSelector({ activeId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Workspace[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const load = () => workspaceStore.list().then(setList);
  useEffect(() => { load(); }, []);

  const active = list.find(w => w.id === activeId) ?? list[0];

  const create = async () => {
    if (!name.trim()) return;
    try {
      const w = await workspaceStore.create(name.trim());
      await load();
      onChange(w.id);
      setName(''); setCreating(false); setOpen(false);
      toast.success('Workspace created');
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary text-foreground/80"
      >
        <Briefcase className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline truncate max-w-[120px]">{active?.name ?? 'Workspace'}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setCreating(false); }} />
          <div className="absolute left-0 top-full mt-1.5 z-40 w-60 rounded-xl border border-border bg-card/98 backdrop-blur-xl shadow-2xl p-1.5">
            {list.map(w => (
              <button key={w.id} onClick={() => { onChange(w.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-secondary text-left ${w.id === activeId ? 'bg-secondary' : ''}`}>
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 truncate">{w.name}</span>
                {w.id === activeId && <Check className="w-3 h-3 text-primary" />}
              </button>
            ))}
            <div className="border-t border-border/50 mt-1 pt-1">
              {creating ? (
                <div className="flex gap-1 p-1">
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()}
                    placeholder="Workspace name" className="flex-1 bg-secondary rounded-md px-2 py-1.5 text-xs outline-none" />
                  <button onClick={create} className="px-2 py-1 rounded-md gradient-gold text-primary-foreground text-xs">Add</button>
                </div>
              ) : (
                <button onClick={() => setCreating(true)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-secondary text-primary">
                  <Plus className="w-3.5 h-3.5" /> New workspace
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
