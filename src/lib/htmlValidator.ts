// Upgraded HTML validator — structural, semantic, accessibility, performance & security checks.
export interface HtmlValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
  stats: {
    sizeKb: number;
    tagCount: number;
    imageCount: number;
    scriptCount: number;
    linkCount: number;
    headingCount: number;
  };
  score: number; // 0-100
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const RAWTEXT_TAGS = new Set(['script', 'style', 'textarea', 'title']);

export function validateHtml(html: string): HtmlValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const trimmed = html.trim();

  // ---- Document shell ----
  if (!/^<!DOCTYPE\s+html>/i.test(trimmed)) errors.push('Missing <!DOCTYPE html> declaration.');
  if (!/<html[\s>]/i.test(trimmed)) errors.push('Missing <html> tag.');
  if (!/<\/html>\s*$/i.test(trimmed)) errors.push('Document not properly closed with </html>.');
  if (!/<head[\s>]/i.test(trimmed)) errors.push('Missing <head> section.');
  if (!/<\/head>/i.test(trimmed)) errors.push('Unclosed <head> section.');
  if (!/<body[\s>]/i.test(trimmed)) errors.push('Missing <body> section.');
  if (!/<\/body>/i.test(trimmed)) errors.push('Unclosed <body> section.');

  // ---- SEO / meta ----
  if (!/<title>[^<]+<\/title>/i.test(trimmed)) warnings.push('No <title> tag — bad for SEO.');
  if (!/<meta\s+[^>]*name=["']viewport/i.test(trimmed)) warnings.push('No viewport meta — not mobile-friendly.');
  if (!/<meta\s+[^>]*name=["']description/i.test(trimmed)) warnings.push('No meta description — bad for SEO.');
  if (!/<meta\s+[^>]*charset/i.test(trimmed)) warnings.push('No charset declaration.');
  if (!/<html[^>]*\blang=/i.test(trimmed)) warnings.push('Missing <html lang> attribute.');

  // ---- Tag balance (skip raw-text tag bodies) ----
  const stack: string[] = [];
  let i = 0, tagCount = 0;
  while (i < trimmed.length) {
    const lt = trimmed.indexOf('<', i);
    if (lt === -1) break;
    // Skip comments / CDATA
    if (trimmed.startsWith('<!--', lt)) { i = trimmed.indexOf('-->', lt + 4) + 3 || trimmed.length; continue; }
    if (trimmed.startsWith('<!', lt)) { i = trimmed.indexOf('>', lt) + 1 || trimmed.length; continue; }
    const gt = trimmed.indexOf('>', lt);
    if (gt === -1) { errors.push('Unterminated tag near end of document.'); break; }
    const segment = trimmed.slice(lt, gt + 1);
    const m = segment.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!m) { i = gt + 1; continue; }
    const tag = m[1].toLowerCase();
    const isClose = segment.startsWith('</');
    const selfClose = segment.endsWith('/>') || VOID_TAGS.has(tag);
    tagCount++;
    if (isClose) {
      const last = stack.pop();
      if (last !== tag) {
        const idx = stack.lastIndexOf(tag);
        if (idx !== -1) stack.splice(idx);
        else warnings.push(`Unmatched closing </${tag}>.`);
      }
    } else if (!selfClose) {
      stack.push(tag);
      if (RAWTEXT_TAGS.has(tag)) {
        // Skip raw-text body
        const closeRe = new RegExp(`</${tag}\\s*>`, 'i');
        const rest = trimmed.slice(gt + 1);
        const cm = rest.match(closeRe);
        if (cm && cm.index !== undefined) {
          stack.pop();
          i = gt + 1 + cm.index + cm[0].length;
          continue;
        } else {
          errors.push(`Unclosed <${tag}> block.`);
          break;
        }
      }
    }
    i = gt + 1;
  }
  if (stack.length > 0) {
    errors.push(`${stack.length} unclosed tag(s): ${[...new Set(stack)].slice(0, 5).join(', ')}`);
  }

  // ---- Accessibility ----
  const imgs = [...trimmed.matchAll(/<img\b[^>]*>/gi)];
  const imgsWithoutAlt = imgs.filter(m => !/\balt\s*=/.test(m[0]));
  if (imgsWithoutAlt.length > 0) warnings.push(`${imgsWithoutAlt.length} image(s) without alt text.`);
  const buttonsEmpty = [...trimmed.matchAll(/<button\b[^>]*>\s*<\/button>/gi)];
  if (buttonsEmpty.length > 0) warnings.push(`${buttonsEmpty.length} empty <button>(s) — add label or aria-label.`);
  const linksEmpty = [...trimmed.matchAll(/<a\b[^>]*>\s*<\/a>/gi)];
  if (linksEmpty.length > 0) warnings.push(`${linksEmpty.length} empty <a>(s).`);
  const inputs = [...trimmed.matchAll(/<input\b[^>]*>/gi)].filter(m => !/type\s*=\s*["'](hidden|submit|button)["']/i.test(m[0]));
  const inputsNoLabel = inputs.filter(m => !/\b(aria-label|id)\s*=/.test(m[0]));
  if (inputsNoLabel.length > 0) warnings.push(`${inputsNoLabel.length} input(s) without aria-label/id.`);

  // ---- Headings ----
  const headings = [...trimmed.matchAll(/<h([1-6])\b/gi)];
  const h1Count = headings.filter(h => h[1] === '1').length;
  if (h1Count === 0) warnings.push('No <h1> on the page.');
  if (h1Count > 1) warnings.push(`${h1Count} <h1> tags — should be exactly one.`);

  // ---- Duplicate IDs ----
  const ids = [...trimmed.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) warnings.push(`Duplicate id(s): ${[...new Set(dupes)].slice(0, 3).join(', ')}`);

  // ---- Performance / security ----
  if (/\bhttp:\/\//i.test(trimmed)) warnings.push('Insecure http:// resource(s) — prefer https://.');
  if (/<script\b[^>]*>[^<]{2000,}/i.test(trimmed)) warnings.push('Very large inline script — consider splitting.');
  const externalScripts = [...trimmed.matchAll(/<script\b[^>]*\bsrc=/gi)];
  if (externalScripts.length > 8) warnings.push(`${externalScripts.length} external scripts — may slow load.`);

  // ---- Stats ----
  const scriptCount = (trimmed.match(/<script\b/gi) || []).length;
  const linkCount = (trimmed.match(/<a\b/gi) || []).length;
  const sizeKb = Math.round((new Blob([trimmed]).size / 1024) * 10) / 10;

  // Score
  let score = 100 - errors.length * 20 - warnings.length * 3;
  if (score < 0) score = 0;

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    stats: { sizeKb, tagCount, imageCount: imgs.length, scriptCount, linkCount, headingCount: headings.length },
    score,
  };
}

export function extractHtmlFromStream(raw: string): string {
  let out = raw.trim();
  if (out.startsWith('```')) {
    out = out.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  const docIdx = out.search(/<!DOCTYPE/i);
  if (docIdx > 0) out = out.slice(docIdx);
  // Trim trailing fence if model added one mid-stream
  out = out.replace(/```\s*$/, '').trim();
  return out;
}
