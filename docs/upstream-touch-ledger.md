# Upstream Touch Ledger

This ledger tracks intentional SillyBunny divergence in upstream-origin files. Its purpose is to keep fork behavior mechanically protected during upstream syncs.

## Rules
- Add or update an entry whenever an upstream-origin file is modified for SillyBunny behavior.
- Keep entries concise and test-backed.
- Do not use the ledger to justify broad inline fork logic. Prefer moving behavior behind a SillyBunny module and keeping upstream-origin files as thin adapters.
- If a seam absorbs the divergence later, update the entry rather than leaving stale notes.

## Entry Template
| Field | Value |
| --- | --- |
| File | `path/to/file.js` |
| Area | Chat lifecycle, mobile shell, preset/API sync, generation lifecycle, extension boot, settings, cache, or other named area. |
| Divergence reason | Why SillyBunny must differ from upstream here. |
| Target seam | The SillyBunny module that should own this behavior, or `none yet` if the seam still needs to be created. |
| Adapter shape | The smallest call or hook that should remain in the upstream-origin file. |
| Protecting tests | Unit/e2e/budget checks that fail if this divergence regresses. |
| Validation | Commands or manual checks used for the latest change. |
| Rollback path | How to revert safely if the divergence breaks upstream compatibility. |
| Last reviewed | Date, issue, PR, or upstream sync reference. |
| Owner | Person or role responsible for keeping the entry current. |

## Active Entries

### `public/script.js` - chat render lifecycle
| Field | Value |
| --- | --- |
| Area | Chat lifecycle. |
| Divergence reason | SillyBunny adds mobile batching, bottom pinning, manual-scroll suppression, long-chat anchoring, streaming DOM throttles, and issue `#167` scroll stability behavior. |
| Target seam | `public/scripts/chat-render-lifecycle/`. |
| Adapter shape | Keep exported compatibility functions in `public/script.js`; delegate bottom-scroll decisions, scheduling, scroll intent, anchor preservation, and update batching to the lifecycle module. |
| Protecting tests | `tests/chat-scroll-edges.test.js`, `tests/mobile-streaming.test.js`, `tests/chat-render-lifecycle-index.test.js`, `tests/chat-render-lifecycle-bottom-scroll.test.js`, `tests/chat-render-lifecycle-rollout-guard.test.js`, `tests/chat-render-lifecycle-anchor.test.js`, `tests/chat-render-lifecycle-scheduler.test.js`, `tests/chat-render-lifecycle-scroll-intent.test.js`, `tests/chat-send-scroll.e2e.js`, `tests/chat-scroll-regressions.e2e.js`, future lifecycle unit tests. |
| Validation | `npm run lint`, `npm run lint --prefix tests -- chat-render-lifecycle-bottom-scroll.test.js chat-render-lifecycle-index.test.js chat-render-lifecycle-rollout-guard.test.js chat-render-lifecycle-scroll-intent.test.js`, `npm run lint --prefix tests -- chat-render-lifecycle-rollout-guard.test.js chat-render-lifecycle-index.test.js`, `npm run lint --prefix tests -- chat-render-lifecycle-index.test.js chat-render-lifecycle-scroll-intent.test.js chat-render-lifecycle-scheduler.test.js chat-render-lifecycle-anchor.test.js`, `npm run test:unit --prefix tests -- chat-render-lifecycle-bottom-scroll.test.js chat-render-lifecycle-index.test.js chat-render-lifecycle-rollout-guard.test.js chat-render-lifecycle-scroll-intent.test.js`, `npm run test:unit --prefix tests -- chat-render-lifecycle-rollout-guard.test.js chat-render-lifecycle-index.test.js`, `npm run test:unit --prefix tests -- chat-render-lifecycle-index.test.js chat-render-lifecycle-scroll-intent.test.js chat-render-lifecycle-scheduler.test.js chat-render-lifecycle-anchor.test.js chat-scroll-edges.test.js mobile-streaming.test.js`, `npm run check:frontend-budgets`, prior focused e2e pack on this stack: `SILLYBUNNY_TEST_BASE_URL=http://127.0.0.1:4567 npm run test:e2e --prefix tests -- chat-scroll-regressions.e2e.js chat-send-scroll.e2e.js`. |
| Rollback path | Keep legacy behavior behind temporary rollout guard until lifecycle fixtures pass. |
| Last reviewed | 2026-05-27 scroll function seam. |
| Owner | Refactor integrator. |

