import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';

// The service landing pages, checked against their own content files: one page per language,
// the whole page in the right order, the metadata and structured data a search engine reads.
const SLUG = 'earth-observation-remote-sensing';
const SECTIONS = {
  en: ['top', 'clients', 'situations', 'offer', 'process', 'audiences', 'why', 'faq', 'contact'],
  da: ['top', 'kunder', 'situationer', 'leverancer', 'proces', 'maalgrupper', 'hvorfor', 'faq', 'kontakt'],
};

const read = (path: string) => readFileSync(`dist/${path}`, 'utf8');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
/** The front matter of a landing page file, as the page's expected values. */
function frontMatterOf(lang: string) {
  const file = readFileSync(`src/content/landing/${lang}/${SLUG}.md`, 'utf8');
  return parseYaml(file.split(/^---$/m)[1]) as Record<string, any>;
}
const frontMatter = frontMatterOf;
// The Danish page has its own URL: the Danish word for services and the slug set in the Danish file.
const DA_PATH = `/da/ydelser/${frontMatterOf('da').slug}/`;
const page = (path: string) => parse(read(path));

describe('the English landing page', () => {
  const path = `services/${SLUG}/index.html`;
  const root = page(path);
  const data = frontMatter('en');
  const jsonLd = root.querySelectorAll('script[type="application/ld+json"]').map((s) => JSON.parse(s.textContent));
  const canonical = `${site.url}/services/${SLUG}/`;

  it('exists and has one h1, the page title', () => {
    const h1 = root.querySelectorAll('h1');
    expect(h1).toHaveLength(1);
    expect(norm(h1[0].textContent)).toBe(data.title);
  });
  it('carries its own title and description', () => {
    expect(root.querySelector('title')!.textContent).toBe(data.meta.title);
    expect(root.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(data.meta.description);
    expect(root.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(canonical);
    expect(root.querySelector('meta[property="og:title"]')!.getAttribute('content')).toBe(data.meta.title);
  });
  it('has the sections in order, each named by its heading', () => {
    const ids = root.querySelectorAll('main section[id]').map((s) => s.id);
    expect(ids).toEqual(SECTIONS.en);
    for (const section of root.querySelectorAll('main section')) {
      const labelledBy = section.getAttribute('aria-labelledby');
      expect(labelledBy, section.id).toBeTruthy();
      expect(root.querySelector(`#${labelledBy}`), section.id).not.toBeNull();
    }
  });
  it('shows every item of the content file, in order', () => {
    const text = norm(root.querySelector('main')!.textContent);
    const pieces = [
      data.title,
      data.hero.primaryCta,
      data.hero.secondaryCta,
      data.clients.title,
      data.situations.title,
      data.situations.intro,
      ...data.situations.items.flatMap((i: any) => [i.title, i.body]),
      data.offer.title,
      ...data.offer.items.flatMap((i: any) => [i.title, i.body, ...i.tags]),
      data.process.title,
      ...data.process.steps.flatMap((i: any) => [i.title, i.body]),
      data.audiences.title,
      data.audiences.intro,
      ...data.audiences.items.flatMap((i: any) => [i.title, i.lead, ...i.points]),
      data.why.title,
      data.why.intro,
      data.why.founder.title,
      data.why.founder.body,
      data.why.quote,
      data.faq.title,
      ...data.faq.items.flatMap((i: any) => [i.question, i.answer]),
      data.contact.title,
      data.contact.body,
    ];
    let at = -1;
    for (const piece of pieces) {
      const i = text.indexOf(norm(piece), at);
      expect(i, piece).toBeGreaterThan(at);
      at = i;
    }
  });
  it('is one h1, then h2 per section and h3 per item, in order', () => {
    const levels = root.querySelectorAll('main h1, main h2, main h3').map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `heading ${i}`).toBeLessThanOrEqual(1);
    expect(root.querySelectorAll('main h2')).toHaveLength(SECTIONS.en.length - 1); // the hero has the h1
  });
  it('has a picture slot in the hero: the image named in the file, or a still of the line field until there is one', () => {
    const slot = root.querySelector('#top .landing-hero__picture');
    expect(slot).not.toBeNull();
    if (data.hero.image) {
      const img = slot!.querySelector('img')!;
      expect(img).not.toBeNull();
      expect(img.getAttribute('alt')).toBe(data.hero.imageAlt);
    } else {
      expect(slot!.querySelector('svg.line-field')).not.toBeNull();
    }
  });
  it('leads to its own contact section from the header and the hero, and down to the offer', () => {
    expect(root.querySelector('header nav .button')!.getAttribute('href')).toBe('#contact');
    const hrefs = root.querySelectorAll('#top a').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#contact', '#offer']);
  });
  it('tells search engines it is a Service with questions and answers', () => {
    expect(jsonLd.map((d) => d['@type'])).toEqual(['ProfessionalService', 'Service', 'FAQPage']);
    const service = jsonLd[1];
    // The service's name is the short name people search for, not the headline sentence.
    expect(service.name).toBe(data.service);
    expect(service.serviceType).toBe(data.service);
    expect(data.service).not.toMatch(/\.$/);
    expect(service.url).toBe(canonical);
    expect(service.provider.name).toBe(site.name);
    expect(jsonLd[2].mainEntity).toHaveLength(data.faq.items.length);
    expect(jsonLd[2].mainEntity[0].name).toBe(data.faq.items[0].question);
  });
  it('leaks no placeholder', () => {
    expect(norm(root.querySelector('main')!.textContent)).not.toMatch(/\[[^\]]+\]/);
  });
  it('is in the sitemap in both languages', () => {
    const sitemap = readdirSync('dist').filter((f) => /^sitemap-\d+\.xml$/.test(f)).map(read).join('');
    expect(sitemap).toContain(canonical);
    expect(sitemap).toContain(`${site.url}${DA_PATH}`);
  });
  it('links to its Danish counterpart under the Danish URL, in the hreflang links and the switcher', () => {
    expect(root.querySelector('link[rel="alternate"][hreflang="da"]')!.getAttribute('href')).toBe(`${site.url}${DA_PATH}`);
    expect(root.querySelectorAll('header nav a.site-header__lang').map((a) => a.getAttribute('href'))).toEqual([DA_PATH]);
  });
});

