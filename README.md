# Asof

Salary-in-local-currency payroll on Arc, paid in USDC at the Chainlink rate that was live at each payday — no matter when settlement happens.

Built with [Arc Studio](https://studio.arc.io)

## What it does

An employer agrees a salary in a worker's currency (MXN, BRL, EUR, JPY, CAD, AUD, KRW, or ARS) and funds a USDC reserve. Each payday is priced at the Chainlink rate that was live at that payday's timestamp ("as of payday"). Settling late, or having a stranger settle on your behalf, cannot change the rate. A shortfall becomes public arrears — never a silent skip. The employer cannot reclaim the reserve while any payday is due and unsettled.

## Tech Stack

- Contracts: Solidity 0.8.30 + Foundry (via-ir, Cancun EVM)
- Oracles: Chainlink AggregatorV3 (8 Chainlink USD feeds on Arc mainnet)
- Chain: Arc Testnet (default) / Arc Mainnet
- Token: USDC as native gas (18-decimal on Arc)
- Frontend: React 18, Vite, TypeScript, Tailwind CSS (coming in a later turn)

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`)
- [Bun](https://bun.sh/)

### Install

```bash
bun install
```

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL | Optional (Arc Studio injects this) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy auth token | Optional (Arc Studio injects this) |
| `RPC_PROXY_CHAINS` | Comma-separated chain keys for the proxy | Optional (Arc Studio injects this) |

No user-managed environment variables are required to build or test the contracts.

### Build

```bash
bun run contracts:build
```

### Test

```bash
bun run contracts:test
```

### Deploy to Arc Testnet (testnet mode, uses TestFeed mocks)

```bash
forge script contracts/script/Deploy.s.sol --rpc-url <ARC_TESTNET_RPC> --broadcast
```

Set `DEPLOY_MODE=mainnet` to print the mainnet constructor arguments without deploying (mainnet deployment must be done by the project owner with their own wallet).

## Deployed Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| Asof | `0x7b7c47f3fab266f12a66d3693adff05564bf9016` |
| TestFeed (shared mock) | `0xd69e04323082945455defd0f1b8712186a5488d2` |
