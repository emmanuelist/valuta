# Valuta

Salaries agreed in pesos, reais or euros, paid in USDC on Arc at the Chainlink rate that was live on payday — however late it settles and whoever settles it.

Built with [Arc Studio](https://studio.arc.io)

## What it does

An employer creates a payroll in a local currency (MXN, BRL, EUR, JPY, CAD, AUD, KRW, or ARS) and funds a USDC reserve. Each payday is converted at the Chainlink rate that was live at that exact payday timestamp. Settling late — or having a third party settle — cannot change the rate. If the reserve is short, the shortfall becomes public arrears, not a silent skip. The employer cannot reclaim the reserve while any payday is unsettled or arrears are outstanding.

## Tech stack

- Solidity `^0.8.30`, Foundry (`forge build`, `forge test`)
- Arc chain: USDC is the native gas token (18-decimal `msg.value`)
- Chainlink AggregatorV3 price feeds
- No owner, no admin, no pause, no upgradeability

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Bun (for the frontend build)

### Install

```bash
bun install
```

### Build contracts

```bash
bun run contracts:build   # forge build
```

### Test contracts

```bash
bun run contracts:test    # forge test --match-path "contracts/test/*.t.sol"
```

Fork tests (Arc mainnet) require a live RPC:

```bash
ARC_RPC_URL=<arc-mainnet-rpc> forge test --match-path contracts/test-integration/ValutaFork.t.sol -vv
```

### Deploy (testnet)

```bash
DEPLOY_MODE=testnet forge script contracts/script/Deploy.s.sol \
  --rpc-url <ARC_TESTNET_RPC> --private-key $PRIVATE_KEY --broadcast
```

### Deploy (mainnet — run yourself)

```bash
DEPLOY_MODE=mainnet forge script contracts/script/Deploy.s.sol \
  --rpc-url <ARC_MAINNET_RPC> --private-key $PRIVATE_KEY --broadcast
```

### Operational scripts

```bash
# Create a payroll
forge script contracts/script/Ops.s.sol:Ops \
  --sig "create(address,address,bytes3,uint256,uint256,uint256,uint256,uint256)" \
  <valuta> <worker> <currency> <salary> <start> <period> <count> <reserve> \
  --rpc-url $ARC_MAINNET_RPC --private-key $PRIVATE_KEY --broadcast

# Settle all due paydays for a payroll
forge script contracts/script/Ops.s.sol:Ops \
  --sig "settleDue(address,uint256)" <valuta> <id> \
  --rpc-url $ARC_MAINNET_RPC --private-key $PRIVATE_KEY --broadcast
```

## Environment variables

| Variable | Purpose | Required outside Arc Studio? |
|----------|---------|------------------------------|
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL | No (Arc Studio only) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token | No (Arc Studio only) |
| `RPC_PROXY_CHAINS` | Comma-separated proxy chain keys | No (Arc Studio only) |
| `ARC_RPC_URL` | Arc mainnet RPC for fork tests and mainnet ops | Yes (for fork tests / mainnet) |
| `PRIVATE_KEY` | Deployer/operator private key | Yes (for mainnet scripts) |

## Arc Testnet addresses

| Contract | Address |
|----------|---------|
| Valuta | `0x807aecf42b356ee43abf95a83343e4bf3bd08516` |
| TestFeed (shared mock) | `0xd69e04323082945455defd0f1b8712186a5488d2` |
