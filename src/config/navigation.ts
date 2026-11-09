import type { Anchor } from './site';

export interface NavItem {
  /** The key of the item's label in the interface text (`nav.<id>`), and of the home page section it leads to. */
  id: 'services' | 'about' | 'approach' | 'sectors' | 'lab';
  /** The section it leads to; its id in each language is in `site.locales[lang].anchors`. */
  anchor: Anchor;
}

// Every item leads to a section of the home page, via anchorPath(). When one becomes a page of its
// own, give it a route (site.locales[lang].routes) and link it with routePath() instead.
export const mainNav: NavItem[] = [
  { id: 'services', anchor: 'services' },
  { id: 'about', anchor: 'about' },
  { id: 'approach', anchor: 'approach' },
  { id: 'sectors', anchor: 'sectors' },
  { id: 'lab', anchor: 'lab' },
];

export const contactCta = { id: 'contact', anchor: 'contact' } as const;

// Planned routes, not built yet: /sectors/[slug], /projects, /insights, /about
