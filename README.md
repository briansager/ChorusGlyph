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

Automatic readings are not guaranteed to be correct. Editable readings will be added in a later milestone. Word-level readings and server-side romanization are not implemented.

## Korean romanization

Korean romanization is based on the official Korean Romanization rules published by the National Institute of Korean Language and the Ministry of Culture, implemented locally as a deterministic approximation. It uses no Korean romanization package, API, or network service.

This first implementation handles Hangul decomposition, basic vowel and consonant mappings, final consonant neutralization, common liaison, and a small number of common boundary cases. It does not cover every possible Korean pronunciation, sound-change rule, or proper-name exception. Readings will be editable in a later milestone.

## Chinese romanization

Chinese readings are generated locally in the browser with pinyin-pro 3.29.5 using pinyin tone marks. pinyin-pro is MIT licensed. No API key or network request is required for Chinese romanization, and the installed npm package is bundled with the application rather than loaded from a CDN.

Automatic pinyin readings may be imperfect, especially for names, dialectal pronunciation, or ambiguous characters. Editable readings will be added in a later milestone.

## Local romanizer chain and cache

The current fallback chain contains only the local Japanese, Korean, and Chinese providers. It chooses providers in that order when automatic selection is requested; the manual selector still lets you choose a specific provider. Azure and an optional AI fallback are planned, but they are not implemented.

Completed romanization results may be cached only in the user's browser using IndexedDB. ChorusGlyph does not store lyrics-related cache data on its server, and local romanization makes no network request. Browser site-data controls can be used to clear the cache. If IndexedDB is unavailable or blocked, romanization continues without caching.

## Azure transliteration fallback

Azure Transliterate is an optional later fallback for scripts without a local provider. Browser requests go only to the Cloudflare Worker in `proxy/`; the Azure endpoint and credentials are never called or included by the frontend. The Worker does not store lyrics or romanization results and does not use a third-party proxy.

Set the public frontend variable `VITE_TRANSLITERATION_WORKER_URL` only to the Worker base URL. The Azure key belongs in Cloudflare with `npx wrangler secret put AZURE_TRANSLATOR_KEY`; never commit `.env`, `.dev.vars`, or real secret values. The Worker also accepts an optional `AZURE_TRANSLATOR_REGION` secret and uses non-secret endpoint/origin configuration from `wrangler.jsonc`.

The Worker uses a best-effort in-memory limit of 20 requests per minute per IP. Because Workers are distributed and can restart, this is not a strict global quota. Azure pricing and free-tier limits can change: the current documented F0 pricing value is 2 million characters per month, not a permanent guarantee, and only one Azure free-tier resource is available per subscription. An Azure subscription and Translator resource are required.
