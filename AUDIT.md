# Ledger usability review — September 9, 2026

This review followed real browser workflows before changing behavior. It covered
first use, a saved sample, normal typing, refresh, forecast changes, destructive
actions and recovery, keyboard access, and narrow screens. Earlier repairs from
this review were incorporated into the repository before the source was moved
into `js/` and `css/`; the final changes and regression suite use that layout.

## Reproduced problems and repairs

| Problem observed | Repair and evidence |
| --- | --- |
| A fresh visit threw an initialization error before showing a usable blank plan. | The empty-plan factory no longer reads uninitialized application state. A fresh browser context loads the guide and reaches editable income fields. |
| Forecast length remained visible in one-year mode because CSS overrode `hidden`. The header overflowed a 1024px viewport to 1111px. | Native hidden behavior is restored. Planning controls have their own expandable section with a readable period summary. All reviewed widths fit the page. |
| On phones, the first income column could fit the page while clipping its own inputs. Sticky labels also obscured forecast columns. | One-year forms stack labels and controls. Forecast tables scroll without a sticky label covering the editable year. Bounding-box checks cover input clipping, and a 320px workflow edits and reloads the tenth year. |
| Numeric blur rerendered controls and swallowed the next click; some edits and chart preferences did not reliably survive refresh. | Input updates persist immediately and refresh results in place. Tests type multi-character values, click the next field, and reload saved values and preferences. |
| Editing hours overwrote future years and prevented a zero-hour year. | Hours are independent per year, including zero. Tests switch modes and reload to verify later years remain intact. |
| Retirement rates entered before income were lost; negative deduction values could return after blur. | Preserve the intended percentage and cap calculated contributions separately. Normalize bounded inputs consistently. |
| Switching away from a forecast-only view, loading a sample, or resetting could leave the wrong panel visible. | A shared active-panel renderer controls both navigation and panel visibility. Forecast URL loading calculates all years before rendering. |
| Reset recovery disappeared after refresh, and failed storage writes were invisible. | A previous-plan backup survives reload, with in-memory recovery when storage fails and a visible storage notice. Cancellation and both recovery paths are tested. |
| Expense totals changed while the category distribution still showed old values. | Distribution, category percentages, annual hints, and table totals update without replacing the focused input. Setting housing to zero immediately removes its distribution segment. |
| A valid numeric entry `1e3` was saved as `13`. | Parsing preserves exponent notation and rejects nonnumeric content instead of stripping it into another number. The browser regression test saves `1000`. |
| The viewport restricted phone zoom; phone Sample and Reset actions had ambiguous icons. | Remove the zoom restriction and retain text labels for those actions. Phone controls use larger targets and the navigation exposes all sections. |
| Annual totals, end balances, and available cash were easy to confuse. | Labels distinguish time periods, cash and retirement assets, goal allocations, and shortfalls. Fixed-model assumptions are visible, including the simplified retirement scope. |

## Validation

`tests/browser.cjs` contains 25 browser checks, including 110 layout combinations:
320, 390, 768, 1024, and 1440px widths; dark and light themes; one-year and forecast
modes; and all available panels. Every workflow also checks for uncaught browser
errors. Tests use actual typing and clicks where interaction matters, along with
direct state setup for calculation fixtures and layout enumeration.

Coverage includes older saved plans, zero values, negative inputs, multi-character
typing, refresh persistence, storage failure, reset cancellation, undo, keyboard
category expansion, chart preferences, and a ten-year forecast on a narrow phone.
Independent cash-flow identities check that employee retirement and earmarked
goals do not inflate total assets. Screenshots were inspected at narrow phone and
desktop widths; page-width checks alone were insufficient and led to the added
input-clipping regression.

Run `npm ci` and `npm test`. To check a deployed copy, set
`LEDGER_URL=https://ledger.riverakarom.com/`. Each test uses isolated browser
storage. Test files and dependencies are excluded from the deployed assets.

