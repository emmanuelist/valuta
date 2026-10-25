---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: Valuta payroll page (home and /payroll/:id)

Mode: Operate. Audience: employers running a payroll, workers checking a payslip, and judges verifying the claim from Arc mainnet in about four minutes. Every value is a contract or Chainlink read; no demo mode. Light is the default (builder's commitment).

Approved comp: `.impeccable/mocks/comp-4-combined.png` (comp-3's top band plus comp-2's ledger and inspector, approved by the builder in chat on 2026-10-25).

Stated deviations from the comp:
- The eyebrow "PROOF INSPECTOR · PAYDAY 01" becomes a payday stepper control in the same box (the craft floor bans eyebrows).
- The selected row's thick left bar becomes a tint plus a 1px petrol ring.
- Comp figures in rows 02–08 and the chart are image-model placeholders; the build renders real reads.

## Direction contract
THESIS: The page owns one idea: a payday's amount is fixed by the rate live at its value date, and lateness only moves the booking. It refuses the category default, a dashboard of tiles and status pills where the rate is just a cell.

OWN-WORLD: A premium value-date statement. Cool white #F7F8F9 ground, white surfaces with 1px #E3E6EA rules, ink #0F1720, and one committed petrol #0B4F6C for brand, selection and the as-of ring. Vermilion #D93F2B is reserved for lateness, amber #B7791F for due. Radio Canada Big carries every word; Geist Mono only rates, rounds, amounts and ids, with tabular figures. Small-caps value stamps read "VALUE 15 OCT 14:00". Payslips are numbered in sequence (No. 07 of 20).

STORY: The visitor reads the claim as a number (MXN 1.00 → 0.053897 USDC) and sees that the totals are live from mainnet. They open payday 01, watch the payday lock onto round 292 while settlement lands 10 days later, and click through to the explorer. An employer settles a due payday whose amount is already shown, fixed.

FIRST VIEWPORT: 1344×890.
- Top bar: wordmark, three links, petrol Connect wallet.
- Claim band: the headline at left (cap 33px), three live totals at right.
- Ledger card (left, 55%): rows 01–08 with value stamps and late tags, then due row 11 with Settle.
- Proof inspector card (right, 45%): payday stepper, "Why 0.053897 USDC", the value axis (rounds 291, 292 ringed, 293, payday line), the settlement axis with its break, ids and the explorer link.

FORM: Statement of Account (IMPECCABLE'S PICK; my #1 grounded candidate), raised to premium per the builder's see.md. Signature interaction, "the lock": selecting a payday draws its payday line, rings the as-of round, and slides the settlement marker to its date while the amount stays still. A payday settled while you watch stays marked until seen (raised from the boarding pass). Seed key cb9c1bd0.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
