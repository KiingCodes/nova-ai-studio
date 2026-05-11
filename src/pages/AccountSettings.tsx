import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, LogOut, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const AccountSettings = () => {
  const nav = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  useEffect(() => { if (!loading && !user) nav('/auth', { replace: true }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? '');
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ''));
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Profile updated');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const updateEmail = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast.success('Check your new email to confirm the change');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const updatePassword = async () => {
    if (password.length < 6) return toast.error('Password must be 6+ characters');
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      toast.success('Password updated');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    if (!user || confirmDelete !== 'DELETE') return;
    setBusy(true);
    try {
      // Cascade-deletes projects/versions/profile via FK + signs out.
      const { error } = await supabase.rpc('delete_my_account' as any).single();
      // Fallback: clear data manually then sign out (admin delete not exposed client-side)
      if (error) {
        await supabase.from('projects').delete().eq('user_id', user.id);
        await supabase.from('profiles').delete().eq('user_id', user.id);
      }
      await signOut();
      toast.success('Account data wiped. You have been signed out.');
      nav('/auth', { replace: true });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => nav('/')} className="p-2 rounded-lg hover:bg-secondary"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-base font-semibold flex-1">Account settings</h1>
          <button onClick={async () => { await signOut(); nav('/auth'); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-muted">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <Section title="Profile" desc="How you appear in kinging.dev.">
          <Field label="Display name">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
          </Field>
          <Btn onClick={saveProfile} busy={busy} icon={Save}>Save profile</Btn>
        </Section>

        <Section title="Email" desc="Used for sign-in and notifications.">
          <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input" /></Field>
          <Btn onClick={updateEmail} busy={busy} icon={Save}>Update email</Btn>
        </Section>

        <Section title="Password" desc="Set a new password.">
          <Field label="New password"><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className="input" /></Field>
          <Btn onClick={updatePassword} busy={busy} icon={Save}>Change password</Btn>
        </Section>

        <Section title="Danger zone" desc="Permanently delete your account and all generated projects." danger>
          <p className="text-xs text-muted-foreground mb-3">Type <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">DELETE</code> to confirm.</p>
          <input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder="DELETE" className="input mb-3" />
          <button
            onClick={deleteAccount} disabled={busy || confirmDelete !== 'DELETE'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" /> Delete my account
          </button>
        </Section>
      </main>

      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;background:hsl(var(--secondary));font-size:0.875rem;outline:none}.input:focus{box-shadow:0 0 0 1px hsl(var(--primary)/0.5)}`}</style>
    </div>
  );
};

const Section = ({ title, desc, children, danger }: any) => (
  <section className={`glass-panel-strong p-5 rounded-2xl ${danger ? 'border-destructive/30' : ''}`}>
    <div className="mb-4">
      <h2 className={`text-sm font-semibold flex items-center gap-2 ${danger ? 'text-destructive' : ''}`}>
        {danger && <AlertTriangle className="w-4 h-4" />}{title}
      </h2>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);
const Field = ({ label, children }: any) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);
const Btn = ({ onClick, busy, icon: Icon, children }: any) => (
  <button onClick={onClick} disabled={busy} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">
    <Icon className="w-4 h-4" />{children}
  </button>
);

export default AccountSettings;
