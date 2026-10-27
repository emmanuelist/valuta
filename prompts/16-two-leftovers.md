Valuta, part 9 (same workspace): two leftovers from turn 15, both measured in the production build. Change nothing else.

1. **The tracing still ships.** `src/config.ts` line 9 imports `registerChain` from `./tracing`, so `tracing.ts` is still bundled: it patches `fetch` and logs `[studio-trace] patching fetch` to every visitor's console. Remove that import and the `registerChain` call. Delete `src/tracing.ts` and `src/console-capture.ts`. The production console must be empty on load.
2. **The countdown chip is still 4.1:1.** `CountdownChip` correctly sets `color: var(--state-due-ink)` (#6B3A0C), but `.countdown-chip-due` in `index.css` overrides it with `color: var(--state-due) !important` (#9a6417 on #F5E7CF). In that rule (and its phone variant), use `var(--state-due-ink)` for the text colour. The border can stay `--state-due`.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`, and confirm the built JS no longer contains the string "studio-trace".
