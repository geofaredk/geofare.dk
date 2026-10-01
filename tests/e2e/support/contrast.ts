import type { Page } from '@playwright/test';

/** What `installContrastTools` puts on `window.contrast` in the page. */
export interface ContrastTools {
  /** Any CSS colour as [r, g, b, alpha 0..1], resolved by the browser. */
  rgba(colour: string): [number, number, number, number];
  /** `top` drawn over the opaque `below`. */
  over(top: number[], below: number[]): [number, number, number, number];
  /** WCAG contrast ratio of two opaque colours. */
  ratio(a: number[], b: number[]): number;
  /** The colour behind an element: translucent backgrounds blended down to the first opaque one. */
  backgroundOf(element: Element): [number, number, number, number];
  /** Product of the element's and its ancestors' opacity. */
  opacityOf(element: Element): number;
  /** An opaque colour as `rgb(r g b)`. */
  css(colour: number[]): string;
}

/**
 * Defines `window.contrast` in the page. Self-contained, because Playwright sends it to the
 * page as source; call it with `page.evaluate(installContrastTools)`.
 */
export function installContrastTools() {
  // Resolve any CSS colour (rgb(), color(srgb …), color-mix() results) through a 1×1 canvas.
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const ctx = probe.getContext('2d', { willReadFrequently: true })!;
  const rgba = (colour: string): [number, number, number, number] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top: number[], below: number[]) =>
    [0, 1, 2].map((i) => top[i] * top[3] + below[i] * (1 - top[3])).concat(1) as [number, number, number, number];
  const luminance = ([r, g, b]: number[]) => {
    const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const ratio = (a: number[], b: number[]) => {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  const backgroundOf = (element: Element) => {
    const layers: number[][] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') throw new Error(`background image behind text at ${node.tagName}.${node.className}`);
      const colour = rgba(style.backgroundColor);
      if (colour[3] > 0) layers.push(colour);
      if (colour[3] === 1) break;
    }
    // Below everything is the canvas, white unless the root paints it.
    let result = [255, 255, 255, 1] as [number, number, number, number];
    for (const layer of layers.reverse()) result = over(layer, result);
    return result;
  };
  const opacityOf = (element: Element) => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity);
    return opacity;
  };
  const css = (c: number[]) => `rgb(${c.slice(0, 3).map(Math.round).join(' ')})`;
  const tools: ContrastTools = { rgba, over, ratio, backgroundOf, opacityOf, css };
  (window as unknown as { contrast: ContrastTools }).contrast = tools;
}

export const withContrastTools = (page: Page) => page.evaluate(installContrastTools);
