# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-page Tetris game implemented in vanilla JavaScript with no build system, package manager, or dependencies. The entire game lives in two files:

- `index.html` — page structure, layout, and all styling (inline `<style>` block)
- `game.js` — all game logic

## Running the game

There is no build step. Open `index.html` directly in a browser, or serve the directory with any static file server, e.g.:

```
python3 -m http.server 8000
```

There are no tests, linter, or package.json in this repo.

## Architecture (`game.js`)

The game is a single global-scope script (no modules) structured around one mutable `player` object and one `board` matrix:

- **Board/piece representation**: `board` is a 2D array (`COLUMNS` x `ROWS`, 10x20). Tetromino shapes are defined in `SHAPES`, where nonzero cell values double as indices into the `COLORS` array — this is why merging a piece into the board (`merge`) and clearing lines just copies/compares these numeric values directly.
- **Two canvases**: the main `#tetris` canvas is scaled via `ctx.scale(BLOCK_SIZE, BLOCK_SIZE)` so all drawing code works in 1-unit-per-cell coordinates (see `drawMatrix`); the `#next-piece` preview canvas is drawn unscaled with its own pixel-size constant, in `drawNextPiece`.
- **Game loop**: `update()` is a `requestAnimationFrame` loop that accumulates `deltaTime` into `dropCounter` and calls `pieceDrop()` once it exceeds `dropInterval`. Difficulty scaling happens in `increaseSpeed()`, called after every line clear.
- **Collision & rotation**: `collide()` checks the active piece's matrix against board bounds and filled cells. `rotatePiece()` rotates in place via `rotateMatrix()` (transpose + reverse) and performs a simple iterative wall-kick (nudging `pos.x` left/right) if the rotation collides, reverting fully if no offset works.
- **Piece lifecycle**: `resetPiece()` promotes `player.next` to `player.matrix`, generates a new `player.next`, and re-centers the piece at the top; if the fresh piece immediately collides, `triggerGameOver()` fires.
- Comments and UI text are in Spanish (`index.html` has `lang="es"`); keep this consistent when editing.

## CI

`.github/workflows/claude.yml` and `.github/workflows/claude-code-review.yml` run Claude Code (via `anthropics/claude-code-action`) on `self-hosted` runners — one responds to `@claude` mentions in issues/PR comments, the other auto-reviews PRs. Both require `CLAUDE_CODE_OAUTH_TOKEN` as a repo secret.
