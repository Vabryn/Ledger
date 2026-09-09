# Ledger — Household Financial Planner

A single‑page planner for a household's **income, taxes, expenses, and
retirement** — for one year or a multi‑year forecast. Enter your numbers (or
load a clearly‑labelled sample), and every figure — take‑home pay, effective
tax rate, monthly surplus, end‑of‑year cash and 401(k)/Roth balances — updates
live. Nothing leaves the browser.

**Live:** <https://ledger.riverakarom.com>

<p align="center">
  <img src="docs/01-overview.png" alt="Overview tab: monthly surplus, income/tax/expense/retirement summary, and the cash-flow chart" width="100%">
</p>

---

## What it does

- **One year or a forecast.** Toggle between a single tax year and a multi‑year
  horizon; each year in the forecast is edited independently.
- **Tax estimate.** A fixed 2025 model: federal brackets, FICA (Social Security
  + Medicare), and state income tax for **CA and NY**. Traditional 401(k) is
  pre‑tax; Roth is post‑tax. The header shows the blended effective rate.
- **Five views** of the same plan — Overview, Income, Expenses, Taxes,
  Retirement & Savings — each a table you can edit in place, with per‑year
  columns in forecast mode.
- **Expenses** break into a fixed set of categories (Housing, Food,
  Transportation, Utilities, Subscriptions, Health & Wellness, Lifestyle,
  Entertainment, …), shown as category cards or a spreadsheet, with a
  proportional spending bar.
- **Charts.** Cash Flow (gross / take‑home / expenses / savings) and Wealth
  Growth (cash + retirement over the horizon), as bars or an area chart —
  hand‑drawn SVG, no chart library.
- **Sample plan / Reset**, with a one‑step undo. Dark and light themes.

<p align="center">
  <img src="docs/04-expenses.png" alt="Expenses tab with the category spending breakdown" width="49%">
  <img src="docs/03-light.png" alt="Overview in light theme" width="49%">
</p>

---

## How it's built

- **Zero build.** `index.html` + `app.js` + `style.css`, plain vanilla
  JavaScript — no framework, no bundler, no runtime dependencies. The only
  network request is Google Fonts (Inter, JetBrains Mono).
- **All local.** State lives in `localStorage` (`ledger_v2_planner_state`, plus
  `ledger_v2_previous_plan` for undo). No backend, no accounts, no analytics.
  There is nothing to sign into and nothing is transmitted.
- **Safe by construction.** Every user‑entered label is HTML‑escaped before it
  reaches the DOM; numeric inputs are coerced and `NaN`/`Infinity`‑guarded
  before they enter the tax math.
- **Deploy:** Cloudflare Workers static assets — `npx wrangler@4 deploy` from
  this folder. `.assetsignore` keeps `legacy/`, `docs/`, `LICENSE` and screenshots
  out of the bundle.

### Layout

```
Ledger/
├── index.html            markup + layout
├── app.js                planner state, tax engine, rendering, SVG charts
├── style.css             design system (dark + light)
├── legacy/               the original pre-split single-file version (reference)
└── wrangler.jsonc        Cloudflare static-assets deploy config
```

---

## Run it locally

```bash
cd Ledger
python3 -m http.server 8000
# open http://localhost:8000
```

No install step. Click **Sample** to populate an example household, or
**Reset** to start from a blank plan.

---

## Scope & disclaimer

The tax model is a **planning estimate**, not tax advice — a fixed 2025
schedule, federal + FICA + CA/NY state only, no itemized deductions beyond the
standard deduction, no AMT, no credits phase‑outs. Use it to compare scenarios,
not to file.

## License

Proprietary — see [`LICENSE`](LICENSE). Published for portfolio review only; no
reuse, redistribution, or commercial use without written permission.
