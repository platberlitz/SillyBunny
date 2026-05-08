# SillyBunny Lessons

Authored by: TLD / Codex

This file is intentionally separate from the existing documentation set so it can be wired in later without disturbing Geechan-authored docs, the release changelog, or the README mirror flow.

## Scope

Source reviewed: `origin/staging` at `612b0a4bf` (`fix(settings): stabilize presets and chat loading`, 2026-05-08).

History shape:

- `656` commits on the active SillyBunny staging branch.
- First fork commit is `2e0412466` (`Initial main history`, 2026-04-04), which imports the upstream baseline.
- The branch then concentrates into April-May 2026 fork work: mobile shell, chat scrolling, in-chat agents, Pathfinder, startup/update flows, bundled presets, release notes, and performance/cache hardening.
- Commit types are dominated by fixes: `355` fix commits, `69` feature commits, `61` docs commits, `24` chore commits, `24` sync commits, `15` merge commits, `12` reverts, and a small number of performance/refactor/style commits.
- Hotspots by changed top-level path are `public/`, `default/`, `src/`, `.github/`, `README.md`, `changelog.md`, and `tests/`.

## Lessons From The History

### 1. Mobile shell work needs executable guardrails

The commit stream repeatedly returns to mobile drawers, safe areas, bottom bars, touch handling, iOS Safari scroll behavior, and chat anchoring. Examples include `f09404863`, `eba50c8f8`, `bd28f519c`, `bcd7c76a1`, `78e983f1f`, and `a4eb1383f`.

Lesson: mobile layout and scroll behavior are not one-off CSS fixes in this project. They need a small set of repeatable checks that exercise:

- iOS visual viewport changes.
- Send/regenerate streaming.
- Scrolling up through prior messages.
- Drawer open/close/reparenting.
- Composer and persona bar sizing at narrow widths.

Agent optimization: add a future lightweight Playwright mobile smoke pack that captures DOM state and screenshots for these flows before merging shell changes.

### 2. The shell script is a critical subsystem, not glue

`public/scripts/sillybunny-tabs.js` appears across a large fraction of fork commits. It coordinates mobile shell behavior, settings surfaces, preset controls, character drawers, workspace tabs, cache tools, and icon handling.

Lesson: this file is doing product orchestration. Treat changes to it like changes to a shared runtime module:

- Prefer narrow functions with clear ownership.
- Avoid coupling visual movement, persisted settings, and data loading in the same patch.
- Require a manual or automated before/after check when touching drawer, tab, preset, or chat-scroll code.

Agent optimization: keep a local "shell change checklist" in a future wired document or lint message so Codex knows which flows to verify when this file changes.

### 3. Reverts show where risk concentrates

The history includes reverts around optimization (`0ecfa44e3`), actor/cast retrieval (`fec2e881e`), icon sizing (`c57d9453a`), chat bar tools (`3cecab4a4`, `4f7873280`), mobile gutters (`1c9bb6489`), streaming render behavior (`974eb08fa`), Moonlit Echoes migration (`12c9e2150`), and cache/lorebook controls (`347f07d2e`).

Lesson: the riskiest changes are the ones that alter timing, inherited upstream UI assumptions, streaming rendering, or feature placement in heavily customized mobile chrome.

Agent optimization: when Codex proposes broad optimization, migration, or UI relocation work, require it to identify the fallback path before editing and to test the exact behavior it is replacing.

### 4. Upstream syncs are product events

The May 4-5 sync sequence (`325eacc30`, `a926f04ae`, `7b6db61d1`, `2d9c49e04`, `f1f61371f`, `02bc8c38e`, `b71935caa`) shows that SillyTavern 1.18 alignment was not a trivial merge. It touched runtime initialization, security/runtime hardening, dependency locks, compatibility, and follow-up behavior fixes.

Lesson: upstream syncs should be handled as staged migrations, not background chores.

Agent optimization: future sync work should have an explicit compatibility checklist:

- Startup under Bun and Node.
- Runtime initialization.
- Auth and static asset loading.
- Extension compatibility.
- Dependency lock consistency.
- Fork-specific shell behavior.

### 5. Caching fixes need lifecycle thinking

Cache-related commits recur: frontend asset bumps, safe app-shell cache bumps, cookie clearing, startup cache stabilization, webpack cache lifecycle hardening, and deferred frontend assets (`b4056863e`, `dd2c7f6a4`, `294040c85`, `b83840677`, `6710d918a`, `1dea1c6ff`, `42b131ef1`, `8bae327a8`).

Lesson: cache fixes are easy to make locally and hard to prove across user installs. Every cache change should state which lifecycle it affects: first install, update, restart, hard refresh, service/static asset cache, webpack vendor bundle, or iOS stale assets.

