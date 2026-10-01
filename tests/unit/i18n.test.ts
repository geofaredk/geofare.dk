import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { alternates, localizePath } from '../../src/lib/i18n';

describe('localizePath', () => {
  it('leaves default-language paths unprefixed', () => {
    expect(localizePath('/#services', 'en')).toBe('/#services');
  });
});

describe('alternates', () => {
  it('lists every locale plus x-default as absolute URLs', () => {
    const links = alternates('/');
    expect(links).toContainEqual({ hreflang: 'en', href: `${site.url}/` });
    expect(links.find((l) => l.hreflang === 'x-default')).toBeDefined();
  });
});
