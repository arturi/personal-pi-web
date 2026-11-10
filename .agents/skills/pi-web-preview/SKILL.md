---
name: pi-web-preview
description: Generate and troubleshoot isolated PI WEB frontend screenshots or preview environments without touching the live session daemon. Use when asked for UI screenshots, responsive visual review, a temporary frontend URL, or reusable Chromium preview tooling in this repository.
compatibility: PI WEB source checkout with dependencies installed; Chromium plus fontconfig/fonts locally, or Docker with a same-base preview image.
---

# PI WEB preview

Use PI WEB's existing isolated screenshot harness rather than pointing development code at the live daemon. Use the global `browser-tools` skill for arbitrary URLs, browser interaction, cookie/profile authentication, and configurable one-off captures; keep this skill responsible for PI WEB's seeded runtime and lifecycle.

## Safety contract

- Never restart, stop, or reuse the session daemon hosting the current agent session.
- Never launch a second PI WEB instance with inherited `PI_WEB_*` state. Give it unique data/config/session directories, socket, and ports.
- Prefer `scripts/capture-screenshots.mjs`: it creates temporary state, chooses free ports, seeds a deterministic project/session, starts sessiond + API + Vite, captures through CDP, and cleans up.
- The harness serves the current working tree, so uncommitted frontend changes are included. Its cloned demo project is only screenshot content.
- Obtain approval before Docker image pulls/builds, published preview ports, host changes, or deployment changes.
- Keep generated previews outside tracked source unless the user explicitly wants documentation assets updated.

## Browser layer

When `browser-tools` is available, use it for ad-hoc URL capture and DOM automation. Its browser sidecar is isolated by `PI_SESSION_ID`, exposes an unadvertised random CDP port only on the private Docker network, mounts no PI WEB data/projects/credentials/Docker socket, and requires explicit consent flags for copied profiles or injected cookies. Always stop it after use. Do not give it PI WEB's live daemon socket or data directory. Private/local development URLs additionally require explicit approval and `--allow-private`.

The repository's deterministic three-viewport script currently owns its own Chromium process. Prefer adding supported script options or extracting a shared browser launcher over making either skill reach into the other's private state.

## Fast path: compatible local Chromium

Confirm dependencies and browser support:

```bash
npm ci                                  # only when dependencies are absent
command -v chromium chromium-browser google-chrome
```

Chromium needs a usable font stack. In the openSUSE image, install/bake these together:

```text
chromium fontconfig dejavu-fonts
```

Then capture:

```bash
CHROME_BIN=/usr/bin/chromium \
  node scripts/capture-screenshots.mjs \
  --output-dir /absolute/output/directory
```

The harness writes desktop, tablet, and mobile PNGs and terminates its child processes.

## Container path

Use a preview image derived from the same `pi-web:local` openSUSE image as the repository dependencies. Bake Chromium and fonts into that image once; do not reinstall them for every screenshot.

Recommended preview-image shape:

```dockerfile
FROM pi-web:local
USER root
RUN zypper --non-interactive install chromium fontconfig dejavu-fonts \
 && zypper clean --all
ENV CHROME_BIN=/usr/bin/chromium
USER 1001:1001
```

Run with the source and output mounted, an ephemeral container, and no live PI WEB data mount. Keep `--ipc=host` or an adequate shared-memory allocation for Chromium. Do not publish ports for screenshot-only runs.

Do not mount this checkout's `node_modules` into an unrelated Ubuntu/Playwright image. `node-pty` is a native dependency: Node ABI and glibc mismatches cause startup failures. A same-base image avoids that class of failure.

## Existing harness limitation

The current desktop capture opens a seeded file preview. If that deterministic selection times out, inspect with `--keep-temp` once and read `logs/chromium.log`, `logs/vite.log`, `logs/api.log`, and `logs/sessiond.log`; do not repeat blind container installs.

For a theme/layout-only preview, add a supported harness option to skip file selection and optionally emulate `prefers-color-scheme` rather than maintaining an out-of-tree patch. Until that option exists, clearly report any temporary capture-only modification and leave repository source unchanged.

## Temporary URL

The screenshot harness already contains the reusable isolated runtime setup, but currently owns its lifecycle internally. For a browser URL, extract that setup into one shared preview-runtime module used by both screenshot capture and a foreground `preview:isolated` command. Requirements:

- random or explicitly isolated API/client ports;
- unique temporary data, agent, session, config, project-store, and socket paths;
- loopback binding by default;
- printed URL and cleanup instructions;
- signal-safe shutdown of Vite, API, and sessiond;
- no port publication, reverse-proxy, or Tailscale change without approval.

Do not duplicate the environment construction in a second script.

## Troubleshooting order

1. Confirm Chrome starts and its CDP `/json/version` endpoint responds.
2. Check fonts if Chromium exits with Skia/font-manager or HarfBuzz errors.
3. Check Node version, glibc, and `node-pty` if sessiond exits before creating its socket.
4. Check the Vite log for a read-only `node_modules/.vite-temp`; Vite needs writable cache space.
5. Check seeded project/session restoration before debugging screenshot selectors.
6. Disable core dumps for experimental runs when possible; if crashes create large dumps, ask before deleting them unless cleanup was explicitly authorized.

## Completion report

Report:

- exact screenshot paths or preview URL;
- viewport sizes and color scheme;
- whether the current working tree or a commit was rendered;
- whether the run used isolated state;
- child/container cleanup status;
- any browser image/package pulled or retained;
- failures and workarounds without claiming the standard harness passed.
