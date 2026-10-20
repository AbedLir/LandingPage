import { test, expect, type Page } from "@playwright/test";

async function metrics(page: Page, id: string) {
  return page.evaluate(
    (id) => (window as any).__canvasMetrics[id] || { draws: 0, resizes: 0 },
    id,
  );
}
async function image(page: Page, id: string) {
  return page
    .locator(`#${id}`)
    .evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__canvasMetrics = {};
    const stats = (canvas: HTMLCanvasElement) =>
      ((window as any).__canvasMetrics[canvas.id] ||= { draws: 0, resizes: 0 });
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      stats(this.canvas).draws++;
      return clear.apply(this, args);
    };
    for (const name of ["width", "height"]) {
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLCanvasElement.prototype,
        name,
      )!;
      Object.defineProperty(HTMLCanvasElement.prototype, name, {
        ...descriptor,
        set(value) {
          stats(this).resizes++;
          descriptor.set!.call(this, value);
        },
      });
    }
  });
});

test("desktop loading, anchors, accordion, theme and XP persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(response.url());
  });
  expect((await page.goto("/"))?.status()).toBe(200);
  await expect(page.locator("h1")).toContainText("IDEAS.");
  await page.locator("#theme-button").click();
  const theme = await page.evaluate(() => localStorage.getItem("lp-theme"));
  await page.waitForTimeout(1200);
  expect(
    Number(await page.evaluate(() => localStorage.getItem("lp-xp"))),
  ).toBeGreaterThan(0);
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("lp-theme"))).toBe(
    theme,
  );
  await page.locator('a[href="#work"]').first().click();
  await expect(page).toHaveURL(/#work$/);
  const entry = page.locator(".experience-item").nth(1);
  await entry.click();
  await expect(entry).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".experience-item").first()).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(await page.locator('a[href^="mailto:"]').count()).toBe(0);
  expect(errors).toEqual([]);
});

test("Pong keyboard, focus, pause/resume, scoring; no per-frame canvas resize", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#pong-start").click();
  await expect(page.locator("#pong-canvas")).toBeFocused();
  const before = await image(page, "pong-canvas");
  await page.keyboard.down("KeyS");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyS");
  expect(await image(page, "pong-canvas")).not.toBe(before);
  await page.keyboard.press("Space");
  await expect(page.locator("#pong-overlay")).not.toHaveClass(/hidden/);
  await page.waitForTimeout(900);
  const paused = await image(page, "pong-canvas");
  await page.waitForTimeout(200);
  expect(await image(page, "pong-canvas")).toBe(paused);
  await page.locator("#pong-start").click();
  const sizing = await metrics(page, "pong-canvas");
  await expect
    .poll(async () => Number(await page.locator("#cpu-score").textContent()), {
      timeout: 20000,
    })
    .toBeGreaterThan(0);
  expect((await metrics(page, "pong-canvas")).resizes).toBe(sizing.resizes);
  await page.locator("#theme-button").focus();
  expect(
    await page.evaluate(() => {
      const e = new KeyboardEvent("keydown", {
        code: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      document.activeElement!.dispatchEvent(e);
      return e.defaultPrevented;
    }),
  ).toBe(false);
});

test("Breakout collisions, keyboard pause, resize preserves score and retry", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#brick-canvas").scrollIntoViewIfNeeded();
  await page.locator("#brick-canvas").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#brick-canvas")).toBeFocused();
  await expect
    .poll(
      async () =>
        Number(
          (await page.locator("#brick-score").textContent())!.split(" ")[1],
        ),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0);
  await page.keyboard.press("Space");
  await expect(page.locator("#brick-overlay")).not.toHaveClass(/hidden/);
  const score = await page.locator("#brick-score").textContent();
  await page.setViewportSize({ width: 800, height: 1000 });
  await page.locator("#brick-canvas").scrollIntoViewIfNeeded();
  expect(await page.locator("#brick-score").textContent()).toBe(score);
  await page.locator("#brick-start").click();
  await page.keyboard.down("KeyA");
  await page.waitForTimeout(900);
  await page.keyboard.up("KeyA");
  await expect(page.locator("#brick-start")).toHaveText("TRY AGAIN ↗", {
    timeout: 15000,
  });
  await page.locator("#brick-start").click();
  await expect(page.locator("#brick-overlay")).toHaveClass(/hidden/);
});

test("offscreen and hidden games stop drawing and resume safely", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#pong-start").click();
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const offscreen = await metrics(page, "pong-canvas");
  await page.waitForTimeout(200);
  expect((await metrics(page, "pong-canvas")).draws).toBe(offscreen.draws);
  await page.locator("#pong-canvas").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect((await metrics(page, "pong-canvas")).draws).toBeGreaterThan(
    offscreen.draws,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hidden = await metrics(page, "pong-canvas");
  await page.waitForTimeout(200);
  expect((await metrics(page, "pong-canvas")).draws).toBe(hidden.draws);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  expect((await metrics(page, "pong-canvas")).draws).toBeGreaterThan(
    hidden.draws,
  );
});

for (const width of [320, 390, 768])
  test(`responsive layout at ${width}px and reduced motion`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const element of await page.locator(".reveal").all())
      expect(await element.evaluate((el) => getComputedStyle(el).opacity)).toBe(
        "1",
      );
    for (const selector of [
      ".intro-lead h1",
      ".contact-inner h2",
      ".section-heading h2",
      ".section-kicker",
    ]) {
      for (const element of await page.locator(selector).all()) {
        expect(
          await element.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        ).toBe(true);
        const box = await element.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
    }
  });

test("invalid and blocked localStorage do not break games", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("lp-theme", "-2");
    localStorage.setItem("lp-xp", "NaN");
  });
  await page.goto("/");
  await page.locator("#pong-start").click();
  await expect(page.locator("#pong-canvas")).toBeFocused();
  await expect(page.locator("#xp-level")).toHaveText("LV 01");
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.reload();
  await page.locator("#theme-button").click();
  await page.locator("#pong-start").click();
  expect(errors).toEqual([]);
});

test("mobile touch drag moves paddles without pausing or scrolling", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4321/");
  const session = await context.newCDPSession(page);
  for (const game of ["pong", "brick"]) {
    await page.locator(`#${game}-start`).tap();
    const box = (await page.locator(`#${game}-canvas`).boundingBox())!;
    const startY = await page.evaluate(() => scrollY);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: box.x + box.width * 0.8, y: box.y + box.height * 0.8 },
      ],
    });
    await page.waitForTimeout(150);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(`#${game}-overlay`)).toHaveClass(/hidden/);
    expect(await page.evaluate(() => scrollY)).toBe(startY);
  }
  await context.close();
});
