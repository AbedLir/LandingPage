# Interactive Landing Page — GPT Work VM Deployment Handoff

Last updated: 2026-10-20

Validation update: `fix/interactive-validation` contains the build and interaction
repairs, a committed npm lockfile and 9 passing Chromium tests. See
[`VALIDATION_REPORT.md`](VALIDATION_REPORT.md) for current evidence and limits.
The unvalidated implementation described below is the original feature baseline.
Cloud deployment remains pending server details and SSH credentials.

## 1. Purpose / current status

The user asked for a playable, huxx.me-inspired **white-model (白模)** for an interactive personal Landing Page. It should prioritize reproducible interactions and architecture rather than final illustrations, branding and content.

Code is in **https://github.com/AbedLir/LandingPage**, branch `feat/interactive-wireframe-v1`, PR **https://github.com/AbedLir/LandingPage/pull/1**. The PR is open and main does not yet contain the actual site. This was created in a prior chat by GitHub tool writes. The site has **not** been built or browser-tested in a normal Node environment yet.

IMPORTANT: This document is handoff state, not proof of quality, successful build, server access, or deployment.

## 2. Implemented modules

| Module | Behavior |
| --- | --- |
| Header | Navigation, XP/level progress, theme switching |
| Hero | Canvas Pong playable via W/S; AI opponent; points, particles |
| About | Large typography and editable profile/avatar placeholder |
| Work | Three placeholder case-study cards with hover animation |
| Experience | Expandable accordion-style entries |
| Lab | Canvas Brick Breaker playable via A/D; scores and level progression |
| Contact | Placeholder email link (MUST replace before publication) |
| Motion | IntersectionObserver scroll-reveal, stagger delays, CSS transitions |
| State | localStorage XP and theme index; game progression triggers theme change |
| Layout | Mobile/tablet/desktop CSS breakpoints, reduced-motion styles |

Files:
- `src/pages/index.astro`: Astro markup and page sections
- `src/styles/global.css`: page styles, tokens, animation and media queries
- `src/scripts/site.ts`: theme, XP, both game loops, keyboard/touch, scroll reveal
- `astro.config.mjs`: Astro + Tailwind Vite integration
- `package.json`: npm entrypoints

No backend, secrets, database, uploaded assets or image-generation dependencies are needed.

## 3. First task inside GPT Work's VM: validate and repair

Use a recent supported Node LTS compatible with Astro 6 (Node 22.12+ minimum). Run:

```bash
git clone https://github.com/AbedLir/LandingPage.git
cd LandingPage
git checkout feat/interactive-wireframe-v1
node --version
npm install
npm run build
npm run check
npm run preview -- --host 127.0.0.1
```

Open the preview in a browser. If npm/build/check fail, fix the relevant source. There is currently no package-lock committed, so `npm ci` should not be used until a lockfile is generated and checked in.

Smoke-test:
- `/` loads without blank screen, uncaught JS or horizontal overflow on desktop/mobile.
- W/S pong paddle, play/pause, points, game input focus, and touch play.
- A/D breakout paddle, collision, blocks, reset, win and touch play.
- Header XP increments without strange resets; theme changes and persists on reload.
- Card reveal, hover, accordion and anchor navigation.
- `prefers-reduced-motion: reduce` remains legible.
- Inspect Console / Network and mobile viewport.
- Avoid relying on `npm run dev` for production performance.

Known candidate engineering improvements:
- `fit(canvas)` in `src/scripts/site.ts` currently assigns `canvas.width` and `canvas.height` on *every requestAnimationFrame*, causing costly context resets. Resize only when measured dimensions/DPR actually change.
- Both demos redraw continuously; consider pausing or throttling when their sections are offscreen or the tab is hidden.
- Touch input currently relies on pointer movement and should be carefully tested on mobile.
- Game physics currently use a capped variable `dt`; check collision robustness under frame drops/high refresh rates.
- Experience data/project links, personal info and contact mail are placeholders. Do not pretend they represent real achievements.

## 4. Cloud VM deployment (after validation)

Target: a static site at the root of the user's authorized domain or at the host's public IP. Ask for missing server attributes only when not supplied elsewhere in the Work conversation; do not guess IP, username, port or domain. Prefer a non-destructive staging path on any server hosting other sites.

Secure SSH:
- NEVER store an SSH private key in Git, project files, task output, shell history, PR or chat documentation.
- Use an approved ephemeral VM secret/key location with restrictive permissions; verify server host fingerprint.
- If a key was previously exposed over an insecure medium, recommend generating/rotating a fresh credential.

Recommended Ubuntu/Debian + Nginx example (adapt to the verified VM OS and existing config):

```bash
# After successful npm run build, upload the contents of dist/ to a new versioned directory.
# Suggested on-server folder: /var/www/landingpage/releases/<commit-sha>/
# Point /var/www/landingpage/current at the verified release with an atomic symlink.
# Configure the Nginx server block with:
# root /var/www/landingpage/current;
# index index.html;
# location / { try_files $uri $uri/ =404; }
# Validate Nginx config before reloading: sudo nginx -t
```

Prefer ordinary HTTPS certificates with automatic renewal when a domain resolves to the VM (e.g., Certbot or the VM's existing ingress solution). Do not disrupt unrelated Nginx vhosts. Ensure firewall and security-group rules permit the intended 80/443 traffic. If deploying solely to IP, explicitly disclose that a trusted public TLS certificate generally requires a proper DNS name or another supported issuance route.

Postdeploy:
1. Verify 200 OK via actual HTTP(S) request and inspect returned page.
2. Browser-check JS/CSS/canvas and both playable games on the deployed URL.
3. Capture commit SHA + URL + server path + service config used.
4. Keep the previous release for rollback; restore symlink and reload after `nginx -t` if needed.
5. Report final results and known limitations. Do **not** merge PR #1 without explicit review/approval from the user, unless the user separately authorizes that step.

## 5. Product direction after white-model acceptance

Keep the original huxx.me inspiration at the level of interaction patterns, not copyrighted art/source. Prioritize layout, motion, interaction quality and performance before branding. Replace placeholders with user-supplied content in later iterations. No need for Three.js/GSAP unless a design requirement demands them.

## 6. Copy-ready GPT Work instruction

> Use my connected GitHub repository `AbedLir/LandingPage`. Read `AGENTS.md` and `docs/DEPLOYMENT_HANDOFF.md` from `feat/interactive-wireframe-v1`. First install and validate the Astro site in your VM, repair build/browser issues, then deploy its `dist/` static output to the cloud VM I authorize. Handle SSH credentials securely, do not expose them in code or logs, and verify the public URL with a real browser. Keep PR #1 unmerged until I approve it. Report commit, URL, tests and rollback plan.
