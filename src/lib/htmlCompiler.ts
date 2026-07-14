const hasAttr = (attrs: string, name: string) => new RegExp(`\\s${name}\\s*=`, 'i').test(attrs);

function standardizeScriptTypes(html: string): string {
  return html.replace(/<script((?:\s+[^>]*)?)>([\s\S]*?)<\/script>/gi, (full, attrs: string, body: string) => {
    if (hasAttr(attrs, 'type')) return full;
    // Detect static ESM syntax at statement position (avoid matching dynamic import() or the word in strings)
    const hasEsm = /(^|\n)\s*(import\s+[\s\S]*?from\s+['"]|import\s*['"]|export\s+(default|const|let|var|function|class|\{))/m.test(body);
    if (hasEsm) return `<script type="module"${attrs}>${body}</script>`;

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

// Guarantee the Tailwind Play CDN <script src="cdn.tailwindcss.com"> loads
// BEFORE any inline `tailwind.config = {...}` or `tailwind = {...}` block.
// Otherwise the sandbox throws "tailwind is not defined" and every generated
// site renders as unstyled/blank.
function fixTailwindConfigOrder(html: string): string {
  const cdnRe = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/i;
  const configRe = /<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?\btailwind\s*(?:\.config)?\s*=[\s\S]*?<\/script>/i;

  const cdnMatch = html.match(cdnRe);
  const cfgMatch = html.match(configRe);
  if (!cfgMatch) return html;

  // Case 1: no CDN script at all — inject one before the config block.
  if (!cdnMatch) {
    const cdnTag = '<script src="https://cdn.tailwindcss.com" crossorigin="anonymous"></script>';
    return html.replace(cfgMatch[0], `${cdnTag}\n${cfgMatch[0]}`);
  }

  const cdnIdx = html.indexOf(cdnMatch[0]);
  const cfgIdx = html.indexOf(cfgMatch[0]);
  // Case 2: config already after CDN — nothing to do.
  if (cfgIdx > cdnIdx) return html;

  // Case 3: config appears before CDN — remove the misplaced config, then
  // re-insert it immediately after the CDN tag so `tailwind` global is defined.
  const withoutCfg = html.replace(cfgMatch[0], '');
  return withoutCfg.replace(cdnMatch[0], `${cdnMatch[0]}\n${cfgMatch[0]}`);
}

export function compileGeneratedHtml(html: string): string {
  return enforceAnonymousCrossOrigin(
    normalizeBabelScripts(
      standardizeScriptTypes(
        fixTailwindConfigOrder(html)
      )
    )
  );
}
