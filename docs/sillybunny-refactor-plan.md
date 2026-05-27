---
status: in-progress
phase: 4
updated: 2026-05-27
---

# SillyBunny Refactor Plan

## Goal
Make SillyBunny's fork-specific frontend behavior mechanically safer to maintain against upstream by moving hot-path behavior behind small compatibility adapters, starting with chat scroll/render lifecycle reliability.

## Context And Decisions
| Decision | Rationale | Source |
| --- | --- | --- |
| Keep `public/script.js` as a compatibility shell | Extensions and app context depend on its exports, but large fork logic there increases upstream merge pain. | `public/script.js`, project instructions |
| Start with chat render lifecycle | It directly targets unreliable scrolling, mobile regressions, long-chat load issues, streaming churn, and issue `#167`. | `public/script.js`, issue `#167`, `tests/chat-send-scroll.e2e.js` |
| Use a deep lifecycle module with a small interface | Timing, scroll intent, anchor preservation, streaming updates, and render batching are currently scattered. Locality matters more than pass-through extraction. | `public/script.js`, `public/scripts/chat-scroll-edges.js`, `public/scripts/mobile-streaming.js` |
| Make scroll intent explicit | Bugs come from inferred state across touch, wheel, streaming, media load, swipe, and long-chat load. | `public/script.js`, `lessons.md` |
| Centralize DOM writes through one scheduler | Current immediate writes can fight each other and cause layout churn. One write lane per frame gives predictable ordering. | `public/script.js`, `scripts/measure-frontend-performance.js` |
| Capture scroll state before DOM mutation | Post-mutation measurements can misclassify a pinned viewport as user-scrolled; lifecycle callers should pass pre-mutation `isNearBottom` snapshots into guarded routes. | `public/script.js`, `public/scripts/chat-render-lifecycle/bottom-scroll.js` |
| Keep lifecycle routing guarded until evidence is route-specific | The rollout guard should compare legacy and lifecycle paths per route; default-on waits for unit, e2e, mobile, and budget evidence for that route. | `public/scripts/chat-render-lifecycle/rollout-guard.js`, `tests/chat-render-lifecycle-rollout-guard.test.js` |
| Preserve upstream compatibility with a ledger | Every upstream-origin edit needs a reason, seam target, and protecting test. | Project instructions |
| Delay CSS containment changes until repro coverage exists | The issue report mentions visibility/containment behavior, but lifecycle ordering should be proven first. | `public/style.css`, issue `#167` |
| Add budgets, not vibes | Performance work needs objective checks and rollback paths. | `lessons.md`, `scripts/check-frontend-budgets.js` |

## Terms
| Term | Meaning |
| --- | --- |
| Module | A unit with an interface and implementation. |
| Interface | Everything callers must know to use the module: methods, ordering, invariants, error modes, and timing. |
| Implementation | The code hidden behind the interface. |
| Seam | A place behavior can be altered without editing callers in place. |
| Adapter | A concrete implementation satisfying an interface at a seam. |
| Depth | Leverage from a small interface hiding substantial behavior. |
| Locality | Bugs and changes concentrated in one place instead of scattered callers. |

## Target Architecture
The first deep module is `chat-render-lifecycle`.

Proposed location: `public/scripts/chat-render-lifecycle/`

Initial internal modules:
| File | Responsibility |
| --- | --- |
| `index.js` | Compatibility-facing lifecycle adapter factory and exported public seam. |
| `scheduler.js` | One-per-frame DOM/state write queue, requestAnimationFrame coalescing, timer cleanup. |
| `scroll-intent.js` | Pure scroll state transitions: pinned bottom, anchored, user scrolling, jump, replace. |
| `bottom-scroll.js` | Bottom-scroll action resolution for guarded compatibility-shell routing. |
| `anchor.js` | Capture and restore viewport-relative message anchors. |
| `render-batch.js` | Append, prepend, replace, and update batching. |
| `stream-buffer.js` | Coalesce streaming token DOM updates without re-entering anchor logic. |
| `resize-observer.js` | Delegated resize/media/layout observer for late content growth. |

Compatibility shell:
`public/script.js` keeps existing exports and delegates behavior.

