import { describe, expect, it } from 'vitest';
import { emailLink, isPlaceholder, linkedinLink, postalAddress } from '../../src/lib/contact';

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

describe('postalAddress', () => {
  it('holds only the country while street and town are placeholders', () => {
    expect(postalAddress({ street: '[street address]', postalTown: '[postcode and town]' })).toEqual({
      '@type': 'PostalAddress',
      addressCountry: 'DK',
    });
  });
  it('adds the street, postcode and town once they are real', () => {
    expect(postalAddress({ street: 'Vestergade 12', postalTown: '8000 Aarhus C' })).toEqual({
      '@type': 'PostalAddress',
      addressCountry: 'DK',
      streetAddress: 'Vestergade 12',
      postalCode: '8000',
      addressLocality: 'Aarhus C',
    });
  });
  it('keeps a postcode and town it cannot split as the town, and leaves a placeholder out', () => {
    expect(postalAddress({ street: '[street address]', postalTown: 'DK-8000 Aarhus' })).toEqual({
      '@type': 'PostalAddress',
      addressCountry: 'DK',
      addressLocality: 'DK-8000 Aarhus',
    });
  });
});
