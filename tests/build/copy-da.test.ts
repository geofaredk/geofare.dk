import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import copy from '../fixtures/copy.da.json';
import { copyPattern } from './copy-match';

// The Danish page against the Danish copy as it was supplied (tests/fixtures/copy.da.json).
// As for English: a value in [square brackets] may still be the placeholder or have been filled in.
const norm = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”„]/g, '"').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const root = parse(readFileSync('dist/da/index.html', 'utf8'));
const sectionText = (id: string) => norm(root.querySelector(`#${id}`)!.textContent);
/** Every piece is in the text, in the order given. */
const expectInOrder = (text: string, pieces: string[]) => {
  let at = -1;
  for (const piece of pieces) {
    const match = copyPattern(piece).exec(text.slice(at + 1));
    expect(match, piece).not.toBeNull();
    at += 1 + match!.index;
  }
};

describe('the Danish page carries the Danish copy word for word', () => {
  it('metadata and language', () => {
    expect(root.querySelector('html')!.getAttribute('lang')).toBe('da-DK');
    expect(root.querySelector('title')!.textContent).toBe(copy.meta.title);
    expect(root.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(copy.meta.description);
  });
  it('navigation and its button', () => {
    const links = root.querySelectorAll('header nav .site-header__links a').map((a) => norm(a.textContent));
    expect(links).toEqual(copy.nav);
    expect(norm(root.querySelector('header nav .button')!.textContent)).toBe(copy.button);
  });
  it('hero: the h1 is the fixed part and the last ending; all endings wait in order', () => {
    expect(norm(root.querySelector('h1')!.textContent)).toBe(`${copy.hero.fixed} ${copy.hero.endings.at(-1)}`);
    expect(root.querySelectorAll('#top .hero__ending').map((e) => norm(e.textContent))).toEqual(copy.hero.endings);
    expectInOrder(sectionText('top'), [copy.hero.subline, copy.hero.primaryCta, copy.hero.secondaryCta]);
  });
  it('services', () => {
    expectInOrder(sectionText('services'), [copy.nav[0], ...copy.services.flatMap((s) => [s.number, s.title, s.body, ...s.tags])]);
  });
  it('about', () => {
    const a = copy.about;
    expectInOrder(sectionText('about'), [a.mission.title, a.mission.body, a.founder.title, a.founder.body, a.quote, a.team.title, a.team.body]);
  });
  it('principles', () => {
    expectInOrder(sectionText('approach'), [copy.approach.title, ...copy.principles.flatMap((p) => [p.title, p.body])]);
  });
  it('sectors', () => {
    expectInOrder(sectionText('sectors'), [copy.sectors.title, copy.sectors.intro, ...copy.sectors.items.flatMap((s) => [s.title, s.lead, ...s.bullets])]);
  });
  it('lab', () => {
    const cards = root.querySelectorAll('#lab .project');
    expect(cards).toHaveLength(copy.lab.projects.length);
    expectInOrder(sectionText('lab'), [copy.lab.title, copy.lab.intro]);
    copy.lab.projects.forEach((project, i) => {
      const text = norm(cards[i].textContent);
      expect(norm(cards[i].querySelector('h3')!.textContent)).toContain(project.title);
      for (const piece of [project.description, ...project.tags]) expect(text).toContain(piece);
      expect(cards[i].querySelector('.project__status')?.textContent.trim()).toBe('status' in project ? project.status : undefined);
    });
  });
  it('contact', () => {
    expectInOrder(sectionText('contact'), [copy.contact.title, copy.contact.body]);
  });
  it('no placeholder filler is left on the page', () => {
    expect(norm(root.querySelector('main')!.textContent)).not.toMatch(/\blorem\b|\bipsum\b|\bdolor\b/i);
  });
});
