# ChorusGlyph

ChorusGlyph is a privacy-conscious multilingual sing-along app. It is a portfolio project by Brian Sager, built to make lyrics easier to follow with editable romanized readings for languages such as Japanese, Korean, and Chinese.

The initial frontend uses React, TypeScript, Vite, Tailwind CSS, and Vitest. ChorusGlyph is being written independently, with Lyrica serving as inspiration only.

## Project principles

- ChorusGlyph will not host or scrape copyrighted lyrics.
- Lyrics will come from user input, LRC files, or permitted APIs.
- The project will avoid sending user content to outside services without a clear reason and user understanding.
- This repository contains no copyrighted song lyrics; any examples use self-written placeholder text.

## LRCLIB lookup

Milestone 4 adds LRCLIB as an external lookup source for synchronized lyrics. Requests are made directly from the browser to LRCLIB's lookup endpoint when the user presses Search. ChorusGlyph does not publish, host, or store lyrics, and LRCLIB lookup does not grant permission to redistribute copyrighted lyrics.

## Development

```bash
npm install
npm run dev
```

Run the checks with:

```bash
npm run test
npm run build
```

## Planned roadmap

1. **Milestone 1 — Frontend foundation:** Set up the React application, styling, testing, and basic responsive shell.
2. **Milestone 2 — Lyrics model and editor:** Add domain types and a local editor for user-provided lyric lines and romanized readings.
3. **Milestone 3 — Synced lyric display:** Support timing data from user-provided LRC files and a readable sing-along view.
4. **Milestone 4 — LRCLIB lookup:** Add an explicit browser-side lookup for permitted synchronized lyric metadata.
5. **Milestone 5 — Language tools:** Add carefully scoped romanization helpers and language-aware editing experiences.
6. **Milestone 6 — Now-playing experience:** Connect permitted song metadata and playback context without making the app a lyric host.
7. **Milestone 7 — Privacy and polish:** Improve accessibility, offline-friendly behavior, documentation, and release quality.

The roadmap is provisional and will evolve as the project is built.