Existing exports to preserve:
| Export | Compatibility rule |
| --- | --- |
| `printMessages()` | Same external behavior, delegates initial render and bottom scroll. |
| `redisplayChat()` | Same parameters, delegates batched render and style/tag follow-up. |
| `addOneMessage()` | Same return shape, delegates append/replace intent. |
| `updateMessageBlock()` | Same callable surface for extensions, delegates update queue. |
| `scrollChatToBottom()` | Same force/wait options, delegates scroll intent. |

High-level lifecycle intents:
| Intent | Meaning |
| --- | --- |
| `initial-load` | Render current chat and land at the expected latest position. |
| `history-prepend` | Add older messages while preserving first visible anchor. |
| `tail-append` | Add a tail message and optionally pin bottom. |
| `replace-message` | Replace/swipe existing message without treating it as append. |
| `stream-progress` | Coalesce live text updates and respect user scroll state. |
| `media-resize` | Reconcile late image/video/code/reasoning layout growth. |
| `manual-scroll` | User interaction wins for a defined suppression window. |
| `force-jump` | Explicit UI action bypasses preference and suppression. |

Core invariants:
| Invariant | Acceptance |
| --- | --- |
| One writer per frame | Repeated update requests collapse into one scheduled write lane. |
| User scroll wins | Touch/wheel/manual scroll prevents streaming from pulling the viewport for a defined window. |
| Anchor before mutate | Any prepend, replace, or late resize captures an anchor before DOM mutation and restores after layout settles. |
| Swipe is replace | Swipe/regenerate paths use replace intent, not append heuristics. |
| Stream path is low priority | Token bursts are buffered and never re-trigger full render unnecessarily. |
| Shell remains thin | Upstream-origin files contain adapter calls, not growing fork logic. |

## Execution Gates And Chunking
| Gate | Purpose | Required evidence |
| --- | --- | --- |
| Surface gate | Prevent extension/API drift before more `public/script.js` routing. | Export-surface snapshot, root lint, focused lifecycle index tests. |
| Guard-off parity gate | Prove default user behavior remains legacy-compatible while routes are opt-in. | Focused unit pack, send-scroll e2e with rollout disabled/default, no export-surface diff. |
| Guard-on route gate | Prove the lifecycle route works before adding another runtime caller. | Route-specific unit tests plus opt-in e2e using the rollout query/storage override. |
| Performance gate | Prevent layout churn from moving work behind adapters. | Scheduler coverage, frontend budget check, and browser/perf probe when a route changes bulk rendering or streaming. |
| Mobile gate | Keep iOS/WebKit momentum and touch suppression from regressing. | Mobile viewport e2e or manual checklist for any route touching `pinMobileChatToBottom()`, streaming, or visual viewport behavior. |
| Default-on gate | Flip lifecycle behavior only after route evidence is complete. | Guard-off parity, guard-on route, mobile, long-chat, swipe, stream, and budget evidence for every enabled path. |

## Phase 1: Plan, Ledger, And Baseline [COMPLETE]
- [x] 1.1 Create `docs/sillybunny-refactor-plan.md` with this plan.
- [x] 1.2 Add `docs/upstream-touch-ledger.md`.
- [x] 1.3 Capture current validation baseline: `npm run lint`, targeted unit tests, and `npm run check:frontend-budgets`.
- [x] 1.4 Record current upstream-origin hot files: `public/script.js`, `public/style.css`, `public/scripts/sillybunny-tabs.js`, and core settings modules touched later.
- [x] 1.5 Capture current issue `#167` repro notes before behavior changes.
- [x] 1.6 Keep Phase 1 docs and ledger scoped; runtime changes moved into later tested slices.

## Phase 2: Tests Before Extraction [COMPLETE]
- [x] 2.1 Add pure unit tests for scroll intent transitions.
- [x] 2.2 Add scheduler unit tests for requestAnimationFrame coalescing and cancellation.
- [x] 2.3 Add anchor unit tests for prepend, replace, and late resize.
- [x] 2.4 Expand `tests/chat-send-scroll.e2e.js` for long-chat send behavior.
- [x] 2.5 Add long-chat fixture generation in-browser, avoiding committed user data.
- [x] 2.6 Add mobile viewport coverage for scroll-up while streaming.
- [x] 2.7 Add last-message swipe replace coverage; add top/middle once lifecycle replace supports non-tail replacement.
- [x] 2.8 Re-scope export-surface snapshot coverage into the Phase 4 surface gate before additional `public/script.js` wiring.

