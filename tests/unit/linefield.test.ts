import { describe, expect, it } from 'vitest';
import { CYCLE_SECONDS, fieldLines, spacingFor, toSvgPath, type Polyline } from '../../src/lib/linefield';

const desktop = { width: 1280, height: 800 };
const phone = { width: 360, height: 740 };

/** Largest distance any point travels between two renderings of the same structure. */
function maxMove(a: Polyline[], b: Polyline[]): number {
  expect(a.length).toBe(b.length);
  let max = 0;
  a.forEach((line, i) => {
    expect(line.length).toBe(b[i].length);
    for (let j = 0; j < line.length; j += 2) {
      max = Math.max(max, Math.hypot(line[j] - b[i][j], line[j + 1] - b[i][j + 1]));
    }
  });
  return max;
}

/** The cells of a 160 px grid over the area that no line passes through, as "column,row". */
function uncrossedCells(lines: Polyline[], area: { width: number; height: number }): string[] {
  const cell = 160;
  const empty = new Set<string>();
  for (let x = 0; x < area.width; x += cell) for (let y = 0; y < area.height; y += cell) empty.add(`${x / cell},${y / cell}`);
  for (const line of lines) {
    for (let j = 0; j < line.length; j += 2) {
      const x = line[j];
      const y = line[j + 1];
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      if (x >= 0 && x < area.width && y >= 0 && y < area.height) empty.delete(`${Math.floor(x / cell)},${Math.floor(y / cell)}`);
    }
  }
  return [...empty];
}

