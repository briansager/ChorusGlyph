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

## Japanese romanization

Japanese readings are generated locally in the browser with Kuroshiro 1.2.1 and kuroshiro-analyzer-kuromoji 1.1.0. This provider does not send lyric text to a romanization service. The Kuromoji dictionary files are distributed locally with the application under `public/dict/` and are loaded from the Vite base path.

Kuroshiro and kuroshiro-analyzer-kuromoji are MIT licensed. Their Kuromoji dependency is Apache-2.0 licensed. The repository includes the relevant license files and Kuromoji `NOTICE.md` with the local dictionary assets.

Automatic readings are not guaranteed to be correct. Editable readings will be added in a later milestone. This milestone does not implement Chinese romanization, word-level readings, or server-side romanization.

## Korean romanization

Korean romanization is based on the official Korean Romanization rules published by the National Institute of Korean Language and the Ministry of Culture, implemented locally as a deterministic approximation. It uses no Korean romanization package, API, or network service.

This first implementation handles Hangul decomposition, basic vowel and consonant mappings, final consonant neutralization, common liaison, and a small number of common boundary cases. It does not cover every possible Korean pronunciation, sound-change rule, or proper-name exception. Readings will be editable in a later milestone.
