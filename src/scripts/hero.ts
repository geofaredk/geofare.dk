/**
 * Brings the hero to life: mounts the line field behind it and starts the headline rotation.
 * With reduced motion there is one still frame and no rotation (the stylesheet already shows
 * the final sentence).
 */
import { mountHeroField, type HeroField } from './hero-field';
import { startRotator } from './hero-rotator';

/** How long each ending of the headline is shown. */
const ENDING_MS = 3000;
/** How far the field rises with each ending, 0..1: highest for "when sea levels climb." */
const LEVELS = [0, 0.6, 1, 0.35, 0];
/** Time constant with which the lines flow back in where the headline has become smaller. */
const SETTLE_MS = 450;

const hero = document.querySelector<HTMLElement>('.hero');
const canvas = hero?.querySelector('canvas');
if (hero && canvas) start(hero, canvas);

function start(hero: HTMLElement, canvas: HTMLCanvasElement) {
  const fixed = hero.querySelector<HTMLElement>('.hero__fixed');
  const final = hero.querySelector<HTMLElement>('.hero__final');
  const rotator = hero.querySelector<HTMLElement>('.hero__rotator');
  const lede = hero.querySelector<HTMLElement>('.hero__lede');
  const range = document.createRange();

  /**
   * The headline text on show now, one box per line of text: the fixed part and whichever
   * endings are visible. Text that shares a line (two endings in mid-change) shares a box.
   */
  function headlineLines(): DOMRect[] {
    const rotating = rotator && getComputedStyle(rotator).display !== 'none';
    const endings = rotating
      ? Array.from(rotator.children).filter((ending) => getComputedStyle(ending).visibility !== 'hidden')
      : [final];
    const lines: { left: number; top: number; right: number; bottom: number }[] = [];
    for (const part of [fixed, ...endings]) {
      if (!part) continue;
      range.selectNodeContents(part);
      for (const box of range.getClientRects()) {
        if (!box.width || !box.height) continue;
        const line = lines.find((other) => Math.abs(other.top - box.top) < box.height / 2);
        if (line) {
          line.left = Math.min(line.left, box.left);
          line.top = Math.min(line.top, box.top);
          line.right = Math.max(line.right, box.right);
          line.bottom = Math.max(line.bottom, box.bottom);
        } else {
          lines.push({ left: box.left, top: box.top, right: box.right, bottom: box.bottom });
        }
      }
    }
    return lines.sort((a, b) => a.top - b.top).map((line) => new DOMRect(line.left, line.top, line.right - line.left, line.bottom - line.top));
  }

  // Each line of the headline has a quiet zone of its own, as wide as that line. Where a line
  // grows its zone grows at once, so no field line is ever behind a letter; where it shrinks
  // the zone eases, so the field flows in. A line that goes gives its zone up at once.
  let widths = new Map<number, number>();
  let easedAt = 0;
  function headlineZones(eased: boolean): DOMRect[] {
    const now = performance.now();
    const step = eased ? 1 - Math.exp(-Math.min(now - easedAt, 100) / SETTLE_MS) : 1;
    easedAt = now;
    const ease = (from: number, to: number) => (to >= from || from - to < 0.5 ? to : from + (to - from) * step);
    const next = new Map<number, number>();
    const zones = headlineLines().map((line) => {
      // A line is known by where it stands: its top, to the pixel.
      const key = Math.round(line.top + scrollY);
      const width = ease(widths.get(key) ?? 0, line.width);
      next.set(key, width);
      return new DOMRect(line.left, line.top, width, line.height);
    });
    widths = next;
    return zones;
  }

  // Still undefined during the first frame, which mountHeroField draws before it returns.
  let mounted: HeroField | undefined;
  const quietZones = () => {
    const box = hero.getBoundingClientRect();
    return [
      // Easing needs frames; a field that is standing still gets the exact boxes.
      ...headlineZones(mounted?.running ?? false),
      // The sub-line and both buttons.
      ...(lede?.getClientRects().length ? [lede.getBoundingClientRect()] : []),
      // The hero's upper and lower edges, so the field thins out towards the header and the
      // page below instead of being cut off.
      new DOMRect(box.left, box.top, box.width, 0),
      new DOMRect(box.left, box.bottom, box.width, 0),
    ];
  };

  const field = (mounted = mountHeroField(canvas, { quietZones }));
  // Every further canvas in the hero gets a field of its own, kept clear of the same text.
  const others = Array.from(hero.querySelectorAll<HTMLCanvasElement>('canvas'))
    .filter((other) => other !== canvas)
    .map((other) => mountHeroField(other, { quietZones }));
  if (canvas.dataset.state === 'static') return;

  if (rotator) {
    startRotator(rotator, {
      intervalMs: ENDING_MS,
      onChange: (index) => [field, ...others].forEach((each) => each.setLevel(LEVELS[index] ?? 0)),
    });
  }
}
