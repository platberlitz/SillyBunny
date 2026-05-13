# Agent Notes

## Runtime And Installs
- The app is Bun-first for direct dev runs (`packageManager: bun@1.3.11`, `bun run start`), but PR CI installs with Node 24 and `npm ci --ignore-scripts`; keep both `bun.lock` and `package-lock.json` implications in mind.
- Node.js compatibility is required even though Bun is default; do not use Bun-only APIs unless a standard Node fallback is included, and test structural runtime changes under both runtimes.
- Root deps and test deps are separate: run `npm ci --ignore-scripts` at repo root and `npm ci --ignore-scripts --prefix tests` before matching CI tests.
- Launchers (`./start.sh`, `Start.command`, `Start.bat`) auto-install/update for users; for direct dev runs prefer `bun run start`, `bun run start:mobile`, `bun run start:global`, or `bun run start:no-csrf`.
- `start.sh` may choose Node on Termux, macOS, or ARM when Node is available to avoid Bun platform issues; force Bun with `SILLYBUNNY_USE_BUN=1 bash start.sh` or `SILLYBUNNY_TERMUX_RUNTIME=bun bash start.sh` on Termux.

## Verification
- Root lint: `npm run lint` or `bun run lint` checks `src/**/*.js`, `public/**/*.js`, `scripts/**/*.js`, and root `*.js` with 4-space indent, single quotes, semicolons, and trailing commas on multiline literals.
- Tests are in the nested `tests` package, not the root package: `npm run test:unit --prefix tests` matches CI.
- Run one Jest file with `npm run test:unit --prefix tests -- tests/<file>.test.js`.
- PR CI also runs `npm run check:frontend-budgets`; run it when changing `public/index.html`, startup assets, large extension assets, or performance-related frontend loading.
- E2E tests use Playwright against `http://127.0.0.1:4444`; start the app separately before `npm run test:e2e --prefix tests`.
- `tests/playwright.config.js` matches root-level `tests/*.e2e.js` and explicitly includes `frontend-performance.e2e.js`; pass a file explicitly for anything outside that match.

## Architecture
- `server.js` parses CLI/config, sets `globalThis.DATA_ROOT` and `globalThis.COMMAND_LINE_ARGS`, changes cwd to the server directory, then imports `src/server-main.js`.
- `src/server-main.js` wires Express middleware, static assets, auth, startup maintenance, and calls `setupPrivateEndpoints(app)`.
- API route registration is centralized in `src/server-startup.js`; endpoint implementations live under `src/endpoints/`.
- Browser code is plain ES modules under `public/`; the large frontend entrypoint is `public/script.js`. SillyBunny shell UI logic is concentrated in `public/scripts/sillybunny-tabs.js`.
- `public/lib.js` is served through `src/middleware/webpack-serve.js` / `webpack.config.js`; Bun runtime intentionally disables Webpack minification for that vendor bundle.

## Config And Data Gotchas
- Checked-in default config is `default/config.yaml`; startup creates or mutates the generated root runtime config by adding missing keys and migrating old keys.
- Config env vars use the upstream `SILLYTAVERN_` prefix via `keyToEnv()` (for example `SILLYTAVERN_DATAROOT`), despite this fork being named SillyBunny.
- Do not commit tracked files under `data/default-user/**`; PR CI has a dedicated blocker for that path.
- Default local port is `4444`; Docker uses `docker compose -f docker/docker-compose.yml up --build` and mounts config/data/plugins/extensions under `docker/`.

## Fork Context
- This is a SillyTavern fork that tries to stay close to upstream; keep changes small, modular, and self-contained so upstream syncs stay manageable.
- If modifying base SillyTavern files, add clear inline comments where SillyBunny intentionally diverges from upstream; avoid new persistent metadata/state formats when an existing one fits.
- New UI/features should work cleanly on both mobile and desktop, matching the README goal of a simple default shell with hidden advanced complexity.
- In-chat agents are a fork feature with backend routes in `src/endpoints/in-chat-agents.js` and related tests in `tests/in-chat-agents-*.test.js`.

## PR And Release Notes
- PRs normally target `staging`; `release` is only for docs, GitHub Actions, or critical hotfixes that must also be backported to `staging`.
- Keep `D:/AIStuff/SillyBunny` on `staging` as the runtime/update checkout; do not switch it to Codex feature branches unless the user explicitly asks.
- For Codex PR work in this workspace, create or reuse separate worktrees under `D:/AIStuff/SillyBunny Contribution/` and open PRs from those worktree branches.
- Use CONTRIBUTING.md PR title prefixes (`fix`, `chore`, `feat`, `sync`, `docs`) when drafting PRs.
- For normal releases, update user-facing version strings and the root README changelog, then run `bash scripts/sync-readme-mirror.sh`; hotfixes skip version/changelog/Discord-release-copy work.
- Before planning or editing, read `lessons.md` and apply its history-derived guardrails; do not repeat known SillyBunny mistakes.
- If you start a temporary dev/debug server, record its PID/port and shut it down before ending the task.
