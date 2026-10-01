// How the copy tests compare the page with the brief's wording in tests/fixtures/copy.en.json.
// Not a test file itself: tests/build/copy.test.ts and tests/unit/copy-match.test.ts use it.

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * What a filled-in placeholder may be: at least one character that is not a space, comma or
 * full stop, and no comma or sentence-ending full stop inside it. So "Jordan", "Vestergade 12",
 * "8000 Aarhus C", "12 34 56 78" and "hello@geofare.dk" are accepted, while an empty value, a
 * value of only punctuation, or text that runs on into another clause or sentence is not.
 */
const FILLED = '[^\\s,.](?:(?:[^,.]|\\.(?=\\S))*?[^\\s,.])?';

/**
 * A fixture string as a pattern. The brief leaves some values open as `[like this]`; each may
 * still be the placeholder or have been filled in with a real value, so filling in an open point
 * needs no change to the tests. Every other character must match exactly. `whole` anchors the
 * pattern to the whole text.
 */
export function copyPattern(s: string, whole = false): RegExp {
  const body = s
    .split(/(\[[^\]]+\])/)
    .map((part, i) => (i % 2 ? `(?:${escape(part)}|${FILLED})` : escape(part)))
    .join('');
  return new RegExp(whole ? `^${body}$` : body);
}

/**
 * The footer's address line, built from the brief's fragments in the order the brief gives them:
 * "geofare, [street address], [postcode and town], Denmark. CVR [number]."
 */
export function footerAddressPattern(fragments: string[]): RegExp {
  const [name, street, town, country, cvr] = fragments;
  return copyPattern(`${name}, ${street}, ${town}, ${country}. ${cvr}.`, true);
}
