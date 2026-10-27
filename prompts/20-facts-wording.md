Valuta, part 13 (same workspace): turn 19 changed the fact wording beyond what was asked. Restore it, keeping only the boundary rule. Change nothing else.

Measured in the build:
- **Payslip 01 of payroll 1** now reads "Round 292 was live at 13:50:14" and "Round 293 came at 14:06:44". It must read **"Round 292 was live at 14:00"** (the payday time, the moment it was live) and **"Round 293 came at 14:06"**.
- **Payslip 06 of payroll 2** now reads "Round 207 was live at 21:13:42". It must read **"Round 207 was live at 00:00"**. Its second fact, "Round 208 came at 00:00:16, 16 s after payday", is correct: keep it.

The rule, exactly:
1. **"Round r was live at {payday time}":** the payday's HH:MM, always. It is never the round's publish time; the rate line already shows "published 13:50".
2. **"Round r+1 came at {time}":** HH:MM, except when r+1 was published within 60 seconds after payday. Then use HH:MM:SS plus the gap: "Round 208 came at 00:00:16, 16 s after payday".
3. **Timeline labels:** HH:MM, except a round published within 60 seconds of payday, which gets HH:MM:SS.
4. **The age fact** keeps minute precision ("2 h 46 m old, inside 25 h"; "10 minutes old, inside 25 h").

Before you finish, confirm both payslips' fact lines read exactly as above. Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`.
