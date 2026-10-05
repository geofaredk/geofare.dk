/**
 * Draws the line field (src/lib/linefield.ts) on a canvas and keeps it drifting.
 *
 * The canvas is sized by CSS; this module only fits the backing store to it. Colour and
 * opacity come from the canvas element's `--field-line` and `--field-opacity`.
 * `canvas.dataset.state` is 'running', 'paused' (by `pause()`) or 'static' (reduced motion:
 * one frame, no loop). While the tab is hidden or the canvas is off screen the loop sleeps
 * without changing the state, and wakes where it left off.
 */
import { CYCLE_SECONDS, fieldLines } from '../lib/linefield';

export interface HeroField {
  play(): void;
  pause(): void;
  /** True while the field is meant to move, even if it is asleep off screen. */
  readonly running: boolean;
  /** -1..1, see FieldOptions.level. Eased over about 2.5 s of running time, never a jump. */
  setLevel(level: number): void;
  destroy(): void;
}

const FRAME_MS = 1000 / 30;
const MAX_PIXEL_RATIO = 2;
/** CSS px. */
const LINE_WIDTH = 1.25;
const LEVEL_SECONDS = 2.5;
/** CSS px over which the lines fade out around a quiet zone … */
const FEATHER = 10;
/** … but no more than this share of the canvas width, or a phone would have no field left between its zones. */
const FEATHER_SHARE = 0.08;
/** CSS px per pixel of the erase mask; it is soft, so it can be coarse. */
const MASK_CELL = 1;

const PAD_X = 16;
const PAD_Y = 10;

const smooth = (t: number) => t * t * (3 - 2 * t);

