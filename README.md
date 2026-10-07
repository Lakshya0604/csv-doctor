# CSV Doctor

Preview and clean CSVs locally in your browser. React/Vite UI with a pure JavaScript transformation core. No accounts, database, uploads, analytics or API keys.

## Current features

- UTF-8 import or paste, with explicit comma, semicolon, tab or pipe separator.
- CSV quoting, multiline cells, UTF-8 BOM and row-width validation.
- Original/cleaned previews, 25-row pages, optional header trim, blank removal and exact duplicate removal.
- Explicit DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD dates to ISO; explicit US/European numbers. Invalid values block export.
- Optional spreadsheet formula protection. Risky cells and headers get an apostrophe; negative numbers also change. Review the log.
- Cleaned CSV and JSON change log downloads after review confirmation. Original input is preserved.
- 2 MB / 10,000-row limits. Browser memory only; refresh clears input.

This is a cleanup tool, not accounting software. Formula protection does not guarantee safety in every spreadsheet application. Always review your output.

## Development

Node 22 (`.nvmrc`).

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

Build output: `apps/web/dist`. Core: `packages/core/index.js`. Tests: `packages/core/core.test.js`.

## Publication status

Private preview. License, public release, contribution guide and community issues are pending owner review. No license has been selected yet.
