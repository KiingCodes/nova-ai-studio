// Streaming generator hook — emits text deltas + retry status + section progress.
import { useCallback, useRef, useState } from 'react';
import { extractHtmlFromStream, validateHtml, type HtmlValidationResult } from './htmlValidator';
import { sanitizeHtml } from './sanitize';

export type GenStage = 'idle' | 'thinking' | 'streaming' | 'validating' | 'retrying' | 'done' | 'error';

export interface BuildSection {
  name: string;       // e.g. 'head', 'nav', 'hero', 'features'
  status: 'pending' | 'building' | 'done';
  bytes: number;
}

export interface StreamEvent {
  stage: GenStage;
  raw: string;
  html: string;
  bytes: number;
  attempt: number;        // current attempt (0 = first try)
  maxAttempts: number;
  sections: BuildSection[];
  validation?: HtmlValidationResult;
  error?: string;
  retryReason?: string;   // when stage === 'retrying'
}

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/generate-site`;

const SECTION_DEFS: { name: string; matcher: RegExp }[] = [
  { name: 'head',         matcher: /<head[\s>]/i },
  { name: 'meta & seo',   matcher: /<meta[^>]+description/i },
  { name: 'styles',       matcher: /<style[\s>]|tailwindcss/i },
  { name: 'navigation',   matcher: /<nav[\s>]/i },
  { name: 'hero',         matcher: /<(section|header)[^>]*hero|class=["'][^"']*hero/i },
  { name: 'features',     matcher: /class=["'][^"']*feature|<section[^>]*features/i },
  { name: 'testimonials', matcher: /testimonial|class=["'][^"']*review/i },
  { name: 'pricing',      matcher: /pricing|class=["'][^"']*pric/i },
  { name: 'faq',          matcher: /<section[^>]*faq|class=["'][^"']*faq/i },
  { name: 'cta',          matcher: /class=["'][^"']*cta/i },
  { name: 'footer',       matcher: /<footer[\s>]/i },
  { name: 'scripts',      matcher: /<script\b[^>]*>[\s\S]{40}/i },
  { name: 'closing',      matcher: /<\/body>|<\/html>/i },
];

function detectSections(html: string): BuildSection[] {
  const built: BuildSection[] = [];
  for (const def of SECTION_DEFS) {
    const m = def.matcher.exec(html);
    if (m) {
      built.push({ name: def.name, status: 'done', bytes: m.index });
    } else {
      built.push({ name: def.name, status: built.some(b => b.status === 'done' || b.status === 'building') && built[built.length - 1]?.status === 'done' ? 'building' : 'pending', bytes: 0 });
      break;
    }
  }
  // Mark last 'done' as 'building' if we haven't seen </html>
  if (!html.includes('</html>') && built.length) {
    const lastDone = [...built].reverse().findIndex(b => b.status === 'done');
    if (lastDone >= 0) {
      const idx = built.length - 1 - lastDone;
      if (idx < built.length - 1) built[idx + 1].status = 'building';
    }
  }
  // Append any remaining pending
  while (built.length < SECTION_DEFS.length) {
    built.push({ name: SECTION_DEFS[built.length].name, status: 'pending', bytes: 0 });
  }
  return built;
}

const initialEvent: StreamEvent = {
  stage: 'idle', raw: '', html: '', bytes: 0, attempt: 0, maxAttempts: 1, sections: [],
};

export function useStreamingGenerator() {
  const [event, setEvent] = useState<StreamEvent>(initialEvent);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (
    prompt: string,
    previousHtml: string | undefined,
    onDelta?: (e: StreamEvent) => void,
    opts?: { maxRetries?: number },
  ): Promise<{ html: string; validation: HtmlValidationResult }> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const maxRetries = opts?.maxRetries ?? 2;
    const maxAttempts = maxRetries + 1;

    let lastDeltaTs = 0;
    const emit = (e: Partial<StreamEvent>, force = false) => {
      const now = Date.now();
      // Throttle streaming deltas to ~10fps to keep UI smooth & diff cheap.
      if (!force && e.stage === 'streaming' && now - lastDeltaTs < 100) return;
      lastDeltaTs = now;
      setEvent(prev => {
        const next = { ...prev, ...e } as StreamEvent;
        onDelta?.(next);
        return next;
      });
    };

    const runOnce = async (instruction: string, prev: string | undefined, attempt: number, retryReason?: string): Promise<{ html: string; validation: HtmlValidationResult }> => {
      emit({ stage: attempt > 0 ? 'retrying' : 'thinking', raw: '', html: '', bytes: 0, attempt, maxAttempts, sections: detectSections(''), retryReason }, true);

      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: instruction, previousHtml: prev }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        let msg = `Generation failed (${res.status})`;
        try { const j = await res.json(); msg = j.error || msg; } catch {}
        emit({ stage: 'error', error: msg }, true);
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const html = extractHtmlFromStream(raw);
        emit({ stage: 'streaming', raw, html, bytes: raw.length, sections: detectSections(html), attempt });
      }
      const html = extractHtmlFromStream(raw);
      emit({ stage: 'validating', raw, html, bytes: raw.length, sections: detectSections(html), attempt }, true);
      const validation = validateHtml(html);
      return { html, validation };
    };

    let attempt = 0;
    let last = await runOnce(prompt, previousHtml, attempt);

    while (!last.validation.ok && attempt < maxRetries) {
      attempt++;
      const issues = last.validation.errors.slice(0, 6).join('\n- ');
      const reason = `${last.validation.errors.length} issue(s): ${last.validation.errors[0] ?? 'invalid HTML'}`;
      const fixPrompt = `The previous HTML had structural issues. Fix them and return the COMPLETE corrected document. Issues:\n- ${issues}\n\nOriginal request: ${prompt}`;
      try {
        last = await runOnce(fixPrompt, last.html, attempt, reason);
      } catch { break; }
    }

    // Sanitize before storing/displaying
    const sanitized = sanitizeHtml(last.html);
    last = { html: sanitized.cleaned, validation: validateHtml(sanitized.cleaned) };

    emit({ stage: 'done', html: last.html, bytes: last.html.length, validation: last.validation, sections: detectSections(last.html), attempt }, true);
    return last;
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setEvent(initialEvent);
  }, []);

  const reset = useCallback(() => setEvent(initialEvent), []);

  return { event, generate, cancel, reset };
}
