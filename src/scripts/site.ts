type Theme = { bg: string; ink: string };
const themes: Theme[] = [
  { bg: "#d0edf5", ink: "#173b45" },
  { bg: "#daead1", ink: "#29533a" },
  { bg: "#f2e7bd", ink: "#624a22" },
  { bg: "#e9d4ed", ink: "#52325b" },
  { bg: "#f2d6c4", ink: "#673c2e" },
];
// Storage may be blocked or contain values written by an older build.
function storedNumber(key: string) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}
function persist(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Keep playing in memory. */
  }
}
let themeIndex = storedNumber("lp-theme") % themes.length;
function applyTheme() {
  const t = themes[themeIndex];
  document.documentElement.style.setProperty("--accent", t.bg);
  document.documentElement.style.setProperty("--ink", t.ink);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", t.bg);
}
function nextTheme() {
  themeIndex = (themeIndex + 1) % themes.length;
  persist("lp-theme", themeIndex);
  applyTheme();
}
applyTheme();
document.getElementById("theme-button")?.addEventListener("click", nextTheme);
const revealElements = document.querySelectorAll<HTMLElement>(".reveal");
if (
  "IntersectionObserver" in window &&
  !matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add("visible");
          observer.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -6% 0px" },
  );
  revealElements.forEach((el, i) => {
    el.style.transitionDelay = String(Math.min(i % 5, 4) * 65) + "ms";
    observer.observe(el);
  });
} else revealElements.forEach((el) => el.classList.add("visible"));
document
  .querySelectorAll<HTMLButtonElement>(".experience-item")
  .forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll<HTMLButtonElement>(".experience-item")
        .forEach((item) => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-expanded", String(active));
          const plus = item.querySelector(".exp-plus");
          if (plus) plus.textContent = active ? "−" : "+";
        });
    }),
  );
let xp = storedNumber("lp-xp"),
  level = 1;
const levelEl = document.getElementById("xp-level"),
  barEl = document.getElementById("xp-progress"),
  speedEl = document.getElementById("xp-speed");
let bonus = 0;
function award(amount: number) {
  xp += amount;
  level = 1 + Math.floor(xp / 30);
  persist("lp-xp", xp);
  if (levelEl) levelEl.textContent = "LV " + String(level).padStart(2, "0");
  if (barEl)
    (barEl as HTMLElement).style.width = String(((xp % 30) / 30) * 100) + "%";
  if (speedEl) speedEl.textContent = "+" + String(1 + bonus) + " XP/s";
}
award(0);
window.setInterval(() => {
  if (!document.hidden) award(1 + bonus);
}, 1000);
const pressed = new Set<string>();
window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (target !== pongCanvas && target !== brickCanvas) return;
  const controls =
    target === pongCanvas
      ? ["KeyW", "KeyS", "ArrowUp", "ArrowDown"]
      : ["KeyA", "KeyD", "ArrowLeft", "ArrowRight"];
  if (controls.includes(e.code)) {
    e.preventDefault();
    pressed.add(e.code);
  }
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    if (target === pongCanvas) togglePong();
    else toggleBrick();
  }
});
window.addEventListener("keyup", (e) => pressed.delete(e.code));
window.addEventListener("blur", () => pressed.clear());
window.addEventListener("focusout", () => pressed.clear());
type Particle = { x: number; y: number; vx: number; vy: number; life: number };
type Surface = {
  w: number;
  h: number;
  dpr: number;
  ctx: CanvasRenderingContext2D;
};
const surfaces = new WeakMap<HTMLCanvasElement, Surface>();
function fit(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.max(1, rect.width),
    h = Math.max(1, rect.height);
  const previous = surfaces.get(canvas);
  if (previous && previous.w === w && previous.h === h && previous.dpr === dpr)
    return previous;
  // Assigning either dimension resets the entire 2D context. Only do it on resize.
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const surface = { w, h, dpr, ctx };
  surfaces.set(canvas, surface);
  return surface;
}
function watchGame(
  canvas: HTMLCanvasElement,
  draw: (time: number) => void,
  resetClock: () => void,
) {
  let visible = false,
    frame = 0;
  function tick(time: number) {
    draw(time);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    resetClock();
    pressed.clear();
    if (visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    sync();
  });
  observer.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  });
  window.addEventListener("pageshow", () => {
    observer.observe(canvas);
    sync();
  });
}
function touchControl(
  canvas: HTMLCanvasElement,
  move: (event: PointerEvent) => void,
  end: () => void,
) {
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    move(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" && canvas.hasPointerCapture(e.pointerId))
      move(e);
  });
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("lostpointercapture", end);
}
const pongCanvas = document.getElementById("pong-canvas") as HTMLCanvasElement,
  pongOverlay = document.getElementById("pong-overlay")!,
  pongStart = document.getElementById("pong-start")!;
