import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

interface PreviewPanelProps {
  html: string;
  isGenerating: boolean;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';

const viewportWidths: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const PreviewPanel = ({ html, isGenerating }: PreviewPanelProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  const viewportButtons: { key: Viewport; icon: typeof Monitor; label: string }[] = [
    { key: 'desktop', icon: Monitor, label: 'Desktop' },
    { key: 'tablet', icon: Tablet, label: 'Tablet' },
    { key: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className={`flex-1 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-1">
          {viewportButtons.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewport(key)}
              title={label}
              className={`p-2 rounded-lg transition-all ${
                viewport === key
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-secondary/50 text-muted-foreground text-xs font-mono">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          localhost:3000
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (iframeRef.current && html) {
                const doc = iframeRef.current.contentDocument;
                if (doc) { doc.open(); doc.write(html); doc.close(); }
              }
            }}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto bg-muted/30">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent"
            />
            <p className="text-sm text-muted-foreground animate-pulse-soft">Generating your project...</p>
          </div>
        ) : html ? (
          <div
            className="h-full bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300"
            style={{ width: viewportWidths[viewport], maxWidth: '100%' }}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-2xl">🎨</div>
            <p className="text-muted-foreground text-sm">Enter a prompt to generate your project</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
