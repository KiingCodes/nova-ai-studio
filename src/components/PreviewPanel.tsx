import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Maximize2, Minimize2, Code2, Eye, AlertTriangle, CheckCircle2, X, Bug, Copy, Gauge } from 'lucide-react';
import type { HtmlValidationResult } from '@/lib/htmlValidator';
import ScoreBreakdown from './ScoreBreakdown';

interface PreviewPanelProps {
  html: string;
  isGenerating: boolean;
  streaming?: boolean;
  validation?: HtmlValidationResult;
  onAiDebug?: (errors: any[]) => void;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';
type Tab = 'preview' | 'code';

interface RuntimeError {
  id: number;
  type: 'error' | 'warn' | 'unhandled';
  message: string;
  source?: string;
  line?: number;
  ts: number;
}

const viewportWidths: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

// Script injected into the iframe to forward runtime errors to the parent.
const ERROR_BRIDGE = `<script>
(function(){
  var post = function(p){ try { parent.postMessage({ __preview: true, ...p }, '*'); } catch(e){} };
  window.addEventListener('error', function(e){
    post({ type:'error', message: e.message || String(e.error||'Error'), source: e.filename, line: e.lineno });
  }, true);
  window.addEventListener('unhandledrejection', function(e){
    var r = e.reason || {}; post({ type:'unhandled', message: (r.message||String(r)) });
  });
  var origErr = console.error;
  console.error = function(){ try { post({ type:'error', message: Array.from(arguments).map(String).join(' ') }); } catch(_){} origErr.apply(console, arguments); };
  var origWarn = console.warn;
  console.warn = function(){ try { post({ type:'warn', message: Array.from(arguments).map(String).join(' ') }); } catch(_){} origWarn.apply(console, arguments); };
})();
<\/script>`;

// Inject the bridge as the first child of <head>, or fall back to prepending.
function injectBridge(html: string): string {
  if (!html) return html;
  const headOpen = html.match(/<head[^>]*>/i);
  if (headOpen && headOpen.index !== undefined) {
    const at = headOpen.index + headOpen[0].length;
    return html.slice(0, at) + ERROR_BRIDGE + html.slice(at);
  }
  return ERROR_BRIDGE + html;
}

const PreviewPanel = ({ html, isGenerating, streaming, validation, onAiDebug }: PreviewPanelProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const [errors, setErrors] = useState<RuntimeError[]>([]);
  const [errorsCollapsed, setErrorsCollapsed] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const lastWriteRef = useRef(0);
  const errIdRef = useRef(0);

  // Listen for runtime errors from the sandbox iframe.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== 'object' || !d.__preview) return;
      const msg = String(d.message || '').slice(0, 400);
      // Filter known noisy messages from CDN libs we can ignore
      if (/cdn\.tailwindcss\.com.*production/i.test(msg)) return;
      setErrors(prev => [
        ...prev.slice(-19),
        { id: ++errIdRef.current, type: d.type, message: msg, source: d.source, line: d.line, ts: Date.now() },
      ]);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Reset errors whenever a new generation starts (not on every streaming delta).
  const generationKey = `${html.length === 0}-${isGenerating}`;
  useEffect(() => {
    if (isGenerating) setErrors([]);
  }, [generationKey, isGenerating]);

  // Auto-switch tabs based on streaming state
  useEffect(() => {
    if (streaming) setTab('code');
    else if (html && !streaming) setTab('preview');
  }, [streaming]);

  // Render HTML into the sandboxed iframe — throttled while streaming.
  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const now = Date.now();
    if (streaming && now - lastWriteRef.current < 400) return;
    lastWriteRef.current = now;

    const injected = injectBridge(html);
    // Use srcdoc — required when sandbox lacks allow-same-origin (document.write would fail)
    iframeRef.current.srcdoc = injected;
  }, [html, streaming]);

  useEffect(() => {
    if (tab === 'code' && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [html, tab]);

  const reload = useCallback(() => {
    if (!iframeRef.current || !html) return;
    setErrors([]);
    iframeRef.current.srcdoc = injectBridge(html);
  }, [html]);

  const openExternal = useCallback(() => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [html]);

  const viewportButtons: { key: Viewport; icon: typeof Monitor; label: string }[] = [
    { key: 'desktop', icon: Monitor, label: 'Desktop' },
    { key: 'tablet', icon: Tablet, label: 'Tablet' },
    { key: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  const errorCount = errors.filter(e => e.type !== 'warn').length;
  const warnCount = errors.length - errorCount;

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
          {streaming ? 'streaming…' : 'sandboxed'}
        </div>

        <div className="flex items-center gap-1">
          {validation && !streaming && (
            <div className="relative">
              <button
                onClick={() => setScoreOpen(o => !o)}
                title="Open score breakdown"
                className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:scale-105 ${
                  validation.errors.length > 0 ? 'bg-rose-500/10 text-rose-700' :
                  validation.warnings.length > 0 ? 'bg-amber-500/10 text-amber-700' :
                  'bg-emerald-500/10 text-emerald-700'
                }`}
              >
                <Gauge className="w-3 h-3" />
                {validation.score}/100 · {validation.stats.sizeKb}kb
              </button>
              <AnimatePresence>
                {scoreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                    className="absolute right-0 top-full mt-2 w-72 z-30 rounded-xl border border-border bg-card/98 backdrop-blur-xl shadow-2xl p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">Quality breakdown</span>
                      <button onClick={() => setScoreOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                    </div>
                    <ScoreBreakdown validation={validation} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <button onClick={reload} title="Reload preview" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={openExternal} title="Open in new tab" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all">
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
            <div className="w-full h-full p-1.5 sm:p-4 overflow-auto flex items-start justify-center">
              <div
                className="h-full bg-white rounded-md sm:rounded-xl overflow-hidden shadow-2xl transition-all duration-300"
                style={{ width: viewportWidths[viewport], maxWidth: '100%', minHeight: '100%' }}
              >
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-0"
                  title="Preview"
                  // Hardened sandbox: scripts allowed (needed for Tailwind CDN, Lucide), forms+modals for interactive demos. No same-origin = no parent access.
                  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"
                  referrerPolicy="no-referrer"
                  loading="lazy"
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

        {/* Runtime error overlay */}
        <AnimatePresence>
          {errors.length > 0 && tab === 'preview' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-[420px] z-20 rounded-xl border border-rose-500/30 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <button
                onClick={() => setErrorsCollapsed(c => !c)}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-rose-500/5 text-left"
              >
                <Bug className="w-3.5 h-3.5 text-rose-600" />
                <span className="text-xs font-semibold text-foreground flex-1">
                  {errorCount > 0 && <span className="text-rose-600">{errorCount} error{errorCount === 1 ? '' : 's'}</span>}
                  {errorCount > 0 && warnCount > 0 && <span className="text-muted-foreground"> · </span>}
                  {warnCount > 0 && <span className="text-amber-600">{warnCount} warning{warnCount === 1 ? '' : 's'}</span>}
                </span>
                {onAiDebug && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAiDebug(errors); }}
                    className="px-1.5 py-0.5 rounded gradient-gold text-primary-foreground text-[10px] font-semibold"
                    title="Debug with AI"
                  >
                    ✨ Fix
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const txt = errors.map(x => `[${x.type}] ${x.message}${x.source ? ` (${x.source}${x.line ? ':' + x.line : ''})` : ''}`).join('\n');
                    navigator.clipboard?.writeText(txt);
                  }}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                  aria-label="Copy errors"
                  title="Copy all errors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setErrors([]); }}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </button>
              {!errorsCollapsed && (
                <div className="max-h-48 overflow-auto divide-y divide-border/40">
                  {errors.slice().reverse().map((e) => (
                    <div key={e.id} className="px-3 py-2 text-[11px] font-mono">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.type === 'warn' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground/90 break-words">{e.message}</p>
                          {(e.source || e.line) && (
                            <p className="text-muted-foreground/70 text-[10px] mt-0.5 truncate">
                              {e.source ? e.source.split('/').pop() : ''}{e.line ? `:${e.line}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PreviewPanel;
