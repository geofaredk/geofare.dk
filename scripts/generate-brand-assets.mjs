// Renders the supplied square mark (src/assets/brand.svg, unmodified) into the favicon,
// touch icon and share image in public/. Run with `npm run brand-assets`; commit the output.
import { copyFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const mark = await readFile(new URL('src/assets/brand.svg', root));
const tokens = await readFile(new URL('src/styles/tokens.css', root), 'utf8');

// The cream background comes from the design tokens, never from a second literal.
const bg = tokens.match(/--bg:\s*(#[0-9a-f]{6})\s*;/i)?.[1];
if (!bg) throw new Error('Could not read --bg from src/styles/tokens.css');

const MARK_VIEWBOX = 229; // brand.svg is 229 x 229

/** The mark rasterised at `size` px, rendered from the vector at matching density. */
const renderMark = (size) =>
  sharp(mark, { density: (72 * size) / MARK_VIEWBOX })
    .resize(size, size)
    .png()
    .toBuffer();

async function onBackground(file, width, height, markSize) {
  await sharp({ create: { width, height, channels: 4, background: bg } })
    .composite([{ input: await renderMark(markSize), gravity: 'centre' }])
    .png()
    .toFile(new URL(`public/${file}`, root).pathname);
}

await onBackground('og-image.png', 1200, 630, 300);
await onBackground('apple-touch-icon.png', 180, 180, 112);
await sharp(await renderMark(32)).toFile(new URL('public/favicon-32.png', root).pathname);
await copyFile(new URL('src/assets/brand.svg', root), new URL('public/favicon.svg', root));

console.log('Wrote public/og-image.png, apple-touch-icon.png, favicon-32.png, favicon.svg');
