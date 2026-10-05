import { expect, test, type Page } from '@playwright/test';

/** Opens every sector row, so the widest state of the page is the one that is measured. */
const openAll = (page: Page) =>
  page.evaluate(() => document.querySelectorAll('details').forEach((details) => (details.open = true)));

/** The x and y of each element, rounded, in document order. */
const positions = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { x: Math.round(box.x), y: Math.round(box.y + scrollY) };
    }),
  );

const distinct = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

for (const width of [320, 360, 768, 1280, 1920]) {
  test.describe(`at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of ['/', '/imprint', '/404']) {
      test(`${path} fits the viewport: no sideways scrolling, nothing past the right edge`, async ({ page }) => {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        await openAll(page);

        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

        const past = await page.evaluate(() => {
          const limit = document.documentElement.clientWidth + 0.5;
          const found: string[] = [];
          for (const element of document.body.querySelectorAll('*')) {
            // Decorative drawings may be cropped by their box; text and controls may not.
            if (element.closest('svg[aria-hidden="true"], canvas')) continue;
            const box = element.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) continue;
            if (box.right > limit) found.push(`${element.tagName.toLowerCase()}.${element.className} ends at ${box.right}`);
          }
          return found;
        });
        expect(past).toEqual([]);
      });
    }
  });
}

test.describe('at 1280', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the four services form two columns and two rows', async ({ page }) => {
    await page.goto('/');
    const blocks = await positions(page, '#services .service');
    expect(blocks).toHaveLength(4);
    expect(distinct(blocks.map((block) => block.x))).toHaveLength(2);
    expect(distinct(blocks.map((block) => block.y))).toHaveLength(2);
    // Reading order runs across, then down: 01 02 / 03 04.
    expect(blocks[0].y).toBe(blocks[1].y);
    expect(blocks[2].y).toBe(blocks[3].y);
    expect(blocks[0].x).toBe(blocks[2].x);
    expect(blocks[1].x).toBeGreaterThan(blocks[0].x);
    expect(blocks[2].y).toBeGreaterThan(blocks[0].y);
  });

  test('the four principles stand side by side, names on one line and sentences on the next', async ({ page }) => {
    await page.goto('/');
    const principles = await positions(page, '#approach .principle');
    expect(principles).toHaveLength(4);
    expect(distinct(principles.map((principle) => principle.y))).toHaveLength(1);
    expect(distinct(principles.map((principle) => principle.x))).toHaveLength(4);
    const sentences = await positions(page, '#approach .principle p');
    expect(distinct(sentences.map((sentence) => sentence.y))).toHaveLength(1);
  });

  test('about is a spread: the picture on the left, founder, quote and team in one column on the middle edge', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const about = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(`#about ${selector}`)!.getBoundingClientRect();
      const container = document.querySelector('#about .container')!;
      const style = getComputedStyle(container);
      const left = container.getBoundingClientRect().left + parseFloat(style.paddingLeft);
      const right = container.getBoundingClientRect().right - parseFloat(style.paddingRight);
      const gap = parseFloat(style.columnGap);
      const column = (right - left - 11 * gap) / 12;
      const quote = document.querySelector('#about blockquote p')!;
      const quoteStyle = getComputedStyle(quote);
      const [founder, team] = [...document.querySelectorAll('#about h3')].map((heading) => heading.getBoundingClientRect());
      return {
        left,
        right,
        // Where column 7 starts and where column 5 ends.
        middle: left + 6 * (column + gap),
        fifth: left + 5 * column + 4 * gap,
        mission: box('.about__mission').left,
        founder: { left: founder.left, top: founder.top, bottom: founder.bottom },
        team: { left: team.left, top: team.top },
        quote: {
          left: quote.getBoundingClientRect().left,
          right: quote.getBoundingClientRect().right,
          top: quote.getBoundingClientRect().top,
          bottom: quote.getBoundingClientRect().bottom,
          lines: quote.getBoundingClientRect().height / parseFloat(quoteStyle.lineHeight),
          size: parseFloat(quoteStyle.fontSize),
          weight: quoteStyle.fontWeight,
          colour: quoteStyle.color,
          indent: parseFloat(quoteStyle.textIndent),
        },
        body: parseFloat(getComputedStyle(document.querySelector('#about .about__text p')!).fontSize),
        accent: getComputedStyle(document.querySelector('#about h2')!).color,
        portrait: (({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }))(box('.portrait')),
        window: (({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }))(box('.portrait__window')),
        picture: (({ left, right, top, bottom, width, height }) => ({ left, right, top, bottom, width, height }))(box('.portrait__picture')),
      };
    });
    const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1);

    // One text column: mission lead, founder heading, quote and team heading start on the middle edge.
    for (const edge of [about.mission, about.founder.left, about.quote.left, about.team.left]) near(edge, about.middle);
    // In reading order down that column.
    expect(about.quote.top).toBeGreaterThan(about.founder.bottom);
    expect(about.team.top).toBeGreaterThan(about.quote.bottom);

    // The quote stays inside the column, in at most five lines, set apart from the body text around it.
    expect(about.quote.right).toBeLessThanOrEqual(about.right + 0.5);
    expect(Math.round(about.quote.lines)).toBeLessThanOrEqual(5);
    expect(about.quote.size).toBeGreaterThan(about.body * 1.3);
    expect(about.quote.weight).toBe('500');
    expect(about.quote.colour).toBe(about.accent);
    expect(about.quote.indent).toBeLessThan(0); // the opening mark hangs

    // The picture block: columns 1 to 5, its top on the founder heading's top, beside the quote.
    near(about.portrait.left, about.left);
    near(about.portrait.right, about.fifth);
    expect(Math.abs(about.portrait.top - about.founder.top)).toBeLessThan(2);
    expect(about.quote.top).toBeLessThan(about.portrait.bottom);
    // In it: the 4:5 picture top right, and the window onto the line field lower on the left;
    // the picture overlaps the window's upper right and stands out above it.
    for (const part of [about.window, about.picture]) expect(Math.abs(part.width / part.height - 4 / 5)).toBeLessThan(0.01);
    near(about.picture.right, about.portrait.right);
    near(about.picture.top, about.portrait.top);
    near(about.window.left, about.portrait.left);
    near(about.window.bottom, about.portrait.bottom);
    expect(about.picture.top).toBeLessThan(about.window.top - 40);
    expect(about.picture.bottom).toBeGreaterThan(about.window.top + 40);
    expect(about.picture.bottom).toBeLessThan(about.window.bottom - 40);
    expect(about.picture.left).toBeGreaterThan(about.window.left + 40);
    expect(about.picture.left).toBeLessThan(about.window.right - 40);
  });
});

