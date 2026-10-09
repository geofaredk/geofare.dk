/**
 * The geofare line field: the edges of the logo's wave bands, extended across any rectangle.
 *
 * Pure geometry: no DOM, no randomness, no clock. The animated hero canvas and the static
 * SVG crops both draw what `fieldLines` returns, so they are the same drawing.
 *
 * How it is built
 * ---------------
 * Work in the logo's own axes: `u` runs along the band diagonal (lower left to upper right),
 * `v` across it. Measured on brand.svg, every band edge is the same staircase in these axes:
 * a straight run along `u`, then a soft step across by exactly one band pair, the step
 * having a tanh profile. Each line steps a little further along `u` than the one before, so
 * the steps lie on a front leaning slightly from straight across, and wide and narrow gaps
 * alternate (the blue bands and the cream between them). STEP_SOFTNESS, PAIRING and STAGGER
 * are those measurements in units of the mean line spacing.
 *
 * A field is not a logo, so three things are relaxed, all slowly and smoothly:
 *   - the straight runs are longer and of uneven length (STEP_PERIOD, STEPS);
 *   - each step's position wanders a little from line to line (MEANDER);
 *   - long swells push neighbouring lines together and apart (SWELLS), and the whole field
 *     rises and falls across the bands (TIDE), like contour lines around a changing water level.
 *
 * Over one cycle the steps travel along the diagonal by exactly one repeat of the step
 * pattern. A passing step lifts a line onto the next pair of the lattice, so the straight
 * runs stay where they are while the steps glide through them, and after a full cycle the
 * field is back where it started.
 */

/** Seconds for one full drift cycle: `time` and `time + CYCLE_SECONDS` give the same lines. */
export const CYCLE_SECONDS = 60;

export interface FieldOptions {
  /** CSS px of the area to cover. */
  width: number;
  height: number;
  /** Seconds; default 0. */
  time?: number;
  /** -1..1, shifts the whole field along its normal like a water level; default 0. */
  level?: number;
  /** Px between neighbouring lines; default from `spacingFor(width)`. */
  spacing?: number;
  /** Default 1. */
  seed?: number;
}

/** x0, y0, x1, y1, … */
export type Polyline = Float32Array;

// Every length below is in units of the mean line spacing (28.3 of the logo's 228 units).

/** Softness of a step: across = tanh(along / STEP_SOFTNESS). Measured on the logo. */
const STEP_SOFTNESS = 0.415;
/** Gaps alternate between (1 + PAIRING) and (1 - PAIRING) spacings: the logo's bands. */
const PAIRING = 0.4;
/** How much further along the band each line steps than its neighbour one spacing across. */
const STAGGER = -0.115;
/** Mean distance along the band from one step to the next. The logo shows one step per edge. */
const STEP_PERIOD = 8;
/** Where the steps sit within one repeat of the pattern, in step periods. */
const STEPS = [0, 1.1, 2];
/** How far a step's position wanders along the band, and over how many lines. */
const MEANDER = { amplitude: 1.5, wavelength: 60 };
/** [amplitude, wavelength across the bands, wavelength along them, cycles per CYCLE_SECONDS]. */
const SWELLS = [
  [0.4, 16, 90, 1],
  [0.25, 27, -60, -1],
];
/** Rise and fall of the whole field across the bands, once per cycle. */
const TIDE = 0.4;
/** Shift across the bands at level ±1. */
const LEVEL_SHIFT = 0.75;

/** Px between samples along the band: fine enough to keep a step smooth. */
const SAMPLE = 6;
const TAU = Math.PI * 2;

/** Wider spacing, so fewer lines, on small screens. */
export function spacingFor(width: number): number {
  return Math.round(Math.min(34, Math.max(28, 36 - width / 160)));
}