Agent optimization: encode cache lifecycle terms in PR descriptions and future test names so agents stop treating "clear cache" as a single behavior.

### 6. Bundled defaults are user-facing product code

Many commits touch bundled presets, default configuration, prompt formats, starter packs, Pathfinder details, and tracker templates. Fixes such as `537af319f`, `f9ae55575`, `23c0ca468`, `23cf7926b`, and `003cf32d` show bundled defaults are part of the runtime experience.

Lesson: changing bundled presets or defaults must be reviewed like product behavior, not like static content.

Agent optimization: future agents should compare generated default files before and after changes and call out migration impact for existing users.

### 7. In-chat agents need state-machine discipline

The agents history repeatedly fixes post-generation timing, mobile fallbacks, regex application, swipe delete state, duplicate tags, manual queues, active chat separation, prompt pass handling, and bundled tracker behavior.

Lesson: in-chat agents are stateful workflows layered on top of streaming generation. Bugs tend to come from ambiguous lifecycle edges: generation start, generation end, swipe/regenerate, delete, mobile delayed events, and active-chat changes.

Agent optimization: model these workflows as explicit states in future work. Even if implementation remains lightweight, tests and review notes should name the state transition being protected.

### 8. Pathfinder should fail open and explain itself

Pathfinder commits include retrieval runtime restoration, log readability, detail modes, slow-retrieval fail-open behavior, token budget changes, memory summary controls, bundled reset tightening, and waiting for retrieval before generation.

Lesson: retrieval features must be debuggable from the UI and should avoid blocking core chat when retrieval is slow or uncertain.

Agent optimization: future Pathfinder changes should preserve three invariants:

- Chat generation remains usable when retrieval fails.
- Logs show enough detail to distinguish "not found", "slow", and "not run".
- Settings changes persist and are visible on mobile.

### 9. Performance work needs budgets, not vibes

Performance commits later added asset deferral, frontend icon loading optimization, startup cache stabilization, webpack cache lifecycle hardening, and budget asset checks. The earlier optimization revert shows that performance work can regress behavior when it is not tied to concrete budgets.

Lesson: optimize only against named startup/render budgets and protect them with checks. Avoid "cleanup" patches that also change ordering, asset availability, or UI behavior.

Agent optimization: future agent runs should report the before/after asset or timing metric they are improving, even if the metric is approximate.

### 10. Release notes have been used as operational memory

There are many changelog and README commits around v1.4.x and v1.5.x. They track fixes, screenshots, compatibility notes, and feature consolidation. Geechan-authored documentation cleanup also removed LLMisms and tightened wording.

Lesson: release notes are doing more than announcing releases; they preserve operational memory. That makes them valuable, but also easy to pollute with implementation chatter.

Agent optimization: keep generated lesson/analysis artifacts separate until intentionally curated. Do not silently wire agent notes into user-facing docs.

### 11. Worktrees are now part of the development model

Commits like `65301e269` and the local workspace policy show runtime and contribution worktrees are an active concern. Admin update flows must support git worktrees, and the main runtime checkout should stay stable.

Lesson: any tool that shells out to git must account for worktrees, detached runtime branches, and user update paths.

Agent optimization: when touching admin/update code, test or inspect behavior from both normal clones and worktrees.

### 12. Small, repeatable fixes beat large heroic patches

The history shows many narrow follow-ups: align one control, restore one scroll behavior, harden one cache edge, recover one mobile event, tighten one preset flow. This is noisy, but it kept the fork moving through a large surface area quickly.

Lesson: SillyBunny benefits from incremental patches, provided each patch records what behavior it protects and how it was checked.

Agent optimization: prefer short-lived branches and targeted reviews, but compensate with mechanical checks and concise context artifacts so the same class of bug does not keep returning.

## Suggested Agent-First Optimizations

These are intentionally not wired into existing docs yet.

### A. Add a future shell smoke checklist

Trigger it whenever `public/scripts/sillybunny-tabs.js`, mobile CSS, or chat rendering code changes.

Minimum checks:

- Desktop startup reaches chat UI.
- Mobile viewport opens and closes Characters, Settings, Presets, and Workspace.
- Send action keeps the chat bottom anchored.
- Scrolling upward through existing messages does not jump.
- Regenerate/streaming does not lose the user position.
- Preset/model controls remain searchable and persist selection.

### B. Add a future cache lifecycle checklist

Trigger it whenever startup, webpack, static asset, frontend icon, service/static cache, or update code changes.

Minimum checks:

- Fresh install.
- Restart after update.
- Existing config with stale assets.
- iOS/mobile stale asset path.
- Node and Bun startup paths where practical.

### C. Add a future in-chat agent lifecycle matrix

Track these transitions in tests or review notes:

