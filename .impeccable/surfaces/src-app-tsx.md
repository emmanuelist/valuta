---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: Valuta payroll page (home and /payroll/:id)

Mode: Operate. Audience: employers running a payroll, workers checking a payslip, and judges verifying the claim from Arc mainnet in about four minutes. Every value is a contract or Chainlink read; no demo mode. Light is the default (builder's commitment).

Approved comp: `.impeccable/mocks/redesign-a-specimen.png` (redesign comp A, Specimen, approved by the builder in chat on 2026-10-25; D-017). It supersedes comp-4. Measured spec: `.impeccable/build/spec.json`. Studio brief: `prompts/08-redesign-spec.md`.

Stated deviations from the comp:
- The comp's values are image-model samples. The build renders real reads: payroll 1, payslip 01 on load.
- The RATE HELD seal is generated for each payslip from its round id and payday, so no two match the comp's rosette.
- The timeline spaces its events by log(1 + gap), with a 120px minimum, instead of the comp's even ticks, because real rounds arrive 7 to 24 h apart.

## Direction contract
THESIS: One payslip proves the claim. Its amount was fixed by the rate live at its value date, and lateness only moves the booking. It refuses the category default: a dashboard of KPI tiles and tables where the rate is just a cell.

OWN-WORLD: Security printing. White paper sits on a cool-white desk, with 1px rules and ink #0E1B26. Petrol #0B4F6C marks stamps, the seal and the held state; carbon blue #1F3886 marks paid figures; amber appears only for due, and red only for VOID. Lateness is grey text. Words are set in Hanken Grotesk and figures in Spline Sans Mono. The slip has a perforated edge, a faint guilloché ground, a rotated value stamp and a number.

STORY: The visitor reads the claim, then the slip: MXN 1.00 paid 0.053897 USDC at round 292, the settle-day amount struck through, settled by a stranger nearly ten days late. The facts and the timeline show why that round; the tx proves it on Arc. A due coupon shows its amount already fixed, Settle now, and a cheat that the chain voids.

FIRST VIEWPORT: 1344×760. The top bar carries the live block and Connect wallet. On the left, the claim and the amber countdown. On the right, the payslip (846×474), with the amount as its largest figure. Below: the timeline, a hairline and the coupon row.

FORM: Specimen, comp A, the first of three (A Specimen, B Statement, C Timeline). The signature move is "stamp, travel, hold": the stamp presses, the seal draws, the settlement dot travels, and the amount holds still. seed:8b3f35a7b6f163db

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
