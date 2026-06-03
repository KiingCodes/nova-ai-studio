import { motion } from 'framer-motion';
import { Check, Loader2, ImageIcon, Sparkles } from 'lucide-react';
import type { BuildSection } from '@/lib/useStreamingGenerator';
import crownLogo from '@/assets/crown-logo.png';

interface Props {
  sections: BuildSection[];
  stage: string;
  bytes: number;
}

// Map generator section names to a visual block in the wireframe.
const BLOCK_FOR: Record<string, string> = {
  head: 'meta',
  'meta & seo': 'meta',
  styles: 'meta',
  navigation: 'nav',
  hero: 'hero',
  features: 'features',
  testimonials: 'testimonials',
  pricing: 'pricing',
  faq: 'faq',
  cta: 'cta',
  footer: 'footer',
  scripts: 'meta',
  closing: 'meta',
};

function statusOf(sections: BuildSection[], block: string): 'pending' | 'building' | 'done' {
  const matches = sections.filter(s => BLOCK_FOR[s.name] === block);
  if (!matches.length) return 'pending';
  if (matches.some(s => s.status === 'done')) {
    return matches.some(s => s.status !== 'done') ? 'building' : 'done';
  }
  if (matches.some(s => s.status === 'building')) return 'building';
  return 'pending';
}

function Block({
  status,
  children,
  className = '',
}: {
  status: 'pending' | 'building' | 'done';
  children?: React.ReactNode;
  className?: string;
}) {
  const tone =
    status === 'done'
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : status === 'building'
      ? 'bg-primary/10 border-primary/40 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)]'
      : 'bg-muted/40 border-border/60';
  return (
    <div className={`relative rounded-xl border ${tone} transition-colors duration-500 ${className}`}>
      {status === 'building' && (
        <motion.div
          aria-hidden
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
          className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none"
        >
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </motion.div>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

function Bar({ w = 'w-full', h = 'h-2.5' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded bg-foreground/10`} />;
}

export default function PreviewSkeleton({ sections, stage, bytes }: Props) {
  const navS = statusOf(sections, 'nav');
  const heroS = statusOf(sections, 'hero');
  const featuresS = statusOf(sections, 'features');
  const testimonialsS = statusOf(sections, 'testimonials');
  const pricingS = statusOf(sections, 'pricing');
  const ctaS = statusOf(sections, 'cta');
  const footerS = statusOf(sections, 'footer');
  const metaS = statusOf(sections, 'meta');

  const stageLabel =
    stage === 'thinking' ? 'Designing layout…'
    : stage === 'streaming' ? 'Rendering sections…'
    : stage === 'validating' ? 'Polishing & validating…'
    : stage === 'retrying' ? 'Refining output…'
    : 'Preparing…';

  const order = [
    ['Brand & meta', metaS],
    ['Logo & navigation', navS],
    ['Hero section', heroS],
    ['Feature grid', featuresS],
    ['Social proof', testimonialsS],
    ['Pricing', pricingS],
    ['Call-to-action', ctaS],
    ['Footer', footerS],
  ] as const;

  return (
    <div className="w-full h-full overflow-auto p-3 sm:p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-4">
        {/* Status header */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-card/80 border border-border/60 backdrop-blur">
          <motion.img
            src={crownLogo}
            alt=""
            className="w-7 h-7"
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{stageLabel}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {(bytes / 1024).toFixed(1)} kb streamed
            </p>
          </div>
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        </div>

        {/* Wireframe */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-3 sm:p-5 space-y-3">
          {/* Nav */}
          <Block status={navS} className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
              <ImageIcon className="w-3.5 h-3.5 text-foreground/40" />
            </div>
            <Bar w="w-24" />
            <div className="ml-auto flex gap-2">
              <Bar w="w-12" /><Bar w="w-12" /><Bar w="w-16" />
            </div>
          </Block>

          {/* Hero */}
          <Block status={heroS} className="p-5 sm:p-8 space-y-3">
            <Bar w="w-2/3" h="h-5" />
            <Bar w="w-1/2" h="h-5" />
            <div className="pt-2 space-y-2">
              <Bar w="w-full" />
              <Bar w="w-5/6" />
            </div>
            <div className="pt-3 flex gap-2">
              <div className="w-24 h-8 rounded-lg bg-primary/30" />
              <div className="w-20 h-8 rounded-lg bg-foreground/10" />
            </div>
          </Block>

          {/* Features */}
          <Block status={featuresS} className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-2 p-3 rounded-lg bg-background/40">
                <div className="w-8 h-8 rounded-md bg-foreground/10" />
                <Bar w="w-3/4" />
                <Bar w="w-full" h="h-2" />
                <Bar w="w-5/6" h="h-2" />
              </div>
            ))}
          </Block>

          {/* Testimonials */}
          <Block status={testimonialsS} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1].map(i => (
              <div key={i} className="space-y-2 p-3 rounded-lg bg-background/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-foreground/10" />
                  <div className="flex-1 space-y-1.5"><Bar w="w-1/2" h="h-2" /><Bar w="w-1/3" h="h-2" /></div>
                </div>
                <Bar w="w-full" h="h-2" /><Bar w="w-5/6" h="h-2" />
              </div>
            ))}
          </Block>

          {/* Pricing */}
          <Block status={pricingS} className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-2 p-3 rounded-lg bg-background/40">
                <Bar w="w-1/2" /><Bar w="w-1/3" h="h-4" />
                <div className="space-y-1 pt-1">
                  <Bar w="w-full" h="h-2" /><Bar w="w-full" h="h-2" /><Bar w="w-3/4" h="h-2" />
                </div>
              </div>
            ))}
          </Block>

          {/* CTA */}
          <Block status={ctaS} className="p-5 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 space-y-2 w-full">
              <Bar w="w-1/2" h="h-4" /><Bar w="w-3/4" h="h-2" />
            </div>
            <div className="w-28 h-9 rounded-lg bg-primary/30" />
          </Block>

          {/* Footer */}
          <Block status={footerS} className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="space-y-1.5">
                <Bar w="w-1/2" h="h-2" />
                <Bar w="w-3/4" h="h-2" />
                <Bar w="w-2/3" h="h-2" />
              </div>
            ))}
          </Block>
        </div>

        {/* Step list */}
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Build progress
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {order.map(([label, st]) => (
              <li key={label} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    st === 'done'
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : st === 'building'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground/50'
                  }`}
                >
                  {st === 'done' ? (
                    <Check className="w-2.5 h-2.5" />
                  ) : st === 'building' ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={
                    st === 'done'
                      ? 'text-muted-foreground line-through decoration-emerald-500/40'
                      : st === 'building'
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground/60'
                  }
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
