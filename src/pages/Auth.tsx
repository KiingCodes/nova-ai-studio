import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useAuth } from '@/lib/auth';
import logo from '@/assets/logo.png';

const Auth = () => {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav('/', { replace: true }); }, [user, loading, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name || email.split('@')[0] } },
        });
        if (error) throw error;
        toast.success('Account created — welcome!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally { setBusy(false); }
  };

  const onGoogle = async () => {
    try {
      const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
      if (r.error) toast.error((r.error as any).message || 'Google sign-in failed');
    } catch (e: any) { toast.error(e.message || 'Google sign-in failed'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-accent/10 blur-3xl animate-pulse-soft" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <img src={logo} alt="kinging.dev" className="h-14 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold mb-1">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signup' ? 'Sign up to start generating premium sites.' : 'Sign in to continue building.'}
          </p>
        </div>

        <div className="glass-panel-strong p-6 rounded-2xl space-y-4">
          <button
            onClick={onGoogle}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-muted text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /><span>or</span><div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name" type="text"
                className="w-full px-4 py-2.5 rounded-xl bg-secondary text-sm outline-none focus:ring-1 focus:ring-primary/50"
              />
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={email} onChange={(e) => setEmail(e.target.value)} required
                type="email" placeholder="you@example.com" autoComplete="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary text-sm outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={password} onChange={(e) => setPassword(e.target.value)} required
                type="password" placeholder="Password" minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary text-sm outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <button
              type="submit" disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-gold text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {busy ? <Sparkles className="w-4 h-4 animate-spin" /> : (<>{mode === 'signup' ? 'Create account' : 'Sign in'}<ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
            <button onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')} className="text-primary font-medium hover:underline">
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
