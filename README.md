# VinylScout — test variant

**Find the record you want. Know which local stores to check before you leave home.**

VinylScout helps vinyl collectors find specific records at participating independent record stores, and gives store staff a quick way to publish and update selected inventory. This repository holds the **test variant**: a working prototype of the MVP described in our PRD (Lab 4), built for prototype testing (PRD §14, Phase 2) and the ENTI 333 Fall 2026 final project.

> **Test-run data.** The 12 stores are real Calgary record shops taken from Google Maps (name, address, phone), collected Nov 25, 2026. For this test run we **assume** they all participate and each carries most of the Discogs vinyl catalogue. Availability, condition, price, copy count and "last confirmed" dates are **simulated** (`src/simulate.js`), and the site footer says so on every page. None of these stores has joined VinylScout, and this is not their real inventory, so don't present it as real in the presentation, blog or video.

## What's in it

| Portal | Who | What they can do | PRD |
|---|---|---|---|
| Collector | Anyone, no account | Search by artist or album (case-insensitive, trimmed), compare stores side by side, see price/pressing details, freshness labels, store contact and directions, report a listing | FR-1, 2, 3, 6, 7, 8 |
| Store | Store owner/staff | Add, edit, mark sold, put back in stock, remove listings; confirm one listing or "confirm all"; edit store profile | FR-4, 5, 6 |
| Admin | VinylScout admin | Review reports, hide/unhide listings, disable accounts (suspends their store), see pilot metrics | FR-10, §5.2, §17 |

**Freshness labels (FR-6):** Recently confirmed (≤ 7 days) · Needs reconfirmation (8–30) · Out of date (> 30) · Unverified (never). They're computed from the store's saved confirmation timestamp. Viewing a listing never changes it, and neither does editing details. Only an explicit Confirm, "confirm all", or availability change does.