## Phase 3: Lifecycle Module Scaffold [COMPLETE]
- [x] 3.1 Create `public/scripts/chat-render-lifecycle/`.
- [x] 3.2 Add empty or pass-through adapter exports with no behavior change.
- [x] 3.3 Add `scheduler.js` with tests; route anchor settle through it as the first low-risk adapter.
- [x] 3.4 Add `scroll-intent.js` as pure logic with table-driven tests.
- [x] 3.5 Add `anchor.js` with DOM fixture tests.
- [x] 3.6 Add lifecycle kill-switch only as temporary rollout protection, not a permanent compatibility layer.
- [x] 3.7 Keep each commit green and small.

## Phase 4: Surface Guard, Tail Append, And Bottom Pin [IN PROGRESS]
- [x] 4.1 Use the temporary rollout guard for Phase 4 runtime routing.
- [x] 4.2 Add `bottom-scroll.js` with bottom-scroll action resolution and unit tests.
- [x] 4.3 Route `scrollChatToBottom()` through the guarded lifecycle bottom-scroll route while preserving guard-off legacy behavior.
- [ ] **4.4 Add export-surface snapshot coverage for `public/script.js` before additional hot-file wiring.** ← CURRENT
- [ ] 4.5 Capture pre-mutation bottom state before `addOneMessage()` tail-append DOM mutation.
- [ ] 4.6 Route non-mobile `addOneMessage()` tail-append bottom scroll through lifecycle using the captured `isNearBottom` hint.
- [ ] 4.7 Preserve jQuery return behavior, `.last_mes`, swipe button refresh, style pins, character tags, and edit arrows with focused assertions.
- [ ] 4.8 Decide and route mobile `pinMobileChatToBottom()` as platform policy consumed by lifecycle or as a guarded lifecycle bottom-scroll settle path.
- [ ] 4.9 Validate send-scroll e2e with rollout disabled/default and rollout enabled.
- [ ] 4.10 Keep the ledger and graph current after Phase 4 code changes.

## Phase 5: Initial Load, History Prepend, And Render Batch [PENDING]
- [x] 5.1 Preserve existing `showMoreMessages()` anchor-module route as the baseline for history prepend.
- [ ] 5.2 Add a render-batch helper with unit tests before routing `redisplayChat()`.
- [ ] 5.3 Route `printMessages()` initial-load bottom landing through lifecycle intent behind the rollout guard.
- [ ] 5.4 Route `redisplayChat()` DOM batching through the render-batch helper without changing fade, tags, style pins, or edit arrows.
- [ ] 5.5 Preserve current mobile batch-size behavior unless route-specific tests prove a safer threshold.
- [ ] 5.6 Replace scattered double-requestAnimationFrame and setTimeout scroll settling with scheduler lanes only after parity tests pass.
- [ ] 5.7 Validate long-chat initial load lands at latest message with guard off and guard on.
- [ ] 5.8 Validate show-more preserves first visible message after batched prepend.

## Phase 6: Route Message Update And Streaming [PENDING]
- [ ] 6.1 Add an update-queue helper with unit tests before moving live message-update state.
- [ ] 6.2 Move pending mobile message update map into lifecycle module behind a narrow adapter.
- [ ] 6.3 Add `stream-buffer.js` with coalescing tests before routing streaming progress.
- [ ] 6.4 Route `StreamingProcessor.onStartStreaming()` scroll requests through lifecycle behind the rollout guard.
- [ ] 6.5 Route `StreamingProcessor.onProgressStreaming()` visible DOM writes through stream buffer and scheduler lanes.
- [ ] 6.6 Keep provider/generation request logic out of the lifecycle module.
- [ ] 6.7 Keep token counting logic where it is initially, but schedule visible writes through the lifecycle lane.
- [ ] 6.8 Validate stream while pinned bottom stays pinned with guard off and guard on.
- [ ] 6.9 Validate stream while user scrolled up does not yank viewport on desktop and mobile.

