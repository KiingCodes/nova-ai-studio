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
  ): Promise<{ html: string; validation: HtmlValidationResult }> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const emit = (e: StreamEvent) => { setEvent(e); onDelta?.(e); };
    emit({ stage: 'thinking', raw: '', html: '', bytes: 0 });

    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ prompt, previousHtml }),
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
    emit({ stage: 'done', raw, html, bytes: raw.length, validation });
    return { html, validation };
  }, []);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { event, generate, cancel };
}
