import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Layout, Globe, ShoppingBag, BarChart3 } from 'lucide-react';
import { type TemplateType } from '@/lib/templates';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

const suggestions = [
  { icon: Zap, text: 'SaaS startup with pricing', template: 'saas' as TemplateType },
  { icon: Layout, text: 'Creative agency portfolio', template: 'agency' as TemplateType },
  { icon: Globe, text: 'Product launch landing page', template: 'landing' as TemplateType },
  { icon: BarChart3, text: 'Admin dashboard', template: 'dashboard' as TemplateType },
  { icon: ShoppingBag, text: 'Booking app', template: 'booking' as TemplateType },
];

const PromptInput = ({ onGenerate, isGenerating }: PromptInputProps) => {
  const [prompt, setPrompt] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto px-4"
    >
      <div className="text-center mb-8 md:mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary-foreground text-xs font-semibold mb-5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Generation
        </motion.div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3 leading-[1.1]">
          Describe it. <span className="text-gradient-gold">We build it.</span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto">
          Generate production-ready websites and apps from a single prompt.
        </p>
      </div>

      <div className={`relative rounded-2xl transition-all duration-300 ${isFocused ? 'glow-gold' : ''}`}>
        <div className="glass-panel-strong p-2 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Describe your website or app..."
              className="flex-1 bg-transparent px-4 py-3.5 text-foreground placeholder:text-muted-foreground outline-none text-sm md:text-base"
              disabled={isGenerating}
            />
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl gradient-gold text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => setPrompt(s.text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-all"
          >
            <s.icon className="w-3 h-3" />
            {s.text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default PromptInput;
