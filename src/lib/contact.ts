/** A value the brief leaves open, written as `[like this]`. It stays visible but never becomes a link. */
export const isPlaceholder = (v: string): boolean => /^\[.*\]$/.test(v.trim());

export interface ContactLink {
  label: string;
  href: string | null;
  external: boolean;
}

export function emailLink(email: string): ContactLink {
  if (isPlaceholder(email)) return { label: email, href: null, external: false };
  return { label: email, href: `mailto:${email}`, external: false };
}

export function linkedinLink(url: string): ContactLink {
  if (isPlaceholder(url)) return { label: url, href: null, external: false };
  return { label: 'LinkedIn', href: url, external: true };
}

/** schema.org PostalAddress fields, as the structured data needs them. */
export interface PostalAddress {
  '@type': 'PostalAddress';
  addressCountry: string;
  streetAddress?: string;
  postalCode?: string;
  addressLocality?: string;
}

/**
 * The company's address for the structured data. A field appears once it holds a real value;
 * a placeholder never does. A Danish "8000 Aarhus C" splits into postcode and town; anything
 * else in that field is kept whole as the town (`addressLocality`).
 */
export function postalAddress(company: { street: string; postalTown: string }, country = 'DK'): PostalAddress {
  const real = (v: string) => v.trim() !== '' && !isPlaceholder(v);
  const address: PostalAddress = { '@type': 'PostalAddress', addressCountry: country };
  if (real(company.street)) address.streetAddress = company.street.trim();
  if (real(company.postalTown)) {
    const split = company.postalTown.trim().match(/^(\d{4})\s+(\S.*)$/);
    if (split) {
      address.postalCode = split[1];
      address.addressLocality = split[2];
    } else {
      address.addressLocality = company.postalTown.trim();
    }
  }
  return address;
}