/** A repeatable pseudo-random number in 0..1 for a seed and a slot. */
function hash(seed: number, slot: number): number {
  const x = Math.sin(seed * 127.1 + slot * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The lines covering `width` × `height`, in px from the top-left corner.
 *
 * The number of lines and of points per line depends only on width, height and spacing;
 * time, level and seed only move the points. Lines are ordered across the bands, never
 * touch, always run rightwards, and begin and end outside the area. Once per step that
 * passes (STEPS.length times a cycle, never at time 0) each index takes over the line one
 * pair further on, which looks the same but means indices do not follow a line forever.
 */
export function fieldLines(o: FieldOptions): Polyline[] {
  const { width, height, time = 0, level = 0, seed = 1 } = o;
  const s = o.spacing ?? spacingFor(width);
  const phase = time / CYCLE_SECONDS - Math.floor(time / CYCLE_SECONDS);

  const steps = STEPS.length;
  const pair = 2 * s; // a step moves a line across by one pair, as in the logo
  const repeat = steps * STEP_PERIOD * s; // the step pattern repeats over this distance along u
  const tilt = (steps * pair) / repeat; // mean slope of the staircase in (u, v)
  const softness = STEP_SOFTNESS * s;
  const drift = repeat * (phase + hash(seed, 0));
  const shift = s * (TIDE * Math.sin(TAU * phase) - LEVEL_SHIFT * level);

  // How far a line can stray from its mean course v = c + tilt * u, plus one sample so that
  // it always ends outside the area. Evenly spaced steps stray by one spacing; uneven ones
  // by a little more, as do the meander, the swells, the tide and the level.
  let reach = 1 + tilt * MEANDER.amplitude + TIDE + LEVEL_SHIFT;
  STEPS.forEach((at, i) => (reach += (2 * Math.abs(at - i)) / steps));
  SWELLS.forEach((swell) => (reach += swell[0]));
  reach = reach * s + SAMPLE;

  // Lines sit on a lattice of pairs across the bands. Each passing step carries a line one
  // pair along it, so the lattice is slid back by a whole pair whenever one has passed.
  const slide = steps * phase;
  const slid = pair * (slide - Math.floor(slide));
  const across = Math.SQRT1_2 * ((1 - tilt) * width + (1 + tilt) * height);
  const pairs = Math.ceil((across + pair + 2 * reach) / pair);
  const w = Math.SQRT2 * width;
  const h = Math.SQRT2 * height;

  const lines: Polyline[] = [];
  const stepAt = new Float64Array(steps);
  const swellAt = new Float64Array(SWELLS.length);
  for (let k = 0; k < pairs * 2; k++) {
    const slot = -reach + pair * (k >> 1) + (k & 1) * (1 + PAIRING) * s;
    const c = slot - slid;

    // The stretch of u in which this line can be inside the area, the same at all times.
    const low = slot - pair - reach;
    const high = slot + reach;
    const from = Math.floor(Math.max((low - h) / (1 - tilt), -high / (1 + tilt)) / SAMPLE);
    const to = Math.ceil(Math.min((w - low) / (1 + tilt), high / (1 - tilt)) / SAMPLE);
    if (to <= from) continue;

    // Everything that is constant along one line.
    for (let i = 0; i < steps; i++) {
      const wander = Math.sin(TAU * (c / (MEANDER.wavelength * s) + hash(seed, 10 + i)));
      stepAt[i] = drift + STAGGER * c + s * (STEPS[i] * STEP_PERIOD + MEANDER.amplitude * wander);
    }
    for (let i = 0; i < SWELLS.length; i++) {
      swellAt[i] = c / (SWELLS[i][1] * s) + SWELLS[i][3] * phase + hash(seed, 20 + i);
    }

    const line = new Float32Array((to - from + 1) * 2);
    for (let j = from, n = 0; j <= to; j++) {
      const u = j * SAMPLE;
      let v = c + shift + tilt * u;
      for (let i = 0; i < steps; i++) {
        // Distance to the nearest repeat of this step; the step itself, less the mean slope.
        let r = u - stepAt[i];
        r -= repeat * Math.round(r / repeat);
        v += pair * (0.5 * Math.tanh(r / softness) - r / repeat);
      }
      for (let i = 0; i < SWELLS.length; i++) {
        v += SWELLS[i][0] * s * Math.sin(TAU * (swellAt[i] + u / (SWELLS[i][2] * s)));
      }
      line[n++] = Math.SQRT1_2 * (u + v);
      line[n++] = Math.SQRT1_2 * (v - u);
    }
    lines.push(line);
  }
  return lines;
}

/** A polyline as SVG path data, "M…L…", rounded to `precision` decimals. */
export function toSvgPath(line: Polyline, precision = 1): string {
  const scale = 10 ** precision;
  const round = (value: number) => Math.round(value * scale) / scale;
  let d = '';
  for (let j = 0; j < line.length; j += 2) {
    d += `${j ? 'L' : 'M'}${round(line[j])} ${round(line[j + 1])}`;
  }
  return d;
}
