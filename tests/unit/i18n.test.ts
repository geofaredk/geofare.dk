import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { alternates, alternatesFor, anchorId, anchorPath, localizePath, publishedLocales, routePath, switchPath } from '../../src/lib/i18n';

describe('localizePath', () => {
  it('leaves default-language paths unprefixed', () => {
    expect(localizePath('/#services', 'en')).toBe('/#services');
  });
});

describe('switchPath', () => {
  it('leads to the same page in another language', () => {
    expect(switchPath('/', 'da')).toBe('/da/');
    expect(switchPath('/da/', 'en')).toBe('/');
    expect(switchPath('/imprint/', 'da')).toBe('/da/imprint/');
    expect(switchPath('/da/imprint', 'en')).toBe('/imprint');
  });

  it('works between two prefixed languages, given a table that has them', () => {
    const locales = { en: { path: '/', hreflang: 'en' }, da: { path: '/da/', hreflang: 'da' }, de: { path: '/de/', hreflang: 'de' } };
    expect(switchPath('/da/', 'de', locales)).toBe('/de/');
    expect(switchPath('/de/imprint/', 'da', locales)).toBe('/da/imprint/');
    expect(switchPath('/de/imprint', 'en', locales)).toBe('/imprint');
  });
});

describe('publishedLocales', () => {
  it('leaves out the draft languages', () => {
    const drafts = Object.entries(site.locales).filter(([, locale]) => locale.draft).map(([lang]) => lang);
    for (const lang of drafts) expect(Object.keys(publishedLocales())).not.toContain(lang);
    expect(Object.keys(publishedLocales())).toContain(site.defaultLang);
  });
});

describe('alternates', () => {
  it('lists every locale plus x-default as absolute URLs', () => {
    const links = alternates('/');
    expect(links).toContainEqual({ hreflang: 'en', href: `${site.url}/` });
    expect(links.find((l) => l.hreflang === 'x-default')).toBeDefined();
  });
});

describe('with a prefixed locale (Danish at /da/), built here so the real config stays English-only', () => {
  const locales = { en: { path: '/', hreflang: 'en' }, da: { path: '/da/', hreflang: 'da' } };

  it('prefixes Danish paths and anchors', () => {
    expect(localizePath('/#services', 'da', locales)).toBe('/da/#services');
    expect(localizePath('/privacy', 'da', locales)).toBe('/da/privacy');
    expect(localizePath('/', 'da', locales)).toBe('/da/');
    expect(localizePath('/privacy', 'en', locales)).toBe('/privacy');
  });

  it('gives the same alternates from the English and the Danish page', () => {
    const expected = [
      { hreflang: 'en', href: `${site.url}/privacy` },
      { hreflang: 'da', href: `${site.url}/da/privacy` },
      { hreflang: 'x-default', href: `${site.url}/privacy` },
    ];
    expect(alternates('/privacy', locales, 'en')).toEqual(expected);
    expect(alternates('/da/privacy', locales, 'en')).toEqual(expected);
    expect(alternates('/da/', locales, 'en')).toEqual([
      { hreflang: 'en', href: `${site.url}/` },
      { hreflang: 'da', href: `${site.url}/da/` },
      { hreflang: 'x-default', href: `${site.url}/` },
    ]);
  });
});

describe('routePath', () => {
  it('builds a page path from the route words of the language', () => {
    expect(routePath('imprint', 'en')).toBe('/imprint/');
    expect(routePath('imprint', 'da')).toBe('/da/kolofon/');
    expect(routePath('services', 'en', 'earth-observation-remote-sensing')).toBe('/services/earth-observation-remote-sensing/');
    expect(routePath('services', 'da', 'jordobservation-og-fjernmaaling')).toBe('/da/ydelser/jordobservation-og-fjernmaaling/');
  });
});

describe('alternatesFor', () => {
  it('turns one path per language into hreflang links, published languages only, plus x-default', () => {
    const locales = { en: { path: '/', hreflang: 'en' }, da: { path: '/da/', hreflang: 'da' } };
    expect(alternatesFor({ en: '/imprint/', da: '/da/kolofon/' }, locales, 'en')).toEqual([
      { hreflang: 'en', href: `${site.url}/imprint/` },
      { hreflang: 'da', href: `${site.url}/da/kolofon/` },
      { hreflang: 'x-default', href: `${site.url}/imprint/` },
    ]);
  });
});

describe('anchorId and anchorPath', () => {
  it('give a section its id in the language, and the home page link to it', () => {
    expect(anchorId('services', 'en')).toBe('services');
    expect(anchorId('services', 'da')).toBe('ydelser');
    expect(anchorId('about', 'da')).toBe('om-os');
    expect(anchorPath('contact', 'en')).toBe('/#contact');
    expect(anchorPath('contact', 'da')).toBe('/da/#kontakt');
  });

  it('every language names every section, in URL-safe lower-case words', () => {
    const [first, ...others] = Object.values(site.locales).map((locale) => locale.anchors);
    for (const anchors of [first, ...others]) {
      expect(Object.keys(anchors).sort()).toEqual(Object.keys(first).sort());
      for (const word of Object.values(anchors)) expect(word).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      // Two sections of one page may not share a word.
      expect(new Set(Object.values(anchors)).size).toBe(Object.values(anchors).length);
    }
  });
});