export function mountHeroField(
  canvas: HTMLCanvasElement,
  opts: {
    quietZones?: () => DOMRect[];
    /** The element whose being on screen keeps the field running; the canvas itself by default. */
    watch?: Element;
  } = {},
): HeroField {
  const ctx = canvas.getContext('2d')!;
  const mask = document.createElement('canvas');
  const maskCtx = mask.getContext('2d')!;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let color = '';
  let opacity = 1;
  let masked = '';

  /** False once destroyed. */
  let mounted = true;
  let playing = !still;
  /** A watched field waits for the first word on whether its window is on screen. */
  let onScreen = !opts.watch;
  let frame = 0;
  /** Seconds of animation shown so far; it only advances while frames are drawn. */
  let clock = 0;
  /** Timestamp of the last drawn frame, or of waking up. */
  let drawnAt = 0;
  let level = { from: 0, to: 0, since: -LEVEL_SECONDS };

  const currentLevel = () => {
    const t = Math.min(1, (clock - level.since) / LEVEL_SECONDS);
    return level.from + (level.to - level.from) * smooth(t);
  };

  /** Fits the backing store to the element and re-reads the tokens. True if the size changed. */
  function measure(): boolean {
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
    // Resolve the token through `color`, so any CSS colour (var(), color-mix()) reaches the canvas as rgb.
    canvas.style.color = 'var(--field-line)';
    const style = getComputedStyle(canvas);
    color = style.color;
    opacity = parseFloat(style.getPropertyValue('--field-opacity')) || 0;
    if (box.width === width && box.height === height && ratio === pixelRatio) return false;
    width = box.width;
    height = box.height;
    pixelRatio = ratio;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    masked = '';
    return true;
  }

  /**
   * The quiet zones as [left, top, right, bottom] in CSS px from the canvas corner, in the
   * canvas's own coordinates: a canvas mirrored in CSS (transform: scale(-1, 1) or scale(1, -1))
   * draws mirrored too, so its zones are mirrored to land behind the text on screen.
   */
  function zoneRects(): number[][] {
    const box = canvas.getBoundingClientRect();
    const transform = getComputedStyle(canvas).transform;
    const matrix = transform === 'none' ? undefined : new DOMMatrixReadOnly(transform);
    const mirroredX = (matrix?.a ?? 1) < 0;
    const mirroredY = (matrix?.d ?? 1) < 0;
    return (opts.quietZones?.() ?? []).map((zone) =>
      [
        mirroredX ? box.right - zone.right : zone.left - box.left,
        mirroredY ? box.bottom - zone.bottom : zone.top - box.top,
        mirroredX ? box.right - zone.left : zone.right - box.left,
        mirroredY ? box.bottom - zone.top : zone.bottom - box.top,
      ].map(Math.round),
    );
  }

  /** Erases the lines behind and around each quiet zone, fading out over FEATHER px. */
  // function eraseQuietZones() {
  //   const rects = zoneRects();
  //   const key = rects.join(';');
  //   const moved = key !== masked;
  //   masked = key;
  //   if (!rects.length) return;
  //
  //   // The mask is rebuilt only when a zone moves relative to the canvas: not on scroll, not per frame.
  //   if (moved) {
  //     mask.width = Math.ceil(width / MASK_CELL);
  //     mask.height = Math.ceil(height / MASK_CELL);
  //     const image = maskCtx.createImageData(mask.width, mask.height);
  //     const feather = Math.min(FEATHER, width * FEATHER_SHARE);
  //     for (let row = 0, i = 3; row < mask.height; row++) {
  //       const y = (row + 0.5) * MASK_CELL;
  //       for (let column = 0; column < mask.width; column++, i += 4) {
  //         const x = (column + 0.5) * MASK_CELL;
  //         let nearest = feather + MASK_CELL;
  //         for (const [left, top, right, bottom] of rects) {
  //           nearest = Math.min(nearest, Math.hypot(Math.max(left - x, 0, x - right), Math.max(top - y, 0, y - bottom)));
  //         }
  //         // Opaque to one cell beyond the zone, so scaling the mask up leaves nothing inside it.
  //         image.data[i] = 255 * smooth(1 - Math.max(0, nearest - MASK_CELL) / feather);
  //       }
  //     }
  //     maskCtx.putImageData(image, 0, 0);
  //   }
//
//   ctx.globalAlpha = 1;
//   ctx.globalCompositeOperation = 'destination-out';
//   ctx.drawImage(mask, 0, 0, mask.width * MASK_CELL, mask.height * MASK_CELL);
//   ctx.globalCompositeOperation = 'source-over';
// }

  function eraseQuietZones() {
    for (const [left, top, right, bottom] of zoneRects()) {
      ctx.clearRect(left - PAD_X, top - PAD_Y, right - left + 2 * PAD_X, bottom - top + 2 * PAD_Y);
      }
    }

  function draw() {
    if (!width || !height) return;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    for (const line of fieldLines({ width, height, time: clock % CYCLE_SECONDS, level: currentLevel() })) {
      ctx.moveTo(line[0], line[1]);
      for (let j = 2; j < line.length; j += 2) ctx.lineTo(line[j], line[j + 1]);
    }
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = LINE_WIDTH;
    ctx.stroke();
    eraseQuietZones();
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    // 30 fps: skip display frames that come sooner (with 1 ms of slack for timer jitter).
    if (now - drawnAt < FRAME_MS - 1) return;
    // Time moves by what was actually shown, so waking up or a slow frame never makes a jump.
    clock += Math.min(now - drawnAt, 3 * FRAME_MS) / 1000;
    drawnAt = now;
    draw();
  }

  /** Runs the loop exactly while the field is playing, on screen and in a visible tab. */
  function sync() {
    const awake = playing && onScreen && !document.hidden;
    if (awake && !frame) {
      // The canvas already shows the current moment; the next frame is due one interval from now.
      drawnAt = performance.now();
      frame = requestAnimationFrame(tick);
    } else if (!awake && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    canvas.dataset.state = still ? 'static' : playing ? 'running' : 'paused';
  }

  /**
   * While the loop is not running (reduced motion, paused, asleep) nothing else would notice
   * text reflowing under the lines, so redraw when the canvas or a quiet zone has changed.
   */
  function refresh() {
    if (mounted && onScreen && !frame && (measure() || zoneRects().join(';') !== masked)) draw();
  }

  const resizeObserver = new ResizeObserver(() => {
    // Resizing clears a canvas, so redraw at once instead of waiting for the next frame.
    if (onScreen && measure()) draw();
  });
  const intersectionObserver = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    if (opts.watch) {
      if (onScreen) {
        if (measure()) draw();
      } else {
        // A canvas as large as the viewport: give its memory back while its window is out of sight.
        canvas.width = canvas.height = 0;
        width = height = 0;
      }
    }
    sync();
  });

  if (onScreen) {
    measure();
    draw();
  }
  sync();
  resizeObserver.observe(canvas);
  intersectionObserver.observe(opts.watch ?? canvas);
  document.addEventListener('visibilitychange', sync);
  // What reflows text without resizing the canvas: a web font arriving, the window changing.
  document.fonts.ready.then(refresh);
  document.fonts.addEventListener('loadingdone', refresh);
  addEventListener('resize', refresh);

  return {
    play() {
      if (still) return;
      playing = true;
      sync();
    },
    pause() {
      if (still) return;
      playing = false;
      sync();
      // No more frames will come, so leave the picture matching the quiet zones as they are now.
      refresh();
    },
    get running() {
      return playing;
    },
    setLevel(target) {
      if (still) return;
      level = { from: currentLevel(), to: Math.max(-1, Math.min(1, target)), since: clock };
    },
    destroy() {
      playing = false;
      mounted = false;
      sync();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', sync);
      document.fonts.removeEventListener('loadingdone', refresh);
      removeEventListener('resize', refresh);
    },
  };
}
