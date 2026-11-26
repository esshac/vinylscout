# VinylScout test plan

This plan turns the PRD's acceptance criteria (§8) and launch checklist (§15) into steps anyone on the team can run against the current app. **Start each session with Admin → Test-run tools → Reset demo data.** To get there, sign in as *Avery (Admin)*.

Record each result as Pass or Fail with a note. Screenshots of passes make good material for the blog post.

> Stock, prices, conditions and shop stats are **simulated** for this test run (see README). Shop names, addresses and phones are real (Google Maps). Record data comes from the live Discogs API, so exact search results can vary.

## A. Collector side: Vinyls tab

| # | Req | Steps | Expected |
|---|---|---|---|
| A1 | FR-1 | Signed out, search `  RUMOURS  ` | Results load without signing in; case and extra spaces don't matter. Each pressing shows "N/12 shops · from $…" |
| A2 | FR-1 | Search `zzqqxx` | "Nothing found" message suggesting checking spelling or searching just the artist |
| A3 | FR-2 | Open any result's release page | Cover, label, country and catalogue #; "Where to find it in Calgary" lists shops with condition, price and freshness; the Discogs liner notes and tracklist load |
| A4 | FR-2/6 | Note a shop's "confirmed N days ago", reload the page 3× | N doesn't change: viewing never refreshes the date |
| A5 | FR-6 | Hover/read the freshness badges | Labels are Recently confirmed (≤ 7 days), Needs reconfirmation (8–30) or Out of date (> 30); "What do the labels mean?" explains them |
| A6 | FR-6 | Admin → Test-run tools → +31 days, reopen the release | Labels age (more "Needs reconfirmation" / "Out of date"). Set it back to +0 afterwards |
| A7 | FR-7 | On a release page, use "Before you go" → Call / Directions | Opens `tel:` / Google Maps for that shop; the shop you came from is highlighted |
| A8 | — | Popular vinyls: switch Most wanted / Most collected / New in 2026 | 12 ranked records each; each card shows shops and the lowest price |
| A9 | — | Hero: type an artist | The text prints around the record label; the tonearm swings in; Search drops the needle, then results load |
| A10 | — | Hero: drag the record in a circle, then flick it | It turns with the pointer, then keeps spinning and eases back to normal speed |

## B. Collector side: Stores tab and shop pages

| # | Req | Steps | Expected |
|---|---|---|---|
| B1 | FR-3 | Open the Stores tab | The deck opens on **Sloth Records**: rainbow border, "ULTRA · Ad" tags, rainbow name |
| B2 | — | Flip with ‹ ›, arrow keys, and a swipe or drag | Cards move through all 12 shops; dots track the position |
| B3 | — | Hover the front card | The holo foil and glare follow the pointer; the card tilts |
| B4 | — | "☆ Add to my dig list" on two shops, reload | Both stay saved (★) and are listed in the "Dig list" line; un-starring removes them |
| B5 | FR-3 | Type `beltline` in the Stores search | The deck narrows to 3 shops (Sloth, Heritage, Blackbyrd) |
| B6 | FR-3 | Poster map and tracklist: hover a shop in either | The same shop highlights in the other; clicking opens the shop page |
| B7 | FR-3 | Open a shop page | Generated cover, address, stats, Hours callout, Call and Directions (only details that exist; no invented phone or website) |
| B8 | — | On a shop page, search its crates for `beatles` | "In stock for 'beatles'" grid with condition and price lines |
| B9 | — | Header city picker | Calgary selected (12 shops); other cities "coming soon" and not clickable; Esc or outside click closes it |

## C. Store side: store portal

