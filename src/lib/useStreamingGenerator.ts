// Streaming generator hook — calls the edge function and emits text deltas.
import { useCallback, useRef, useState } from 'react';
import { extractHtmlFromStream, validateHtml, type HtmlValidationResult } from './htmlValidator';

export type GenStage = 'idle' | 'thinking' | 'streaming' | 'validating' | 'done' | 'error';

export interface StreamEvent {
  stage: GenStage;
  raw: string;       // raw accumulated text from the model
  html: string;      // cleaned HTML so far (for live preview)
  bytes: number;
  validation?: HtmlValidationResult;
  error?: string;
}

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/generate-site`;

export function useStreamingGenerator() {
  const [event, setEvent] = useState<StreamEvent>({ stage: 'idle', raw: '', html: '', bytes: 0 });
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

    const emit = (e: StreamEvent) => { setEvent(e); onDelta?.(e); };

    const runOnce = async (instruction: string, prev?: string): Promise<{ html: string; validation: HtmlValidationResult }> => {
      emit({ stage: 'thinking', raw: '', html: '', bytes: 0 });

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
        emit({ stage: 'error', raw: '', html: '', bytes: 0, error: msg });
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
        emit({ stage: 'streaming', raw, html, bytes: raw.length });
      }
      const html = extractHtmlFromStream(raw);
      emit({ stage: 'validating', raw, html, bytes: raw.length });
      const validation = validateHtml(html);
      return { html, validation };
    };

    const maxRetries = opts?.maxRetries ?? 2;
    let attempt = 0;
    let last = await runOnce(prompt, previousHtml);

    while (!last.validation.ok && attempt < maxRetries) {
      attempt++;
      const issues = last.validation.errors.slice(0, 6).join('\n- ');
      const fixPrompt = `The previous HTML had structural issues. Fix them and return the COMPLETE corrected document. Issues:\n- ${issues}\n\nOriginal request: ${prompt}`;
      try {
        const next = await runOnce(fixPrompt, last.html);
        last = next;
      } catch {
        break;
      }
    }

    emit({ stage: 'done', raw: '', html: last.html, bytes: last.html.length, validation: last.validation });
    return last;
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { event, generate, cancel };
}
