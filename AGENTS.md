# AGENTS.md — LandingPage Agent Handoff

## Project identity
- Repository: https://github.com/AbedLir/LandingPage
- Current implementation branch: `feat/interactive-wireframe-v1`
- Review PR: https://github.com/AbedLir/LandingPage/pull/1 (open, not merged as of 2026-10-20)
- Objective: turn the interactive Landing Page **wireframe** into a verified static website, then deploy it to the user's own cloud VM when the user supplies/authorizes the server details.
- Reference for interaction patterns: https://huxx.me/zh/ (inspiration only). This repository's layout and code are original; do not copy third-party art, branding or source.

## Current technology
- Astro 6, TypeScript, Tailwind CSS v4 via Vite.
- Native CSS transitions and IntersectionObserver for reveal animations.
- Pure Canvas 2D Pong and Breakout mini-games.
- Theme changes, XP and levels use in-browser state/localStorage.
- Static build: `dist/`; no API, database, or server-side runtime required.

## Source of truth
- Main page: `src/pages/index.astro`
- Styling: `src/styles/global.css`
- Games/state/reveal: `src/scripts/site.ts`
- Build commands: `package.json`
- Deployment and acceptance checklist: `docs/DEPLOYMENT_HANDOFF.md`

## Status / constraints
- The prototype is committed to the feature branch; main only contains the initialization README.
- The prototype has **NOT** passed a real npm build, typecheck or browser test. Do not imply it is production-ready.
- All biographical text, projects, dates, stats, email address, and branding are placeholders.
- Do not merge into main until build, mobile checks, keyboard/touch gameplay and interaction smoke tests pass.
- The existing games use `canvas.width/height` assignment on each animation frame in `fit()`; avoid this resizing/performance overhead before going live (cache dimensions and resize on size/DPR changes).
- Look for proper animation pause on hidden/offscreen tabs and event cleanup.
- If adding a base path (e.g. GitHub Pages project subpath), update Astro config and links; preferred production deployment is served at the domain root.

## Security / secret handling
- Never commit, paste, print or summarize any SSH private key, passphrase, password, token or .env secret in repository, logs, PR, or documentation.
- If an SSH private key has been exposed in conversation or an otherwise insecure channel, arrange replacement/rotation before using it in production.
- Use a secure temporary key mechanism in the VM and restrict file permissions; validate server host key (do not disable host-key checking).
- Confirm actual host, login user, SSH port, domain, DNS and OS from the user's provided cloud information. Do not guess any of them.
- Limit cloud access changes; avoid destructive server actions and preserve existing sites. Deploy only after user authorizes the target server.

## Work mode objective
1. Read `docs/DEPLOYMENT_HANDOFF.md`.
2. Checkout the feature branch, install deps, run `npm run build` and `npm run check`; fix errors on a new branch/PR as needed.
3. Open a browser and verify layout, games, responsiveness, storage, reduced-motion behavior.
4. Produce a static deployment of the build output on the authorized cloud VM, with HTTPS when a domain is available.
5. Report exact deployed URL, tested commit, verification results and rollback plan. Do not claim a deployment unless verified through a real HTTP request.