| # | Req | Steps | Expected |
|---|---|---|---|
| C1 | FR-4 | Signed out, open **For stores** | "Put your crates on the map" with a sign-in button only |
| C2 | FR-4 | Sign in as *Casey (Collector)*, open For stores | "Only authorized store staff can manage listings" |
| C3 | FR-4 | Sign in as *Demo staff · Sloth Records*, open DevTools console, run `vinylscoutApi.createListing('s-hotwax', {artist:'x', title:'y'})` | Error 403 "You can only manage your own store." |
| C4 | FR-4/10 | As Sloth staff, go to `#/admin` | "Administrator access only." |
| C5 | FR-5 | + Add record → Publish with empty fields | Inline "Artist is required" and "Album title is required"; nothing saved |
| C6 | FR-5 | + Add record → "Find it on Discogs": `feist the reminder` → pick a pressing → add price → Publish | Form autofills (artist, title, year, format, cat #, notes, cover); listing goes live as "confirmed today" |
| C7 | FR-5 | Open that release as a collector | Sloth appears with *your* price and condition (overrides the simulated copy) |
| C8 | FR-5 | Mark it "Sold / unavailable", reopen the release | Sloth no longer listed for it; "Back in stock" restores it |
| C9 | FR-5 | Remove → "Remove for good?" → Cancel, then Remove → Yes | Cancel keeps it; Yes removes it with a confirmation message |
| C10 | FR-6 | "✓ I checked the shelves — confirm all available" | Success message; Sloth's copies show "Recently confirmed · today" on release pages |
| C11 | FR-5 | Store profile tab: change the phone, save, view the public page | The new phone shows on the public shop page (Call button) |

## D. Admin

| # | Req | Steps | Expected |
|---|---|---|---|
| D1 | FR-10 | Sign in as *Avery (Admin)* | "Pilot control room" with metrics (searches, contact clicks, confirmations) |
| D2 | — | Ad spot: note impressions and clicks; open the Stores tab and click Visit on Sloth's card; come back | Impressions and clicks increase |
| D3 | — | Ad spot: pick another shop, save; open Stores | That shop's card leads the deck with the Ad styling; Sloth becomes a normal HOLO card |
| D4 | FR-8/10 | As a collector, report a store-added listing (listing page → Report); as admin, hide it | The report appears in Admin; hiding removes the listing from public view; Unhide restores it |
| D5 | FR-10 | Disable a staff account | That shop is suspended (hidden) and the account can't sign in; Re-enable restores it |

## E. Security, compliance and launch readiness (PRD §15)

- [ ] `GET /api/discogs/oauth/identity` (local or on Vercel) returns **403**; only `/database/search` and `/releases/<id>` pass through the proxy
- [ ] The Discogs token appears nowhere in the built site (`dist/`) or the repo; it's only in `.env.local` / Vercel env vars
- [ ] Every block of Discogs data shows "Data provided by Discogs"; the footer has the non-affiliation notice and the simulated-data disclosure
- [ ] Phone (375px): header on one row; no sideways scrolling on Vinyls, Stores, a release, a shop page, For stores and Admin
- [ ] Keyboard only: Tab reaches search, tabs, cards (‹ › / arrow keys), buttons and form fields, with visible focus rings
- [ ] "Reduce motion" turned on in the OS: rainbow, spinning and drifting animations stop; everything is still usable

## F. Usability sessions (PRD §14, Phase 2)

**Collectors (target 5, success = at least 4 complete it):**
> "You want a copy of *Kind of Blue*. Use VinylScout to decide which Calgary shop you'd call first, and tell me why."

Observe whether they notice different pressings (original vs reissue), read the freshness label, and find Call or Directions. Ask afterwards: *Did the "last confirmed" date change what you'd do?*

**Shop staff (target 2):**
> "You just sold your copy of *Rumours* and got a used *Purple Rain* in. Update VinylScout."

Time it from opening the portal to done (PRD target: median under 2 minutes). Ask: *Would the Discogs autofill save you time? How often could you realistically do this?*

## G. Results log

| Date | Tester | Test(s) | Result | Notes |
|---|---|---|---|---|
| | | | | |
