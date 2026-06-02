**SillyBunny version 1.6.1 has released**
This release carries the post-1.6.0 staging line forward with safer chat rendering, sturdier preset/profile persistence, cleaner mobile navigation, more reliable Quick Replies, and a broad settings/tooling cleanup pass.

**Detailed Changelog**
- Chat rendering now routes bottom scroll, redisplay, show-more, message updates, streaming, swipe replacement, media resize, and mobile viewport handling through smaller lifecycle helpers.
- Mobile shell, preset/API sync, generation, extension boot, Prompt Manager, and tooling hydration behavior now have cleaner seams for safer future fixes.
- Connection profiles and presets now persist more reliably, including immediate preset saves, prompt-order resets, reverse-proxy backend binding, and current model fetching.
- Quick Replies now dedupe duplicate set names across loading, buttons, API listing, auto-execute, settings selectors, and context menus without dropping saved chat or character links.
- OOC and HTML context depth `0` now keeps the active turn while stripping older context messages.
- Sampler visibility startup no longer overwrites saved selections when browser storage is slow to respond.
- Added desktop vertical navigation settings, post-main agent intercept timing, OpenAI TTS audio format selection, current-chat files access, Quick Action icon picking, and compact Pathfinder controls.
- Fixed character avatar refresh, imported character selection, desktop Prompt Manager scroll, chat shell wheel routing, shell resize handles, Select2 dropdown surfaces, native chat style headers, bounded rendered messages, and wand message screenshots.
- Hardened duplicate agent initialization, local generation aborts, text-completion reasoning leaks, Guided Generations steering, post-agent provider-error handling, Pathfinder swipe reuse, and release-note coverage.

**How to update**
- Built-in updater: open Customize > Server and update from there.
- Git clone: run `git pull`.
- Launcher users: close and reopen Start.bat, Start.command, or start.sh.
- ZIP users: grab the new release directly.
