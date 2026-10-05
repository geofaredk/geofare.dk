import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import copy from '../fixtures/copy.en.json';
import { site } from '../../src/config/site';
import { isPlaceholder, postalAddress } from '../../src/lib/contact';

const read = (path: string) => readFileSync(`dist/${path}`, 'utf8');
const root = parse(read('index.html'));
const meta = (selector: string) => root.querySelector(selector)?.getAttribute('content');
const isAbsolute = (url: string | undefined) => !!url && url.startsWith(`${site.url}/`);

/** Every string value anywhere in a JSON value. */
const strings = (value: unknown): string[] =>
  typeof value === 'string'
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(strings)
      : value && typeof value === 'object'
        ? Object.values(value).flatMap(strings)
        : [];

describe('page metadata', () => {
  it('title and description come from the brief', () => {
    expect(root.querySelector('title')!.textContent).toBe(copy.meta.title);
    expect(meta('meta[name="description"]')).toBe(copy.meta.description);
  });
  it('declares British English', () => {
    expect(root.querySelector('html')!.getAttribute('lang')).toBe('en-GB');
  });
  it('has an absolute canonical and hreflang alternates', () => {
    expect(isAbsolute(root.querySelector('link[rel="canonical"]')?.getAttribute('href'))).toBe(true);
    expect(isAbsolute(root.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href'))).toBe(true);
    expect(isAbsolute(root.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href'))).toBe(true);
  });
  it('has an absolute og:image that exists in dist', () => {
    const image = meta('meta[property="og:image"]');
    expect(isAbsolute(image)).toBe(true);
    expect(existsSync(`dist${new URL(image!).pathname}`)).toBe(true);
  });
});

describe('structured data', () => {
  const block = root.querySelector('script[type="application/ld+json"]');
  const data = JSON.parse(block!.textContent);
  it('is a ProfessionalService', () => {
    expect(data['@type']).toBe('ProfessionalService');
  });
  it('leaks no placeholder', () => {
    for (const s of strings(data)) expect(s).not.toMatch(/\[[^\]]+\]/);
  });
  it('has the street and the postcode and town once they are real, and not before', () => {
    expect(data.address).toEqual(postalAddress(site.company));
    expect('streetAddress' in data.address).toBe(!isPlaceholder(site.company.street));
    expect('addressLocality' in data.address).toBe(!isPlaceholder(site.company.postalTown));
  });
  it('states no service area, which the brief does not give', () => {
    expect(data.areaServed).toBeUndefined();
  });
});

describe('crawl files', () => {
  it('robots.txt points to the sitemap', () => {
    expect(read('robots.txt')).toMatch(/^Sitemap: \S+$/m);
  });
  it('the sitemap exists and leaves out /imprint', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
    const sitemaps = readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f));
    expect(sitemaps.length).toBeGreaterThan(0);
    for (const f of sitemaps) expect(read(f)).not.toContain('/imprint');
  });
  it('draft languages are built but kept out of search engines: noindex, no canonical, not in the sitemap or the hreflang links', () => {
    const sitemap = readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f)).map(read).join('');
    for (const lang of ['da']) {
      for (const path of [`${lang}/index.html`, `${lang}/imprint/index.html`]) {
        expect(existsSync(`dist/${path}`), path).toBe(true);
        const page = parse(read(path));
        expect(page.querySelector('html')?.getAttribute('lang')).toMatch(new RegExp(`^${lang}-`));
        expect(page.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
        expect(page.querySelector('link[rel="canonical"]')).toBeNull();
      }
      expect(sitemap).not.toContain(`/${lang}/`);
    }
    const home = parse(read('index.html'));
    expect(home.querySelectorAll('link[rel="alternate"]').map((l) => l.getAttribute('hreflang'))).toEqual(['en', 'x-default']);
  });
  it('there are no pages in a language that is not in the list', () => {
    expect(existsSync('dist/de')).toBe(false);
  });
  it('every page offers the same page in the other languages, and marks the language it is in', () => {
    const cases: [string, string, Record<string, string>][] = [
      ['index.html', 'EN', { DA: '/da/' }],
      ['da/index.html', 'DA', { EN: '/' }],
      ['da/imprint/index.html', 'DA', { EN: '/imprint/' }],
      // The 404 page exists once, so from there the other languages lead home.
      ['404.html', 'EN', { DA: '/da/' }],
    ];
    for (const [path, current, others] of cases) {
      const items = parse(read(path)).querySelectorAll('header nav .site-header__lang');
      expect(items).toHaveLength(2);
      const here = items.filter((item) => item.getAttribute('aria-current'));
      expect(here).toHaveLength(1);
      expect(here[0].tagName).toBe('SPAN');
      expect(here[0].textContent.trim().startsWith(current), path).toBe(true);
      const links = Object.fromEntries(items.filter((item) => item.tagName === 'A').map((a) => [a.textContent.trim().slice(0, 2), a.getAttribute('href')]));
      expect(links, path).toEqual(others);
    }
  });
  it('404 and imprint pages exist and are noindex', () => {
    for (const path of ['404.html', 'imprint/index.html']) {
      expect(existsSync(`dist/${path}`)).toBe(true);
      expect(parse(read(path)).querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    }
  });
});
