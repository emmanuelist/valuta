# Valuta: demo run-of-show (also the film script)

**Thesis in one line:** *Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.*

Target: **about 2:30**. The submission requires the video to show **the build in Arc Studio** and **the mainnet transaction**. Every figure on screen is a live read; no slide claims anything the chain doesn't hold.

The one moment everyone must see: **payday 01's inspector**. The payday line locks onto round 292, round 293 sits six minutes later at a higher rate, and the settlement marker lands ten days to the right while the amount does not move.

---

## Pre-flight
- [ ] The production app is live (Vercel) and the home page has loaded once (warm).
- [ ] An Arc Studio workspace is open, logged in (the builder's browser), on project `ad133b3b…`: chat history, `contracts/Valuta.sol`, a test run.
- [ ] Payroll 2 has a payday due (every even hour UTC), so the live settle has something to do. Pause the keeper about 5 minutes before recording, and restart it afterwards.
- [ ] A wallet holding STRANGER's key is connected on Arc mainnet in the recording browser. It's a demo wallet, disclosed as the builder's.
- [ ] Explorer tabs pre-opened: the v2 contract, the stranger's settlement tx `0x82ff…38b7`, the Sourcify page.
- [ ] Backup: the full recorded film, plus stills of every shot.

## Cold open: the problem (0:00–0:15)
> "A contractor in Mexico City agrees to be paid in pesos. Her employer pays in dollars, and pays late. Which day's exchange rate does she get? Today, whoever pays decides."

Shot: the app home page, still. The claim band reads **MXN 1.00 → 0.053897 USDC**.

## Act 1: the feel (0:15–1:00)
1. Click **payday 01** in the ledger. **The lock** plays.
   > "Payday was the 15th of October at 14:00. Chainlink round 292 was live then. That's the rate, and it is now a fact."
2. **The reversal.** Point at round 293, published at 14:06.
   > "Six minutes later the rate moved up. A late payer settling today could try to use it. The contract refuses: `NotAsOfPayday`, by name."
   Cut to the terminal (read-only call against mainnet) showing the decoded refusal.
3. The settlement marker, ten days later.
   > "This payday was settled ten days late, by a wallet that has nothing to do with the payroll. Same amount, to the micro-USDC."
4. Scroll the ledger: ten paydays, ten different amounts, one salary. Then the eleventh, settled on time.

## Act 2: built in Arc Studio (1:00–1:40)
Shot: the Studio workspace (the builder's browser).
- The chat: prompt 01 ("Build the smart contracts for Asof…") through prompt 07 (the app).
- `contracts/Valuta.sol`, the as-of rule.
- Studio's test run: 96 tests, with its audit findings and the fixes it made (phase handling, `answeredInRound`).
- The testnet deploy panel.
> "Arc Studio wrote the contract, the tests and this app, from seven prompts, all published in the repo. It deploys to testnet only, so we deployed its exact source to Arc mainnet. Sourcify says exact match."

Shot: the Sourcify page, then the contract on explorer.arc.io.

## Act 3: live on mainnet (1:40–2:15)
1. Open **payroll 2** (BRL 0.10 every 2 h). A payday is due, and its amount is already shown: "rate already fixed".
   > "This payday's amount was decided at 16:00. Anyone can press Settle."
2. Press **Settle** as the stranger wallet. The tx confirms in about a second. A payslip appears, marked "settled just now", with its round and "on time".
3. Click the tx through to explorer.arc.io: real USDC moved through the contract.

## Close: the thesis (2:15–2:30)
> "Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it."

Limits, one line: "Unaudited, and the demo payrolls are our own wallets. Every function is open, so anyone can run one."

---

## If something breaks
- The app is slow: use the pre-opened explorer tabs and narrate the payslip from `payslips(1, 0, 64)` in the terminal.
- No payday is due: use payroll 1's next daily payday, or record at the next even hour.
- Studio is unreachable: use stills of the workspace captured earlier, plus the `prompts/` folder on GitHub.
