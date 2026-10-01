import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import copy from '../fixtures/copy.en.json';
import { site } from '../../src/config/site';

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
});

describe('crawl files', () => {
  it('robots.txt points to the sitemap', () => {
    expect(read('robots.txt')).toMatch(/^Sitemap: \S+$/m);
  });
  it('the sitemap exists and leaves out /privacy', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
    const sitemaps = readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f));
    expect(sitemaps.length).toBeGreaterThan(0);
    for (const f of sitemaps) expect(read(f)).not.toContain('/privacy');
  });
  it('404 and privacy pages exist and are noindex', () => {
    for (const path of ['404.html', 'privacy/index.html']) {
      expect(existsSync(`dist/${path}`)).toBe(true);
      expect(parse(read(path)).querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    }
  });
});
