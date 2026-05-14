// Strips/blocks unsafe scripts in generated HTML before rendering in the iframe.
// We allow a strict allowlist of CDNs the model is encouraged to use.
const ALLOWED_HOSTS = [
  'cdn.tailwindcss.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'images.unsplash.com',
  'logo.clearbit.com',
  'api.dicebear.com',
  'ui-avatars.com',
  'i.pravatar.cc',
];

const DANGEROUS_INLINE = [
  /document\.cookie/gi,
  /localStorage\b/gi,
  /sessionStorage\b/gi,
  /\bfetch\s*\(\s*['"`]https?:\/\/(?!images\.unsplash\.com|fonts\.|.*\.functions\.supabase\.co|.*\.supabase\.co)/gi,
  /XMLHttpRequest/gi,
  /eval\s*\(/gi,
];

export interface SanitizeReport {
  blockedScripts: string[];   // src URLs we removed
  inlineWarnings: string[];   // patterns we flagged
  cleaned: string;
}

export function sanitizeHtml(html: string): SanitizeReport {
  const blockedScripts: string[] = [];
  const inlineWarnings: string[] = [];

  // Remove disallowed external scripts
  let cleaned = html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi, (m, src) => {
    try {
      const u = new URL(src, window.location.origin);
      if (u.protocol === 'http:') { blockedScripts.push(src); return `<!-- blocked-insecure-script: ${src} -->`; }
      if (!ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h))) {
        blockedScripts.push(src);
        return `<!-- blocked-external-script: ${src} -->`;
      }
    } catch { blockedScripts.push(src); return `<!-- blocked-script: ${src} -->`; }
    return m;
  });

  // Flag dangerous inline patterns (warn only, don't strip — many demos legitimately need DOM access)
  for (const re of DANGEROUS_INLINE) {
    const matches = cleaned.match(re);
    if (matches) inlineWarnings.push(`${matches.length}× ${re.source}`);
  }

  // Strip on* event handlers that try to navigate away or submit cross-origin
  cleaned = cleaned.replace(/\son(?:click|submit|load|error)\s*=\s*["'][^"']*window\.location[^"']*["']/gi, '');

  return { blockedScripts, inlineWarnings, cleaned };
}
