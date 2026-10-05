/**
 * A "window" onto the line field: the canvas is fixed to the viewport (see Portrait.astro) and
 * its parent cuts a window out of it, so the page scrolls over a field that stays where it is.
 * The field runs only while its window is on screen.
 */
import { mountHeroField } from './hero-field';

for (const canvas of document.querySelectorAll<HTMLCanvasElement>('canvas[data-window-field]')) {
  mountHeroField(canvas, { watch: canvas.parentElement ?? canvas });
}
