# AGENTS.md

## Project Priorities
- SillyBunny is a derivative fork of [SillyTavern](https://github.com/SillyTavern/SillyTavern), not a replacement. Sustainability to upstream is critical: keep SillyBunny's general code compatibility as close to upstream as possible.
- Backwards compatibility with SillyTavern is a key design goal of the project. A user should be able to open SillyBunny, import their pre-existing SillyTavern settings, and feel right at home with SillyTavern's pre-existing featureset.
- Follow KISS (keep it simple, stupid). A solution to a problem should not have any excess overreach. Always prefer a simple, modular approach to a problem or feature, using smaller PRs to address each individual problem.
- Changes to upstream should be self-contained in their own files where possible. With the exception of UI modifications, try to minimise actual changes to base SillyTavern code.
- If modifying base SillyTavern files, leave clear inline comments indicating where and why SillyBunny code diverges from upstream. This aids maintainers during future upstream merge conflict resolutions.
- Reuse existing metadata/state formats where possible instead of inventing new persistent structures.
- While Bun is the default runtime, Node.js backwards compatibility is required. Do not use Bun-exclusive APIs (such as Bun.file() or Bun.serve()) unless a standard Node.js fallback is included. Test all structural changes in both runtime environments.
- Keep fork-specific feature additions and upstream synchronization merges in separate pull requests. Mixing upstream code updates with SillyBunny feature logic complicates the review process.
- Make sure new features work elegantly with parity on both mobile and desktop environments.

## Commands
- Install root deps for CI parity: `npm ci --ignore-scripts`.
- Install test deps: `npm ci --ignore-scripts --prefix tests`.
- Start with Bun: `bun run start` or `bun server.js`; default port is `4444`.
- Start with Node compatibility path: `npm run start:node`.
- Other useful launch variants: `bun run start:mobile`, `bun run start:global`, `bun run start:no-csrf`.
- User launchers (`./start.sh`, `Start.command`, `Start.bat`) auto-install/update; `start.sh` may choose Node on Termux, macOS, or ARM unless forced with `SILLYBUNNY_USE_BUN=1` or `SILLYBUNNY_TERMUX_RUNTIME=bun`.
- Lint app code: `npm run lint`.
- Lint tests: `npm run lint --prefix tests`.
- Run unit tests: `npm run test:unit --prefix tests`.
- Run one Jest file: `npm run test:unit --prefix tests -- path/to/file.test.js`.
- Run e2e tests: `npm run test:e2e --prefix tests`; Playwright config expects a server already running at `http://127.0.0.1:4444`.
- Check frontend startup budgets: `npm run check:frontend-budgets`.
- Build hashed frontend assets into `dist/frontend`: `npm run build:frontend`.

## CI Expectations
- PR CI uses Node.js 24, not Bun, for lint, unit tests, and frontend budget checks.
- CI blocks tracked files under `data/default-user/**`; do not commit local/default user state.
- For structural runtime changes, verify both `bun run start` and `npm run start:node` when feasible.

## Architecture Notes
- `server.js` is the real entrypoint. It parses CLI args, sets `globalThis.DATA_ROOT` and `globalThis.COMMAND_LINE_ARGS`, changes to the server directory, then imports `src/server-main.js`.
- `src/server-main.js` wires Express middleware, security, user storage, plugins, and server startup.
- API route registration lives in `src/server-startup.js`; add private routers there instead of only creating an endpoint file.
- Browser code is mostly under `public/`; `public/script.js` is a large app entrypoint, and SillyBunny shell UI code is concentrated in files such as `public/scripts/sillybunny-tabs.js`.
- In-chat agents span server storage at `src/endpoints/in-chat-agents.js` and frontend runtime/store files under `public/scripts/extensions/in-chat-agents/`.
- `config.yaml` is the active local config; `default/config.yaml` is the documented template/default source.
- Config environment overrides still use the upstream `SILLYTAVERN_` prefix via `keyToEnv()`, for example `SILLYTAVERN_DATAROOT`.
- `public/lib.js` is served through `src/middleware/webpack-serve.js` and `webpack.config.js`; Bun intentionally uses a non-minified vendor bundle signature there.
- User data defaults to `./data`; avoid committing runtime state, caches, backups, or generated user content.

## Style And Tooling
- The repo is ESM (`"type": "module"`) with checked JavaScript via `jsconfig.json`; keep imports/exports ESM unless an existing CJS config file requires otherwise.
- Formatting enforced by ESLint/editorconfig: 4-space indents, single quotes, semicolons, trailing commas on multiline literals, LF endings.
- Root ESLint covers `src/**/*.js`, `public/**/*.js`, `scripts/**/*.js`, and root `*.js`, but ignores vendored/generated areas including `public/lib/**`, `public/scripts/extensions/quick-image-gen/**`, `public/scripts/extensions/third-party/**`, `data/**`, `cache/**`, and `dist/**`.
- Tests have a separate package and ESLint config under `tests/`; install and run them with `--prefix tests`.

## Risk Hotspots
- Before changing mobile shell, cache/update, in-chat agents, Pathfinder, bundled defaults, or git/admin update flows, skim `lessons.md` for the history-derived failure modes.
- Treat `public/scripts/sillybunny-tabs.js` as shared shell runtime: verify drawer/tab/preset/chat-scroll behavior after touching it.
- In-chat agent bugs usually sit at lifecycle edges: generation start/end, mobile delayed events, swipe/regenerate/delete, manual queues, and active-chat changes.
- Cache/performance changes should name the lifecycle they affect: fresh install, restart after update, stale assets, iOS/mobile cache, webpack vendor bundle, or Node/Bun startup.
- If starting a temporary dev/debug server, record its PID/port and shut it down before ending the task.

## Release / PR Conventions
- Target normal PRs at `staging`. Only docs, GitHub Actions, or critical hotfixes should target `release`.
- PR titles should use these prefixes: `fix`, `chore`, `feat`, `sync`, or `docs`.
- Normal releases must update all user-facing/hardcoded SillyBunny version references, including `package.json`, `public/script.js` UI version, and `public/script.js` Horde `CLIENT_VERSION`.
- After updating the root `README.md` changelog for a release, sync `.github/readme.md` with `bash scripts/sync-readme-mirror.sh`; do not edit the mirror by hand.
- Hotfixes skip version bumps, README/changelog release work, and Discord post copy; include only a short bulleted hotfix list.
