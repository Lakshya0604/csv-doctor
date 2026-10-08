# CSV Doctor

Preview and clean CSVs in your browser. React/Vite UI with a pure JavaScript transformation core. Cleaning runs locally; sign up to save finished runs to MongoDB through a small Express API (bcrypt + JWT).

Demo: https://csv-doctor-ihm2.onrender.com/

## Current features

- UTF-8 import or paste, with explicit comma, semicolon, tab or pipe separator.
- CSV quoting, multiline cells, UTF-8 BOM and row-width validation.
- Original/cleaned previews, 25-row pages, optional header trim, blank removal and exact duplicate removal.
- Explicit DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD dates to ISO; explicit US/European numbers. Invalid values block export.
- Optional spreadsheet formula protection. Risky cells and headers get an apostrophe; negative numbers also change. Review the log.
- Cleaned CSV and JSON change log downloads after review confirmation. Original input is preserved.
- 2 MB / 10,000-row limits. Input stays in browser memory; only runs you choose to save are stored.
- Accounts: signup/login, save a reviewed run (options, row counts, change log, cleaned CSV), list, download and delete runs, delete account. Data is per user in the `csvdoctor` MongoDB database.

## API

`server/index.js` (Express + Mongoose). Env: `MONGODB_URI`, `JWT_SECRET` (32+ chars), `CORS_ORIGIN`. Start with `npm start`; `npm run test:api` runs the integration test against `API_BASE`.

This is a cleanup tool, not accounting software. Formula protection does not guarantee safety in every spreadsheet application. Always review your output.

## Development

Node 22 (`.nvmrc`).

```sh
npm ci
npm run dev
npm test
npx playwright install chromium
npm run test:ui
npm run lint
npm run build
```

Build output: `apps/web/dist`. Core: `packages/core/index.js`. Tests: `packages/core/core.test.js`.

## Contribute

New contributors are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), then pick a focused issue labeled `good first issue`. Each starter issue explains the expected behavior, relevant files and checks.

Please don't submit real customer data, credentials or bulk cosmetic PRs. Useful bug reports, tests, accessibility fixes and clearer docs all count. See the guide for the source map, test commands and data-safety rules.

## License

MIT. See [LICENSE](LICENSE).
