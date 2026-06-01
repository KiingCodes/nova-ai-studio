import { motion } from 'framer-motion';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

interface CrownLoaderProps {
  label?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export default function CrownLoader({ label = 'Loading…', fullScreen, size = 'md', className }: CrownLoaderProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center', className)}>
      <div className={cn('relative flex items-center justify-center', sizeClasses[size])}>
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/30 border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
        />
        <motion.img
          src={logo}
          alt="kinging.dev loading"
          className="w-3/4 h-3/4 object-contain drop-shadow-md"
          animate={{ scale: [0.94, 1.04, 0.94], opacity: [0.78, 1, 0.78] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        />
      </div>
      {label && <p className="text-xs font-medium text-muted-foreground animate-pulse-soft">{label}</p>}
    </div>
  );

  if (!fullScreen) return content;
  return <div className="min-h-screen bg-background flex items-center justify-center p-6">{content}</div>;
}