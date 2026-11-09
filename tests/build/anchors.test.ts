import { existsSync, readFileSync } from 'node:fs';
import { parse, type HTMLElement } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';

// The section anchors: each language has its own words for them (`/da/#ydelser` for `/#services`),
// and every link to an anchor, on the page or on another, leads to an element that exists.
const read = (path: string) => readFileSync(`dist/${path}`, 'utf8');
const file = (pathname: string) => `${pathname.replace(/^\//, '')}${pathname.endsWith('/') ? '' : '/'}index.html`;
const page = (pathname: string) => parse(read(file(pathname)));

const PAGES = ['/', '/da/', '/services/earth-observation-remote-sensing/', '/da/ydelser/jordobservation-og-fjernmaaling/', '/imprint/', '/da/kolofon/'];

/** The in-page links of a document: `#x`, or a site path followed by `#x`. */
function anchorLinks(root: HTMLElement, own: string): { href: string; pathname: string; id: string }[] {
  return root
    .querySelectorAll('a[href*="#"]')
    .map((a) => a.getAttribute('href')!)
    .filter((href) => href.startsWith('#') || href.startsWith('/'))
    .map((href) => {
      const [path, id] = href.split('#');
      return { href, pathname: path || own, id };
    });
}

describe('section anchors', () => {
  it('the Danish home page has Danish ids, in the English order', () => {
    const ids = page('/da/').querySelectorAll('main > section').map((s) => s.id);
    expect(ids).toEqual(['top', 'ydelser', 'om-os', 'kunder', 'tilgang', 'sektorer', 'lab', 'kontakt']);
    expect(page('/').querySelectorAll('main > section').map((s) => s.id)).toEqual(['top', 'services', 'about', 'clients', 'approach', 'sectors', 'lab', 'contact']);
    expect(ids).toEqual(Object.keys(site.locales.en.anchors).filter((key) => !['situations', 'offer', 'process', 'audiences', 'why', 'faq'].includes(key)).map((key) => site.locales.da.anchors[key as keyof typeof site.locales.da.anchors]));
  });

  it('the Danish menu and hero link to the Danish anchors', () => {
    const root = page('/da/');
    expect(root.querySelectorAll('header nav .site-header__links a').map((a) => a.getAttribute('href'))).toEqual(['/da/#ydelser', '/da/#om-os', '/da/#tilgang', '/da/#sektorer', '/da/#lab']);
    expect(root.querySelector('header nav .button')!.getAttribute('href')).toBe('/da/#kontakt');
    expect(root.querySelectorAll('#top .button').map((a) => a.getAttribute('href'))).toEqual(['/da/#kontakt', '/da/#ydelser']);
  });

  for (const pathname of PAGES) {
    it(`every anchor link on ${pathname} leads to an element that exists`, () => {
      const links = anchorLinks(page(pathname), pathname);
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(existsSync(`dist/${file(link.pathname)}`), link.href).toBe(true);
        expect(page(link.pathname).querySelector(`[id="${link.id}"]`), `${link.href} on ${pathname}`).not.toBeNull();
      }
    });
  }
});
