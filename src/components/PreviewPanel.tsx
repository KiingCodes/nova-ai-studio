import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Maximize2, Minimize2, Code2, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { HtmlValidationResult } from '@/lib/htmlValidator';

interface PreviewPanelProps {
  html: string;
  isGenerating: boolean;
  streaming?: boolean;
  validation?: HtmlValidationResult;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';
type Tab = 'preview' | 'code';

const viewportWidths: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const PreviewPanel = ({ html, isGenerating, streaming, validation }: PreviewPanelProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const lastWriteRef = useRef(0);

  // Auto-switch to code view while streaming so users see the build happening
  useEffect(() => {
    if (streaming) setTab('code');
    else if (html && !streaming) setTab('preview');
  }, [streaming]);

  // Write HTML into iframe — throttle while streaming for performance
  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const now = Date.now();
    if (streaming && now - lastWriteRef.current < 350) return;
    lastWriteRef.current = now;

    const doc = iframeRef.current.contentDocument;
    if (doc) {
      try {
        doc.open();
        doc.write(html);
        doc.close();
      } catch {}
    }
  }, [html, streaming]);

  // Auto-scroll code view
  useEffect(() => {
    if (tab === 'code' && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [html, tab]);

  const viewportButtons: { key: Viewport; icon: typeof Monitor; label: string }[] = [
    { key: 'desktop', icon: Monitor, label: 'Desktop' },
    { key: 'tablet', icon: Tablet, label: 'Tablet' },
    { key: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className={`flex-1 flex flex-col min-w-0 ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/50 backdrop-blur-sm gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                tab === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Eye className="w-3 h-3" /> Preview
            </button>
            <button
              onClick={() => setTab('code')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                tab === 'code' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Code2 className="w-3 h-3" /> Code
            </button>
          </div>

          {tab === 'preview' && (
            <div className="hidden md:flex items-center gap-0.5 ml-2">
              {viewportButtons.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setViewport(key)}
                  title={label}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewport === key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/50 text-muted-foreground text-[11px] font-mono">
          <div className={`w-1.5 h-1.5 rounded-full ${streaming ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {streaming ? 'streaming…' : 'localhost:3000'}
        </div>

        <div className="flex items-center gap-1">
          {validation && !streaming && (
            <div
              title={validation.warnings.concat(validation.errors).join('\n') || 'Valid HTML'}
              className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono ${
                validation.errors.length > 0 ? 'bg-rose-500/10 text-rose-700' :
                validation.warnings.length > 0 ? 'bg-amber-500/10 text-amber-700' :
                'bg-emerald-500/10 text-emerald-700'
              }`}
            >
              {validation.errors.length > 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {validation.stats.sizeKb}kb · {validation.stats.tagCount} tags
            </div>
          )}
          <button
            onClick={() => {
              if (iframeRef.current && html) {
                const doc = iframeRef.current.contentDocument;
                if (doc) { doc.open(); doc.write(html); doc.close(); }
              }
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-start justify-center overflow-hidden bg-muted/30 relative">
        {isGenerating && !html ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 m-auto">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent"
            />
            <p className="text-sm text-muted-foreground animate-pulse-soft">Connecting to AI…</p>
          </div>
        ) : html ? (
          tab === 'preview' ? (
            <div className="w-full h-full p-4 overflow-auto flex items-start justify-center">
              <div
                className="h-full bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300"
                style={{ width: viewportWidths[viewport], maxWidth: '100%', minHeight: '100%' }}
              >
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          ) : (
            <pre
              ref={codeRef}
              className="w-full h-full overflow-auto p-4 font-mono text-[11px] leading-relaxed text-foreground/90 bg-card/40 whitespace-pre-wrap break-all"
            >
              <code>{html}</code>
              {streaming && <span className="inline-block w-2 h-4 align-middle bg-primary animate-pulse ml-0.5" />}
            </pre>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center m-auto">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-2xl">🎨</div>
            <p className="text-muted-foreground text-sm">Enter a prompt to generate your project</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
