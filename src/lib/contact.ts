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
