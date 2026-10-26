# Valuta: demo run-of-show (also the film script)

**Thesis in one line:** *Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.*

Target: **about 2:30**. The submission requires the video to show **the build in Arc Studio** and **the mainnet transaction**. Every figure on screen is a live read. No slide claims anything the chain doesn't hold.

The one moment everyone must see is **payslip 01's "stamp, travel, hold"**:
- the value stamp presses "VALUE 15 OCT 2026 · 14:00 UTC"
- the RATE HELD seal draws
- the settlement dot travels ten days to the right
- the amount, 0.053897 USDC, does not move

Then the chain refuses the cheat, on screen.

---

## Pre-flight
- [ ] The production app is live (Vercel) and has loaded once (warm).
- [ ] An Arc Studio workspace is open and logged in, in a browser we can record, on project `ad133b3b…`. It shows the chat, `contracts/Valuta.sol` and a test run.
- [ ] A payday is due for the live settle: payroll 2 at an even hour, or payroll 3 at 14:00 UTC. Pause the keeper about 5 minutes before recording, and restart it afterwards.
- [ ] The wallet that settles on camera is a disclosed demo wallet (STRANGER), connected on Arc mainnet.
- [ ] Explorer tabs pre-opened: the v2 contract, the stranger's settlement tx `0x82ff…38b7`, the Sourcify page.
- [ ] Backup: the full recorded film, plus stills of every shot.

## Cold open: the problem (0:00–0:12)
> "A contractor in Mexico City is paid in pesos. Her employer pays in dollars, and pays late. Which day's exchange rate does she get? Today, whoever pays decides."

Shot: the home page, still. The claim on the left; payslip No. 01 on the right.

## Act 1: the payslip (0:12–1:00)
1. Click coupon **01**. **Stamp, travel, hold** plays.
   > "Payday was the 15th of October at 14:00. Chainlink round 292 was live then, so that's the rate. It's on the payslip, and the payslip is on-chain."
2. Point at the three facts and the struck-through line.
   > "Round 293 came six minutes after payday. This payday was settled nine days late, by a wallet with nothing to do with the payroll, and the amount didn't move."
3. **The reversal.** Scroll to "Try to cheat it." and press **Run all**.
   > "Watch the chain refuse. Pay it at round 293's rate: VOID, `NotAsOfPayday`. The employer pulls the reserve while pay is due: VOID. The honest round goes through."

   Each attempt replays the real call at the block before payday 01 was settled.
4. Cut to payroll 2's coupon 06.
   > "This one was settled almost seven hours late. Round 208 arrived sixteen seconds after its payday, so it still paid at round 207. To the second."

## Act 2: built in Arc Studio (1:00–1:40)
Shot: the Studio workspace.
- The chat, from prompt 01 ("Build the smart contracts for Asof…") to the redesign turns.
- `contracts/Valuta.sol`: the as-of rule.
- Studio's test run, with its audit findings and the fixes it made.
- The testnet deploy panel.
> "Arc Studio wrote the contract, the tests and this app. Every prompt is published in the repo. Studio deploys to testnet, so we deployed its exact source to Arc mainnet. Sourcify says exact match."

Shot: the Sourcify page, then the contract on explorer.arc.io.

## Act 3: live on mainnet (1:40–2:15)
1. Open the payroll with a due payday. Its coupon is stamped DUE, and the slip shows the amount "already fixed".
   > "This payday's amount was decided the second it came due. Anyone can press Settle."
2. Press **Settle now** as the stranger wallet. The tx confirms in about a second. The receipt card appears, and the coupon flips to HELD with "settled just now".
3. Click the tx through to explorer.arc.io: real USDC moved, from the reserve to the worker.

## Close: the thesis (2:15–2:30)
> "Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it."

Limits, in one line: "Unaudited, and the demo payrolls are our own wallets. Every function is open, so anyone can run one."

---

## If something breaks
- **The app is slow:** use the pre-opened explorer tabs, and narrate payslip 01 from `payslips(1, 0, 64)` in the terminal.
- **No payday is due:** use payroll 3 at 14:00 UTC, or record at the next even hour for payroll 2.
- **Studio is unreachable:** use stills of the workspace captured earlier, plus the `prompts/` folder on GitHub.
- **The cheat replay fails** (RPC without history): use the captured refusals in E-021 and E-022, read from the terminal.
