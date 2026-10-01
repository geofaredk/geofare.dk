import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';

const files = readdirSync('dist', { recursive: true, encoding: 'utf8' });
const pages = files.filter((f) => f.endsWith('.html')).map((f) => ({ path: f, html: readFileSync(`dist/${f}`, 'utf8') }));

describe('CSP-clean output', () => {
  it('builds at least the three pages', () => {
    expect(pages.map((p) => p.path)).toEqual(expect.arrayContaining(['index.html', '404.html', 'privacy/index.html']));
  });

  for (const { path, html } of pages) {
    describe(path, () => {
      const root = parse(html);
      it('has no <style> element and no style attribute', () => {
        expect(root.querySelectorAll('style')).toHaveLength(0);
        expect(html).not.toMatch(/\sstyle\s*=/i);
      });
      it('has no inline script code other than JSON-LD', () => {
        const inline = root
          .querySelectorAll('script')
          .filter((s) => !s.hasAttribute('src') && s.getAttribute('type') !== 'application/ld+json');
        expect(inline.map((s) => s.outerHTML)).toEqual([]);
      });
      it('loads nothing from another origin', () => {
        const urls = [
          ...root.querySelectorAll('[src]').map((e) => e.getAttribute('src')!),
          ...root.querySelectorAll('[srcset]').flatMap((e) => e.getAttribute('srcset')!.split(',').map((c) => c.trim().split(/\s+/)[0])),
          ...root.querySelectorAll('link[href]').map((e) => e.getAttribute('href')!),
        ];
        const foreign = urls.filter((u) => /^(https?:)?\/\//i.test(u) && !u.startsWith(site.url));
        expect(foreign).toEqual([]);
      });
    });
  }
});

describe('budgets', () => {
  it('keeps all JavaScript under 50 000 bytes gzipped', () => {
    const js = readdirSync('dist/_astro').filter((f) => f.endsWith('.js'));
    const total = js.reduce((sum, f) => sum + gzipSync(readFileSync(`dist/_astro/${f}`)).length, 0);
    expect(total).toBeLessThan(50_000);
  });
  it('ships fonts as woff2 only', () => {
    const fonts = files.filter((f) => /\.(woff2?|ttf|otf|eot)$/i.test(f));
    expect(fonts.length).toBeGreaterThan(0);
    for (const f of fonts) expect(f).toMatch(/\.woff2$/);
  });
});
