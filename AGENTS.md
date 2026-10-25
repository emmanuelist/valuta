# Agents: start here
Read CLAUDE.md. It holds the build rules, the operating protocol, and (through its import) the current state in docs/STATE.md. Everything an agent needs is in the repo; nothing depends on chat history.

## This is NOT a normal EVM project
- Code is written by **Arc Studio** (`arc-studio run`), not by hand in this repo. See "How code gets written here" in CLAUDE.md.
- **Arc is not Ethereum.** USDC is the native gas token (18 decimals native, 6 through the ERC-20 interface, one balance). Native transfers can revert at runtime. Stock `anvil` does not reproduce Arc's rules; use `arc-forge` and `arc-anvil --network arc`. Read docs/CONTEXT.md before writing anything that moves value.