## Phase 7: Route Replace, Swipe, And Late Resize [PENDING]
- [ ] 7.1 Expand replace-message tests for top, middle, and tail swipe/regenerate paths.
- [ ] 7.2 Route swipe display replacement through lifecycle replace path behind the rollout guard.
- [ ] 7.3 Add delegated resize observer with cleanup tests before observing live messages.
- [ ] 7.4 Treat images, videos, code blocks, reasoning blocks, and async renderers as late resizers.
- [ ] 7.5 Avoid one observer per message; use delegated observation and chat-switch cleanup to prevent leaks.
- [ ] 7.6 Validate swipe replace preserves viewport-relative position with guard off and guard on.
- [ ] 7.7 Validate image-heavy messages do not cause scroll jumps.
- [ ] 7.8 Validate no observer/timer leaks after chat switch, clear, and delete.

## Phase 8: Mobile Shell Adapter [PENDING]
- [ ] 8.1 Keep `public/scripts/sillybunny-tabs.js` shell-facing behavior intact.
- [ ] 8.2 Replace direct chat scroll math in shell code with lifecycle adapter calls where practical.
- [ ] 8.3 Keep `public/scripts/mobile-streaming.js` as platform policy, not DOM orchestration.
- [ ] 8.4 Subscribe lifecycle to `visualViewport` resize/scroll for keyboard and mobile viewport changes.
- [ ] 8.5 Add timeout-based settle detection for iOS-style momentum scrolling.
- [ ] 8.6 Validate drawer/tab/preset/chat-scroll checklist from `lessons.md`.

## Phase 9: CSS Containment Trial [PENDING]
- [ ] 9.1 Do not change `.mes` containment until issue fixtures exist.
- [ ] 9.2 Compare current containment, global containment removal, and transition-only containment suppression.
- [ ] 9.3 Prefer a lifecycle transition class over permanent heavier CSS.
- [ ] 9.4 If `content-visibility` is introduced, pair it with stable intrinsic sizing.
- [ ] 9.5 Validate macOS, Firefox, long chat, and mobile reports where environments are available.
- [ ] 9.6 Keep CSS changes in a separate PR from scheduler extraction.

## Phase 10: Performance Budgets [PENDING]
- [ ] 10.1 Keep static `check:frontend-budgets` in every lifecycle PR.
- [ ] 10.2 Add chat-specific static checks only if they can catch real regressions without false positives.
- [ ] 10.3 Extend `scripts/measure-frontend-performance.js` with long-chat render timing after render-batch routing starts.
- [ ] 10.4 Add scroll FPS reporting for chat container only when browser perf harness cost is acceptable.
- [ ] 10.5 Add long-task count and longest-task reporting for long-chat render and stream scenarios.
- [ ] 10.6 Add budget thresholds: desktop scroll FPS, mobile scroll FPS, render time for N messages, bottom/anchor pixel drift.
- [ ] 10.7 Keep heavy browser perf checks opt-in or nightly if too slow for normal CI.
- [ ] 10.8 Keep lightweight unit and static budget checks in normal PR validation.

## Phase 11: Rollout And Cleanup [PENDING]
- [ ] 11.1 Flip lifecycle paths on by default only after issue fixtures pass.
- [ ] 11.2 Keep temporary kill-switch for one release cycle if needed.
- [ ] 11.3 Remove old inline scroll state from `public/script.js` after default-on validation.
- [ ] 11.4 Update upstream touch ledger entries as seams absorb inline divergence.
- [ ] 11.5 Run `graphify update .` after code changes.
- [ ] 11.6 Document validation evidence in PR descriptions.

## Phase 12: Next Deep Modules [PENDING]
- [ ] 12.1 Mobile shell lifecycle: resize, drawer, nav, bottom bar, and viewport behavior.
- [ ] 12.2 Preset/API sync lifecycle: profile application, preset save, API/model state, cancellation, and overwrite protection.
- [ ] 12.3 Generation lifecycle: UI lock/unlock, event ordering, post-generation recovery, save timing, and agent hooks.
- [ ] 12.4 Extension boot lifecycle: lazy hydration by idle, visible, interaction, or feature usage.
- [ ] 12.5 Prompt manager lifecycle: heavy preview/render scheduling, token count deferral, and non-active settings group hydration.
- [ ] 12.6 Screenshot/image-gen/tooling UI hydration: load only on first use.

