# Design

## Style

SillyBunny is a product UI. Visual design serves repeated workflows: chatting, switching personas, managing presets, searching settings, editing characters, and controlling extensions. The shell should feel calm, compact, and familiar, with enough warmth to match the fork's personality.

## Color

Use a restrained strategy by default: tinted dark surfaces, clear text contrast, one accent for active selections and primary actions, and semantic colors only for status. Avoid making inactive controls saturated. Existing theme customization remains the source of truth for user-selected accents.

## Typography

Use a stable product scale, not viewport-fluid type. Prefer Figtree with system UI fallbacks for shell and form text. Use broad fallback fonts only when needed for language coverage. Use mono fonts only for code-like surfaces, token/debug output, or structured prompts.

## Layout

Favor predictable app-shell patterns: top navigation, side panels, drawers, tabs, and dense but scannable settings groups. Do not add cards inside cards. Use responsive structural changes on mobile instead of shrinking everything.

## Components

Controls should have clear default, hover, focus, active, disabled, loading, and error states. Icon buttons should use familiar icons and tooltips. Loading states should reserve space and use skeleton-like placeholders where content layout is known.

## Motion

Use short 150-250 ms transitions for state changes. Prefer transform and opacity. Respect reduced motion. Avoid decorative page-load choreography and animations that change layout.

## Performance Notes

The first viewport should load only what it needs to display the shell and active chat. Heavy panels, broad font families, optional extension assets, and feature-specific CSS should be deferred where compatibility allows. Mobile and low-power devices are the performance baseline.