- Manual run queued while generation is active.
- Automatic post-generation run.
- Swipe/regenerate.
- Delete active swipe.
- Mobile delayed generation-end event.
- Switching active chat while an agent flow is pending.

### D. Add future history-aware review prompts

For Codex PR review, prompt agents to inspect recent commits touching the same files and to answer:

- Has this file recently required reverts?
- Is this touching mobile shell, streaming, cache, update, bundled defaults, or Pathfinder?
- Which historical lesson applies?
- What exact verification closes the loop?

### E. Keep AGENTS.md as a map, not a manual

The current project instructions already point agents toward runtime, verification, architecture, config gotchas, fork context, and PR/release rules. That matches the harness guidance: small entry point, progressive disclosure, and enforceable checks.

Future optimization should add deeper, linked artifacts only when they can stay short, owned, and mechanically useful.

## Commit History Clusters

### 2026-04-04 to 2026-04-05: bootstrap and first mobile stabilization

Key commits: `2e0412466`, `913265cdb`, `9f2c8e666`, `ddd63f3c5`, `161a35a15`, `4414cf8b0`, `9bce279d3`, `f4d92ba4e`, `0ecfa44e3`.

Takeaway: the fork quickly moved from imported history to startup self-update, mobile UI repair, preset drawer fixes, Select2/mobile search, Moonlit Echoes compatibility, and an early optimization revert. Early instability came from mixing layout, dependency behavior, and optimization before guardrails existed.

### 2026-04-06 to 2026-04-17: feature expansion and agent foundations

Key themes: Android launchers, all-talk/settings controls, CSS snippets, dynamic model dropdowns, in-chat agent overhaul, prompt transform history, undo/redo, Safari spacing, and release format work.

Takeaway: fast feature expansion created the first durable need for agent-legible structure. Any future prompt/agent feature should make state and history explicit enough to test.

### 2026-04-21 to 2026-04-23: shell, theme, docs, screenshot, and Pathfinder polish

Key commits: `e62ab05ef`, `8e31bf318`, `08a54c37e`, `f5eb2f10b`, `b4194b82e`, `efe6beb07`, `d8b371b9e`, `52ef0454d`, `898a34968`.

Takeaway: product polish and documentation quality improved together, but the blank-screen fix and Pathfinder regressions show that UI polish needs runtime checks, not just visual inspection.

### 2026-04-24 to 2026-04-26: cast/groups/Pathfinder and mobile agent hardening

Key commits: `3c5cbb4f8`, `d82aa5a5b`, `05586bf81`, `24944ad98`, `fec2e881e`, `c526418a4`, `79989f949`, `deaea2561`, `031155793`, `a1efe21ad`, `e7e423362`, `23c0ca468`.

Takeaway: actor/group/Pathfinder behavior is powerful but tightly coupled to generation flow, retrieval, and mobile timing. Use state diagrams or transition lists before changing it again.

### 2026-04-29 to 2026-05-03: release polish, chat anchoring, iOS, cache, and reverts

Key commits: `887be362a`, `fd6a690d6`, `c6f8903c9`, `eeec4122d`, `974eb08fa`, `1c9bb6489`, `bdbaef84c`, `e25b4132a`, `eba50c8f8`, `705468302`, `347f07d2e`.

Takeaway: this period shows the highest concentration of "fix the fix" work. Streaming, scroll anchoring, cache busting, and bottom-bar tools should be handled with explicit repro steps.

### 2026-05-04 to 2026-05-05: upstream 1.18 sync and performance work

Key commits: `325eacc30`, `7b6db61d1`, `2d9c49e04`, `02bc8c38e`, `b71935caa`, `98affc781`, `1dea1c6ff`, `42b131ef1`, `8bae327a8`.

Takeaway: sync and performance work both cross subsystem boundaries. They need a broader verification pass than visual UI fixes.

### 2026-05-06 to 2026-05-08: Codex worktree support and latest mobile/settings stabilization

Key commits: `65301e269`, `4c2e410f8`, `78e983f1f`, `9e2eebc7d`, `99d6bef7c`, `8fbc93e6b`, `a4eb1383f`, `612b0a4bf`.

Takeaway: the current direction is toward agent-friendly worktrees, mobile shell reliability, Pathfinder timing fixes, and preset/chat loading stability. These are the right seams to protect with future checks.

## Operating Principles Going Forward

- Preserve the runtime checkout. Use contribution worktrees for PR work.
- Treat mobile shell behavior as a product surface with tests, not a CSS afterthought.
- Treat bundled defaults as versioned product behavior.
- Treat upstream syncs as migrations with compatibility acceptance criteria.
- Treat cache and performance work as lifecycle-specific work.
- Keep docs clean by separating raw agent analysis from curated user-facing text.
- Prefer short, scoped patches, but make each patch carry its verification proof.
