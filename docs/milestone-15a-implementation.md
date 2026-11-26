# Milestone 15A — lyric result review and correction

Implemented in the GitHub checkout on master after af3d102. No files are staged, and no commits, pushes, deployments, or repository-setting changes were made.

## Review and replacement behavior

- Explicit Search LRCLIB uses the stable public /api/search endpoint. Preparing a suggestion, changing companion metadata, opening previews, selecting a card, and confirming replacement do not issue additional requests.
- Zero, one, or multiple results are presented for review. No result is automatically selected or loaded, including a single result.
- Each card shows title, artist, album when supplied, duration or an unavailable label, language or an unavailable label, timing availability, LRCLIB attribution and record ID when supplied, and metadata-match explanations.
- Preview details displays the returned lyrics locally. Select lyrics opens a separate replacement confirmation with the current document and selected result. Only Confirm replacement invokes the existing onLoaded callback.
- Confirmation cancellation returns focus to the selected card. Review cancellation returns focus to Search LRCLIB. Search again focuses the editable query without running a request. Manual and local-file actions focus their existing controls and retain explicit Load actions.
- Form edits, new explicit preparation, cancellation, and local loading invalidate old responses and pending selections. Errors/no results do not replace the active document. Successful loading still resets/restores reading state through App's existing onLoaded implementation.
- Unsynchronized, empty, and malformed-timing records can be inspected but cannot replace the timed workspace. They explain the manual/LRC alternatives.
- The native-fetch receiver issue documented in Milestone 14A is corrected in the shared LRCLIB client, with both a regression test and a real-browser intercepted-request check.

## Matching rules

The prepared song's title, artist, album and language are captured independently of active lyrics and later candidate arrivals. Duration is prefilled from existing companion metadata and can be explicitly corrected; its reviewed value is used locally, without mutating the candidate snapshot. Manual searches compare against their own entered metadata.

Title, artist and album reuse the existing Unicode/whitespace/case/punctuation normalizer. Live/remix/featuring distinctions are retained and explained rather than treated as identical editions. Durations within two seconds are described as close; unavailable durations are not guessed. Explicit language metadata is compared using primary language tags and known aliases; lyric text is not used to guess language.

Internal ordering is deterministic: normalized title agreement contributes 3, artist 2, album 1, duration 1, and language 1. Disagreement subtracts the corresponding weight, except language disagreement subtracts 2. Unknown data contributes nothing. Equal scores retain API order. No score or percentage is presented as lyric-match probability. Every result requires confirmation regardless of its metadata score.

Duplicate grouping compares normalized metadata, duration, language, instrumental state, and both lyric payloads; IDs alone do not determine equivalence. Identical payloads across IDs are grouped. Different editions, languages, lyric text, or timings remain separate.

## Changed files

- src/app/App.tsx — passes the active document into the replacement confirmation.
- src/domain/lyrics-candidates/companion-candidate.ts — carries already available valid duration metadata.
- src/domain/lyrics-candidates/lyric-candidate-types.ts — optional candidate duration.
- src/domain/lyrics/lrclib-client.ts — validated multi-result search, shared existing HTTP/error handling, safe native-fetch invocation.
- src/domain/lyrics/lrclib-source.ts — shared conversion function used by both legacy lookup and reviewed-result loading.
- src/domain/lyrics/lrclib-types.ts — incomplete search-result metadata and local matching reference types.
- src/domain/lyrics/lyrics-types.ts — optional album/language metadata retained with a loaded document.
- src/features/lyric-suggestions/lyric-suggestion-state.ts — complete prepared metadata snapshot.
- src/features/lyrics-source/LyricsSourcePanel.tsx — explicit review/selection/confirmation/cancellation state.
- src/features/lyrics-source/LrclibResultReview.tsx — new result cards, previews, and accessible confirmation UI.
- src/features/lyrics-source/lrclib-result-review.ts — new matching and duplicate grouping logic.
- src/styles/index.css — responsive cards, previews, and confirmation focus styling.
- src/test/App.test.tsx — actual application active-document preservation and confirmed loading.
- src/test/LyricsSourcePanel.test.tsx — result-selection, confirmation, cancellation, stale-response, error, missing-metadata, wrong-language, untimed, manual, file, and duration-correction cases.
- src/test/lrclib-client.test.ts — search contract, validation, error handling and native-fetch receiver regressions.
- src/test/lyric-candidates.test.ts — prepared metadata snapshot persistence and valid duration handling.
- src/test/lrclib-result-review.test.ts — new normalization, ordering, mismatch and duplicate tests.
- docs/milestone-15a-implementation.md — this report.

## Verification

- Full test suite: 27 files, 188 tests passed.
- Production build, including TypeScript: passed.
- git diff --check: passed.
- Chrome with intercepted, self-written LRCLIB responses: explicit request gating, duplicate grouping, previews, keyboard selection/cancellation/confirmation, active lyric preservation, pending cancellation/late-response protection, and no-results correction passed. Native browser fetch required no test shim.
- No page-level overflow at 320, 390, 768, 1024, or 1440 CSS pixels. Desktop review and mobile confirmation screenshots were visually inspected.
- Hash checks confirm all 688 companion files, proxy files, workflow files, .env.local, Git metadata, Vite configuration, and package manifests/lockfile are unchanged. No Pages settings were accessed or changed during implementation.
- IndexedDB, provider comparison, manual timer, reading overrides, and companion protocol were not changed; their existing regression suites pass.

## Remaining limitations

- LRCLIB normally does not provide language metadata. Unknown language is displayed honestly; automatic lyric-language classification is outside this milestone.
- Untimed lyrics remain preview-only because the existing workspace requires timed LRC.
- The current stable search API returns at most 20 records and has no pagination. No alternate provider or scraping fallback was added. See the [official API documentation](https://lrclib.net/docs.txt).
- Browser checks used local intercepted responses, not a live LRCLIB lyric lookup. No API keys or dependencies were added.
- Vite retains its large-chunk warning (about 672 kB before gzip). No dependency restructuring was performed.