for (const width of [1024, 1280, 1440, 1920]) {
  test(`with four columns every principle name is one line, all on one shared line, at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const names = await page.locator('#approach .principle h3').evaluateAll((headings) =>
      headings.map((heading) => {
        const box = heading.getBoundingClientRect();
        return { x: Math.round(box.x), top: Math.round(box.top + scrollY), lines: box.height / parseFloat(getComputedStyle(heading).lineHeight) };
      }),
    );
    expect(names).toHaveLength(4);
    expect(distinct(names.map((name) => name.x))).toHaveLength(4);
    expect(distinct(names.map((name) => name.top))).toHaveLength(1);
    for (const name of names) expect(Math.round(name.lines * 10) / 10).toBe(1);
  });
}

test.describe('the blue section at 1280', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the signpost stands close above the principles, with more blue above it than below', async ({ page }) => {
    await page.goto('/');
    const space = await page.evaluate(() => {
      const approach = document.querySelector('#approach')!;
      const signpost = approach.querySelector('h2')!.getBoundingClientRect();
      const name = approach.querySelector('h3')!.getBoundingClientRect();
      return { above: signpost.top - approach.getBoundingClientRect().top, below: name.top - signpost.bottom };
    });
    // `above` is the section space; the signpost sits about a third of that above the names.
    expect(space.below / space.above).toBeGreaterThan(0.25);
    expect(space.below / space.above).toBeLessThan(0.42);
  });

  test('a principle that gains a second paragraph, and a fifth principle, both keep their place', async ({ page }) => {
    await page.goto('/');
    // What an edit to the content files would produce: one more block in a body, one more entry.
    await page.evaluate(() => {
      const first = document.querySelector('#approach .principle')!;
      for (const child of [...first.children]) {
        if (child.tagName === 'H3') continue;
        const paragraph = child.matches('p') ? child : child.querySelector('p')!;
        paragraph.after(paragraph.cloneNode(true));
      }
      const list = document.querySelector('#approach .principles')!;
      list.append(list.lastElementChild!.cloneNode(true));
    });
    const result = await page.evaluate(() => {
      const principles = [...document.querySelectorAll('#approach .principle')];
      const paragraphs = [...principles[0].querySelectorAll('p')].map((p) => p.getBoundingClientRect());
      const rows = principles.map((principle) => principle.getBoundingClientRect());
      const texts = principles.map((principle) => Math.max(...[...principle.querySelectorAll('h3, p')].map((e) => e.getBoundingClientRect().bottom)));
      return {
        children: principles.map((principle) => principle.children.length),
        paragraphs: paragraphs.map(({ top, bottom }) => ({ top, bottom })),
        firstRowBottom: Math.max(...texts.slice(0, 4)),
        fifth: { left: rows[4].left, top: rows[4].top },
        firstLeft: rows[0].left,
      };
    });
    // A name and one body element, whatever the body holds.
    expect(result.children).toEqual([2, 2, 2, 2, 2]);
    expect(result.paragraphs).toHaveLength(2);
    expect(result.paragraphs[1].top).toBeGreaterThanOrEqual(result.paragraphs[0].bottom);
    // The fifth starts a new row under the first, a clear gap below everything in the row above.
    expect(result.fifth.left).toBe(result.firstLeft);
    expect(result.fifth.top - result.firstRowBottom).toBeGreaterThanOrEqual(40);
  });
});

test.describe('at 360', () => {
  test.use({ viewport: { width: 360, height: 900 } });

  test('the four services stack in one column', async ({ page }) => {
    await page.goto('/');
    const blocks = await positions(page, '#services .service');
    expect(blocks).toHaveLength(4);
    expect(distinct(blocks.map((block) => block.x))).toHaveLength(1);
    expect(distinct(blocks.map((block) => block.y))).toHaveLength(4);
  });

  test('the four principles stack in one column', async ({ page }) => {
    await page.goto('/');
    const principles = await positions(page, '#approach .principle');
    expect(distinct(principles.map((principle) => principle.x))).toHaveLength(1);
    expect(distinct(principles.map((principle) => principle.y))).toHaveLength(4);
  });

  test('the picture block is small and on the left edge, not a full-width box', async ({ page }) => {
    await page.goto('/');
    const slot = await page.evaluate(() => {
      const box = document.querySelector('#about .portrait')!.getBoundingClientRect();
      const text = document.querySelector('#about h2')!.getBoundingClientRect();
      return { left: box.left, width: box.width, height: box.height, edge: text.left, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) };
    });
    expect(slot.left).toBe(slot.edge);
    expect(slot.width).toBeLessThanOrEqual(16 * slot.rem);
    expect(slot.width).toBeGreaterThanOrEqual(12 * slot.rem);
  });
});

for (const width of [360, 1280, 1920]) {
  test(`the blue section is the accent colour from edge to edge at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const section = await page.evaluate(() => {
      // Resolve the tokens the way the browser does, so the test holds no colour of its own.
      const probe = document.createElement('div');
      document.body.append(probe);
      const resolve = (token: string, property: 'backgroundColor' | 'color') => {
        probe.style[property] = `var(${token})`;
        return getComputedStyle(probe)[property];
      };
      const accent = resolve('--accent', 'backgroundColor');
      const onAccent = resolve('--on-accent', 'color');
      probe.remove();

      const approach = document.querySelector('#approach')!;
      const box = approach.getBoundingClientRect();
      const text = [...approach.querySelectorAll('h2, h3, p')].map((element) => getComputedStyle(element).color);
      return {
        accent,
        onAccent,
        background: getComputedStyle(approach).backgroundColor,
        left: box.left,
        width: box.width,
        viewport: document.documentElement.clientWidth,
        text,
      };
    });
    expect(section.background).toBe(section.accent);
    expect(section.left).toBe(0);
    expect(section.width).toBe(section.viewport);
    expect(section.text.length).toBeGreaterThanOrEqual(9);
    for (const colour of section.text) expect(colour).toBe(section.onAccent);
  });
}