## Parallel Execution Model
| Lane | Can run in parallel | Integrator gate |
| --- | --- | --- |
| Plan docs and ledger | Yes | Documentation owner reviews for consistency. |
| Issue `#167` repro tests | Yes | Test lead reconciles fixtures and selectors. |
| Pure lifecycle modules | Mostly | Lifecycle lead locks the public interface first. |
| Performance budgets | Yes | Performance lead aligns thresholds with existing scripts. |
| CSS containment research | Research only | CSS changes wait for repro tests. |
| `public/script.js` adapter wiring | No | Single integrator owns hot-file edits. |
| Streaming/generation wiring | No | Serialize after append/load paths are stable. |
| Mobile shell wiring | Mostly no | Implementation waits for lifecycle adapter stability. |

Recommended waves:
| Wave | Work |
| --- | --- |
| 0 | Completed: plan, ledger, repro fixtures, scheduler, scroll intent, anchor, index seam, rollout guard, and guarded bottom-scroll seam. |
| 1 | Current: protect `public/script.js` export surface, then route tail append using pre-mutation scroll state. |
| 2 | Finish Phase 4: route or explicitly preserve mobile bottom pin behavior and validate guard-off/guard-on send scroll. |
| 3 | Route initial-load and redisplay batching after Phase 4 is green. |
| 4 | Route update batching and streaming progress after append/load paths are stable. |
| 5 | Serialize high-risk paths: swipe replace, late resize, mobile viewport handling. |
| 6 | CSS containment trial only if tests still reproduce the bug class. |
| 7 | Future deep modules: mobile shell, preset/API sync, generation lifecycle, extension boot. |

## Tiny Chunk Plan
| Chunk | Scope | Status |
| --- | --- | --- |
| 1 | Add refactor plan, ledger, and issue `#167` baseline fixtures. | Complete. |
| 2 | Add scheduler, scroll-intent, and anchor modules with focused tests. | Complete. |
| 3 | Add lifecycle index seam with no runtime behavior change. | Complete via PR `#205`. |
| 4 | Add rollout guard seam with default-off behavior. | Complete via PR `#206`. |
| 5 | Route `scrollChatToBottom()` through guarded bottom-scroll decision path. | Complete via PR `#208`. |
| 6 | Add `public/script.js` export-surface snapshot coverage. | Next. |
| 7 | Capture pre-mutation tail-append bottom state in `addOneMessage()`. | Pending. |
| 8 | Route non-mobile tail append bottom scroll through lifecycle. | Pending. |
| 9 | Route or explicitly preserve mobile bottom pin behavior through lifecycle platform policy. | Pending. |
| 10 | Add render-batch helper and route initial load/redisplay batching. | Pending. |
| 11 | Add update-queue helper and route mobile message updates. | Pending. |
| 12 | Add stream-buffer helper and route streaming progress DOM writes. | Pending. |
| 13 | Route replace/swipe behavior and delegated late-resize observation. | Pending. |
| 14 | Add mobile viewport/momentum settle handling. | Pending. |
| 15 | Add chat-specific performance reporting and default-on rollout evidence. | Pending. |
| 16 | Remove superseded inline compatibility-shell code after default-on validation. | Pending. |

## Validation Matrix
| Area | Check |
| --- | --- |
| Static | `npm run lint` |
| Unit | `npm run test:unit --prefix tests -- chat-scroll-edges.test.js mobile-streaming.test.js` |
| Unit | New lifecycle scheduler, scroll intent, anchor, bottom-scroll, render-batch, stream-buffer, update-queue, and resize-observer tests. |
| Unit | Export-surface snapshot coverage for `public/script.js` before additional hot-file routing. |
| Budget | `npm run check:frontend-budgets` |
| Build | `npm run build:frontend` |
| E2E | `npm run test:e2e --prefix tests -- chat-send-scroll.e2e.js` with rollout disabled/default and enabled for routed paths. |
| E2E | Long-chat initial load, send scroll, show-more prepend, swipe replace, mobile stream, and late media resize. |
| Runtime | `bun run start` smoke when structural frontend changes land. |
| Runtime | `npm run start:node` smoke when structural frontend changes land. |
| Graph | `graphify update .` after code edits. |

