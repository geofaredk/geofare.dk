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
  it('the sitemap exists and leaves out the imprint and 404 pages in every language', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
    const sitemaps = readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f));
    expect(sitemaps.length).toBeGreaterThan(0);
    for (const f of sitemaps) {
      expect(read(f)).not.toContain('/imprint');
      expect(read(f)).not.toContain('/kolofon');
      expect(read(f)).not.toContain('/404');
    }
  });
  it('Danish is published: indexable, with a canonical, in the sitemap, and both languages point at each other with hreflang', () => {
    const sitemap = readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f)).map(read).join('');
    const da = parse(read('da/index.html'));
    expect(da.querySelector('html')?.getAttribute('lang')).toBe('da-DK');
    expect(da.querySelector('meta[name="robots"]')).toBeNull();
    expect(da.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${site.url}/da/`);
    expect(sitemap).toContain(`${site.url}/da/`);
    const hreflangs = (page: ReturnType<typeof parse>) =>
      Object.fromEntries(page.querySelectorAll('link[rel="alternate"]').map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')]));
    const expected = { en: `${site.url}/`, da: `${site.url}/da/`, 'x-default': `${site.url}/` };
    expect(hreflangs(parse(read('index.html')))).toEqual(expected);
    expect(hreflangs(da)).toEqual(expected);
    // The imprint stays out of search engines in every language, as a page, not as a language.
    expect(parse(read('da/kolofon/index.html')).querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
  });
  it('a draft language, if there is one, is built but kept out of search engines: noindex, no canonical, not in the sitemap or the hreflang links', () => {
    const sitemap = readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f)).map(read).join('');
    const drafts = Object.entries(site.locales).filter(([, locale]) => locale.draft);
    for (const [lang] of drafts) {
      const page = parse(read(`${lang}/index.html`));
      expect(page.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
      expect(page.querySelector('link[rel="canonical"]')).toBeNull();
      expect(sitemap).not.toContain(`/${lang}/`);
      expect(parse(read('index.html')).querySelector(`link[rel="alternate"][hreflang="${site.locales[lang as keyof typeof site.locales].hreflang}"]`)).toBeNull();
    }
  });
  it('there are no pages in a language that is not in the list, and no Danish page under an English path', () => {
    expect(existsSync('dist/de')).toBe(false);
    expect(existsSync('dist/da/imprint')).toBe(false);
    expect(existsSync('dist/da/services')).toBe(false);
  });
  it('every page offers the same page in the other languages only, each link named in its own language', () => {
    const cases: [string, Record<string, string>][] = [
      ['index.html', { Dansk: '/da/' }],
      ['da/index.html', { English: '/' }],
      // The imprint has its own word in each language's URL.
      ['imprint/index.html', { Dansk: '/da/kolofon/' }],
      ['da/kolofon/index.html', { English: '/imprint/' }],
      // The 404 pages have no header, so no switcher.
    ];
    for (const [path, others] of cases) {
      const items = parse(read(path)).querySelectorAll('header nav .site-header__lang');
      // The language the page is in is not offered: nothing marks it, nothing links to it.
      expect(items.filter((item) => item.tagName !== 'A' || item.getAttribute('aria-current')), path).toHaveLength(0);
      const links = Object.fromEntries(items.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
      expect(links, path).toEqual(others);
      for (const a of items) expect(a.getAttribute('lang'), path).toBe(site.locales[a.getAttribute('hreflang') as keyof typeof site.locales].htmlLang);
    }
  });
  it('404 and imprint pages exist and are noindex', () => {
    for (const path of ['404.html', 'da/404/index.html', 'imprint/index.html', 'da/kolofon/index.html']) {
      expect(existsSync(`dist/${path}`)).toBe(true);
      expect(parse(read(path)).querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    }
  });
});
