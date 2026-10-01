/**
 * Brings the hero to life: mounts the line field behind it, starts the headline rotation and
 * wires the pause button to both. With reduced motion there is one still frame, no rotation
 * and no button (the stylesheet already shows the final sentence).
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
  const pause = hero.querySelector<HTMLButtonElement>('.hero__pause');
  const range = document.createRange();

  /** The box around the headline text on show now: the fixed part and whichever endings are visible. */
  function headline(): DOMRect {
    const rotating = rotator && getComputedStyle(rotator).display !== 'none';
    const endings = rotating
      ? Array.from(rotator.children).filter((ending) => getComputedStyle(ending).visibility !== 'hidden')
      : [final];
    let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const part of [fixed, ...endings]) {
      if (!part) continue;
      range.selectNodeContents(part);
      const box = range.getBoundingClientRect();
      left = Math.min(left, box.left);
      top = Math.min(top, box.top);
      right = Math.max(right, box.right);
      bottom = Math.max(bottom, box.bottom);
    }
    return new DOMRect(left, top, right - left, bottom - top);
  }

  // The headline's quiet zone follows the text. Where the text grows the zone grows at once,
  // so no line is ever behind a letter; where it shrinks the zone eases, so lines flow in.
  let zone = { width: 0, height: 0 };
  let easedAt = 0;
  function headlineZone(eased: boolean): DOMRect {
    const text = headline();
    const now = performance.now();
    const step = eased ? 1 - Math.exp(-Math.min(now - easedAt, 100) / SETTLE_MS) : 1;
    easedAt = now;
    const ease = (from: number, to: number) => (to >= from || from - to < 0.5 ? to : from + (to - from) * step);
    zone = { width: ease(zone.width, text.width), height: ease(zone.height, text.height) };
    return new DOMRect(text.left, text.top, zone.width, zone.height);
  }

  // Still undefined during the first frame, which mountHeroField draws before it returns.
  let mounted: HeroField | undefined;
  const quietZones = () => {
    const box = hero.getBoundingClientRect();
    return [
      // Easing needs frames; a field that is standing still gets the exact box.
      headlineZone(mounted?.running ?? false),
      // The sub-line and both buttons, and the pause control when it is shown.
      ...[lede, pause].filter((element) => element?.getClientRects().length).map((element) => element!.getBoundingClientRect()),
      // The hero's upper and lower edges, so the field thins out towards the header and the
      // page below instead of being cut off.
      new DOMRect(box.left, box.top, box.width, 0),
      new DOMRect(box.left, box.bottom, box.width, 0),
    ];
  };

  const field = (mounted = mountHeroField(canvas, { quietZones }));
  if (canvas.dataset.state === 'static') {
    if (pause) pause.hidden = true;
    return;
  }

  const rotation = rotator && startRotator(rotator, { intervalMs: ENDING_MS, onChange: (index) => field.setLevel(LEVELS[index] ?? 0) });

  pause?.addEventListener('click', () => {
    if (field.running) {
      // Pausing stops everything that moves by itself, so the headline settles on its last ending.
      rotation?.finish();
      field.pause();
    } else {
      field.play();
    }
    const paused = !field.running;
    pause.toggleAttribute('data-paused', paused);
    const label = pause.querySelector('.hero__pause-label');
    if (label) label.textContent = (paused ? pause.dataset.play : pause.dataset.pause) ?? '';
  });
}
