import { describe, expect, it } from 'vitest';
import { checkList, checkSection, checkLab } from '../../src/lib/content-rules';

describe('checkSection', () => {
  it('passes a section with its title and text', () => {
    expect(() => checkSection('en', 'services', { title: 'Services' }, '')).not.toThrow();
    expect(() => checkSection('en', 'contact', { title: 'Have a decision coming up?' }, 'Tell us.')).not.toThrow();
  });

  it('names the file of a section whose title is missing or empty', () => {
    expect(() => checkSection('en', 'about-mission', { title: undefined }, 'Text.')).toThrow('src/content/sections/en/about-mission.md needs a title');
    expect(() => checkSection('da', 'services', { title: '  ' }, '')).toThrow('src/content/sections/da/services.md needs a title');
  });

  it('needs no title for the hero and the quote', () => {
    expect(() => checkSection('en', 'hero', { title: undefined }, 'Sub-line.')).not.toThrow();
    expect(() => checkSection('en', 'about-quote', { title: undefined }, 'Quote.')).not.toThrow();
  });

  it('names the file of a section whose rendered text is empty', () => {
    expect(() => checkSection('en', 'contact', { title: 'Have a decision coming up?' }, '\n  \n')).toThrow(
      'src/content/sections/en/contact.md needs text below the front matter',
    );
    expect(() => checkSection('en', 'about-quote', { title: undefined }, undefined)).toThrow('src/content/sections/en/about-quote.md needs text');
  });

  it('needs no text for the sections that show only their title', () => {
    expect(() => checkSection('en', 'approach', { title: 'How we work' }, '')).not.toThrow();
  });
});

describe('checkSection, other fields', () => {
  it('needs the 404 page\'s button text, so the button never renders empty', () => {
    expect(() => checkSection('en', 'not-found', { title: 'Page not found', back: 'Back to the home page' }, 'Text.')).not.toThrow();
    expect(() => checkSection('en', 'not-found', { title: 'Page not found' }, 'Text.')).toThrow('src/content/sections/en/not-found.md needs back');
    expect(() => checkSection('en', 'not-found', { title: 'Page not found', back: ' ' }, 'Text.')).toThrow('src/content/sections/en/not-found.md needs back');
  });
});

describe('checkList', () => {
  const entry = (name: string, order: number, slug = name, body = 'Text.') => ({
    id: `en/${name}`,
    filePath: `src/content/services/en/${name}.md`,
    body,
    data: { order, slug },
  });

  it('passes distinct orders and slugs', () => {
    expect(() => checkList('services', 'en', [entry('a', 1), entry('b', 2)])).not.toThrow();
  });

  it('names both files when two entries share an order', () => {
    expect(() => checkList('services', 'en', [entry('a', 1), entry('b', 1)])).toThrow(
      'src/content/services/en: src/content/services/en/a.md and src/content/services/en/b.md have the same order (1)',
    );
  });

  it('names both files when two entries share a slug', () => {
    expect(() => checkList('services', 'en', [entry('a', 1, 'same'), entry('b', 2, 'same')])).toThrow('have the same slug (same)');
  });

  it('names the file of an entry with no text', () => {
    expect(() => checkList('services', 'en', [entry('a', 1, 'a', ' ')])).toThrow('src/content/services/en/a.md needs text below the front matter');
  });
});

describe('checkLab', () => {
  const project = (id: string, order: number) => ({ id: `en/${id}`, data: { order } });

  it('accepts projects that each have their own place', () => {
    expect(() => checkLab('en', [project('a', 1), project('b', 2)])).not.toThrow();
    expect(() => checkLab('en', [])).not.toThrow();
  });

  it('names both files when two projects share an order', () => {
    expect(() => checkLab('en', [project('a', 1), project('b', 1)])).toThrow(
      'src/content/lab/en: src/content/lab/en/a.md and src/content/lab/en/b.md have the same order (1); each needs its own',
    );
  });
});
