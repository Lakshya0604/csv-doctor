# Contributing to CSV Doctor

Start small. A good first contribution can be a failing test for a CSV edge case, a clearer error message, an accessibility fix or a useful example.

1. Read the README and run the synthetic sample locally.
2. Check existing issues and pull requests before starting.
3. Comment on an issue to say what you want to work on. For larger changes, discuss the approach first.
4. Fork the repo and create a branch for one focused change.
5. Add or update tests. Include a synthetic fixture when the change handles a new CSV case.
6. Run `npm run lint`, `npm test`, `npm run build` and `npm run test:ui`. Install the test browser first with `npx playwright install chromium`.
7. Open a pull request describing the problem, the change and the checks you ran. Include before/after screenshots for UI changes.

## Find your way around

- `apps/web/src/App.jsx`: import, preview, cleanup controls and downloads.
- `apps/web/src/style.css`: responsive styles.
- `packages/core/index.js`: parsing, validation and pure transformations.
- `packages/core/core.test.js`: deterministic core tests.
- `tests/ui.spec.js`: browser tests, including file import and download contents.
- `fixtures/`: synthetic sample data.
- `.github/workflows/ci.yml`: lint, core tests, build and browser tests.

The parser already accepts UTF-8 BOM, quoted commas and quoted newlines. Empty input, invalid rows and duplicate headers have checks. Please reproduce a bug before filing it as a defect.

## Data and safety

- Use synthetic or properly anonymized fixtures only.
- Never include API keys, passwords, personal data or real customer exports.
- Keep processing local. Do not add telemetry, uploads or model calls without discussing the change.
- Preserve the original input. A transform must show what changes and require the user's choice.
- Do not infer an ambiguous date, locale or currency silently.
- Formula protection is explicit and changes the output. Do not hide those changes from the log.

## Useful pull requests

Keep changes focused. Avoid unrelated formatting, generated star/contributor lists or multiple overlapping fixes. Explain AI-assisted code you submit and run the checks yourself; you are responsible for the result.

Be respectful when reporting bugs or reviewing code. The maintainer may ask for a smaller change or a test before merging.
