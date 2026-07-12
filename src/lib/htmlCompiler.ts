const hasAttr = (attrs: string, name: string) => new RegExp(`\\s${name}\\s*=`, 'i').test(attrs);

function standardizeScriptTypes(html: string): string {
  return html.replace(/<script((?:\s+[^>]*)?)>([\s\S]*?)<\/script>/gi, (full, attrs: string, body: string) => {
    if (hasAttr(attrs, 'type')) return full;
    if (/\b(import|export)\b/.test(body)) return `<script type="module"${attrs}>${body}</script>`;

    const looksLikeJsx = /ReactDOM\.createRoot[\s\S]*\.render\s*\(\s*</.test(body)
      || /return\s*\(\s*<[A-Za-z]/.test(body)
      || /=>\s*\(\s*<[A-Za-z]/.test(body);

    if (looksLikeJsx) return `<script type="text/babel" data-presets="env,react"${attrs}>${body}</script>`;
    return full;
  });
}

function normalizeBabelScripts(html: string): string {
  return html.replace(/<script\b([^>]*)>/gi, (tag, attrs: string) => {
    if (!/\stype\s*=\s*(["'])text\/babel\1/i.test(attrs)) return tag;
    if (!hasAttr(attrs, 'data-presets')) return `<script${attrs} data-presets="env,react">`;
    return tag.replace(/data-presets\s*=\s*(["'])(.*?)\1/i, (_m, quote, value) => {
      const presets = String(value).split(',').map((v) => v.trim()).filter(Boolean);
      if (!presets.includes('react')) presets.push('react');
      if (!presets.includes('env')) presets.unshift('env');
      return `data-presets=${quote}${presets.join(',')}${quote}`;
    });
  });
}

function enforceAnonymousCrossOrigin(html: string): string {
  return html
    .replace(/<script\b([^>]*)>/gi, (tag, attrs: string) => {
      if (hasAttr(attrs, 'crossorigin')) return tag;
      return `<script${attrs} crossorigin="anonymous">`;
    })
    .replace(/<link\b([^>]*(?:\brel\s*=\s*(["'])(?:modulepreload|preload)\2|\bas\s*=\s*(["'])script\3)[^>]*)>/gi, (tag, attrs: string) => {
      if (hasAttr(attrs, 'crossorigin')) return tag;
      return `<link${attrs} crossorigin="anonymous">`;
    });
}

export function compileGeneratedHtml(html: string): string {
  return enforceAnonymousCrossOrigin(normalizeBabelScripts(standardizeScriptTypes(html)));
}