test('the line field in the blue section lies below the text, never behind it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const field = page.locator('#approach .field-window');
  await expect(field).toHaveCount(1);
  await expect(field).toHaveAttribute('aria-hidden', 'true');
  const edges = await page.evaluate(() => {
    const approach = document.querySelector('#approach')!;
    const bottoms = [...approach.querySelectorAll('h2, h3, p')].map((element) => element.getBoundingClientRect().bottom);
    const box = approach.querySelector('.field-window')!.getBoundingClientRect();
    return { text: Math.max(...bottoms), top: box.top, bottom: box.bottom, section: approach.getBoundingClientRect().bottom };
  });
  expect(edges.top).toBeGreaterThanOrEqual(edges.text);
  expect(Math.abs(edges.bottom - edges.section)).toBeLessThan(1);
});

test('one line-field band stands between the lab and the contact section, with no text on it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const band = await page.evaluate(() => {
    const lab = document.querySelector('#lab')!;
    const contact = document.querySelector('#contact')!;
    const between: Element[] = [];
    for (let node = lab.nextElementSibling; node && node !== contact; node = node.nextElementSibling) between.push(node);
    const fields = between.flatMap((node) => (node.matches('.field-window') ? [node] : [...node.querySelectorAll('.field-window')]));
    const box = fields[0]?.getBoundingClientRect();
    return {
      fields: fields.length,
      // What is shown: innerText leaves out the still drawing kept in <noscript> for when JavaScript is off.
      text: between.map((node) => (node as HTMLElement).innerText.trim()).join(''),
      ids: between.map((node) => node.id).join(''),
      left: box?.left,
      width: box?.width,
      height: box?.height,
      viewport: document.documentElement.clientWidth,
    };
  });
  expect(band.fields).toBe(1);
  expect(band.text).toBe('');
  expect(band.ids).toBe('');
  expect(band.left).toBe(0);
  expect(band.width).toBe(band.viewport);
  expect(band.height).toBeGreaterThan(120);
});

