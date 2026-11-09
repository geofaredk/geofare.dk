import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';

// The booking block of the contact section: a highlighted invitation to book an introductory
// call, above the email address, on every page that has the section.
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const booking = (lang: string) => {
  const file = readFileSync(`src/content/sections/${lang}/contact.md`, 'utf8');
  return parseYaml(file.split(/^---$/m)[1]).booking as { title: string; cta: string; note: string };
};

const pages = [
  ['the English home page', 'en', 'index.html'],
  ['the Danish home page', 'da', 'da/index.html'],
  ['the English landing page', 'en', 'services/earth-observation-remote-sensing/index.html'],
] as const;

describe.each(pages)('the booking block on %s', (_name, lang, path) => {
  const root = parse(readFileSync(`dist/${path}`, 'utf8'));
  const copy = booking(lang);
  // The contact section's id in the page's language: `contact` in English, `kontakt` in Danish.
  const contact = `#${site.locales[lang].anchors.contact}`;

  it('says its three lines, from the contact section file', () => {
    const block = root.querySelector(`${contact} .contact__booking`);
    expect(block).not.toBeNull();
    const text = norm(block!.textContent);
    for (const s of [copy.title, copy.cta, copy.note]) expect(text).toContain(norm(s));
  });

  it('links to the booking page and stands above the email address', () => {
    const hrefs = root.querySelectorAll(`${contact} a[href]`).map((a) => a.getAttribute('href')!);
    expect(hrefs.indexOf(site.company.booking)).toBeGreaterThanOrEqual(0);
    expect(hrefs.indexOf(site.company.booking)).toBeLessThan(hrefs.findIndex((h) => h.startsWith('mailto:')));
    const link = root.querySelector(`${contact} .contact__booking a[href="${site.company.booking}"]`)!;
    // The visible label alone: the link's own text, without the hidden "(opens in a new tab)".
    const visible = link.childNodes.filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    expect(norm(visible)).toBe(norm(copy.cta));
  });

  it('opens the booking page in a new tab and says so to a screen reader', () => {
    const link = root.querySelector(`${contact} .contact__booking a[href="${site.company.booking}"]`)!;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    const ui = parseYaml(readFileSync(`src/content/ui/${lang}.yaml`, 'utf8'));
    const hidden = link.querySelector('.sr-only')!;
    expect(hidden).not.toBeNull();
    expect(norm(hidden.textContent)).toBe(norm(ui.lab.newTab));
    expect(norm(link.textContent)).toBe(norm(`${copy.cta} ${ui.lab.newTab}`));
  });
});