describe('fieldLines', () => {
  it('is deterministic', () => {
    const options = { ...desktop, time: 7.3, level: 0.4, seed: 5 };
    expect(fieldLines(options)).toEqual(fieldLines(options));
  });

  it('is periodic over a cycle of at least 20 seconds', () => {
    expect(CYCLE_SECONDS).toBeGreaterThanOrEqual(20);
    expect(maxMove(fieldLines({ ...desktop, time: 3 }), fieldLines({ ...desktop, time: 3 + CYCLE_SECONDS }))).toBeLessThan(0.01);
  });

  it('moves slowly: no point travels more than 1.5 px in one frame', () => {
    expect(maxMove(fieldLines({ ...desktop, time: 0 }), fieldLines({ ...desktop, time: 1 / 30 }))).toBeLessThan(1.5);
    // Nor later in the cycle, nor on a phone, where the wider spacing makes the steps travel faster.
    for (const area of [desktop, phone]) {
      for (const time of [9.5, 31, 52.25]) {
        expect(maxMove(fieldLines({ ...area, time }), fieldLines({ ...area, time: time + 1 / 30 }))).toBeLessThan(1.5);
      }
    }
  });

  it('actually moves', () => {
    expect(maxMove(fieldLines({ ...desktop, time: 0 }), fieldLines({ ...desktop, time: 1 }))).toBeGreaterThan(1);
  });

  it('covers the whole area with finite coordinates', () => {
    expect(uncrossedCells(fieldLines(desktop), desktop)).toEqual([]);
  });

  it('is continuous: no segment is longer than 24 px', () => {
    let longest = 0;
    for (const line of fieldLines(desktop)) {
      for (let j = 2; j < line.length; j += 2) {
        longest = Math.max(longest, Math.hypot(line[j] - line[j - 2], line[j + 1] - line[j - 1]));
      }
    }
    expect(longest).toBeGreaterThan(0);
    expect(longest).toBeLessThanOrEqual(24);
  });

  it('draws fewer lines on small screens and is never denser on a phone', () => {
    expect(fieldLines(phone).length).toBeLessThan(fieldLines(desktop).length);
    expect(spacingFor(360)).toBeGreaterThanOrEqual(spacingFor(1280));
  });

  it('takes its default spacing from spacingFor(width)', () => {
    expect(fieldLines(desktop)).toEqual(fieldLines({ ...desktop, spacing: spacingFor(desktop.width) }));
    expect(fieldLines({ ...desktop, spacing: 60 }).length).toBeLessThan(fieldLines(desktop).length);
  });

  it('shifts with level by no more than two line spacings anywhere', () => {
    const spacing = spacingFor(desktop.width);
    const moved = maxMove(fieldLines({ ...desktop, level: 0 }), fieldLines({ ...desktop, level: 1 }));
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThanOrEqual(2 * spacing);
  });

  it('draws a different field for a different seed', () => {
    expect(fieldLines({ ...desktop, seed: 2 })).not.toEqual(fieldLines({ ...desktop, seed: 1 }));
  });

  // The logo's band edges: straight runs on the lower-left to upper-right diagonal, joined by soft S-steps.
  it('runs along the 45° diagonal of the logo for most of its length', () => {
    let diagonal = 0;
    let total = 0;
    for (const line of fieldLines(desktop)) {
      for (let j = 2; j < line.length; j += 2) {
        const dx = line[j] - line[j - 2];
        const dy = line[j + 1] - line[j - 1];
        const length = Math.hypot(dx, dy);
        const degrees = (Math.atan2(-dy, dx) * 180) / Math.PI; // screen y points down
        total += length;
        if (Math.abs(degrees - 45) <= 10) diagonal += length;
      }
    }
    expect(diagonal / total).toBeGreaterThan(0.5);
    expect(diagonal / total).toBeLessThan(0.9); // the rest is the steps
  });

  // What the canvas and the static crops rely on, at any time, level and size.
  // The times include the moments just before and after line indices are handed on (see fieldLines).
  describe.each([0, 11.7, CYCLE_SECONDS / 3 - 0.01, CYCLE_SECONDS / 3 + 0.01, CYCLE_SECONDS - 0.01])('at time %s', (time) => {
    describe.each([desktop, phone, { width: 1440, height: 240 }])('covering $width × $height', (area) => {
      const lines = fieldLines({ ...area, time, level: -1, seed: 3 });

      it('keeps the same structure, so only coordinates change between frames', () => {
        const base = fieldLines({ ...area, time: 0, seed: 3 });
        expect(lines.map((line) => line.length)).toEqual(base.map((line) => line.length));
      });

      it('covers the whole area', () => {
        expect(uncrossedCells(lines, area)).toEqual([]);
      });

      it('never ends a line inside the area', () => {
        const inside = (x: number, y: number) => x > 0 && x < area.width && y > 0 && y < area.height;
        for (const line of lines) {
          expect(line.length).toBeGreaterThanOrEqual(4);
          expect(inside(line[0], line[1])).toBe(false);
          expect(inside(line[line.length - 2], line[line.length - 1])).toBe(false);
        }
      });

      it('never lets two lines touch', () => {
        // Every line runs rightwards, so it has one height at each x; walk them all at once.
        const columns: number[][] = [];
        for (let x = 0; x <= area.width; x += 8) columns.push([]);
        for (const line of lines) {
          let j = 2;
          columns.forEach((column, i) => {
            const x = i * 8;
            if (x < line[0] || x > line[line.length - 2]) return;
            while (line[j] < x) j += 2;
            expect(line[j]).toBeGreaterThan(line[j - 2]);
            const f = (x - line[j - 2]) / (line[j] - line[j - 2]);
            column.push(line[j - 1] + f * (line[j + 1] - line[j - 1]));
          });
        }
        let closest = Infinity;
        for (const column of columns) {
          // In array order each line lies below the one before it.
          for (let i = 1; i < column.length; i++) closest = Math.min(closest, column[i] - column[i - 1]);
        }
        expect(closest).toBeGreaterThan(spacingFor(area.width) / 8);
      });
    });
  });
});

describe('toSvgPath', () => {
  it('writes a polyline as M…L… with one decimal by default', () => {
    expect(toSvgPath(new Float32Array([0, 0, 10.26, 5]))).toBe('M0 0L10.3 5');
  });

  it('honours the precision and joins every point', () => {
    expect(toSvgPath(new Float32Array([1.234, -5.678, 10, 20.05, 30.5, 40]), 2)).toBe('M1.23 -5.68L10 20.05L30.5 40');
    expect(toSvgPath(new Float32Array([1.234, -5.678, 10, 20.4]), 0)).toBe('M1 -6L10 20');
  });
});
