---
status: not-started
phase: 1
updated: 2026-05-26
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
| `prepend-history` | Add older messages while preserving first visible anchor. |
| `append-message` | Add a tail message and optionally pin bottom. |
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

## Phase 1: Plan, Ledger, And Baseline [IN PROGRESS]
- [x] 1.1 Create `docs/sillybunny-refactor-plan.md` with this plan.
- [x] 1.2 Add `docs/upstream-touch-ledger.md`.
- [ ] **1.3 Capture current validation baseline: `npm run lint`, targeted unit tests, and `npm run check:frontend-budgets`.** <- CURRENT
- [ ] 1.4 Record current upstream-origin hot files: `public/script.js`, `public/style.css`, `public/scripts/sillybunny-tabs.js`, and core settings modules touched later.
- [ ] 1.5 Capture current issue `#167` repro notes before behavior changes.
- [ ] 1.6 Do not change runtime behavior in this phase.

## Phase 2: Tests Before Extraction [IN PROGRESS]
- [ ] 2.1 Add pure unit tests for scroll intent transitions.
- [ ] 2.2 Add scheduler unit tests for requestAnimationFrame coalescing and cancellation.
- [x] 2.3 Add anchor unit tests for prepend, replace, and late resize.
- [x] 2.4 Expand `tests/chat-send-scroll.e2e.js` for long-chat send behavior.
- [x] 2.5 Add long-chat fixture generation in-browser, avoiding committed user data.
- [x] 2.6 Add mobile viewport coverage for scroll-up while streaming.
- [x] 2.7 Add last-message swipe replace coverage; add top/middle once lifecycle replace supports non-tail replacement.
- [ ] 2.8 Add export-surface snapshot coverage for `public/script.js`.

## Phase 3: Lifecycle Module Scaffold [IN PROGRESS]
- [x] 3.1 Create `public/scripts/chat-render-lifecycle/`.
- [ ] 3.2 Add empty or pass-through adapter exports with no behavior change.
- [x] 3.3 Add `scheduler.js` with tests; route anchor settle through it as the first low-risk adapter.
- [ ] 3.4 Add `scroll-intent.js` as pure logic with table-driven tests.
- [x] 3.5 Add `anchor.js` with DOM fixture tests.
- [ ] 3.6 Add lifecycle kill-switch only as temporary rollout protection, not a permanent compatibility layer.
- [ ] 3.7 Keep each commit green and small.

## Phase 4: Route Tail Append And Bottom Pin [PENDING]
- [ ] 4.1 Route `addOneMessage()` tail append through lifecycle append intent.
- [ ] 4.2 Preserve jQuery return behavior.
- [ ] 4.3 Preserve `.last_mes`, swipe button refresh, style pins, character tags, and edit arrows.
- [ ] 4.4 Replace direct bottom pin logic with lifecycle scroll request.
- [ ] 4.5 Keep legacy code path available only behind temporary rollout guard.
- [ ] 4.6 Validate send-scroll e2e and unit scheduler coverage.

## Phase 5: Route Initial Load And History Prepend [PENDING]
- [ ] 5.1 Route `printMessages()` through lifecycle initial-load intent.
- [ ] 5.2 Route `redisplayChat()` through lifecycle render batch.
- [x] 5.3 Route `showMoreMessages()` and prepend preservation through anchor module.
- [ ] 5.4 Preserve current mobile batch size behavior unless tests prove it wrong.
- [ ] 5.5 Replace scattered double-requestAnimationFrame and setTimeout scrolls with scheduler lanes.
- [ ] 5.6 Validate long-chat initial load lands at latest message.
- [ ] 5.7 Validate show-more preserves first visible message.

## Phase 6: Route Message Update And Streaming [PENDING]
- [ ] 6.1 Route `updateMessageBlock()` through lifecycle update queue.
- [ ] 6.2 Move pending mobile message update map into lifecycle module.
- [ ] 6.3 Route `StreamingProcessor.onStartStreaming()` scroll requests through lifecycle.
- [ ] 6.4 Route `StreamingProcessor.onProgressStreaming()` DOM updates through stream buffer.
- [ ] 6.5 Keep provider/generation request logic out of the lifecycle module.
- [ ] 6.6 Keep token counting logic where it is initially, but schedule visible writes through the lifecycle lane.
- [ ] 6.7 Validate stream while pinned bottom stays pinned.
- [ ] 6.8 Validate stream while user scrolled up does not yank viewport.

