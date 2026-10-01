import { describe, expect, it } from 'vitest';
import { emailLink, isPlaceholder, linkedinLink } from '../../src/lib/contact';

describe('isPlaceholder', () => {
  it('recognises square-bracket placeholders', () => {
    expect(isPlaceholder('[email address]')).toBe(true);
    expect(isPlaceholder('hello@geofare.dk')).toBe(false);
  });
});

describe('emailLink', () => {
  it('keeps a placeholder as plain text', () => {
    expect(emailLink('[email address]')).toEqual({ label: '[email address]', href: null, external: false });
  });
  it('turns a real address into a mailto link', () => {
    expect(emailLink('hello@geofare.dk')).toEqual({ label: 'hello@geofare.dk', href: 'mailto:hello@geofare.dk', external: false });
  });
});

describe('linkedinLink', () => {
  it('keeps a placeholder as plain text', () => {
    expect(linkedinLink('[LinkedIn URL]').href).toBeNull();
  });
  it('turns a real URL into an external link', () => {
    const url = 'https://www.linkedin.com/company/geofare';
    expect(linkedinLink(url)).toEqual({ label: 'LinkedIn', href: url, external: true });
  });
});
