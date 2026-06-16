# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"תפוס את הכוכבים" (Catch the Stars) — a Hebrew (RTL), browser-based, single-page arcade game. No build tooling, no package manager, no test suite: it's plain HTML/CSS/JS served as static files.

- [index.html](index.html) — DOM structure (HUD, legend, overlays for game-over/stage-complete/level-complete)
- [style.css](style.css) — all visuals/animations
- [script.js](script.js) — entire game logic (~950 lines, no modules)

## Running / testing

There is no build step. Open [index.html](index.html) directly in a browser, or serve the folder with any static file server (e.g. `npx serve .`) for environments that disallow `file://` (gamepad/touch APIs work fine from `file://` too). There are no automated tests or linters configured — verify changes manually in-browser.

## Architecture

Everything lives in global scope in [script.js](script.js), organized into clearly delimited sections (look for the `// ----` banner comments) rather than modules/classes:

1. **Global mutable state** (top of file) — score, lives, combo, per-effect timers (`shieldTime`, `freezeTime`, `magnetTime`, `doublePointsTime`, `speedBoostTime`), stage/level counters. Nearly every function reads/writes these directly.
2. **Static config tables** — `baseStageTargets` (20 entries, one per stage), `stageNames`, `baseStarTypes` (emoji/points/spawn chance), `powerupTypes`. Stage/level scaling is just `baseValue * globalLevel`.
3. **UI sync functions** (`update*`) — push current state into the DOM. Call the relevant one(s) after mutating state; nothing re-renders automatically.
4. **Persistence** — `saveGameState()`/`loadGameState()` serialize/restore the full state object to `localStorage` (key `catchStarsSave_v1`). Autosaves every 30s while running, plus on stage complete/fail/pause. `loadGameState()` also resumes mid-stage if `gameRunning` was true, or advances/resets stage based on saved score vs. target.
5. **Object spawning** (`createStar`/`createBomb`/`createBlackhole`/`createLightning`/`createPowerup`) — each appends a positioned `<div>` to `#gameContainer`; falling speed and collision are handled generically.
6. **Game loop** (`gameLoop`, driven by `requestAnimationFrame`) — each frame: randomly spawns objects (probabilities scale with `globalLevel`/`spawnRate`), calls `moveObjects()` (moves every spawned element down, checks collisions with `#player`, applies magnet/freeze/double-points effects, awards points/lives/combo), ticks down effect timers, then checks stage target completion via `endStage(true)`.
7. **Stage/level flow** — `initStage()` → play → `endStage(success)` → `nextStage()`/`nextLevel()`/`retryStage()`. A level = 20 stages; finishing stage 20 increments `globalLevel` (which is also the score multiplier) and resets stage 1.
8. **Gamepad support** — separate always-running `gamepadLoop()` (RAF) polls `navigator.getGamepads()`. Routes input to `handleMenuInput()` (D-pad/stick navigation + highlight of `.gamepad-focus` buttons, A to confirm) when an overlay is visible, or `handleGameplayInput()` (stick/D-pad movement, LS-press/RT = speed boost, Start/Y = pause) during gameplay. Vibration (`gamepadVibrate`/`gamepadVibratePattern`) has a priority-lock mechanism so big "stage complete/fail" rumble isn't cut short by minor menu-nav rumble.
9. **Debug console commands** — `window.setlvl(stage)` and `window.addPoints(points)` are exposed globally for manual testing via the browser console (F12).

## Conventions worth knowing

- Hebrew/RTL throughout: UI text, comments, and section banners are in Hebrew. Match this style for in-file comments and any user-facing strings.
- Effect timers are measured in frames (ticked once per `gameLoop` call, ~60/s), not wall-clock time — e.g. `shieldTime = 600` ≈ 10s.
- Mouse, touch, and gamepad all funnel into the same `mouseX/mouseY` + `player.style.left/top` — keep new input methods consistent with that pattern rather than introducing a separate position model.
- After changing any piece of state that affects the HUD, call the matching `update*()` function explicitly — there's no reactive binding.
