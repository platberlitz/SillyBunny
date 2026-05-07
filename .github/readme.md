<!-- This file mirrors the root README so GitHub renders the correct project homepage copy. -->

# 🐰 SillyBunny 🐰
<div>
<img src="screenshots/banner.jpg" width="100%">
</div>

---

An elegant fork of [SillyTavern](https://github.com/SillyTavern/SillyTavern), designed with a cleaner, graphical shell UI; Bun-based backend; built-in tutorials, presets, extensions, and a quick-start dashboard; and a lightweight agentic system to faciliate modern agent functionality.

> [!WARNING]
> This is an in-dev fork, and is considered beta quality. [Please direct SillyBunny-specific issues to this project's issue tracker.](https://github.com/platberlitz/SillyBunny/issues) If an issue is reproducible in upstream SillyTavern, please report it upstream instead.
>
> Disclaimer: LLMs are used to facilitate development of this fork. Overall software design, prompting, testing, and documentation are handled by humans. To keep things simple, we try to maintain close to upstream as possible.

<details>
<summary><h2>Screenshots</h2></summary>

These screenshots show the graphical shell UI across Workspace, Customize, Agents, Characters, Search, and a Bunny Guide in-chat view on desktop and mobile.

#### Desktop

| Desktop Workspace Menu | Desktop Customize Menu |
| :---: | :---: |
| <img src="screenshots/sillybunny-ui-desktop-navigate-v1.4.0.png" alt="Desktop Workspace Menu" width="100%"> | <img src="screenshots/sillybunny-ui-desktop-customize-v1.4.0.png" alt="Desktop Customize Menu" width="100%"> |

| Desktop Agents Menu | Desktop Characters Menu |
| :---: | :---: |
| <img src="screenshots/sillybunny-ui-desktop-agents-v1.4.0.png" alt="Desktop Agents Menu" width="100%"> | <img src="screenshots/sillybunny-ui-desktop-characters-v1.4.0.png" alt="Desktop Characters Menu" width="100%"> |

| Desktop Search | Desktop Chat |
| :---: | :---: |
| <img src="screenshots/sillybunny-ui-desktop-search-v1.4.0.png" alt="Desktop Search" width="100%"> | <img src="screenshots/sillybunny-ui-desktop-in-chat-v1.4.0.png" alt="Desktop Bunny Guide Chat" width="100%"> |

#### Mobile

| Mobile Workspace Menu | Mobile Customize Menu | Mobile Agents Menu |
| :---: | :---: | :---: |
| <img src="screenshots/sillybunny-ui-mobile-navigate-v1.4.0.png" alt="Mobile Workspace Menu" width="100%"> | <img src="screenshots/sillybunny-ui-mobile-customize-v1.4.0.png" alt="Mobile Customize Menu" width="100%"> | <img src="screenshots/sillybunny-ui-mobile-agents-v1.4.0.png" alt="Mobile Agents Menu" width="100%"> |

| Mobile Characters Menu | Mobile Search | Mobile Chat |
| :---: | :---: | :---: |
| <img src="screenshots/sillybunny-ui-mobile-characters-v1.4.0.png" alt="Mobile Characters Menu" width="100%"> | <img src="screenshots/sillybunny-ui-mobile-search-v1.4.0.png" alt="Mobile Search" width="100%"> | <img src="screenshots/sillybunny-ui-mobile-in-chat-v1.4.0.png" alt="Mobile Bunny Guide Chat" width="100%"> |

</details>

---

## Table of Contents
* [At a Glance](#at-a-glance)
* [Installation](#installation)
    * [macOS Notes](#macos-notes)
    * [Termux (Android) Notes](#termux-android-notes)
    * [Update Instructions](#how-to-update)
* [Project Goals](#project-goals-aka-why-we-made-this-fork)
* [Changes Compared to SillyTavern](#changes-vs-sillytavern)
* [Latest Update](#latest-update)
    * [v1.5.3 (2026-05-03)](#v153-2026-05-03)
    * [v1.5.2 (2026-04-30)](#v152-2026-04-30)
    * [v1.5.1 (2026-04-29)](#v151-2026-04-29)
* [Upstream Information](#upstream-information)
* [Contributors](#contributors)
***

## At a glance

| | |
|-|-|
| **UI** | Custom navigation shell with search, themes, and mobile layout |
| **Runtime** | Bun (auto-installed), Node.js fallback |
| **Bundled Goodies** | Pre-bundled RP presets, complementary extensions, and additional themes, alongside built-in detailed tutorials |
| **Agents** | Built-in In-Chat Agents for modular RP prompting |
| **Data** | Drop-in compatible with SillyTavern settings, characters, chats, presets, and extensions |
| **Default port** | `4444` |

---

## Installation

[Grab the latest release here.](https://github.com/platberlitz/SillyBunny/releases/latest)

Or run:

```bash
git clone https://github.com/platberlitz/SillyBunny.git
cd SillyBunny
```

Then, run the appropriate launcher for your OS, which auto-installs all dependencies, checks for updates, and starts a server instance. You can also open `http://127.0.0.1:4444` manually in your browser.

| Platform | Command |
|----------|---------|
| Windows | `.\Start.bat` |
| macOS (Terminal) | `./Start.command` |
| macOS (Finder) | Double-click `Start.command` (right-click > Open if Gatekeeper warns) |
| Linux / WSL | `./start.sh` |
| Docker | `docker compose -f docker/docker-compose.yml up --build`
| Android (Termux) | `bash start.sh` |

If you already manage your own Bun install, run via `bun run start`. Other launch variants:

```bash
bun run start:mobile   # lower-memory (--smol)
bun run start:global   # SillyBunny-owned data paths
bun run start:no-csrf  # disable CSRF (local dev)
```

### macOS notes

- If the launcher window closes too fast, run `./Start.command` from Terminal to keep output visible
- If Git is missing, the launcher triggers `xcode-select --install` automatically
- Quarantine metadata from ZIP downloads: `xattr -dr com.apple.quarantine /path/to/SillyBunny`
- Stripped permissions from unzip: `chmod +x Start.command start.sh scripts/*.sh`

### Termux (Android) notes

```bash
pkg update && pkg upgrade -y
pkg install -y git curl unzip
git clone https://github.com/platberlitz/SillyBunny.git
cd SillyBunny
bash start.sh
```

- The launcher defaults to Node.js + npm on native Termux and ARM devices when Node.js is available
- To force Bun anyway: `SILLYBUNNY_USE_BUN=1 bash start.sh`
- For shared storage access: `termux-setup-storage` once before starting
  
### How to Update

| What you want | Command |
|---------------|---------|
| Update from the running app | Open Customize > Server and use the built-in updater |
| Normal launch (auto-checks for updates) | `./start.sh` |
| Force update then launch | `./start.sh --self-update` |
| Update only, don't start | `./start.sh --self-update-only` |
| Skip update check once | `./start.sh --skip-self-update` |
| Disable auto-update permanently | `SILLYBUNNY_AUTO_UPDATE=0 ./start.sh` |

---

## Project Goals (AKA, why we made this fork)

Our primary goals for SillyBunny are as follows:

1) **Simple by default; powerful when needed.** Directly inspired by KDE Plasma's main driving philosophy, SillyBunny is aimed to be simple to understand and intuitive to use by default, with most of the complex settings hidden away from the default workspace. Sane defaults are implemented while all the extra complexity is hidden behind UI elements: still there, but less obtrusive. Our graphical shell best embodies this philosophy.
2) **A focus on roleplay and storytelling.** SillyBunny has a more opinionated purpose compared to upstream SillyTavern. Our goals align closely with the creative writing scene for models, and the general direction of the fork is aimed for that use case. We facilitate this with pre-bundled tutorials/add-ons/presets designed to get you started with LLM creative writing in fun ways.
3) **Modernised features.** We aim to implement new features that can greatly take advantage of modern models and their strong, agentic capabilities. Currently, this includes full support for In-Chat pre and post gen agents that complement the main generation. Models work best on smaller individual tasks, and this is best shown through in-chat agents and their capabilities. We're also looking into features like an RPG game mode that can take advantage of these agents.
4) **Better performance.** Base SillyTavern relies on node.js for its runtime environment. While robust, this is not ideal for performance. We've switched to a Bun runtime to increase general performance and startup times, while optimising for lower power devices like smartphones.
5) **Compatibility**. We remain as closely backwards compatible with upstream SillyTavern as possible. This facilitates easy synchronizing with upstream. We aim to not remove any pre-existing features, unless replacing with a direct alternative. The backend is already very solid, so primary work is done in the frontend space. In addition, we aim to make all our new features compatible with models of all sizes, not just the frontier, SOTA ones. Simplicity is key.

---

## Changes vs. SillyTavern

### Different UI

The original SillyTavern layout is replaced with a custom, easy-to-navigate graphical shell:

- **Top bar**: Reworked with cleaner, better-defined nested menus. Includes Workspace, Customize, Home, and Characters.
- **Bottom bar**: New bottom bar designed for quick access to persona switching, quick chat switching, and add/edit/remove existing chat functionality.
- **Panel-oriented navigation**: Easy access to all settings in nested panels. Collapsible settings sections in both Chat Completions and Text Completions presets.
- **Global search**: A global search bar that queries across presets, lore, extensions, personas, and settings at once.
- **Platform-aware**: Designed for both desktop and mobile, with a dedicated phone/tablet navigation layer.
- **Three modern shell themes**: Modern Glass, Clean Minimal, Bold Stylized.
- **Palette customization**: Easily change the accent colour of any theme you're currently using.

### Bun-first runtime

We primarily use Bun as a runtime, instead of node.js. This results in consistently faster startups, overall performance, and automatic launcher bootstraping. Node.js is still fully functional as a legacy fallback system.

### In-Chat agentic Support

SillyBunny has support for In-Chat Agents. These are custom prompt fields that can run separately from the main generation, which allows for a lot of extra flexibility. Included are several pre-built prompts designed for trackers, post-gen cleanup, anti-slop, and more. Agents can use the main model or a different connection profile, allowing for a fast, smaller model to run long agentic tasks with ease while a large, main model writes the actual story content. These are designed to fill the gap between full extensions and simple, modular agentic functionality.

**Pipeline:**

1. **Pre-generation agents** injects prompt text before the main reply is generated.
2. **Main Model** writes the main RP reply.
3. **Post-generation agents** optionally rewrites the contents of the main response, or appends extra content after the reply.
4. **Post-process utilities** can extract structured data, run regex cleanup/formatting, or preserve machine-readable blocks while showing cleaner UI.
5. **Groups and templates** let you swap whole stacks quickly without editing your base preset every time.

**Typical Usecases:**

- Trackers for scene, time, items, relationships, off-screen activity, and world state.
- Writing cleanup passes like anti-slop or regex-based formatting.
- Formatting helpers like direction menus, CYOA choices, or NPC profile cards.
- Randomisers and directives that change the pressure, genre, pacing, or escalation of a scene.
- Content toggles for prose style, difficulty, POV, and HTML artifacts.
- Agentic lorebook navigation for on-demand retrieval, memory maintenance, and tree building.
- Cheap helper-model passes that prepare or polish content without spending your main model's budget.

**Included Agents**

* **Trackers:** Achievements, CYOA Choices, Direction Menu, Event, Item, NPC Profiles, Parallel Off-Screen, Relationship, Reputation, Scene, Secrets, Status, Time, and World Detail.
* **Randomizers:** Chaos Mode, Combined Director's Cut, Dead Dove Escalation, Genre, Grounded Complication, Intimacy & Kink, Scene Driving Force, and Scene Pressure Cocktail.
* **Content:** Difficulty Increase, Don't Write for User, Friction Mode, Grounded Prose, HTML Toggle, and Write for User.
* **Post Generation Editors:** Prose Polisher
* **Additional Agents:** Pathfinder (an agentic lorebook navigator with 8 tools for retrieval, memory maintenance, and tree building).

**Agent Behaviors and Settings**
* Agentic prompts feature inline run-order editing, click-to-edit functionality, and fullscreen prompt editors.
* Agents use the main connection profile by default with an 8192 max token limit. Separate connection profile support is available when explicitly selected.
* Bundled trackers, including CYOA Choices, are configured for pre-generation. The main model emits clickable options directly in the response.
* All bundled tracker and menu agents default to the User injection role to maintain compatibility with models that deprioritize System injections.
* Built-in groups are available for the full preset, trackers only, and randomizers only.
* Custom agents support ST-style regex options.

### Bundled Goodies & Tutorials
SillyBunny includes some extras by default to help you get started right away:
* A tutorial that guides you through the SillyBunny interface.
* Pre-bundled roleplay presets from purachina and Geechan.
* A character card conversion preset from TLD to help you generate character cards from scratch, or convert from existing cards to a better format.
* A friendly quick-start guide with optional recommended extensions (Summary Sharder, Dialogue Colours, Quick Image Gen, Guided Generations, CSS Snippets).
* Two custom assistants to help you get started - Bunny Guide, and Assistant Nahida.

---

## Latest Update

### v1.5.3 (2026-05-03)

This update adds the Black Orange theme and desktop character drawer tiles, improves managed shell coexistence, restores Moving UI control over the character drawer size, and quiets expected Pathfinder sidecar aborts.

**Themes And Character Drawer**
* Added the Black Orange theme.
* Added desktop character drawer tile styling for the SillyBunny tabs layout.

**Shell And Moving UI**
* Opening Customize no longer closes an already-open Workspace or Agents shell, and opening Workspace or Agents no longer closes Customize.
* Moving UI now keeps control of the character drawer position and size instead of being overridden by SillyBunny desktop drawer sizing.
* Disabled the SillyBunny character drawer resize handle while Moving UI is active so the upstream drag/resize controls remain the single source of truth.
* Aligned Character Author's Note placement controls and Custom API key controls on mobile WebKit.

**Pathfinder And Release Metadata**
* Suppressed expected `AbortError` stack traces when Pathfinder sidecar generation is cancelled by its retrieval timeout or a closed client connection.
* Added `SILLYBUNNY_USE_BUN=1 bash start.sh` as the launcher override for users who want to force Bun on ARM devices.
* Updated app, Horde client, bundled extension, and package metadata to 1.5.3.

### v1.5.2 (2026-04-30)

This update brings Group Utilities into Launchpad, improves Moonlit Echoes and Guided Generations migration paths, restores Pathfinder access to contextual lorebooks, fixes group-chat continuity, and focuses heavily on mobile Safari chat stability.

**Launchpad And Extensions**
* Added SB-GroupUtilities to Launchpad optional installs, covering group presence, group greetings, shared group context, and SendAs utilities.
* Made the legacy Moonlit Echoes migration toast persistent until dismissed or opened, with a Show in Launchpad action that highlights the Moonlit Echoes Theme card.
* Added a Guided Generations fork notice that directs existing users to the SillyBunny-compatible fork in Launchpad.
* Updated bundled SillyBunny extension version labels to 1.5.2.

**Pathfinder**
* Pathfinder now includes active chat-bound, character, character extra, and persona lorebooks alongside manually selected lorebooks by default.
* Added diagnostics for manual/contextual lorebook counts and registered ToolManager tools, reducing false missing-source and enabled-tool warnings.
* Normalized candidate entry matching and added warnings when candidate JSON does not match loaded lorebook entry names.
* Added unit coverage for contextual Pathfinder lorebook merging and deduplication.

**Group Chats And Agents**
* Opening the Characters drawer during a group chat now jumps to the active group edit panel.
* Group Auto Mode now re-applies the saved global toggle when opening or creating group chats, while keeping the default off until the user enables it.
* Group DM history is included for the speaking character when returning to the main group chat without exposing private context to other speakers.
* Deleting a swipe clears pending post-generation recovery state so already-run post-generation agents do not fire again.
* Agent output history popups now use a scrollable desktop layout so long diffs keep Undo and Redo controls in view.

**Chat Naming And Workspace**
* Chat auto-naming now allows longer title responses and strips reasoning wrappers before parsing, making the Persona bottom-bar wand more reliable with reasoning models.
* Persona bottom-bar Auto-label Chat now uses structured title output when available and falls back to raw title parsing, preventing false `No message generated` errors.
* Workspace tabs and mobile shortcut options now place API immediately after Presets.
* CYOA Choices bundled regex now removes empty optional choice rows before rendering.

**Mobile Chat Stability**
* Added lazy/async loading hints for chat avatars and attached message images.
* Chat rendering now uses smaller mobile batches, ignores duplicate older-history touch/mouse activations, and contains off-screen messages to reduce WebKit layout and memory pressure.
* Mobile message updates now batch regex/HTML post-processing while keeping generation updates immediate.
* Streaming replies now patch formatted DOM in place, restore live formatted updates when stream fade-in is disabled, and reduce repeated swipe metadata cloning.
* Send flows now render user messages before slow handoffs, server ping, or group setup, then hold bottom scroll position to avoid iOS Safari send delays and snap-backs.
* Swipe navigation now anchors relative to the chat bottom and disables browser scroll anchoring on the chat scroller.
* New-message media scrolling now watches only visible media in the latest message and caps waits at 300 ms.

**Shell And Mobile UI**
* Fixed group speaker controls overflowing to the right when a typing indicator appears by allowing the desktop control row to wrap cleanly.
* The Bottom Bar Size slider now scales the SillyBunny chatbar and Persona bottom chat controls on mobile instead of only affecting the legacy composer sizing.
* Background Visibility now supports 100%, refreshes upgraded slider metadata, and keeps composer/chatbar surfaces readable at high visibility.
* Header, chatbar, composer, bottom chat surfaces, and Clean Minimal mobile drawer/menu panels now use solid layers in no-blur or high-visibility setups to prevent compositor artifacts.
* Mobile Workspace, navigation, Characters, and Quick Actions drawers now have tighter, more consistent spacing, safer bounds, and solid focused panels while keeping page context visible where intended.
* Characters drawer right-lock alignment now applies immediately on macOS desktop browsers and stays edge-flush on shorter windows without losing drag/resize behavior.
* Mobile Characters drawer layouts now use native shell bounds, safe-area gutters, aligned controls, and square avatars that avoid squeezing on narrow iOS-sized viewports.
* Mobile Top Bar Label option cards are left-aligned so checkbox, title, and helper text read cleanly in one-column settings layouts.
* Rotated the SillyBunny theme, tabs, and service-worker cache keys so browsers pick up the hardened surface styling immediately.

### v1.5.1 (2026-04-29)

This update restores Prose Polisher coverage for guided impersonation workflows, makes Advanced Formatting a first-class workspace tab again, adds conservative startup-loading improvements for desktop and mobile, and polishes cross-platform UI alignment, focus, safe-area, and touch-target behavior.

**In-Chat Agents**
* Added an opt-in prompt-pass condition for generated impersonation text so Prose Polisher can rewrite Guided Generations impersonations without mutating the previous assistant message.
* Shipped the bundled Prose Polisher template with impersonation polishing enabled, while keeping the new behavior off by default for other prompt-pass agents.
* Added editor UI and migration support for saved bundled Prose Polisher agents, plus unit coverage for both opted-out and opted-in impersonation behavior.

**Workspace And Formatting**
* Promoted Advanced Formatting into its own left workspace tab immediately after Sampling.
* Kept the Formatting tab visible across backends instead of hiding the whole Advanced Formatting drawer outside Text Completions.

**Loading**
* Deferred ordered classic library scripts, preloaded startup modules, and limited the mobile stylesheet to mobile viewports.
* Added a guarded service worker that stale-while-revalidates static library, CSS, image, and webfont assets while using network-first handling for HTML and JavaScript.

**UI Polish**
* Replaced clipped outer focus outlines and oversized active-control shadows with inset rings so focused and highlighted controls stay inside rounded containers.
* Aligned shell headers, character drawer padding, welcome headers, and checkbox labels across desktop and mobile breakpoints.
* Normalized mobile safe-area fallbacks and 44 px tap targets for the composer, bottom chat controls, and welcome recent-chat actions.
* Cleaned up redundant shell borders, trailing recent-chat stat dividers, and duplicated macOS browser chrome patches.
* Left-aligned SillyBunny shell drawer eyebrow labels, titles, subtitles, and descriptions across desktop and mobile.
* Contained shell close-button focus rings inside rounded borders so highlights no longer bleed past the control edge.
* Gave mobile Customize, Navigate, and Characters drawers a rounded native sheet treatment with a slide-up entry, handle pill, side gutters, and safe-area-aware header spacing.
* Stabilized mobile Recent Chats text sizing in WebKit with scoped text-size adjustment, stronger line-clamp bounds, and narrow-screen overflow guards.
* Tightened the mobile composer bottom spacing by removing duplicate safe-area padding and avoiding the forced 34 px fallback under the chat bar.

**Chat Management**
* Narrowed the Persona bottom chat bar on mobile with safe-area-aware side gutters while leaving the message composer width unchanged.
* Tightened mobile Persona bottom bar control heights, avatar sizing, icon buttons, gaps, and narrow-phone spacing so the bar no longer dominates the screen.
* Added Persona bottom bar shortcuts for mass deleting chats in the current character/group scope and asking the active LLM to name the current chat.
* Added aligned mass-delete checkboxes, protected the currently open chat, and included 7/30/90/180 day cleanup presets plus a matching `/autonamechat` command.

This patch also focuses on persistence and restart fixes for the new agentic and admin workflows introduced around `v1.5.0`.

**Chat And Reasoning**
* Persisted collapsed thinking/reasoning block state per message so user-expanded or user-collapsed reasoning blocks survive chat switches and reloads.

**Pathfinder**
* Added an independent Pathfinder enable switch in settings so saving books, modes, or prompt settings no longer toggles Pathfinder off unexpectedly.
* Preserved nested Pathfinder settings, including pipeline prompts, custom pipelines, book permissions, and tool confirmations, instead of resetting omitted fields back to defaults.
* Raised Pathfinder pipeline stage output limits from `1024` to `32000` tokens by default and exposed the stage max-token setting in both prompt editors.

**Server Admin**
* Fixed frontend Save & Restart and update restarts when launched from the provided Linux, macOS, and Windows launchers so the server relaunches in the same terminal instead of becoming a detached silent process.

[Find other changelogs in our Releases.](https://github.com/platberlitz/SillyBunny/releases)

---

## Upstream Information

SillyBunny is a fork of SillyTavern. Most SillyTavern behavior, data formats, and ecosystem knowledge still apply. Please report SillyBunny-specific issues here, while reporting SillyTavern adjacent issues upstream.

| Resource | Link |
|----------|------|
| Upstream repo | [SillyTavern/SillyTavern](https://github.com/SillyTavern/SillyTavern) |
| Upstream docs | [docs.sillytavern.app](https://docs.sillytavern.app/) |
| Discord | [discord.gg/sillytavern](https://discord.gg/sillytavern) |
| Subreddit | [r/SillyTavernAI](https://reddit.com/r/SillyTavernAI) |

If something feels off, compare against the upstream `release` branch first.

## Contributors

- [Platberlitz](https://github.com/platberlitz)
- [Geechan](https://github.com/Geechan)
- [TheLonelyDevil9](https://github.com/TheLonelyDevil9)

[Licensed as free software under the AGPL-3.0.](https://www.gnu.org/licenses/agpl-3.0.en.html)
