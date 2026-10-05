import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { alternates, localizePath, publishedLocales, switchPath } from '../../src/lib/i18n';

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
