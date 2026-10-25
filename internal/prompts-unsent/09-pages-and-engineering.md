Valuta app, fix round 2 (same workspace): the two secondary pages and engineering. Keep the home page as it is.

## A. /new: create a payroll
1. **Validation:** show a field's error only after that field is blurred or the form is submitted. Today all five errors show before the user types anything. Errors sit inline under their field.
2. **Layout at ≥1024px:** the form on the left (max 480px), and on the right a sticky **live payslip preview** card in the same visual language as the ledger and inspector. It shows:
   - "Payday 01 · VALUE <first payday, UTC>"
   - "At today's MXN/USD 0.05356770 (round 326, published 24 Oct 14:42)" from `latestRoundData` on the selected currency's feed
   - "≈ 0.053567 USDC per payday", "Reserve covers N paydays", and for back pay, "N paydays will be due immediately"
   - three plain guarantees under a hairline: "The rate is fixed at each payday, from Chainlink round history." "Anyone can settle a due payday; lateness cannot change the amount." "The reserve cannot be withdrawn while pay is due."
3. **Currency select:** each option shows code plus today's rate ("MXN · 0.05356770").
4. **First payday:** a styled UTC datetime input with quick chips "Next hour", "Tomorrow 14:00", "Back pay: 10 days ago".
5. **Wallet:** one consistent Connect wallet treatment (the top-bar button's style). Remove the second boxed "Connect Wallet".
6. After a successful create: a confirmation with the new payroll id, the tx link, and a button to open `/payroll/<id>`.

## B. /lookup: rate as of any moment
7. **Open with an answer.** Prefill MXN and 2026-10-15 14:00 UTC, and show the result immediately: round, rate (8 decimals), publish time, its neighbours, and the same value-axis component as the inspector.
8. Quick presets: "Now", "1 hour ago", "Yesterday 14:00", "Payday 01 of payroll 1".
9. Beneath it, a **live rates board** of all 8 currencies (one multicall of `latestRoundData` on each feed): code, rate (8 decimals), round, published (UTC), and age ("3h 12m ago"). An age over 25 hours turns amber and reads "stale: next payday prices at the next round".

## C. Engineering
10. **Make typecheck and lint pass outside the Studio sandbox.** `scripts/compass-deploy.ts` imports `@circlefin/compass-chains`, which exists only in the sandbox. Exclude `scripts/` from `tsconfig` and from the oxlint run, or delete the scaffold scripts if the app doesn't use them.
11. **Bundle:**
    - remove unused scaffold code and SDK imports (anything from the Circle SDKs or modal kits the app doesn't use)
    - lazy-load the `/new` and `/lookup` routes and the wallet connector
    - goal: initial JS under 250 kB gzipped (it is about 485 kB today)
12. Keep the home page's data path as it is (Multicall3 batching); cold load to the claim is about 2.5 s today and must not get slower.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `vite build`, and report the gzipped size of the initial chunk.