let pongPlaying = false,
  pongActive = false,
  pongPlayer = 0,
  pongCpu = 0,
  pongBall = { x: 200, y: 100, vx: 3.5, vy: 2.2 },
  pongPaddle = 0,
  pongAI = 0,
  pongLast = 0,
  pongParticles: Particle[] = [];
function pongReset(w: number, h: number, direction = 1) {
  pongBall = {
    x: w / 2,
    y: h / 2,
    vx: direction * (3.6 + Math.min(pongPlayer, 5) * 0.25),
    vy: (Math.random() - 0.5) * 4,
  };
}
function burst(list: Particle[], x: number, y: number, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      s = 1 + Math.random() * 4;
    list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 });
  }
}
function renderParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
    "--ink",
  );
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= 0.025;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillRect(p.x, p.y, 3, 3);
    if (p.life <= 0) list.splice(i, 1);
  }
  ctx.globalAlpha = 1;
}
function togglePong() {
  pongPlaying = !pongPlaying;
  pongActive = true;
  pongOverlay.classList.toggle("hidden", pongPlaying);
  pongStart.textContent = "RESUME ↗";
  if (pongPlaying) pongCanvas.focus({ preventScroll: true });
}
pongStart.addEventListener("click", togglePong);
pongCanvas.addEventListener("click", (e) => {
  if (pongActive && (e as PointerEvent).pointerType !== "touch") togglePong();
});
let pongTouch: number | null = null;
touchControl(
  pongCanvas,
  (e) => {
    pongTouch = e.clientY - pongCanvas.getBoundingClientRect().top;
  },
  () => (pongTouch = null),
);
function pongLoop(time: number) {
  const { w, h, ctx } = fit(pongCanvas);
  const dt = pongLast ? Math.min((time - pongLast) / 16.667, 1) : 1;
  pongLast = time;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(23,59,69,.25)";
  ctx.setLineDash([5, 10]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);
  if (pongPlaying) {
    if (pressed.has("KeyW") || pressed.has("ArrowUp")) pongPaddle -= 6.8 * dt;
    if (pressed.has("KeyS") || pressed.has("ArrowDown")) pongPaddle += 6.8 * dt;
    if (pongTouch !== null) pongPaddle += (pongTouch - 37 - pongPaddle) * 0.25;
    pongPaddle = Math.max(0, Math.min(h - 74, pongPaddle));
    pongAI += Math.max(-4.5 * dt, Math.min(4.5 * dt, pongBall.y - 37 - pongAI));
    pongAI = Math.max(0, Math.min(h - 74, pongAI));
    pongBall.x += pongBall.vx * dt;
    pongBall.y += pongBall.vy * dt;
    if (pongBall.y < 9 || pongBall.y > h - 9) {
      pongBall.vy *= -1;
      pongBall.y = Math.max(9, Math.min(h - 9, pongBall.y));
    }
    if (
      pongBall.vx < 0 &&
      pongBall.x < 27 &&
      pongBall.x > 12 &&
      pongBall.y > pongPaddle - 9 &&
      pongBall.y < pongPaddle + 83
    ) {
      pongBall.x = 27;
      pongBall.vx = Math.min(10, Math.abs(pongBall.vx) * 1.04);
      pongBall.vy = Math.max(
        -8,
        Math.min(8, pongBall.vy + (pongBall.y - pongPaddle - 37) * 0.04),
      );
      burst(pongParticles, 27, pongBall.y);
    }
    if (
      pongBall.vx > 0 &&
      pongBall.x > w - 27 &&
      pongBall.x < w - 12 &&
      pongBall.y > pongAI - 9 &&
      pongBall.y < pongAI + 83
    ) {
      pongBall.x = w - 27;
      pongBall.vx = -Math.min(10, Math.abs(pongBall.vx) * 1.02);
      pongBall.vy = Math.max(
        -8,
        Math.min(8, pongBall.vy + (pongBall.y - pongAI - 37) * 0.035),
      );
      burst(pongParticles, w - 27, pongBall.y);
    }
    if (pongBall.x > w) {
      pongPlayer++;
      award(8);
      bonus = Math.min(3, Math.floor(pongPlayer / 3));
      nextTheme();
      document.getElementById("pong-score")!.textContent = String(
        pongPlayer,
      ).padStart(2, "0");
      pongReset(w, h, -1);
    }
    if (pongBall.x < 0) {
      pongCpu++;
      document.getElementById("cpu-score")!.textContent = String(
        pongCpu,
      ).padStart(2, "0");
      pongReset(w, h, 1);
    }
  }
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
    "--ink",
  );
  ctx.fillRect(13, pongPaddle, 12, 74);
  ctx.fillRect(w - 25, pongAI, 12, 74);
  ctx.beginPath();
  ctx.arc(pongBall.x, pongBall.y, 9, 0, Math.PI * 2);
  ctx.fill();
  renderParticles(ctx, pongParticles);
}
watchGame(pongCanvas, pongLoop, () => {
  pongLast = 0;
});
const brickCanvas = document.getElementById(
    "brick-canvas",
  ) as HTMLCanvasElement,
  brickOverlay = document.getElementById("brick-overlay")!,
  brickStart = document.getElementById("brick-start")!;
