# ChorusGlyph Transliteration Worker

This Cloudflare Worker is a small proxy for Azure Translator Transliterate. Azure credentials stay in Cloudflare secrets; the GitHub Pages frontend calls only this Worker.

The Worker does not store lyrics, romanized text, or server-side cache entries. Its in-memory rate limit is best effort because Worker instances are distributed and may restart.

## Local setup

Install dependencies:

```bash
npm install
npm test
npx wrangler types
```

Configure local secrets without committing them:

```bash
npx wrangler secret put AZURE_TRANSLATOR_KEY
```

Set `AZURE_TRANSLATOR_REGION` as a secret or environment variable when the Azure resource requires it. `wrangler.jsonc` contains only non-secret defaults for the Azure endpoint and allowed development origins. Do not create or commit `.dev.vars`, `.env`, or credential files.

## Routes

- `POST /api/transliterate` validates an allowlist of language/script pairs, requires an allowed `Origin`, limits text to 1000 characters, applies a best-effort 20 requests/minute/IP limit, and forwards only the validated request to Azure.
- `GET /api/transliteration-languages` retrieves transliteration metadata with `scope=transliteration`. Only metadata is cached briefly in the Worker runtime.
- `OPTIONS` supports CORS preflight for allowed origins.

The frontend Worker URL is public configuration. Azure keys are never placed in frontend code.
