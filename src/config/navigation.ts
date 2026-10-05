export interface NavItem {
  id: 'services' | 'about' | 'approach' | 'sectors' | 'lab';
  href: string;
}

// hrefs are site-relative; an anchor becomes a page link later by changing one string
export const mainNav: NavItem[] = [
  { id: 'services', href: '/#services' },
  { id: 'about', href: '/#about' },
  { id: 'approach', href: '/#approach' },
  { id: 'sectors', href: '/#sectors' },
  { id: 'lab', href: '/#lab' },
];

export const contactCta = { id: 'contact', href: '/#contact' } as const;

// Planned routes, not built yet: /services/[slug], /sectors/[slug], /projects, /insights, /about
