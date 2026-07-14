import { describe, expect, it } from 'vitest';
import { compileGeneratedHtml } from './htmlCompiler';

describe('compileGeneratedHtml', () => {
  it('precompiles Babel JSX modules so imports execute as native modules', () => {
    const html = `<!doctype html><html><head>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    </head><body><div id="root"></div>
      <script type="text/babel" data-presets="env,react">
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        const App = () => <main>Hello</main>;
        createRoot(document.getElementById('root')).render(<App />);
      </script>
    </body></html>`;

    const compiled = compileGeneratedHtml(html);

    expect(compiled).not.toContain('@babel/standalone');
    expect(compiled).not.toContain('type="text/babel"');
    expect(compiled).toContain('<script type="module"');
    expect(compiled).toContain('import React from');
    expect(compiled).toContain('React.createElement');
  });

  it('precompiles classic inline JSX without requiring the in-browser transformer', () => {
    const html = `<html><body><div id="root"></div><script>
      const App = () => <section>Ready</section>;
      ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script></body></html>`;

    const compiled = compileGeneratedHtml(html);

    expect(compiled).not.toContain('text/babel');
    expect(compiled).toContain('React.createElement');
  });

  it('keeps Tailwind config after the Tailwind CDN script', () => {
    const html = `<html><head><script>tailwind.config={theme:{extend:{}}}</script><script src="https://cdn.tailwindcss.com"></script></head></html>`;
    const compiled = compileGeneratedHtml(html);

    expect(compiled.indexOf('cdn.tailwindcss.com')).toBeLessThan(compiled.indexOf('tailwind.config'));
  });
});