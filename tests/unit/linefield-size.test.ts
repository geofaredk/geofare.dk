import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { expect, it } from 'vitest';

// The brief caps the animation module at 15 KB. Measure it the way it ships: the driver with
// its geometry import, bundled and minified by the Vite that Astro builds with.
it('keeps the hero field driver and its geometry under 15 000 bytes', async () => {
  const result = await build({
    configFile: false,
    logLevel: 'error',
    build: {
      write: false,
      minify: true,
      rolldownOptions: {
        input: fileURLToPath(new URL('../../src/scripts/hero-field.ts', import.meta.url)),
        // Nothing imports the driver here, so keep its exports or it is shaken away to nothing.
        preserveEntrySignatures: 'strict',
      },
    },
  });
  const chunks = [result]
    .flat()
    .flatMap((bundle) => ('output' in bundle ? bundle.output : []))
    .filter((file) => file.type === 'chunk');

  // One self-contained chunk that still offers the driver and contains the geometry.
  expect(chunks).toHaveLength(1);
  const [{ code, exports, moduleIds }] = chunks;
  expect(exports).toContain('mountHeroField');
  expect(moduleIds.some((id) => id.endsWith('/src/lib/linefield.ts'))).toBe(true);
  expect(code).not.toMatch(/\bimport\b/);

  const bytes = Buffer.byteLength(code);
  expect(bytes).toBeGreaterThan(1_000);
  expect(bytes).toBeLessThan(15_000);
});