for (const width of [360, 1280]) {
  test(`the two contact details are full-row blocks; one still in brackets is plain text, never a link, at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const blocks = page.locator('#contact .contact__block');
    await expect(blocks).toHaveCount(2);
    const container = (await page.locator('#contact h2').boundingBox())!;
    for (const block of await blocks.all()) {
      const { tag, href, text, left, right } = await block.evaluate((element) => {
        // Where the text itself starts, and how far the rule beneath it runs.
        const range = document.createRange();
        range.selectNodeContents(element);
        const rule = getComputedStyle(element, '::after');
        const box = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          href: element.getAttribute('href'),
          text: element.textContent!.trim(),
          left: range.getBoundingClientRect().left,
          right: box.right - parseFloat(rule.right),
        };
      });
      if (/^\[.*\]$/.test(text)) {
        expect(tag).toBe('SPAN');
        expect(href).toBeNull();
      } else {
        expect(tag).toBe('A');
        expect(href).toMatch(/^(mailto:|https:\/\/)/);
      }
      // The text starts on the page's left edge and the rule runs the full row.
      expect(Math.abs(left - container.x)).toBeLessThan(1);
      expect(Math.abs(right - (container.x + container.width))).toBeLessThan(1);
      expect((await block.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // No link anywhere on the page points at a placeholder.
    const hrefs = await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
    expect(hrefs.filter((href) => /\[|%5B/i.test(href))).toEqual([]);
  });

  test(`the footer is one quiet line and its imprint link is underlined and easy to hit at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toContainText(`© ${new Date().getFullYear()} geofare.`);
    // Link, copyright and CVR stand on one line; there is no address.
    const text = footer.locator('p');
    await expect(text).toHaveCount(1);
    const lines = await text.evaluate((p) => Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)));
    expect(lines).toBe(1);
    await expect(footer).not.toContainText('Denmark');
    const logo = (await footer.locator('img').boundingBox())!;
    expect(logo.height).toBe(36);
    // Beside the logo, the line is right-aligned on the page's right edge and stands on the foot of the logo.
    if (width >= 768) {
      const edges = await footer.evaluate((element) => {
        const logo = element.querySelector('img')!.getBoundingClientRect();
        const line = element.querySelector('p')!;
        const range = document.createRange();
        range.selectNodeContents(line);
        const text = range.getBoundingClientRect();
        const mark = document.createElement('span');
        mark.style.display = 'inline-block';
        line.append(mark);
        const baseline = mark.getBoundingClientRect().bottom;
        mark.remove();
        const container = element.querySelector('.container')!;
        const right = container.getBoundingClientRect().right - parseFloat(getComputedStyle(container).paddingRight);
        return { logoFoot: logo.bottom, baseline, textRight: text.right, right };
      });
      expect(Math.abs(edges.baseline - edges.logoFoot)).toBeLessThanOrEqual(1);
      expect(Math.abs(edges.textRight - edges.right)).toBeLessThanOrEqual(1);
    }
    const link = footer.getByRole('link', { name: 'Imprint' });
    expect(await link.evaluate((element) => getComputedStyle(element).textDecorationLine)).toBe('underline');
    // The target reaches beyond the word: 10 px above and below it still belongs to the link.
    await link.scrollIntoViewIfNeeded();
    const hits = await link.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const x = box.left + box.width / 2;
      return [box.top - 9, box.bottom + 9].map((y) => document.elementFromPoint(x, y) === element);
    });
    expect(hits).toEqual([true, true]);
    await link.click();
    await expect(page).toHaveURL(/\/imprint\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Imprint');
  });
}