**Discogs integration:** record data comes from the [Discogs API](https://www.discogs.com/developers):
- *Store portal → Add record:* store staff search Discogs by artist, album or the catalogue number on the spine, pick the exact pressing, and the form fills in artist, title, year, format, cat # and pressing notes, plus a link to that release. This targets the PRD's "update in under 2 minutes" goal and its record-identification risk (§9.3).
- *Collectors:* cover art on results, plus an "About this release" panel on each listing with label, country, format, genres, tracklist and Discogs have/want counts.
- *No local results:* the page shows matching Discogs releases so collectors can confirm what they're after and quote the catalogue # when they call a shop.
- VinylScout's own listings (store, price, condition, availability, freshness) stay separate from Discogs data. Discogs describes the release in general; the store describes its own copy.

**Vinyls tab:** a big record rising out of its sleeve like a sunrise. Whatever you type is printed live around its label, typing makes it spin faster, you can grab and spin (or flick) the record with your mouse or finger, and pressing Search drops the tonearm before the results load (`src/RecordSunrise.jsx`). Below it is a "Popular vinyls near you" grid ranked by Discogs want/have counts, showing how many Calgary stores carry each record and the lowest price.

**Stores tab:** **holographic shop trading cards**: one collectible card per shop (cover art in its quadrant ink, catalogue size, distance, best genre), with a rainbow foil shimmer and 3D tilt that follow the pointer. Swipe, drag, use ‹ › or the arrow keys to flip through the deck, save favourites to a **dig list** (stored in this browser), and type to filter by shop name or neighbourhood. The advertised shop's card leads the deck, with an **Ad** tag and an animated rainbow border (`src/ShopCards.jsx`). Below it is a screen-printed **gig-poster map**: a fisheye projection that enlarges downtown, riso-style inks with paper grain, and a spinning record for each shop. Next to it is a **record-sleeve tracklist** of the shops grouped by quadrant (Northwest · Southwest & Beltline · Southeast & Inglewood · Northeast), with distance from downtown as the "track time". Hovering a shop in either one highlights it in the other, and record searches light up the shops that carry it. Google Maps is used only for each shop's Directions link.

Pages, cards and covers animate on hover (records slide out of their sleeves). Animations turn off when the OS "reduce motion" setting is on.

**Test-run tools** (Admin page): simulate days passing so you can watch labels age, and reset all demo data.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. To put it online, see **Deploy to Vercel** below.

### Discogs token (optional, recommended)
Discogs works with no setup, but without a token search results have **no cover images** and you're limited to 25 requests a minute. With a token, results show covers and the limit is 60 a minute.

1. Sign in at discogs.com and go to **Settings → Developers → Generate new token**.
2. Copy `.env.example` to `.env.local` and paste it: `DISCOGS_TOKEN=yourtoken`. On Vercel, add it as an environment variable instead (see below).
3. Restart `npm run dev`.

The browser never sees the token. It calls `/api/discogs/…` on the dev server (`vite.config.js`), which adds the token and a User-Agent and forwards the request to `api.discogs.com`. Responses are cached in the browser for up to 5 hours (Discogs' terms allow at most 6), and requests are queued so a burst of searches doesn't hit the rate limit. `.env.local` is git-ignored, so **never commit your token**.

### Demo accounts
Go to **Sign in** and pick an account. The test variant has no passwords.

- **Avery (Admin):** reports, moderation, metrics
- **Demo staff accounts** for Hot Wax Records, Recordland and Sloth Records: each manages only that store. These are test accounts, not real store staff.
- **Casey (Collector):** signed-in collector with no store access

## Deploy to Vercel

The app is a static Vite build plus two small **serverless functions** in `/api`:
- `api/discogs-proxy.js` is the Discogs proxy (`vercel.json` routes `/api/discogs/*` to it). It adds the secret token and only allows search and release lookups.
- `api/discogs-status.js` tells the UI whether a token is set.

Locally, `vite.config.js` does the same job, so `npm run dev` needs no Vercel.

1. Push the repo to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo. Vercel detects **Vite** (build `npm run build`, output `dist`).
3. Under **Settings → Environment Variables**, add `DISCOGS_TOKEN` = your Discogs personal token (Production and Preview).
4. Deploy, then open the URL. Searches should show cover art; `/api/discogs-status` should return `{"token":true}`.

Notes:
- **Shared data:** data such as listings and reports still lives in each visitor's browser (`localStorage`), so visitors don't see each other's changes. See "From test variant to MVP".
- **Simulated stock:** the live site shows real shop names with simulated stock (disclosed in the footer). Share the link with your class and team rather than publicly.

## How we built it

See **[docs/BUILD_PROCESS.md](docs/BUILD_PROCESS.md)** for every tool we used (Claude Code, Claude in Chrome, Discogs API, Google Maps, React, Vite, three.js, Vercel and more), the build timeline, example prompts, and what the AI did versus what the team decided.

## Ad spot (revenue test)

One shop at a time can be the **ad** in the Stores tab: its trading card leads the deck, with an "Ad" tag and an animated rainbow border. This tests the "paid features for shops" revenue idea (PRD §11.3).
- **Admin control:** Admin → *Ad spot* lets you pick the shop and an optional tagline, and shows **ad impressions, clicks and click-through rate**, the numbers you'd use to price and sell the spot.
- **Clearly labelled:** the ad card always carries an **"Ad"** tag. Its stats are the same simulated stats as every other shop.
- **Placement, not rankings:** the ad buys *first position in the card deck*. It never changes search results or a shop's stats. The PRD warns that paid placement must not make results misleading.
- **Example ad:** the project ships with **Sloth Records** as an *example* placement. Its card shows an **Ad** tag; Admin notes it is an example placement, not a paying shop. Sloth Records hasn't bought anything, so say so if you show it. Saving or clearing the spot in Admin replaces it. With no ad set, the deck simply starts at the first shop.
- **Simulated stats:** shop-card stats (catalogue size, best genre) are simulated in `src/simulate.js`, like the inventory.

## How the simulated inventory works

- **Search:** Vinyls search runs a Discogs search (12 vinyl releases). For each release and each store, `simulateOffer()` decides whether the store has it (each store carries a fixed 60–88% of the catalogue), plus condition, price, copies and a confirmation date. It uses a hash of store + release, so results look random but stay the same on every reload.
- **Overrides:** a listing a store adds in the store portal for the same Discogs release always replaces the simulated one. Marking it sold removes that store from the results.
- **Confirm all:** "confirm all" in the store portal also refreshes the store's simulated confirmation dates.
- **Freshness:** simulated dates are anchored to when the data was seeded, so **Admin → Test-run tools → simulate days** still ages them.
- **New pages:** `#/release/<discogsId>` shows every store's stock for one release, and `#/store/<id>` lets you search inside one store.

## How it's built

- React 18 + Vite. Routing is hash-based (`src/App.jsx`). Earlier hero designs (including three.js 3D versions) are in **[`prototypes/`](prototypes/README.md)**, with notes on why each was replaced; they aren't part of the build. The Stores hero is `src/ShopCards.jsx`. The poster map and tracklist are hand-built SVG/CSS in `src/poster/` (`geo.js` holds the projection and quadrant "sides").
- `src/api.js` is a **mock backend**. Data is stored in the browser's `localStorage`, but every write goes through server-style permission checks (`requireUser`, `requireStoreAccess`, `requireAdmin`) and validation, and throws HTTP-style errors (401/403/400/404). The UI only talks to this module, so it can be swapped for real API calls later.
- `src/seed.js` holds the 12 real Calgary shops (from Google Maps), the demo accounts and the example ad.
- `docs/TEST_PLAN.md` maps each PRD acceptance criterion to a test step, plus usability-test scripts for collectors and stores.

```
src/
  api.js            mock backend: data, permissions, freshness, metrics
  seed.js           demo data (each record linked to a real Discogs release ID)
  discogs.js        Discogs client: search, release lookup, cache, rate-limit queue
  DiscogsUI.jsx     cover art, release panel, store-side Discogs picker
  App.jsx           layout, router, header, city picker
  components.jsx    badges, contact links, form fields
  pages/Collector.jsx   Vinyls/Stores tabs, results, release + shop pages
  RecordSunrise.jsx     Vinyls hero (search printed on a spinnable record)
  ShopCards.jsx         Stores hero (holographic shop cards, ad card, dig list)
  poster/               gig-poster map, sleeve tracklist, shared sleeve parts
  simulate.js           simulated stock and shop stats
  pages/StorePortal.jsx listings manager, add/edit form, profile
  pages/Admin.jsx       pilot metrics, ad spot, reports, accounts, test-run tools
  pages/SignIn.jsx      demo account picker
```

## Known limitations of the test variant

- Data lives in one browser. Two testers on two laptops won't see each other's changes.
- There's no real authentication: demo accounts are one click. Permission checks run in the browser, which is fine for a prototype but **not secure**.
- **Discogs API Terms of Use** (last updated May 27, 2025). This is what the app does to comply:
  - Every Discogs block shows "Data provided by Discogs." linked to the source page, and the footer shows the required "not affiliated with… trademark of Zink Media, LLC" notice.
  - Discogs responses are cached for at most 5 hours, because the terms don't allow showing data more than 6 hours older than discogs.com.
  - Cover images are "Restricted Data": allowed for this non-commercial prototype, but **not** for commercial use. A paid version of VinylScout would need written permission from Discogs or store-supplied photos.
  - The terms also limit commercial uses that drive traffic to non-Discogs sites, so check with Discogs before any business launch (PRD §11, §18).
  - Users of the token must be 18+, and the token gives full access to that person's Discogs account, so keep it private.
- The Discogs proxy runs in the Vite server locally and as Vercel functions (`/api`) in production. Other static hosts would need an equivalent server route.
- The collector wantlist (FR-9) is deferred, as the PRD prioritizes. The Stores tab has a lighter "dig list" of favourite shops, saved in the browser.

## From test variant to MVP (next steps)

1. Move `api.js` logic into server routes (e.g. Vercel functions alongside `/api/discogs`) backed by a hosted database such as Postgres. Keep the same function names as endpoints.
2. Replace demo sign-in with a real auth provider and store `role` + `storeId` on the user.
3. Run the permission tests in `docs/TEST_PLAN.md` against the server, not the browser.
4. Load real listings only from stores that have agreed to the pilot.

## Team & course

Built for **ENTI 333: Generative AI and Prompting** (Haskayne School of Business, University of Calgary, Fall 2026) using AI-assisted development tools.
**Team:** Declan McGowan · Esshac Limson · Keenan McGowan · Priyana Moses

License: [MIT](LICENSE)
