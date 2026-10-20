# Mordecai's Study Guide

A phone-first vocabulary trainer for Czech speakers reading (and listening to) *Dungeon Crawler Carl* by Matt Dinniman.

> New achievement! You learned a word.

Fan project, not affiliated with the author or publishers. Example sentences are original, not quotes from the books.

## How it works

- **Daily training:** due reviews (spaced repetition) plus a few new words per day.
- **New words come from the chapter you're about to read** (set on the home screen), so you meet them before the reading session. Words from later chapters stay locked, so nothing is spoiled.
- **Exercise mix:** flashcards both ways, multiple choice both ways, listening (single word and whole sentence, using the phone's built-in voice), and fill-the-gap. Settings shows how often each type is used and how often it's answered right, and lets you switch types off.
- **Add your own words** on the Words tab while reading. They show up first in the next training.
- **Progress lives on the phone** (localStorage). Use Settings → Save backup now and then.
- Works offline once installed (PWA).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173, also on your LAN for phone testing
npm test
npm run build    # outputs dist/
```

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo.
2. Framework preset: **Vite** (build command `npm run build`, output directory `dist`).
3. Every push to `main` redeploys automatically.

## Adding words

Words live in [`src/data/words.json`](src/data/words.json). Each entry:

| field | required | notes |
|---|---|---|
| `id` | yes | unique kebab-case |
| `en` | yes | English word/phrase as displayed |
| `cs` | yes | Czech translation(s) |
| `pos` | no | part of speech |
| `def` | no | simple English definition (B1 level) |
| `ex` / `exCs` | no (together) | **original** example sentence + Czech translation |
| `gap` | no | exact text inside `ex` to blank out, when the word appears inflected (e.g. `dodged`) |
| `book` | yes | book number |
| `chapter` | no | chapter where it first appears; omit for general series vocabulary |
| `tags` | no | `game`, `combat`, `sounds`, `describe`, `feelings`, `phrasal`, `slang`, `story` |

`npm test` checks ids are unique and every `gap` appears in its sentence.
