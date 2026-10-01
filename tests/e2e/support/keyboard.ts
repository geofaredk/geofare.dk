/**
 * The key that moves focus to the next link or control.
 *
 * Safari (and Playwright's WebKit) leaves links out of the Tab order unless the reader has
 * turned on "Press Tab to highlight each item"; Option+Tab always includes them. Keyboard
 * users of Safari use one or the other, so the tests walk the page the same way.
 */
export const tabKey = (browserName: string) => (browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
