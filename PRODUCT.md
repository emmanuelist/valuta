# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
**Primary: employers** who pay remote contractors whose pay is agreed in the contractor's own currency (MXN, BRL, EUR, JPY, CAD, AUD, KRW or ARS) and who want to settle in USDC. They create a payroll, fund its reserve, and keep it current. (Confirmed by the builder, 2026-10-25.)

Also involved:
- **Workers**, who receive each payday and want to see exactly which rate they were paid at, and why that rate.
- **Anyone at all** may settle a due payday. The settler has no say over the rate or the recipient.

Evaluation audience for the current build: Arc Microgrants 2 judges. They review time-boxed, from a link, and must be able to verify the claim against Arc mainnet themselves.

## Product Purpose
Valuta pays salaries agreed in local currency in USDC on Arc, at the Chainlink rate that was live at each payday. It exists because cross-border contractors are often contracted in their own currency while employers pay in dollars. Whoever converts, and *when*, decides what the worker actually receives, and a late payer can quietly pick a better rate.

Success means:
- every payday settles at a rate anyone can prove;
- a reserve can never be pulled out from under pay that is already due;
- a shortfall shows as public arrears, never as a silent skip.

## Positioning
The rate is fixed by **Chainlink round history as of payday**, so neither lateness nor who settles can change it. Each payday is proven against three facts:
- the round that was live at that moment;
- that the round's successor came after it;
- that the round wasn't stale.

Every payslip carries its round id. Stablecoin payroll platforms (Rise, Deel) convert off-chain at their own rate and spread. Valuta's conversion is a public, checkable fact on the payslip itself.

The name: *valuta* is a banking word for both **currency** and **value date** (the date whose value applies to a payment, whenever the money moves).

## Operating Context
- **Setup:** the employer sets a salary in local currency, a pay period (from 60 seconds to monthly), a number of paydays and a first payday, and funds a reserve in native USDC. The first payday may be up to 90 days in the past (back pay).
- **Settling:** paydays fall due on schedule. Anyone settles them, in order, up to 32 per transaction, passing the as-of round for each. The app finds those rounds itself.
- **Payout:** pay is pushed to the worker. If the push fails (a blocklisted address, or a contract that rejects it), the amount is credited for the worker to withdraw.
- **Ending:** the employer can end a payroll, and can reclaim the reserve only once no payday is due and no arrears remain.
- **Arc specifics:** USDC is the native gas token (18 decimals natively, 6 through the ERC-20 interface), finality is sub-second, and Chainlink FX feeds for the 8 currencies exist on Arc mainnet only, not on testnet.

## Capabilities and Constraints
- **Contract** (mainnet, Sourcify-verified, no owner, no admin, no upgrades):
  - writes: `create`, `fund`, `settle`, `withdraw`, `reclaim`, `end`
  - reads: `asOf(currency, t)`, `payslip`, `payslips`, `payrolls`, `duePreview`, `dueCount`, `nextPayday`, `quote`, `credit`, `currencies`, `payrollCount`
  - named refusals: `NotAsOfPayday`, `UnsettledPaydays`, `ArrearsOutstanding`, `InsufficientReserve`, `NotEmployer`, `NothingDue`, `StartTooOld`, among others
- **Rules:** staleness bound 25 hours (when the live round was stale, the payday prices at the first round after it). Payouts are floored to whole micro-USDC.
- **Every figure in the app is a contract or Chainlink read on Arc mainnet.** No demo mode, mock data, seeded fixtures or fake fallbacks.
- **All code is written by Arc Studio** and pulled into the repo (eligibility rule of the program).
- **Undecided:** payroll labels or names (nothing human-readable is stored on-chain; payrolls are identified by id, currency and addresses).

## Brand Commitments
- Name: **Valuta** (renamed from Asof on 2026-10-25 at the builder's request for a more professional name).
- The claim, used verbatim on every surface: *Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.*
- **Light is the default theme; dark must not be the default** ("because of clarity", builder, 2026-10-25). A dark theme may exist only as an option.

## Evidence on Hand
- Valuta v1 on Arc mainnet `0x2bDF0F489687a57a0E63E609281C3eC86dda76e9`: Sourcify exact match, with 10 back-pay paydays settled by a stranger in one transaction at 10 different rounds (docs/EVIDENCE.md E-011 to E-015).
- Named refusals were captured from the live contract (E-013).
- A fork test against the live MXN/USD and USD/ARS feeds (E-006).
- **v2 (on-chain payslips) is being deployed;** its address is recorded in docs/STATE.md once live.
- **Absences that must not be fabricated:**
  - no real customers or employers: the demo payrolls are the builder's own wallets, and the app and README must say so;
  - no testimonials, audits, volumes or partnerships.

## Product Principles
1. **The rate is a fact, not a decision.** Every payslip shows the round that fixed it, and why that round and not its neighbours.
2. **Lateness changes nothing, and the product shows it before it happens.** A due payday's amount is already decided; settling only moves the money.
3. **Nothing is hidden.** Arrears are public, refusals are named, and every number links to the chain.
4. **The chain is the only store.** If it can't be read from Arc, it isn't shown.
5. **Built for the employer's job, legible to the worker.** Operating a payroll is the employer's task; proving a payslip must take the worker one look.
