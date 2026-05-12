// Upgraded HTML validator — categorical scoring (structure, accessibility, SEO, performance, security).
export interface CategoryScore {
  name: string;
  score: number;       // 0-100
  weight: number;
  passed: number;
  total: number;
  notes: string[];
}

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
    formCount: number;
  };
  categories: CategoryScore[];
  score: number; // weighted 0-100
}

const VOID_TAGS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const RAWTEXT_TAGS = new Set(['script', 'style', 'textarea', 'title']);

interface Check { ok: boolean; note: string; severity?: 'warn' | 'error' }

function category(name: string, weight: number, checks: Check[]): { cat: CategoryScore; warns: string[]; errs: string[] } {
  const total = checks.length;
  const passed = checks.filter(c => c.ok).length;
  const score = total === 0 ? 100 : Math.round((passed / total) * 100);
  const notes = checks.filter(c => !c.ok).map(c => c.note);
  const warns: string[] = []; const errs: string[] = [];
  for (const c of checks) if (!c.ok) (c.severity === 'error' ? errs : warns).push(`[${name}] ${c.note}`);
  return { cat: { name, score, weight, passed, total, notes }, warns, errs };
}

export function validateHtml(html: string): HtmlValidationResult {
  const trimmed = html.trim();
  const warnings: string[] = [];
  const errors: string[] = [];

  // ---- Tag balance + raw stats ----
  const stack: string[] = [];
  let i = 0, tagCount = 0;
  while (i < trimmed.length) {
    const lt = trimmed.indexOf('<', i);
    if (lt === -1) break;
    if (trimmed.startsWith('<!--', lt)) { i = trimmed.indexOf('-->', lt + 4) + 3 || trimmed.length; continue; }
    if (trimmed.startsWith('<!', lt)) { i = trimmed.indexOf('>', lt) + 1 || trimmed.length; continue; }
    const gt = trimmed.indexOf('>', lt);
    if (gt === -1) { errors.push('Unterminated tag near end of document.'); break; }
    const seg = trimmed.slice(lt, gt + 1);
    const m = seg.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!m) { i = gt + 1; continue; }
    const tag = m[1].toLowerCase();
    const isClose = seg.startsWith('</');
    const selfClose = seg.endsWith('/>') || VOID_TAGS.has(tag);
    tagCount++;
    if (isClose) {
      const last = stack.pop();
      if (last !== tag) { const idx = stack.lastIndexOf(tag); if (idx !== -1) stack.splice(idx); }
    } else if (!selfClose) {
      stack.push(tag);
      if (RAWTEXT_TAGS.has(tag)) {
        const re = new RegExp(`</${tag}\\s*>`, 'i');
        const rest = trimmed.slice(gt + 1); const cm = rest.match(re);
        if (cm && cm.index !== undefined) { stack.pop(); i = gt + 1 + cm.index + cm[0].length; continue; }
        else { errors.push(`Unclosed <${tag}> block.`); break; }
      }
    }
    i = gt + 1;
  }
  const unclosedCount = stack.length;

  const sizeKb = Math.round((new Blob([trimmed]).size / 1024) * 10) / 10;
  const imgs = [...trimmed.matchAll(/<img\b[^>]*>/gi)];
  const externalScripts = [...trimmed.matchAll(/<script\b[^>]*\bsrc=/gi)];
  const scriptCount = (trimmed.match(/<script\b/gi) || []).length;
  const linkCount = (trimmed.match(/<a\b/gi) || []).length;
  const headings = [...trimmed.matchAll(/<h([1-6])\b/gi)];
  const formCount = (trimmed.match(/<form\b/gi) || []).length;
  const ids = [...trimmed.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]);
  const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  const imgsNoAlt = imgs.filter(m => !/\balt\s*=/.test(m[0])).length;
  const inputs = [...trimmed.matchAll(/<input\b[^>]*>/gi)].filter(m => !/type\s*=\s*["'](hidden|submit|button)["']/i.test(m[0]));
  const inputsNoLabel = inputs.filter(m => !/\b(aria-label|id)\s*=/.test(m[0])).length;

  // ---- Categories ----
  const structure = category('Structure', 30, [
    { ok: /^<!DOCTYPE\s+html>/i.test(trimmed), note: 'Missing <!DOCTYPE html>', severity: 'error' },
    { ok: /<html[\s>]/i.test(trimmed) && /<\/html>\s*$/i.test(trimmed), note: 'Document not fully closed', severity: 'error' },
    { ok: /<head[\s>]/i.test(trimmed) && /<\/head>/i.test(trimmed), note: '<head> not properly closed', severity: 'error' },
    { ok: /<body[\s>]/i.test(trimmed) && /<\/body>/i.test(trimmed), note: '<body> not properly closed', severity: 'error' },
    { ok: unclosedCount === 0, note: `${unclosedCount} unclosed tag(s): ${[...new Set(stack)].slice(0,3).join(', ')}`, severity: 'error' },
    { ok: dupIds.length === 0, note: `Duplicate id(s): ${dupIds.slice(0,3).join(', ')}` },
  ]);

  const seo = category('SEO', 20, [
    { ok: /<title>[^<]+<\/title>/i.test(trimmed), note: 'Missing <title>' },
    { ok: /<meta\s+[^>]*name=["']description/i.test(trimmed), note: 'Missing meta description' },
    { ok: /<meta\s+[^>]*charset/i.test(trimmed), note: 'Missing charset declaration' },
    { ok: /<meta\s+[^>]*name=["']viewport/i.test(trimmed), note: 'Missing viewport meta' },
    { ok: /<html[^>]*\blang=/i.test(trimmed), note: 'Missing <html lang>' },
    { ok: /<meta\s+[^>]*property=["']og:/i.test(trimmed), note: 'Missing OpenGraph tags' },
    { ok: /<link\s+[^>]*rel=["']canonical/i.test(trimmed), note: 'Missing canonical link' },
    { ok: /<script[^>]+application\/ld\+json/i.test(trimmed), note: 'No JSON-LD schema' },
  ]);

  const h1Count = headings.filter(h => h[1] === '1').length;
  const a11y = category('Accessibility', 25, [
    { ok: imgsNoAlt === 0, note: `${imgsNoAlt} image(s) without alt text` },
    { ok: h1Count === 1, note: h1Count === 0 ? 'No <h1>' : `${h1Count} <h1> tags (should be 1)` },
    { ok: inputsNoLabel === 0, note: `${inputsNoLabel} input(s) without label/aria-label` },
    { ok: !/<button\b[^>]*>\s*<\/button>/gi.test(trimmed), note: 'Empty <button> elements' },
    { ok: !/<a\b[^>]*>\s*<\/a>/gi.test(trimmed), note: 'Empty <a> elements' },
    { ok: headings.length >= 3, note: 'Few headings — consider richer document outline' },
    { ok: !/role=["']button["'][^>]*(?!tabindex)/i.test(trimmed) || /tabindex=/i.test(trimmed), note: 'Custom button missing tabindex' },
  ]);

  const perf = category('Performance', 15, [
    { ok: sizeKb <= 80, note: `Page is ${sizeKb}KB (budget 80KB)` },
    { ok: sizeKb <= 150, note: `Page is ${sizeKb}KB (HARD budget 150KB)`, severity: 'error' },
    { ok: scriptCount <= 8, note: `${scriptCount} <script> tags exceed budget 8` },
    { ok: externalScripts.length <= 6, note: `${externalScripts.length} external scripts exceed budget 6` },
    { ok: imgs.length <= 30, note: `${imgs.length} images exceed budget 30` },
    { ok: !/<script\b[^>]*>[^<]{6000,}/i.test(trimmed), note: 'Very large inline script' },
  ]);

  const security = category('Security', 10, [
    { ok: !/\bhttp:\/\//i.test(trimmed), note: 'Insecure http:// resource(s)' },
    { ok: !/\bonclick\s*=\s*["'][^"']*window\.location/i.test(trimmed), note: 'Inline onclick navigation — use <a href>' },
    { ok: !/\beval\s*\(/i.test(trimmed), note: 'Use of eval() detected' },
    { ok: !/\bdocument\.write\b/i.test(trimmed), note: 'Use of document.write detected' },
    { ok: !/<iframe\b[^>]+src=["']http:\/\//i.test(trimmed), note: 'Insecure iframe src' },
  ]);

  const cats = [structure, seo, a11y, perf, security];
  for (const c of cats) { warnings.push(...c.warns); errors.push(...c.errs); }

  const totalWeight = cats.reduce((s, c) => s + c.cat.weight, 0);
  const score = Math.round(cats.reduce((s, c) => s + c.cat.score * c.cat.weight, 0) / totalWeight);

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    stats: { sizeKb, tagCount, imageCount: imgs.length, scriptCount, linkCount, headingCount: headings.length, formCount },
    categories: cats.map(c => c.cat),
    score,
  };
}

export function extractHtmlFromStream(raw: string): string {
  let out = raw.trim();
  if (out.startsWith('```')) out = out.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const docIdx = out.search(/<!DOCTYPE/i);
  if (docIdx > 0) out = out.slice(docIdx);
  out = out.replace(/```\s*$/, '').trim();
  return out;
}
