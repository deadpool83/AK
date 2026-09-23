# AK Sunshine ☀️

A very colourful, very yellow static page (sun, cats, Neapolitan pizza, Canada, New York, a "rank 1" badge)
with exactly one real feature: the **محاسبه AK** button.

Pressing it prints **e<sup>n</sup>** with every digit visible, where

- `n` is **51** on 21 September 2026,
- and grows by **1 every calendar day** after that (22 Sept 2026 → e^52, and so on).

The digits are computed exactly in the browser with `BigInt` (Taylor series with guard digits), so nothing is rounded to
floating point: the integer part is complete and 25 decimals are printed. The digits are auto-sized so the whole number
always fits inside the display, however large it gets.

No build step, no dependencies. Plain HTML, CSS and JavaScript.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npm start            # python3 -m http.server 8080  → http://localhost:8080
```

## Publish on GitHub Pages

```bash
git init
git add .
git commit -m "AK Sunshine"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
The site appears at `https://<your-user>.github.io/<your-repo>/` after a minute.

## Change how AK counts

Everything lives at the top of [`js/ak-math.js`](js/ak-math.js):

```js
var START_EXPONENT = 51;                                  // exponent on the start date
var START_DATE = { year: 2026, month: 9, day: 21 };       // month is 1-12
var DEFAULT_DECIMALS = 25;                                // digits after the decimal point
```

The day counter uses the visitor's **local calendar date**, so the exponent ticks over at their local midnight.

## Tests

```bash
npm test
```

Checks e^n digit-for-digit (n = 0, 1, 10, 51, 52, 60, 400) against reference values produced independently with Python's
`decimal` module, plus the day-by-day exponent logic. Requires Node 18+.

## Structure

```
index.html          page markup (Persian, RTL) + the cat SVG template
css/style.css       all styling
js/ak-math.js       pure AK logic (browser + Node)
js/app.js           UI: button, digit reveal + auto-fit, copy, confetti, cats
assets/             pizza / Canada / New York / favicon SVGs
test/               unit tests + reference values
```

Fonts (Lalezar, Vazirmatn) load from Google Fonts; the page falls back to system fonts if they are unavailable.
