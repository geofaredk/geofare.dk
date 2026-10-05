import { describe, expect, it } from 'vitest';
import copy from '../fixtures/copy.en.json';
import { copyPattern, footerLinePattern } from '../../tests/build/copy-match';

const founder = copy.about.founder.body;
const line = footerLinePattern(copy.footer.fragments, 2026);

describe('copyPattern', () => {
  it('accepts the founder text with the placeholder or a surname', () => {
    expect(founder).toMatch(copyPattern(founder));
    expect(founder.replace('[surname]', 'Jordan')).toMatch(copyPattern(founder));
    expect(founder.replace('[surname]', 'Due-Jensen')).toMatch(copyPattern(founder));
  });

  it('rejects a surname that is empty, only punctuation, or runs into another sentence', () => {
    expect(founder.replace('[surname]', '')).not.toMatch(copyPattern(founder));
    expect(founder.replace(' [surname]', '')).not.toMatch(copyPattern(founder));
    expect(founder.replace('[surname]', '.')).not.toMatch(copyPattern(founder));
    expect('by Niklas Jordan. Something else entirely, a geologist.').not.toMatch(copyPattern('by Niklas [surname], a geologist.'));
    expect('by Niklas Jordan, a geologist.').toMatch(copyPattern('by Niklas [surname], a geologist.'));
  });

  it('still requires every other word', () => {
    expect(founder.replace('a geologist', 'an engineer')).not.toMatch(copyPattern(founder));
  });
});

describe('footerLinePattern', () => {
  it('accepts the placeholder and a real number', () => {
    expect('Imprint. © 2026 geofare. CVR [number].').toMatch(line);
    expect('Imprint. © 2026 geofare. CVR 12345678.').toMatch(line);
    expect('Imprint. © 2026 geofare. CVR 12 34 56 78.').toMatch(line);
  });

  it('rejects a blanked CVR, another year, or anything before or after the line', () => {
    expect('Imprint. © 2026 geofare. CVR .').not.toMatch(line);
    expect('Imprint. © 2025 geofare. CVR 12345678.').not.toMatch(line);
    expect('geofare, Vestergade 12, Denmark. Imprint. © 2026 geofare. CVR 12345678.').not.toMatch(line);
    expect('Imprint. © 2026 geofare. CVR 12345678. Denmark.').not.toMatch(line);
  });
});
