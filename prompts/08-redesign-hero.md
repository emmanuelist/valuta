Redesign the Valuta app's home and `/payroll/:id` pages so **the payslip is the hero**. This replaces the current visual layer. The data layer (Multicall3 reads, single-block getLogs, simulate-then-write) stays.

Two reference files are attached:
- `context/08-redesign-spec.md`: the complete spec (tokens, fonts, every region's box in 1344-wide px, the payslip's contents and their chain reads, the honest timeline, the coupon row, the motion, live data, due and upcoming states). Follow it in full.
- `context/redesign-a-specimen.png`: the approved composition (2× scale). At 1344×760 the first viewport must match it region for region.

The non-negotiables, in short:
1. **Fonts:** Hanken Grotesk for words, Spline Sans Mono for every figure (tabular). Light theme. Petrol #0B4F6C, carbon blue #1F3886 for the paid amount. **Lateness is quiet grey text, never red.** Red only for a refused cheat (VOID).
2. **The payslip** is a security document:
   - a perforated top edge (CSS mask) and a faint guilloché ground
   - the rotated value-date stamp, and rate, salary and amount lines formatted from bigints (rates with all 8 decimals)
   - **the counterfactual struck through**, computed from `asOf(currency, settledAt)`
   - a **RATE HELD guilloché seal generated in SVG from a hash of the payslip's roundId and payday**, unique per payslip
   - three proof facts from `getRoundData(r)`, `getRoundData(r+1)` and `maxAge()`
   - "settled by … not the employer" (or "by the employer"), and the tx
3. **One honest timeline:** previous round, as-of round (ringed), payday, next round, a break, settlement. Spacing is log-proportional to the gaps, with no hourly ticks and no label collisions on real data (Arc's FX rounds are 7–24 h apart).
4. **The coupon row:** one coupon per payday stamped HELD, DUE, CREDITED or upcoming, scroll-snap, keyboard ←/→ and j/k, `aria-current`.
5. **Live:**
   - the block number in the top bar
   - a countdown chip to the next value date
   - refetch on new blocks (throttled)
   - a newly due payday stamps itself DUE and stays highlighted until seen
6. **Due payslips:** an "already fixed" amount, **Settle now** (connects the wallet if needed, simulates, then leaves a receipt), and **Try to cheat it** (a read-only `settle(id, [round+1])` showing the chain's decoded `NotAsOfPayday` as a VOID stamp).
7. **Motion:** "stamp, travel, hold" per spec §3 (framer-motion). The amount never moves while time moves. Reduced motion shows final states instantly.
8. Delete the old ClaimBand KPI strip, ProofInspector, ValueAxis and SettlementAxis components and the payroll tab row once replaced. Mount exactly one payslip instance.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `vite build`. Report the files changed.