type Brick = { x: number; y: number; w: number; h: number; alive: boolean };
let brickPlaying = false,
  brickLevel = 1,
  brickScore = 0,
  bricks: Brick[] = [],
  brickBall = { x: 200, y: 230, vx: 3.1, vy: -4 },
  brickPaddle = 150,
  brickLast = 0,
  brickParticles: Particle[] = [];
let brickTouch: number | null = null;
function layoutBricks(w: number) {
  const cols = 6,
    gap = 7,
    margin = 18,
    bw = (w - margin * 2 - (cols - 1) * gap) / cols;
  bricks = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < cols; col++)
      bricks.push({
        x: margin + col * (bw + gap),
        y: 24 + row * 34,
        w: bw,
        h: 25,
        alive: true,
      });
}
function beginBrick() {
  const { w, h } = fit(brickCanvas);
  brickPaddle = w / 2 - 45;
  brickBall = { x: w / 2, y: h - 65, vx: 3.1, vy: -4 };
  layoutBricks(w);
  brickPlaying = true;
  brickOverlay.classList.add("hidden");
}
let brickStarted = false;
function toggleBrick() {
  if (!brickStarted) {
    beginBrick();
    brickStarted = true;
    brickCanvas.focus({ preventScroll: true });
    return;
  }
  brickPlaying = !brickPlaying;
  brickOverlay.classList.toggle("hidden", brickPlaying);
  brickStart.textContent = "RESUME ↗";
  if (brickPlaying) brickCanvas.focus({ preventScroll: true });
}
brickStart.addEventListener("click", () => {
  if (brickStarted) toggleBrick();
  else {
    beginBrick();
    brickStarted = true;
    brickCanvas.focus({ preventScroll: true });
  }
});
touchControl(
  brickCanvas,
  (e) => {
    brickTouch = e.clientX - brickCanvas.getBoundingClientRect().left;
  },
  () => (brickTouch = null),
);
function brickLoop(time: number) {
  const { w, h, ctx } = fit(brickCanvas);
  const dt = brickLast ? Math.min((time - brickLast) / 16.667, 1) : 1;
  brickLast = time;
  ctx.clearRect(0, 0, w, h);
  const color = getComputedStyle(document.documentElement).getPropertyValue(
    "--ink",
  );
  ctx.fillStyle = color;
  if (brickPlaying) {
    if (pressed.has("KeyA") || pressed.has("ArrowLeft")) brickPaddle -= 7 * dt;
    if (pressed.has("KeyD") || pressed.has("ArrowRight")) brickPaddle += 7 * dt;
    if (brickTouch !== null)
      brickPaddle += (brickTouch - 45 - brickPaddle) * 0.28;
    brickPaddle = Math.max(0, Math.min(w - 90, brickPaddle));
    const b = brickBall;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < 9) {
      b.x = 9;
      b.vx = Math.abs(b.vx);
    }
    if (b.x > w - 9) {
      b.x = w - 9;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y < 9) b.vy = Math.abs(b.vy);
    if (
      b.vy > 0 &&
      b.y + 8 >= h - 35 &&
      b.y < h - 16 &&
      b.x >= brickPaddle - 8 &&
      b.x <= brickPaddle + 98
    ) {
      b.y = h - 43;
      b.vy = -Math.abs(b.vy);
      b.vx = (b.x - brickPaddle - 45) * 0.095;
      burst(brickParticles, b.x, b.y, 7);
    }
    for (const brick of bricks) {
      if (
        brick.alive &&
        b.x + 8 > brick.x &&
        b.x - 8 < brick.x + brick.w &&
        b.y + 8 > brick.y &&
        b.y - 8 < brick.y + brick.h
      ) {
        brick.alive = false;
        b.vy *= -1;
        brickScore += 10;
        award(2);
        burst(brickParticles, b.x, b.y, 14);
        document.getElementById("brick-score")!.textContent =
          "SCORE " + String(brickScore).padStart(3, "0");
        break;
      }
    }
    if (b.y > h + 10) {
      brickPlaying = false;
      brickStarted = false;
      brickOverlay.classList.remove("hidden");
      brickStart.textContent = "TRY AGAIN ↗";
    }
    if (bricks.length && bricks.every((br) => !br.alive)) {
      brickLevel++;
      award(20);
      nextTheme();
      document.getElementById("brick-level")!.textContent =
        "LEVEL " + String(brickLevel).padStart(2, "0");
      beginBrick();
    }
  }
  for (const br of bricks) {
    if (!br.alive) continue;
    ctx.globalAlpha = 0.68;
    ctx.fillRect(br.x, br.y, br.w, br.h);
    ctx.globalAlpha = 1;
  }
  ctx.fillRect(brickPaddle, h - 30, 90, 12);
  ctx.beginPath();
  ctx.arc(brickBall.x, brickBall.y, 8, 0, Math.PI * 2);
  ctx.fill();
  renderParticles(ctx, brickParticles);
}
watchGame(brickCanvas, brickLoop, () => {
  brickLast = 0;
});
// Preserve destroyed bricks and scores when rotating/resizing the viewport.
let brickWidth = 0;
const resizeObserver = new ResizeObserver(() => {
  const { w, h } = fit(brickCanvas);
  if (brickWidth && brickWidth !== w) {
    const ratio = w / brickWidth;
    const alive = bricks.map((brick) => brick.alive);
    layoutBricks(w);
    bricks.forEach((brick, i) => (brick.alive = alive[i] ?? true));
    brickBall.x = Math.max(8, Math.min(w - 8, brickBall.x * ratio));
    brickPaddle = Math.max(0, Math.min(w - 90, brickPaddle * ratio));
  }
  brickBall.y = Math.min(h - 44, brickBall.y);
  brickWidth = w;
  const pong = fit(pongCanvas);
  pongBall.x = Math.max(9, Math.min(pong.w - 9, pongBall.x));
  pongBall.y = Math.max(9, Math.min(pong.h - 9, pongBall.y));
});
resizeObserver.observe(brickCanvas);
resizeObserver.observe(pongCanvas);
window.addEventListener("pagehide", () => resizeObserver.disconnect());
window.addEventListener("pageshow", () => {
  resizeObserver.observe(brickCanvas);
  resizeObserver.observe(pongCanvas);
});