test('the 404 page offers one button back to the home page', async ({ page }) => {
  await page.goto('/404');
  const back = page.locator('main').getByRole('link', { name: 'Back to the home page' });
  await expect(back).toBeVisible();
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await back.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make good decisions when it matters.');
});

test('on a page with little on it the footer stands at the foot of the window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/imprint');
  const bottom = await page.evaluate(() => document.querySelector('footer')!.getBoundingClientRect().bottom);
  expect(Math.round(bottom)).toBe(900);
});

for (const width of [360, 768, 1280, 1920]) {
  test(`without JavaScript the still line fields are drawn at the hero's scale, never shrunk to the screen, at ${width}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto('/');
    const scales = await page.evaluate(() =>
      ['#approach', '.contact__band', '.about__portrait'].map((selector) => {
        const path = document.querySelector(`${selector} path`) as SVGGraphicsElement | null;
        const matrix = path?.getScreenCTM();
        return { selector, scale: matrix ? Math.hypot(matrix.a, matrix.b) : null };
      }),
    );
    for (const { selector, scale } of scales) expect(scale, selector).toBeCloseTo(1, 5);
    await context.close();
  });
}

test.describe('the windows onto the line field', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  /** Scrolls so the window's top is `offset` px below the top of the screen, and reports where things are. */
  const at = (page: Page, selector: string, offset: number) =>
    page.evaluate(
      async ({ selector, offset }) => {
        const win = document.querySelector(selector)!;
        const canvas = win.querySelector('canvas')!;
        scrollTo({ top: win.getBoundingClientRect().top + scrollY - offset, behavior: 'instant' });
        // The field wakes when its window comes on screen: wait until it has been drawn again.
        while (!canvas.width) await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const rect = (element: Element) => (({ left, top, width, height }) => ({ left, top, width, height }))(element.getBoundingClientRect());
        return { canvas: rect(canvas), window: rect(win), state: canvas.dataset.state, backing: canvas.width };
      },
      { selector, offset },
    );

  for (const selector of ['#about .portrait__window', '#approach .approach__field', '.contact__band']) {
    test(`the field stays where it is on screen while its window scrolls over it: ${selector}`, async ({ page }) => {
      await page.goto('/');
      const high = await at(page, selector, 120);
      const low = await at(page, selector, 320);
      // The canvas fills the viewport and does not move; the window does.
      for (const shot of [high, low]) expect(shot.canvas).toEqual({ left: 0, top: 0, width: 1280, height: 800 });
      expect(low.window.top - high.window.top).toBeCloseTo(200, 0);
      expect(high.state).toBe('running');
      // Out of sight, the viewport-sized canvas gives its memory back.
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await expect.poll(() => page.locator(`${selector} canvas`).evaluate((canvas: HTMLCanvasElement) => canvas.width)).toBe(0);
    });

    test(`with reduced motion the field is one still frame inside its window: ${selector}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      const shot = await at(page, selector, 120);
      expect(shot.state).toBe('static');
      expect(shot.canvas).toEqual(shot.window);
    });
  }

  test('nothing of a viewport-sized canvas can be reached outside its window', async ({ page }) => {
    await page.goto('/');
    await at(page, '#about .portrait__window', 120);
    const hit = await page.evaluate(() => document.elementFromPoint(900, 400)?.className ?? '');
    expect(hit).not.toContain('field-window__field');
  });

  test('the window in the blue section draws in the colour of its text', async ({ page }) => {
    await page.goto('/');
    await at(page, '#approach .approach__field', 300);
    const colours = await page.evaluate(() => ({
      line: getComputedStyle(document.querySelector('#approach canvas')!).color,
      text: getComputedStyle(document.querySelector('#approach h2')!).color,
    }));
    expect(colours.line).toBe(colours.text);
  });

  test('the picture is the founder photo, described for those who cannot see it, filling its 4:5 box', async ({ page }) => {
    await page.goto('/');
    const photo = page.locator('#about .portrait__picture img');
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveAttribute('alt', /\S+/);
    await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const { image, box } = await page.evaluate(() => {
      const rect = (selector: string) => (({ width, height }) => ({ width, height }))(document.querySelector(selector)!.getBoundingClientRect());
      return { image: rect('#about .portrait__picture img'), box: rect('#about .portrait__picture') };
    });
    expect(image).toEqual(box);
    await expect(page.locator('#about .portrait__placeholder')).toHaveCount(0);
  });
});
