import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Image as ImageIcon, Crown, X } from 'lucide-react';
import logo from '@/assets/logo.png';
import MediaPicker from './MediaPicker';
import type { UploadedMedia } from '@/lib/mediaUpload';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

const TYPEWRITER_PROMPTS = [
  'A SaaS startup with pricing and testimonials…',
  'A creative agency portfolio with case studies…',
  'A product launch landing page with waitlist…',
  'An admin dashboard with charts and tables…',
  'A booking app for a yoga studio…',
  'A modern restaurant site with online menu…',
  'A photography portfolio with masonry gallery…',
];

const useTypewriter = (active: boolean) => {
  const [text, setText] = useState('');
  const [i, setI] = useState(0);
  const [j, setJ] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (!active) return;
    const cur = TYPEWRITER_PROMPTS[i % TYPEWRITER_PROMPTS.length];
    const speed = del ? 25 : 55;
    const t = setTimeout(() => {
      if (!del) {
        if (j < cur.length) { setText(cur.slice(0, j + 1)); setJ(j + 1); }
        else { setTimeout(() => setDel(true), 1400); }
      } else {
        if (j > 0) { setText(cur.slice(0, j - 1)); setJ(j - 1); }
        else { setDel(false); setI(i + 1); }
      }
    }, speed);
    return () => clearTimeout(t);
  }, [i, j, del, active]);

  return text;
};

const PromptInput = ({ onGenerate, isGenerating }: PromptInputProps) => {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<UploadedMedia[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const placeholder = useTypewriter(!prompt && !isFocused);

  const buildFinalPrompt = (base: string) => {
    let p = base;
    if (logoUrl) {
      p += `\n\nBRAND LOGO (use as the real site logo in nav header, footer, favicon link, and Open Graph image — do NOT replace with a generic one): ${logoUrl}`;
    }
    const extras = attachedMedia.filter(m => m.url !== logoUrl);
    if (extras.length) {
      p += `\n\nADDITIONAL BRAND ASSETS (use as real imagery — hero, features, gallery):\n` + extras.map(m => `- ${m.url}`).join('\n');
    }
    return p;
  };

  const handleSubmit = () => {
    if (prompt.trim() && !isGenerating) onGenerate(buildFinalPrompt(prompt.trim()));
  };

  const attachMedia = (m: UploadedMedia) => {
    setAttachedMedia((items) => items.some((item) => item.url === m.url) ? items : [...items, m]);
    if (!logoUrl && /logo|brand|crown|icon/i.test(m.name)) setLogoUrl(m.url);
  };
  const removeMedia = (url: string) => {
    setAttachedMedia(items => items.filter(m => m.url !== url));
    if (logoUrl === url) setLogoUrl(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto px-3 sm:px-4"
    >
      <div className="text-center mb-6 sm:mb-10">
        <motion.img
          src={logo}
          alt="kinging.dev"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-[min(60vw,360px)] h-auto mx-auto mb-4 sm:mb-6 object-contain drop-shadow-[0_10px_40px_rgba(212,175,55,0.35)]"
        />
        <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2 sm:mb-3 leading-[1.1]">
          Describe it. <span className="text-gradient-gold">We build it.</span>
        </h1>
        <p className="text-muted-foreground text-xs sm:text-base max-w-lg mx-auto px-2">
          Generate production-ready, full-stack websites and apps from a single prompt.
        </p>
      </div>

      <div className={`relative rounded-2xl transition-all duration-300 ${isFocused ? 'glow-gold' : ''}`}>
        <div className="glass-panel-strong p-1.5 sm:p-2 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 relative">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder=""
                className="w-full bg-transparent px-3 sm:px-4 py-3 text-foreground outline-none text-sm md:text-base relative z-10"
                disabled={isGenerating}
                aria-label="Describe your project"
              />
              {!prompt && (
                <span className="pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm md:text-base truncate max-w-[calc(100%-1rem)]">
                  {placeholder}
                  <span className="inline-block w-[2px] h-4 bg-primary align-middle ml-0.5 animate-pulse" />
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMediaOpen(true)}
              disabled={isGenerating}
              title="Add media or logo to the AI prompt"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-muted transition-all disabled:opacity-40 shrink-0"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="sm:hidden">Media</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl gradient-gold text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isGenerating ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Sparkles className="w-4 h-4" />
                </motion.div>
              ) : (
                <>
                  Generate <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          {attachedMedia.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
              {attachedMedia.map((m) => (
                <button
                  key={m.url}
                  type="button"
                  onClick={() => navigator.clipboard.writeText(m.url)}
                  className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-background/75 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  title="Click to copy media URL"
                >
                  <ImageIcon className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate max-w-[180px]">{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onPick={attachMedia}
      />
    </motion.div>
  );
};

export default PromptInput;
