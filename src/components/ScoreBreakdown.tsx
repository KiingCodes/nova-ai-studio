import { motion } from 'framer-motion';
import { Shield, Zap, Eye, Search, Layers } from 'lucide-react';
import type { HtmlValidationResult } from '@/lib/htmlValidator';

const ICONS: Record<string, typeof Shield> = {
  Structure: Layers, SEO: Search, Accessibility: Eye, Performance: Zap, Security: Shield,
};

const colorFor = (s: number) =>
  s >= 90 ? 'text-emerald-600 bg-emerald-500/10' :
  s >= 70 ? 'text-amber-600 bg-amber-500/10' :
            'text-rose-600 bg-rose-500/10';

const ScoreBreakdown = ({ validation }: { validation: HtmlValidationResult }) => {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold tracking-tight">{validation.score}</span>
        <span className="text-muted-foreground">/ 100 overall</span>
      </div>
      {validation.categories.map((c) => {
        const Icon = ICONS[c.name] ?? Shield;
        return (
          <div key={c.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Icon className="w-3 h-3 text-muted-foreground" /> {c.name}
              </span>
              <span className={`px-1.5 py-0.5 rounded font-mono ${colorFor(c.score)}`}>
                {c.score} · {c.passed}/{c.total}
              </span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${c.score}%` }}
                transition={{ duration: 0.6 }}
                className={`h-full ${c.score >= 90 ? 'bg-emerald-500' : c.score >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
              />
            </div>
            {c.notes.length > 0 && (
              <ul className="pl-4 text-[10px] text-muted-foreground list-disc space-y-0.5">
                {c.notes.slice(0, 3).map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScoreBreakdown;
