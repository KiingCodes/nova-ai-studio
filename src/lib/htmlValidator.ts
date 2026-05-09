// Lightweight HTML validator — reports structural issues without parsing the full DOM.
export interface HtmlValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
  stats: {
    sizeKb: number;
    tagCount: number;
    imageCount: number;
    scriptCount: number;
  };
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export function validateHtml(html: string): HtmlValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const trimmed = html.trim();

  if (!/^<!DOCTYPE\s+html>/i.test(trimmed)) {
    errors.push('Missing <!DOCTYPE html> declaration.');
  }
  if (!/<html[\s>]/i.test(trimmed)) errors.push('Missing <html> tag.');
  if (!/<\/html>\s*$/i.test(trimmed)) errors.push('Document not properly closed with </html>.');
  if (!/<head[\s>]/i.test(trimmed)) errors.push('Missing <head> section.');
  if (!/<body[\s>]/i.test(trimmed)) errors.push('Missing <body> section.');
  if (!/<title>/i.test(trimmed)) warnings.push('No <title> tag — bad for SEO.');
  if (!/<meta\s+name=["']viewport/i.test(trimmed)) warnings.push('No viewport meta — not mobile-friendly.');
  if (!/<meta\s+name=["']description/i.test(trimmed)) warnings.push('No meta description — bad for SEO.');

  // Tag balance check
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  const stack: string[] = [];
  let match: RegExpExecArray | null;
  let tagCount = 0;
  while ((match = tagRegex.exec(trimmed)) !== null) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    const selfClose = match[2] === '/' || VOID_TAGS.has(tag);
    tagCount++;
    if (full.startsWith('</')) {
      const last = stack.pop();
      if (last !== tag) {
        // Mismatched — try to recover
        const idx = stack.lastIndexOf(tag);
        if (idx !== -1) stack.splice(idx);
        else warnings.push(`Unmatched closing tag </${tag}>.`);
      }
    } else if (!selfClose) {
      stack.push(tag);
    }
  }
  if (stack.length > 0) {
    warnings.push(`${stack.length} unclosed tag(s): ${[...new Set(stack)].slice(0, 5).join(', ')}`);
  }

  // Image alt
  const imgs = [...trimmed.matchAll(/<img\b[^>]*>/gi)];
  const imgsWithoutAlt = imgs.filter(m => !/\balt\s*=/.test(m[0]));
  if (imgsWithoutAlt.length > 0) {
    warnings.push(`${imgsWithoutAlt.length} image(s) without alt text.`);
  }

  const scriptCount = (trimmed.match(/<script\b/gi) || []).length;
  const sizeKb = Math.round((new Blob([trimmed]).size / 1024) * 10) / 10;

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    stats: { sizeKb, tagCount, imageCount: imgs.length, scriptCount },
  };
}

export function extractHtmlFromStream(raw: string): string {
  let out = raw.trim();
  if (out.startsWith('```')) {
    out = out.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  const docIdx = out.search(/<!DOCTYPE/i);
  if (docIdx > 0) out = out.slice(docIdx);
  return out;
}
