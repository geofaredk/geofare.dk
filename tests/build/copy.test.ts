import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import copy from '../fixtures/copy.en.json';
import { copyPattern, footerAddressPattern } from './copy-match';

export const norm = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** The page text contains the fixture string, with its placeholders either kept or filled in. */
const expectCopy = (text: string, s: string) => expect(text).toMatch(copyPattern(s));

const html = readFileSync('dist/index.html', 'utf8');
const root = parse(html);
const text = norm(root.querySelector('body')!.textContent);
const sectionText = (id: string) => norm(root.querySelector(`#${id}`)!.textContent);

describe('copy matches the brief word for word', () => {
  it('hero', () => {
    const t = sectionText('top');
    for (const s of [copy.hero.fixed, copy.hero.endings.at(-1)!, copy.hero.subline, copy.hero.primaryCta, copy.hero.secondaryCta]) expect(t).toContain(s);
  });
  it('services, in order, with numbers and tags', () => {
    const t = sectionText('services');
    let at = -1;
    for (const s of copy.services) {
      for (const piece of [s.number, s.title, s.body, ...s.tags]) expect(t).toContain(piece);
      const i = t.indexOf(s.title); expect(i).toBeGreaterThan(at); at = i;
    }
  });
  it('about', () => {
    const t = sectionText('about'); const a = copy.about;
    for (const s of [a.mission.title, a.mission.body, a.founder.title, a.founder.body, a.quote, a.team.title, a.team.body]) expectCopy(t, s);
  });
  it('principles', () => {
    const t = sectionText('approach');
    expect(t).toContain('How we work');
    for (const p of copy.principles) { expect(t).toContain(p.title); expect(t).toContain(p.body); }
  });
  it('sectors, in order, all text in the HTML', () => {
    const t = sectionText('sectors'); let at = -1;
    expect(t).toContain(copy.sectors.title); expect(t).toContain(copy.sectors.intro);
    for (const s of copy.sectors.items) {
      for (const piece of [s.title, s.lead, ...s.bullets]) expect(t).toContain(piece);
      const i = t.indexOf(s.lead); expect(i).toBeGreaterThan(at); at = i;
    }
  });
  it('contact and footer show their placeholders or the values filled in', () => {
    const t = sectionText('contact');
    for (const s of [copy.contact.title, copy.contact.body]) expectCopy(t, s);
    // A filled-in email address or LinkedIn URL becomes a link, whose text need not be the address.
    const hrefs = root.querySelectorAll('#contact a[href]').map((a) => a.getAttribute('href')!);
    for (const s of copy.contact.links) {
      if (t.includes(s)) continue;
      const link = /email/i.test(s) ? /^mailto:\S+@\S+$/ : /^https:\/\/\S+$/;
      expect(hrefs.some((href) => link.test(href)), `${s} is shown, or has become a link`).toBe(true);
    }
    // The footer as whole sentences, so a value left empty ("CVR .") fails.
    const [address, legal] = root.querySelectorAll('footer p').map((p) => norm(p.textContent));
    expect(address).toMatch(footerAddressPattern(copy.footer.fragments));
    const [, , , , , privacy, copyright] = copy.footer.fragments;
    expect(legal).toBe(`${privacy}. ${copyright.replace('{year}', String(new Date().getFullYear()))}.`);
  });
  it('navigation labels', () => {
    const n = norm(root.querySelector('header nav')!.textContent);
    for (const s of copy.nav) expect(n).toContain(s);
    expect(norm(root.querySelector('header')!.textContent)).toContain('Get in touch');
  });
  it('section order answers what, who, how, for whom', () => {
    const ids = root.querySelectorAll('main > section, main > div[id]').map((e) => e.id).filter(Boolean);
    expect(ids).toEqual(['top', 'services', 'about', 'approach', 'sectors', 'contact']);
  });
  it('the brand name is lowercase in running text', () => { expect(text).not.toMatch(/\bGeofare\b|\bGEOFARE\b/); });
});

describe('document outline', () => {
  it('has one h1 whose whole text is the final sentence, for crawlers as much as for assistive tech', () => {
    const h1s = root.querySelectorAll('h1'); expect(h1s).toHaveLength(1);
    // The full text content, not only the part outside aria-hidden: most crawlers ignore ARIA.
    expect(norm(h1s[0].textContent)).toBe(`${copy.hero.fixed} ${copy.hero.endings.at(-1)}`);
    expect(norm(h1s[0].textContent)).toBe('Make good decisions when it matters.');
  });
  it('keeps the rotating endings beside the h1, hidden from assistive tech, all five in order', () => {
    const rotators = root.querySelectorAll('#top [aria-hidden="true"]').filter((e) => copy.hero.endings.every((ending) => e.textContent.includes(ending)));
    expect(rotators).toHaveLength(1);
    expect(rotators[0].closest('h1')).toBeNull();
    expect(norm(rotators[0].textContent)).toBe(copy.hero.endings.join(' '));
  });
  it('never skips a heading level', () => {
    let prev = 0;
    for (const h of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) { const l = Number(h.tagName[1]); expect(l - prev).toBeLessThanOrEqual(1); prev = l; }
  });
});