## Acceptance Criteria
| Criterion | Target |
| --- | --- |
| Export compatibility | `public/script.js` exported surface unchanged. |
| Shell thinness | Upstream-origin files only wire adapters and hold concise divergence comments. |
| Scroll stability | Pinned-bottom stays within 2 px during append and stream. |
| User intent | User-scrolled-up viewport drifts no more than 2 px during append, stream, media resize, and swipe. |
| Long chat | Initial long-chat load lands at latest message unless preserving an intentional anchor. |
| Swipe | Swipe replace preserves viewport-relative position. |
| Scheduler | Burst appends and stream tokens collapse to bounded frame writes. |
| Media | Late image/video/code/reasoning growth does not yank viewport. |
| Mobile | Visual viewport resize and momentum scroll do not break chat position. |
| Performance | Scroll FPS and long-task budgets do not regress beyond agreed thresholds. |
| Ledger | Every upstream-origin edit has a reason, target seam, and protecting test. |

## Out Of Scope
- No server refactor.
- No prompt-building refactor in the chat lifecycle PRs.
- No tokenizer refactor.
- No world-info refactor.
- No character card schema changes.
- No extension API breakage.
- No new state-management library.
- No router or SPA conversion.
- No build-tool migration.
- No permanent compatibility flags.
- No broad CSS restyle.
- No upstream sync mixed into these PRs.
- No preset/API sync refactor until chat lifecycle is stable.
- No generation lifecycle refactor until chat lifecycle is stable.

## Risks And Mitigations
| Risk | Mitigation |
| --- | --- |
| Extension breakage from changed exports | Snapshot exported surface and keep `public/script.js` adapters. |
| Scroll tests flake due smooth scrolling | Disable smooth behavior in test fixtures and assert pixel thresholds. |
| iOS behavior hard to automate locally | Unit-test platform policy and keep manual/remote mobile verification checklist. |
| Resize observer leaks | Use delegated observation and cleanup on chat switch/clear. |
| CSS containment fix hides root cause | Gate CSS changes behind repro fixtures and separate PR. |
| Scheduler changes event ordering | Preserve event emission order and add generation lifecycle assertions. |
| Broad PR becomes unreviewable | Enforce tiny commits and one lifecycle route per PR. |
| Upstream merge conflicts grow | Keep hot files as shell adapters and update ledger continuously. |

## PR Sequence
| PR | Scope | Risk |
| --- | --- | --- |
| PR 1 | Plan, upstream touch ledger, repro fixtures, no runtime behavior changes. | Low |
| PR 2 | Scheduler, scroll intent, anchor modules with tests, unused by runtime. | Low |
| PR 3 | Lifecycle index seam with no runtime behavior change (`#205`). | Low |
| PR 4 | Default-off rollout guard seam (`#206`). | Low |
| PR 5 | Guarded `scrollChatToBottom()` lifecycle route (`#208`). | Medium |
| PR 6 | Export-surface snapshot plus tail-append pre-mutation state capture. | Low |
| PR 7 | Route non-mobile tail append and decide mobile bottom pin policy. | Medium |
| PR 8 | Route initial load and redisplay batching through lifecycle adapter. | Medium |
| PR 9 | Route update batching and streaming progress through lifecycle adapter. | High |
| PR 10 | Route swipe replace and late resize handling. | High |
| PR 11 | Mobile shell adapter cleanup and viewport handling. | Medium |
| PR 12 | CSS containment trial if still needed. | Medium |
| PR 13 | Performance budgets, default-on rollout evidence, and superseded shell cleanup. | Medium |

## Next Execution Step
Add `public/script.js` export-surface snapshot coverage, then capture pre-mutation bottom state for `addOneMessage()` tail append before routing another runtime path.