describe('the Danish landing page', () => {
  const path = `${DA_PATH.slice(1)}index.html`;
  it('is built in Danish, indexable with its own canonical and hreflang links, and switches back to the English page', () => {
    expect(existsSync(`dist/${path}`)).toBe(true);
    const root = page(path);
    expect(root.querySelector('html')!.getAttribute('lang')).toBe('da-DK');
    expect(root.querySelector('meta[name="robots"]')).toBeNull();
    expect(root.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(`${site.url}${DA_PATH}`);
    expect(root.querySelector('link[rel="alternate"][hreflang="en"]')!.getAttribute('href')).toBe(`${site.url}/services/${SLUG}/`);
    expect(root.querySelectorAll('link[rel="alternate"]').map((l) => l.getAttribute('hreflang'))).toEqual(['en', 'da', 'x-default']);
    expect(norm(root.querySelector('h1')!.textContent)).toBe(frontMatter('da').title);
    const toEnglish = root.querySelectorAll('header nav a.site-header__lang').map((a) => a.getAttribute('href'));
    expect(toEnglish).toEqual([`/services/${SLUG}/`]);
    const toDanish = page(`services/${SLUG}/index.html`).querySelectorAll('header nav a.site-header__lang').map((a) => a.getAttribute('href'));
    expect(toDanish).toEqual([DA_PATH]);
  });
  it('has the same sections in the same order, under Danish ids, and its hero buttons lead to them', () => {
    const root = page(path);
    expect(root.querySelectorAll('main section[id]').map((s) => s.id)).toEqual(SECTIONS.da);
    expect(root.querySelectorAll('#top .landing-hero__actions a').map((a) => a.getAttribute('href'))).toEqual(['#kontakt', '#leverancer']);
    expect(root.querySelector('header nav .button')!.getAttribute('href')).toBe('#kontakt');
  });
});
