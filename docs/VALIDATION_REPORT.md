# Interactive Landing Page validation — 2026-10-20

## Scope and release status

Source baseline: `6e8277072c63482ab1d571ea062d784d20998ee1` on
`feat/interactive-wireframe-v1`. Fixes are isolated on `fix/interactive-validation`.
PR #1 remains open and unmerged. Main is unchanged.

The static build is validated locally. **No cloud deployment, SSH connection,
remote Web service configuration, public URL or HTTPS validation has occurred.**
The current Work conversation and available handoff data do not contain the
server address, SSH user/port, domain, verified host fingerprint or usable key.
Do not interpret local HTTP 200 as evidence of a public deployment.

## Repairs

- Explicit Vite 7 development dependency keeps Astro and the Tailwind Vite
  plugin on the same major. Previously npm resolved a separate Vite 8 for
  Tailwind, and `astro build` failed with a Rolldown `tsconfigPaths` binding error.
- Committed npm lockfile; future installations should use `npm ci`.
- Canvas backing dimensions change only when CSS dimensions or DPR change.
- Games cancel animation frames while offscreen or the page is hidden, reset
  frame clocks on resume, and reconnect observers after back/forward navigation.
- Keyboard input belongs to the focused game. Canvas elements are focusable;
  starting a game moves focus there. Space pauses/resumes either game.
- Touch drags capture the pointer and suppress page scrolling on the canvas.
- Breakout preserves destroyed bricks and score across viewport width changes;
  ball/paddle positions are clamped to the new bounds.
- Pong speed is capped; Breakout wall and paddle hits clamp positions to avoid
  repeated collision reversals. Large frame deltas are capped.
- Invalid/blocked localStorage no longer prevents page initialization.
- Removed the example mailto action; the contact block now says DEMO ONLY.
- Narrow-screen headings scale down to avoid clipping long words.

## Reproduction

Environment: Node 24.19.0, npm 11.9.0, Astro 6.4.8, Vite 7.3.7,
Playwright 1.56.1, Chromium 141.0.7390.37 on Linux.

```bash
npm ci
npx playwright install chromium
npm run build
npm run check
npm run test:browser
```

The build emits a static `dist/` site. Typecheck has no errors, warnings or hints.
The browser suite exercises the production preview, not the development server:

1. Desktop HTTP loading, assets/JavaScript errors, anchors, accordion, theme/XP
   persistence and removal of the placeholder mailto action.
2. Pong focus, keyboard movement, pause/resume, CPU scoring and unchanged canvas
   resize counters during gameplay.
3. Breakout brick collision/scoring, pause/resume, resize, loss and retry.
4. Offscreen drawing stops and resumes; a simulated document visibility event
   tests the hidden-tab handler (not an OS-level background-tab test).
5. 320px layout, heading bounds and reduced-motion visibility.
6. 390px layout, heading bounds and reduced-motion visibility.
7. 768px layout, heading bounds and reduced-motion visibility.
8. Invalid and denied localStorage handling.
9. Chromium mobile emulation with actual CDP touch input, both game overlays and
   stable page scroll position during drag.

Desktop and 320px full-page screenshots were inspected locally. The Linux test
image lacks CJK fonts, so its Chinese screenshot glyphs are unavailable; the page
uses the browser/system font fallback and ships no remote font dependency.

Limits: Chromium only; no physical iOS/Android check, full-level completion test,
long-running performance benchmark, or remote-server test has been performed.
The profile, project and experience content remains demonstration material.

## Deployment inputs still needed

- Authorized server IP/hostname, SSH login user and SSH port.
- A usable credential supplied as an attached key file or an existing secure VM
  path, not pasted into code/logs. If a prior key was exposed, replace it first.
- Expected SSH host fingerprint from the provider console or trusted channel.
- Domain if any, DNS status and intended dedicated host/path for this site.

Discover OS, existing vhosts, ingress, permissions and free ports with read-only
commands after connecting. Preserve every unrelated site. Adapt Web service and
TLS choices to the actual server; no example config has been executed remotely.

## Planned release and rollback

After inspecting the server, use a dedicated release tree, for example
`/var/www/landingpage/releases/<tested-commit>/`, and an atomic `current` symlink.
Record the previous target and back up only the specific vhost being changed.
Validate the Web server configuration before reloading. Check the public HTTP(S)
response and replay the browser tests against the public URL before calling the
release deployed.

For later upgrades, roll back by atomically restoring `current` to the recorded
previous release. If the vhost changed, restore its saved configuration, validate
and reload. For the first installation with no previous release, disable only
this new vhost and restore its prior state. Never alter unrelated vhosts or use a
global configuration reset. Preserve the previous files and certificate setup.