### `public/script.js` - generation lifecycle
| Field | Value |
| --- | --- |
| Area | Generation lifecycle. |
| Divergence reason | SillyBunny generation flow needs explicit UI lock, stop, and unblock decisions while preserving provider calls, prompt assembly, token accounting, and persistence in the existing generation path. |
| Target seam | `public/scripts/generation-lifecycle/`. |
| Adapter shape | Keep exported generation functions in `public/script.js`; delegate send-button lock state, stop-generation request state, and unblock cleanup decisions to the lifecycle module. |
| Protecting tests | `tests/generation-lifecycle.test.js`, `tests/generation-lifecycle-wiring.test.js`, existing export-surface coverage. |
| Validation | `npm run test:unit --prefix tests -- generation-lifecycle.test.js generation-lifecycle-wiring.test.js`, `npm run lint --prefix tests -- generation-lifecycle.test.js generation-lifecycle-wiring.test.js`, `npm run lint`, `npm run check:frontend-budgets`. |
| Rollback path | Revert lifecycle calls in `public/script.js` while keeping existing provider and prompt paths intact. |
| Last reviewed | 2026-05-28 generation lifecycle wiring. |
| Owner | Refactor integrator. |

### `public/style.css` - message containment and scroll anchoring
| Field | Value |
| --- | --- |
| Area | Chat lifecycle and CSS containment. |
| Divergence reason | SillyBunny may need targeted containment or visibility handling to stabilize long-chat and macOS/mobile scroll behavior. |
| Target seam | `public/scripts/chat-render-lifecycle/` controls transition classes; CSS remains declarative. |
| Adapter shape | Prefer lifecycle state classes over permanent global `.mes` behavior changes. |
| Protecting tests | Future issue `#167` long-chat, swipe, media resize, and mobile stream fixtures. |
| Validation | No CSS behavior change until repro coverage exists. |
| Rollback path | Revert CSS class or containment rule independently from lifecycle module. |
| Last reviewed | 2026-05-26 refactor plan. |
| Owner | Refactor integrator and test lead. |

### `public/scripts/sillybunny-tabs.js` - shell chat controls
| Field | Value |
| --- | --- |
| Area | Mobile shell, chat navigation, and preset/API sync. |
| Divergence reason | SillyBunny shell owns top/bottom navigation, chat controls, drawers, mobile actions, and mirrored connection-profile controls that interact with chat and API state. |
| Target seam | `public/scripts/chat-render-lifecycle/` for chat scroll requests; `public/scripts/mobile-shell-lifecycle/` for drawer/nav/viewport behavior; `public/scripts/preset-api-sync-lifecycle/` for active API and connection-profile mirror decisions. |
| Adapter shape | Shell code keeps DOM wiring and requests lifecycle decisions for nav drag, page scroll, overlay open/close, auto-close, modal inert policy, active API connect-button lookup, and connection-profile mirror state. |
| Protecting tests | `tests/mobile-shell-lifecycle.test.js`, `tests/mobile-shell-lifecycle-wiring.test.js`, `tests/preset-api-sync-lifecycle.test.js`, `tests/preset-api-sync-lifecycle-wiring.test.js`, future shell smoke checks for drawer/tab/preset/chat-scroll behavior. |
| Validation | `npm run test:unit --prefix tests -- mobile-shell-lifecycle.test.js mobile-shell-lifecycle-wiring.test.js`, `npm run lint --prefix tests -- mobile-shell-lifecycle.test.js mobile-shell-lifecycle-wiring.test.js`, `npm run test:unit --prefix tests -- preset-api-sync-lifecycle.test.js preset-api-sync-lifecycle-wiring.test.js`, `npm run lint --prefix tests -- preset-api-sync-lifecycle.test.js preset-api-sync-lifecycle-wiring.test.js`, `npm run lint`, `npm run check:frontend-budgets`. |
| Rollback path | Keep shell calls narrow so a bad adapter route can be reverted without removing shell UI. |
| Last reviewed | 2026-05-28 preset/API sync lifecycle wiring. |
| Owner | Refactor integrator and mobile shell owner. |

