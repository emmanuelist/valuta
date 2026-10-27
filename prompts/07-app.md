Build the Valuta web app in this workspace's Vite + React + Tailwind app (`src/`), reading **Arc mainnet**. This is the product a judge will use, so build it to production quality.

Two reference files are attached:
- `context/07-app-spec.md`: the complete spec (chain and contract, reads and writes, routes, visual tokens, the exact first-viewport layout, motion, responsive behaviour, states, acceptance). Follow it in full.
- `context/comp-4-combined.png`: the approved composition. At 1344×890 the first viewport of the home page must match it region for region (the spec lists each region's box in px).

The non-negotiables, in short:
1. **Real data only.** Every number comes from Valuta v2 at `0x7d209Fbd9999C8fe37b4e6B3CCeF41DbbAF3252a` on Arc mainnet (chain `arc`, id 5042, from `viem/chains`), from the Chainlink feeds, or from the chain itself. Delete the scaffold's demo mode, sample data and testnet config. Import the ABI from this workspace's Foundry output for `contracts/Valuta.sol`.
2. **Fast reads.** Batch through Multicall3 (`0xcA11bde05977b3631167028862bE2a173976CA11`, live on Arc mainnet): `payrolls(1, 64)`, `payslips(id, 0, 64)`, `duePreview(id, 32)`, plus the neighbouring Chainlink rounds. Find a settlement tx with `eth_getLogs` on exactly one block (`payslip.settledBlock`). Never scan block ranges; Arc's RPCs refuse 10,000 blocks or more.
3. **Light theme only.** Petrol #0B4F6C is the single brand colour; vermilion #D93F2B means lateness and nothing else. Radio Canada Big for all text; Geist Mono only for data, always with tabular figures. No gradients, glass, glow, eyebrow labels or thick coloured left borders.
4. **The signature is the proof inspector.** Its value-time axis shows the round before, the round live at payday (petrol ring) and the round after, with the payday line between. Its settlement axis shows when the money actually moved. "The lock" motion (spec §6, framer-motion) plays when a payday is selected, and the amount itself never moves.
5. **Anyone can settle.** Due paydays show the amount `duePreview` already fixes, and a Settle button that calls `settle(id, roundIds)` with those round ids. Simulate every write first, and translate custom errors (`UnsettledPaydays`, `NotAsOfPayday`, …) into one plain sentence each.
6. **Every state designed:** loading skeletons, empty, RPC error with retry, wrong network, not connected (read-only), pending, confirmed and failed transactions with explorer links, arrears, ended payroll, credited payout with Withdraw.
7. **Responsive:** stack at 1100px or narrower. At 640px or narrower, the top bar collapses, rows take two lines, and the inspector opens as a bottom sheet. No horizontal scroll at 360px.
8. **Routes:** `/`, `/payroll/:id` (with `?payday=N`), `/new` (create with a live quote preview), `/lookup` (rate as of any moment). Use a tiny History-API router plus a `vercel.json` rewrite to `index.html`.

Finish with `bun run typecheck`, `bun run lint` at zero warnings, and `vite build` all passing. Then open the preview and confirm the home page shows payroll 1's ten real payslips, with payday 01 locked to round 292 between rounds 291 and 293.
