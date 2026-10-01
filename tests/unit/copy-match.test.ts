import { describe, expect, it } from 'vitest';
import copy from '../fixtures/copy.en.json';
import { copyPattern, footerAddressPattern } from '../../tests/build/copy-match';

const founder = copy.about.founder.body;
const address = footerAddressPattern(copy.footer.fragments);

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

describe('footerAddressPattern', () => {
  it('accepts the placeholders', () => {
    expect('geofare, [street address], [postcode and town], Denmark. CVR [number].').toMatch(address);
  });

  it('accepts real values', () => {
    expect('geofare, Vestergade 12, 8000 Aarhus C, Denmark. CVR 12345678.').toMatch(address);
    expect('geofare, St.Kongensgade 4, 1264 København K, Denmark. CVR 12 34 56 78.').toMatch(address);
    expect('geofare, Vestergade 12, [postcode and town], Denmark. CVR [number].').toMatch(address);
  });

  it('rejects blanked street, town or CVR', () => {
    expect('geofare, , , Denmark. CVR .').not.toMatch(address);
    expect('geofare, , 8000 Aarhus C, Denmark. CVR 12345678.').not.toMatch(address);
    expect('geofare, Vestergade 12, , Denmark. CVR 12345678.').not.toMatch(address);
    expect('geofare, Vestergade 12, 8000 Aarhus C, Denmark. CVR .').not.toMatch(address);
    expect('geofare, Vestergade 12, 8000 Aarhus C, Denmark. CVR  .').not.toMatch(address);
  });

  it('rejects a value that swallows the next part of the sentence', () => {
    expect('geofare, Vestergade 12, Denmark. CVR 12345678.').not.toMatch(address);
    expect('geofare, Vestergade 12, 8000 Aarhus C, Denmark. CVR 1. More text.').not.toMatch(address);
  });
});
