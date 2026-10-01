import { describe, expect, it } from 'vitest';
import { checkList, checkSection } from '../../src/lib/content-rules';

describe('checkSection', () => {
  it('passes a section with its title and text', () => {
    expect(() => checkSection('en', 'services', 'Services', '')).not.toThrow();
    expect(() => checkSection('en', 'contact', 'Have a decision coming up?', 'Tell us.')).not.toThrow();
  });

  it('names the file of a section whose title is missing or empty', () => {
    expect(() => checkSection('en', 'about-mission', undefined, 'Text.')).toThrow('src/content/sections/en/about-mission.md needs a title');
    expect(() => checkSection('da', 'services', '  ', '')).toThrow('src/content/sections/da/services.md needs a title');
  });

  it('needs no title for the hero and the quote', () => {
    expect(() => checkSection('en', 'hero', undefined, 'Sub-line.')).not.toThrow();
    expect(() => checkSection('en', 'about-quote', undefined, 'Quote.')).not.toThrow();
  });

  it('names the file of a section whose rendered text is empty', () => {
    expect(() => checkSection('en', 'contact', 'Have a decision coming up?', '\n  \n')).toThrow(
      'src/content/sections/en/contact.md needs text below the front matter',
    );
    expect(() => checkSection('en', 'about-quote', undefined, undefined)).toThrow('src/content/sections/en/about-quote.md needs text');
  });

  it('needs no text for the sections that show only their title', () => {
    expect(() => checkSection('en', 'approach', 'How we work', '')).not.toThrow();
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
