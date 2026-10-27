Valuta, part 12 (same workspace): precision at the boundary, the product's strongest proof. Change nothing else.

Payslip 06 of payroll 2 (payday 26 Oct 00:00:00 UTC) was priced at round 207, because round 208 was published at **00:00:16**, sixteen seconds after payday. Today its facts read "Round 207 was live at 00:00" and "Round 208 came at 00:00", and its timeline labels round 208 "00:00". At minute precision the proof reads as a contradiction: a round "coming at" the payday minute.

1. **Facts:** when a round's publish time is within 60 seconds of the payday, either side, print it to the second with the signed gap. For example "Round 208 came at 00:00:16, 16 s after payday", or "Round 207 was live at 00:00 (published 23:59:50, 10 s before)". Every other case keeps today's HH:MM wording.
2. **Timeline:** the same rule for the time labels above the round markers ("00:00:16").
3. **The age fact:** minute precision under 24 h ("2 h 47 m old, inside 25 h"; today it rounds to "3 h old").

## Before you finish
- `/payroll/2?payday=5` shows "Round 208 came at 00:00:16, 16 s after payday", and the timeline labels 208 "00:00:16".
- `/payroll/1` payslip 01 is unchanged ("Round 293 came at 14:06").

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`.
