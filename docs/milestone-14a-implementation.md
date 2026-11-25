# Milestone 14A implementation report

Implemented the compact navy workspace, Timed Glyph identity, shared outline icons, responsive forms, clearer metadata/search wording, numeric timing adjustment, and explicit comparison states. No commits, pushes, dependency changes, or deployments were made.

The selected workspace was empty. Implementation is in `C:\Users\Brian\Documents\ChatGPT\ChorusGlyph`, copied from `C:\Users\Brian\Documents\GitHub\ChorusGlyph` with its existing uncommitted source changes and demo fixture preserved. The original checkout remains untouched. The untracked `companion/` directory and mock fixture were already present in that original checkout; they are not new milestone features.

| Changed files | Result |
|---|---|
| `src/app/App.tsx` | Compact introduction, section order, conditional suggestions, active document metadata, prepared-search snapshot wiring, removal of public milestone badge. |
| `src/styles/index.css` | Exact color tokens, spacing scale, role typography, button states, control boundaries, responsive layouts, visible focus, multilingual line height, reduced motion. |
| `src/features/now-playing/WindowsCompanionPanel.tsx` | Native metadata-mode fieldset, optional companion wording, separate connection state, demo metadata never changes the displayed live connection or selected radio. |
| `src/features/lyric-suggestions/LyricSuggestions.tsx`, `lyric-suggestion-state.ts` | Metadata-only provenance, accurate completeness explanation, “Select suggestion” preserving the old select handler, primary preparation action, stable dismissal focus, independent prepared-search snapshot retained across candidate arrivals/edits/dismissal. |
| `src/features/lyrics-source/LyricsSourcePanel.tsx` | Persistent format/required guidance, editable prepared fields, neutral prepared notice, search focus including cancellation during loading, stale-request invalidation on explicit replacement or local loading. |
| `src/features/synced-lyrics/SyncedLyrics.tsx` | Active lyric title/source, passive timestamp, unchanged preview mathematics, accurate preview labels, synchronized numeric offset, invalid-entry handling, language-first options and secondary engine/version information. |
| `src/features/provider-comparison/ProviderComparison.tsx` | Explicit idle/loading/success/empty/cache/error states, stable compatible-first presentation, compact unavailable rows, neutral online labels, sample text badges, distinct Han-only selection wording. Existing retry and cache scope retained. |
| `src/shared/ui/Icon.tsx`, `TimedGlyph.tsx`, `provider-labels.ts` | Shared icon inventory, decorative accessible SVG presentation, brand symbol, language/provider labels without independent language state. |
| `public/timed-glyph*.svg`, `public/favicon.svg`, `index.html` | Standard/dark/light/monochrome symbols and outlined horizontal wordmarks; dedicated simplified, color-scheme-aware favicon. No embedded fonts, gradients, filters, or animations. |
| `src/test/{App,WindowsCompanionPanel,LyricSuggestions,LyricsSourcePanel,SyncedLyrics,ProviderComparison}.test.tsx`, `src/test/lyric-candidates.test.ts` | Updated wording assertions and regression coverage for state separation, production guards, snapshots, cancellation, success/failure loading, focus, offset validation, and empty comparison output. |
| `scripts/verify-milestone14a.cjs`, `scripts/verify-milestone14a-external.cjs` | Repeatable browser QA using an existing Playwright installation; no project dependency added. |

Verification completed:

- Full suite: **26 files / 155 tests passed**. After final semantic/copy edits, the affected four component suites also passed (**20 tests**).
- TypeScript project check and production build passed. A `/ChorusGlyph/` base-path build verified prefixed asset and favicon URLs; the final build was restored to the default base.
- Chrome keyboard checks covered paste loading, file chooser activation and explicit file load, candidate selection/editing/preparation/cancellation, slider and numeric offset adjustment, preview start/pause/restart, native language selection, Han-only radio arrow keys, and provider comparison.
- Preparation made no external request. Candidate arrival retained focus. Search received a visible 2 px focus outline with 2 px separation. In-flight cancellation restored search focus, ignored a late response, and preserved active lyrics. Failure/no-results retained entered values and lyrics; mocked success used the existing LRCLIB loading path.
- Production UI contained no demo activation button or development helper. Demo metadata retained Manual selection and “Not connected.”
- No page overflow or controls outside their panels at **320, 390, 768, 1024, and 1440 CSS px**, including long edited metadata and Japanese/Chinese/Korean/Thai lyrics with combining marks. A **320 px / 200% font-and-line-height stress check** also passed layout containment. Screenshots were reviewed separately from keyboard checks.
- Computed-color contrast checks covered default/error, primary hover/pressed, selected, success and cached states. Minimum checked text contrast: **5.17:1**. Control borders: **4.04:1 or greater**; focus ring: **10.55:1 or greater**; selected indicators: **7.39:1 or greater** against the panel surfaces.
- Reduced motion removed transitions; loading text remained visible. Timestamp updates have live announcements disabled. Brand artwork was inspected at **16, 20, 24, 32 and 48 px**, plus the dedicated 16 px favicon.
- Protected-tree comparison found no content differences in **688 companion files, 42 domain files, 2 tracked workflow files, and 12 tracked proxy files**, ignoring checkout line endings. Package manifests/lockfile and Vite/Vitest configuration also remain unchanged.

Evidence is in [`artifacts/milestone-14a/`](../artifacts/milestone-14a/): browser reports, provenance comparison, five viewport captures, production captures, enlarged-text capture, and brand size sheet. To repeat browser QA, start the Vite development server on port 5173 and preview server on port 4173. Set `PLAYWRIGHT_MODULE` to an existing Playwright module path when it is not installed in the caller's environment, then run the two scripts. The main script also accepts `QA_BASE_URL`.

Known limitations:

- **Pre-existing LRCLIB native-fetch receiver issue:** the unchanged domain client saves `fetch` as an instance property and invokes it with the client as receiver. Chrome rejects this with “Illegal invocation” before issuing a request. This was reproduced independently; it was not changed as part of the visual milestone. To exercise mocked pending/success/error responses in a real browser, the external QA script binds `window.fetch` only in its isolated test page. Its report explicitly records that shim. Live LRCLIB functionality is therefore not claimed as verified.
- No live companion, Azure service, or LRCLIB service was contacted. Unit coverage and intercepted responses verify the relevant request boundaries and presentation paths.
- Screen-reader testing with NVDA/JAWS/VoiceOver and native browser text-only zoom were not performed. The enlargement check scales computed font sizes and line heights; it is a layout stress test. These checks and screenshots do not establish full WCAG conformance.
- Vite continues to report the existing large application chunk (about 662 kB before gzip). Dependency restructuring was outside this milestone.