## Phase 7: Route Replace, Swipe, And Late Resize [PENDING]
- [ ] 7.1 Add explicit `replace-message` intent for swipe/regenerate paths.
- [ ] 7.2 Route swipe display replacement through lifecycle replace path.
- [ ] 7.3 Add delegated resize observer for message growth.
- [ ] 7.4 Treat images, videos, code blocks, reasoning blocks, and async renderers as late resizers.
- [ ] 7.5 Avoid one observer per message; use delegated observation to prevent leaks.
- [ ] 7.6 Validate swipe replace preserves viewport-relative position.
- [ ] 7.7 Validate image-heavy messages do not cause scroll jumps.

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
- [ ] 10.1 Extend `scripts/check-frontend-budgets.js` with chat-specific static checks only if measurable statically.
- [ ] 10.2 Extend `scripts/measure-frontend-performance.js` with long-chat render timing.
- [ ] 10.3 Add scroll FPS reporting for chat container.
- [ ] 10.4 Add long-task count and longest-task reporting.
- [ ] 10.5 Add budget thresholds: desktop scroll FPS, mobile scroll FPS, render time for N messages, bottom/anchor pixel drift.
- [ ] 10.6 Keep heavy browser perf checks opt-in or nightly if too slow for normal CI.
- [ ] 10.7 Keep lightweight unit and static budget checks in normal PR validation.

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
| 0 | One owner creates plan, ledger, and lifecycle interface contract. |
| 1 | Parallel lanes: repro tests, pure scheduler/intent/anchor modules, performance budget design, ledger population. |
| 2 | One integrator wires append and bottom-pin through the lifecycle adapter. |
| 3 | Parallel after Wave 2 is green: initial-load/prepend path, update batching, expanded e2e coverage. |
| 4 | Serialize high-risk paths: streaming progress, swipe replace, mobile viewport handling. |
| 5 | CSS containment trial only if tests still reproduce the bug class. |
| 6 | Future deep modules: mobile shell, preset/API sync, generation lifecycle, extension boot. |

## Tiny Commit Plan
| Commit | Scope |
| --- | --- |
| 1 | Add `docs/sillybunny-refactor-plan.md`. |
| 2 | Add upstream touch ledger template. |
| 3 | Add issue `#167` test fixture helper for synthetic long chats. |
| 4 | Add scroll intent pure tests. |
| 5 | Add scheduler tests. |
| 6 | Add anchor tests. |
| 7 | Scaffold lifecycle module with no runtime behavior change. |
| 8 | Implement scheduler. |
| 9 | Implement scroll intent state machine. |
| 10 | Implement anchor capture/restore. |
| 11 | Route tail append through adapter behind temporary rollout guard. |
| 12 | Route bottom scroll through lifecycle scroll request. |
| 13 | Route initial chat load through lifecycle. |
| 14 | Route history prepend through anchor module. |
| 15 | Route mobile message update batching through lifecycle. |
| 16 | Route streaming progress DOM writes through stream buffer. |
| 17 | Add explicit swipe replace intent. |
| 18 | Add delegated resize observer for late layout growth. |
| 19 | Add mobile viewport/momentum settle handling. |
| 20 | Add chat-specific performance reporting. |
| 21 | Flip lifecycle default when tests pass. |
| 22 | Remove superseded inline code from compatibility shell. |
| 23 | Update ledger and validation docs. |
| 24 | Run graph update after code edits. |

## Validation Matrix
| Area | Check |
| --- | --- |
| Static | `npm run lint` |
| Unit | `npm run test:unit --prefix tests -- chat-scroll-edges.test.js mobile-streaming.test.js` |
| Unit | New lifecycle scheduler, scroll intent, anchor, and render batch tests. |
| Budget | `npm run check:frontend-budgets` |
| Build | `npm run build:frontend` |
| E2E | `npm run test:e2e --prefix tests -- chat-send-scroll.e2e.js` |
| E2E | Long-chat initial load, send scroll, show-more prepend, swipe replace, mobile stream. |
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
| PR 3 | Route append and bottom pin through lifecycle adapter. | Medium |
| PR 4 | Route initial load and history prepend through lifecycle adapter. | Medium |
| PR 5 | Route update batching and streaming progress through lifecycle adapter. | High |
| PR 6 | Route swipe replace and late resize handling. | High |
| PR 7 | Mobile shell adapter cleanup and viewport handling. | Medium |
| PR 8 | CSS containment trial if still needed. | Medium |
| PR 9 | Performance budgets and cleanup of superseded inline shell logic. | Medium |

## First Execution Step
Add this plan and the upstream touch ledger template as documentation-only Wave 0 artifacts, then continue with issue `#167` repro fixtures before runtime behavior changes.
