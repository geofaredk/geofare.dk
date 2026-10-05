/**
 * The small-screen menu: one button that shows and hides the navigation.
 *
 * `aria-expanded` on the button is the only state; the stylesheet shows the menu from it.
 * The button's two labels come from its `data-open` and `data-close` attributes.
 */
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = toggle && document.getElementById(toggle.getAttribute('aria-controls') ?? '');
const header = toggle?.closest('header');

if (toggle && menu && header) {
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = (open ? toggle.dataset.close : toggle.dataset.open) ?? '';
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Choosing a destination closes the menu.
  menu.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });

  // The open menu covers the page, so close it when focus moves on into the page behind it.
  header.addEventListener('focusout', (event) => {
    if (event.relatedTarget instanceof Node && !header.contains(event.relatedTarget)) setOpen(false);
  });

  // On a wide screen the links are always shown and the button is gone.
  matchMedia('(min-width: 77rem)').addEventListener('change', () => setOpen(false));
}
