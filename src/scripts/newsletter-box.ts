/**
 * The newsletter box starts folded to its round button, as the HTML has it. It opens by itself
 * once the visitor has scrolled past the hero, on a page that has one, and not if they have
 * already closed it. Nothing is stored: the site keeps nothing in the browser, so this is
 * decided afresh on every page.
 *
 * While the box is folded its bell rings every nine seconds: one short swing, started afresh
 * each time, so that no animation runs for long. Not when motion is reduced, not while the
 * tab is hidden, and never while the box is open.
 */
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const hero = document.querySelector('#top');
const EVERY = 9000;
const FIRST = 3000;

for (const box of document.querySelectorAll<HTMLDetailsElement>('details[data-newsletter-box]')) {
  // Closed by the visitor: it stays closed.
  let dismissed = false;
  box.addEventListener('toggle', () => {
    if (!box.open) dismissed = true;
  });

  if (hero) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        // Out of view above the window: the hero has been scrolled past.
        if (entry.isIntersecting || entry.boundingClientRect.bottom > 0) continue;
        observer.disconnect();
        if (dismissed) return;
        // Opening makes room for the card below the footer. Was the page at its end, it stays there,
        // so the footer's line does not end up under the card.
        const root = document.documentElement;
        const atEnd = scrollY + innerHeight >= root.scrollHeight - 2;
        box.open = true;
        if (atEnd) scrollTo({ top: root.scrollHeight, behavior: 'instant' });
      }
    });
    observer.observe(hero);
  }

  const bell = box.querySelector<SVGElement>('.debrief__bell');
  if (!bell) continue;
  bell.addEventListener('animationend', () => bell.classList.remove('is-ringing'));
  const ring = () => {
    if (box.open || !motion.matches || document.hidden) return;
    bell.classList.add('is-ringing');
  };
  setTimeout(() => {
    ring();
    setInterval(ring, EVERY);
  }, FIRST);
}