### `public/scripts/mobile-streaming.js` - platform streaming policy
| Field | Value |
| --- | --- |
| Area | Mobile streaming. |
| Divergence reason | SillyBunny needs iOS WebKit conservative streaming and optional smooth-streaming bypass behavior. |
| Target seam | Keep this as platform policy consumed by `chat-render-lifecycle`; do not let it own DOM orchestration. |
| Adapter shape | Export pure policy helpers for effective smooth streaming, reduced DOM work, and update intervals. |
| Protecting tests | `tests/mobile-streaming.test.js`, future lifecycle streaming tests. |
| Validation | Existing unit tests plus future lifecycle checks. |
| Rollback path | Disable conservative policy flags while preserving base streaming path. |
| Last reviewed | 2026-05-26 refactor plan. |
| Owner | Refactor integrator. |

### `public/scripts/extensions.js` - extension boot lifecycle
| Field | Value |
| --- | --- |
| Area | Extension boot. |
| Divergence reason | SillyBunny extension boot needs duplicate manifest protection, deterministic activation ordering, dependency/module gating, disabled dependency handling, and client-version checks while preserving the existing extension runtime loading hooks. |
| Target seam | `public/scripts/extension-boot-lifecycle/`. |
| Adapter shape | Extension runtime keeps fetch/script/style/hook behavior and delegates manifest registration, dedupe keys, activation ordering, and activation eligibility decisions to the lifecycle module. |
| Protecting tests | `tests/extension-boot-lifecycle.test.js`, `tests/extension-boot-lifecycle-wiring.test.js`, `tests/extensions-disable.test.js`. |
| Validation | `npm run test:unit --prefix tests -- extension-boot-lifecycle.test.js extension-boot-lifecycle-wiring.test.js extensions-disable.test.js`, `npm run lint --prefix tests -- extension-boot-lifecycle.test.js extension-boot-lifecycle-wiring.test.js`, `npm run lint`, `npm run check:frontend-budgets`. |
| Rollback path | Revert helper calls in `extensions.js` while leaving extension settings and runtime load paths unchanged. |
| Last reviewed | 2026-05-28 extension boot lifecycle wiring. |
| Owner | Refactor integrator and extension runtime owner. |

### `public/scripts/PromptManager.js` - prompt manager lifecycle
| Field | Value |
| --- | --- |
| Area | Prompt manager lifecycle. |
| Divergence reason | SillyBunny Prompt Manager needs explicit render gating, generation-active waiting, dry-run/live render selection, and scroll restoration while keeping prompt assembly, token counting, and DOM rendering in the existing class. |
| Target seam | `public/scripts/prompt-manager-lifecycle/`. |
| Adapter shape | PromptManager keeps prompt/render implementation and delegates render gating, render mode, and scroll-restore decisions to the lifecycle module. |
| Protecting tests | `tests/prompt-manager-lifecycle.test.js`, `tests/prompt-manager-lifecycle-wiring.test.js`. |
| Validation | `npm run test:unit --prefix tests -- prompt-manager-lifecycle.test.js prompt-manager-lifecycle-wiring.test.js`, `npm run lint --prefix tests -- prompt-manager-lifecycle.test.js prompt-manager-lifecycle-wiring.test.js`, `npm run lint`, `npm run check:frontend-budgets`. |
| Rollback path | Revert lifecycle calls in `PromptManager.js` while leaving prompt data and service settings untouched. |
| Last reviewed | 2026-05-28 prompt manager lifecycle wiring. |
| Owner | Refactor integrator and prompt manager owner. |

## Candidate Entries To Add Later
| File or area | Add entry when |
| --- | --- |
| Core settings modules | Preset/API sync refactor starts. |
| Screenshot/image-gen UI code | Lazy loading of non-active tooling begins. |

## Review Checklist
- Does the upstream-origin file contain only adapter wiring and concise comments?
- Does the target seam have a small interface and concentrated implementation?
- Does at least one test protect the divergence?
- Does the rollback path avoid user data changes?
- Does the PR keep upstream sync work separate from fork feature work?
- Did validation name the lifecycle affected: fresh install, restart after update, stale assets, mobile viewport, long chat, streaming, swipe, or settings save?
