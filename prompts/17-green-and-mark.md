Valuta, part 10 (same workspace): the builder approved two changes, previewed in a browser. Change nothing else.

## 1. Banknote green means money that moved
Today petrol and carbon blue are both blues, so the page reads blue throughout. Give the paid state its own ink. In `index.css` `:root`:
- Add primitives `--green: #1A6B47` (6.5:1 on white) and `--gtint: #E4F2EA` (green text on it is 5.6:1).
- Point `--state-held` and `--state-paid` at `var(--green)`, and `--state-held-tint` at `var(--gtint)`.
- `--state-credited` stays carbon blue (`var(--carbon)`).
- Petrol keeps its role as **proof and brand**: the VALUE stamp, the RATE HELD seal, the as-of round's ring, the fact check icons, links, buttons and **selection** (the selected coupon's 2px outline and tint stay petrol).

Then make every state colour use the state tokens, never the palette names:
- **CouponRow:** the HELD stamp and the settled coupon border use `--state-held` / `--state-held-tint` (today `var(--petrol)` / `var(--ptint)`). CREDITED uses `--state-credited`.
- **HonestTimeline:** the settlement dot and its label use `--state-paid` (today `var(--carbon)`). The as-of ring stays petrol.
- **PayslipCard:** the paid amount uses `--state-paid`.
- **CheatSection:** the SETTLES stamp uses `--state-paid`.
- The settle receipt uses `--state-paid`.
- **PayrollRegister:** the settled segments of the payday strip already use `--state-held`, so they become green with the token.

## 2. The brand mark
`context/valuta-mark.svg` is the mark: the as-of round, ringed on its track, the app's own timeline symbol.
- Copy it to `public/valuta-mark.svg`.
- **Favicon:** `<link rel="icon" type="image/svg+xml" href="/valuta-mark.svg">` replaces today's data-URI "V".
- **Top bar:** the mark at 28px, 10px left of the "Valuta" wordmark, vertically centred. On phones it sits beside the wordmark at 24px.
- **Social card:** copy `context/og.png` (1200×630) to `public/og.png`. In `index.html` add:
  - `<meta property="og:image" content="https://valuta-arc.vercel.app/og.png">`
  - `og:image:width` 1200 and `og:image:height` 630
  - `og:url` `https://valuta-arc.vercel.app`
  - `<meta name="twitter:card" content="summary_large_image">`, plus `twitter:image` with the same URL

## Before you finish
At 1344×760:
- the paid amount and the HELD coupons are green
- the VALUE stamp, the seal and round 292's ring are petrol
- the selected coupon's outline is petrol
- every text pair is at 4.5:1 or more

At 390×844, the top bar shows the mark beside the wordmark without overflow.

Run `bun run typecheck`, `bun run lint` (zero warnings) and `bun run build`.
