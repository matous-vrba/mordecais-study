# Mordecai's Study Guide

A PWA (React + Vite + TypeScript, no backend) that teaches English vocabulary from *Dungeon Crawler Carl* to a Czech native speaker who uses it mainly on her phone. Her partner and she read the book together a paragraph at a time (audiobook, then printed text, then translating). The goal is for her to follow the audiobook without stopping, so listening matters most.

## Adding words (the most common task)

The user will often send a list of words from a chapter, e.g. "book 1 ch 12: skulk, gristle, …". For each:

- Append to `src/data/words.json` with `book` and `chapter` set. See the field table in README.md.
- `cs`: natural Czech, several meanings separated by commas if needed. Mark vulgar words as such in `def`.
- `def`: simple English (B1), one short line.
- `ex`: write an **original** sentence in the DCC tone. Never copy sentences from the books (copyright). Keep it short and spoiler-free for chapters after the one given.
- `exCs`: a natural Czech translation of `ex`.
- If the word appears inflected in `ex`, set `gap` to the exact inflected text.
- Skip words already in the file (search `en` and `id`).
- Run `npm test` and `npm run build`, then commit and push. Cloudflare Pages redeploys from `main`.

## Conventions

- UI copy: simple English, with a short Czech hint after a `·` where instructions matter.
- Progress is stored in localStorage (`mordecai.progress.v1`). If you change the `Progress` shape, keep `normalize()` in `src/lib/storage.ts` backward compatible, because her real progress lives there.
- Scheduling: `src/lib/srs.ts` (simplified SM-2) and `src/lib/session.ts` (builds the daily queue).