## Follow-up: space and visual hierarchy

The first review's overflow checks missed excessive vertical space. In a saved
sample forecast, the workspace began approximately 647px below the viewport top
at desktop width and 939px down at 320px. Expanded settings, separate notices,
and a full-width headline metric displaced the actual planner.

The revised layout uses a compact plan toolbar, settings that open on demand,
an inline sample indicator, and an expandable explanation labeled "2025 model."
Actual storage failures retain their visible alert. Desktop figures share one
row; phone figures use a compact summary with two rows of section navigation.
Row management appears only in sections with removable rows. Values retain
their annual, forecast-total, or end-balance context.

Screenshots show the workspace starting around 311px on desktop and 516px on
the narrow phone. Additional checks exercise settings changes, Done, Escape,
focus return, outside-click dismissal, and reload persistence. A layout check
now verifies that the overview workspace appears in the first screen, in
addition to checking horizontal overflow. These measurements support a more
usable layout; they do not substitute for user feedback on the design.

## Remaining scope and limits

- Phone testing uses Chromium device emulation, not physical iPhones or Android
  devices. Native Safari behavior, virtual keyboards, and assistive-technology
  testing still require those environments. This is not a claim of universal
  browser compatibility or complete accessibility certification.
- The fixed 2025 tax model is not updated tax advice. The review checks app
  behavior and accounting consistency, not every tax rule or legal eligibility.
- Retirement applies one employee 401(k) limit to combined wages and simplified
  Roth eligibility. Individual employer plans, catch-up contributions, debt,
  inflation, and withdrawals remain outside the model and are disclosed in the UI.
- Plans remain local to a browser. Storage errors are visible, but clearing browser
  data or moving to another device does not transfer a plan.

## Repository audit — September 10, 2026

- Replaced the phone's clipped forecast editor with a section selector and one
  explicit editing year, including Previous/Next, persistence, and return to all
  columns on desktop. Financial overview metrics are hidden while editing.
- Moved transient undo into the plan toolbar; retained the existing persistent
  restore action. Preserved newer committed desktop table/waterfall work.
- Corrected federal 2025 standard deductions and the child credit; corrected
  California 2025 brackets, deductions, exemption amounts, and credit phaseout.
  Head-of-household receives one California personal exemption, not two.
- Traditional 401(k) now reduces modeled modified AGI for Roth eligibility and
  child-credit phaseout. Existing cash-conservation tests continue to pass.
- Escaped savings-fund identifiers before inserting them into HTML attributes.
  Added deployment security headers, with framing limited to this site and the
  portfolio origin. Inline scripts remain allowed because the current UI uses
  inline event handlers; this is a documented constraint, not a strict CSP claim.
- 29 browser checks cover the revised phone workflow, desktop regressions,
  federal deduction boundaries, the child credit, the FTB joint-income example,
  and Roth eligibility. Physical iOS Safari verification is still outstanding.

Tax references: [IRS Publication 501, Table 6](https://www.irs.gov/publications/p501),
[2025 Schedule 8812](https://www.irs.gov/pub/irs-prior/i1040s8--2025.pdf),
[FTB 2025 rate schedules](https://www.ftb.ca.gov/forms/2025/2025-540-tax-rate-schedules.pdf),
[FTB Form 540](https://www.ftb.ca.gov/forms/2025/2025-540.pdf), and
[FTB credit limitations](https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html).
NY standard deductions were checked against
[the state schedule](https://www.tax.ny.gov/pit/file/standard_deductions.htm).

Remaining release limits: the planner is a simplified fixed-year scenario tool,
not a complete tax engine. NY recapture and several retirement/credit eligibility
rules, age-dependent deductions, preferential investment-income tax rates,
refundability and debt/inflation modeling require further product work if those
are launch requirements. The archive is intentionally historical and is not
updated or deployed as a financial tool.
