# Valuta

Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday, however late it settles and whoever settles it.

Built with [Arc Studio](https://studio.arc.io)

## What it does

An employer creates a payroll denominated in a local currency (MXN, BRL, EUR, JPY, CAD, AUD, KRW or ARS) and funds a USDC reserve. On each payday, anyone can settle by supplying the Chainlink round that was live at that exact timestamp. The rate is locked to that moment — settling late, or settling it yourself, cannot change the amount. Shortfalls become public arrears rather than silent skips. Every settled payday is stored on-chain as a `Payslip`, so the app can read a full payroll ledger in one call without scanning logs.

## Tech stack

- **Solidity ^0.8.30** — `contracts/Valuta.sol`
- **Foundry** — build, test, deploy
- **Chainlink AggregatorV3** — oracle feeds (real proxies on Arc mainnet; TestFeed mock for testnet/tests)
- **Arc Testnet / Arc Mainnet** — USDC is the native gas token (18-decimal)
- **React + Vite + TypeScript + Tailwind** — frontend (coming soon)

## Development

### Prerequisites

- [Foundry](https://getfoundry.sh/) (`forge`, `cast`, `anvil`)
- [Bun](https://bun.sh/)

### Install

```bash
bun install
```

### Environment variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL | Optional outside Arc Studio |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token | Optional outside Arc Studio |
| `RPC_PROXY_CHAINS` | Comma-separated chain keys | Optional outside Arc Studio |
| `ARC_RPC_URL` | Arc mainnet RPC URL for fork tests | Optional (fork tests skip without it) |

### Run the frontend dev server

```bash
bun run dev
```

### Build contracts

```bash
forge build
```

### Run unit tests

```bash
forge test --match-path "contracts/test/*.t.sol"
```

### Run fork tests (requires Arc mainnet RPC)

```bash
ARC_RPC_URL=<arc-mainnet-rpc> forge test --match-path contracts/test-integration/ValutaFork.t.sol -vv
```

### Deploy to Arc Testnet

```bash
DEPLOY_MODE=testnet forge script contracts/script/Deploy.s.sol --broadcast
```

### Deploy to Arc Mainnet (run yourself with your own key)

```bash
DEPLOY_MODE=mainnet forge script contracts/script/Deploy.s.sol --rpc-url $ARC_MAINNET_RPC --broadcast --private-key $PRIVATE_KEY
```

## Contracts

| File | Description |
|------|-------------|
| `contracts/Valuta.sol` | Main payroll contract |
| `contracts/TestFeed.sol` | Chainlink mock for testnet and tests |
| `contracts/script/Deploy.s.sol` | Two-mode deploy script (testnet / mainnet) |
| `contracts/script/Ops.s.sol` | Operational scripts: create, fund, settleDue |
| `contracts/test/Valuta.t.sol` | Core unit tests |
| `contracts/test/Valuta.Extra.t.sol` | Additional unit tests |
| `contracts/test/Valuta.Payslip.t.sol` | Payslip storage and batch view tests |
| `contracts/test-integration/ValutaFork.t.sol` | Fork tests against Arc mainnet feeds |

## Arc Testnet deployment

| Contract | Address |
|----------|---------|
| Valuta (current) | `0x3a95e355464b7bccbafd5a18fd608bd48558d647` |
| TestFeed (mock) | `0xd69e04323082945455defd0f1b8712186a5488d2` |
