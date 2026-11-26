# VinylScout test plan

This plan turns the PRD's acceptance criteria (§8) and launch checklist (§15) into steps anyone on the team can run against the test variant. Start each session with **Admin → Test-run tools → Reset demo data**.

Record results as Pass/Fail with a note. Screenshots of passes make good material for the blog post.

## A. Functional checks (PRD §8)

| # | Req | Steps | Expected |
|---|---|---|---|
| A1 | FR-1 | Signed out, search `  RUMOURS  ` | 2 listings (Chinook, Needle Drop). Search is case-insensitive and ignores spaces. Prairie's *removed* copy doesn't appear |
| A2 | FR-1 | Search `nirvana` | Empty state. Chinook's copy is marked unavailable, so it's hidden |
| A3 | FR-1 | Search `zzzz` | Empty state that explains only participating stores are included |
| A4 | FR-2 | Open *Lady Soul* (Needle Drop) | Price shows "Price not listed" and isn't made up. Availability disclaimer is visible |
| A5 | FR-2/6 | Note a listing's "confirmed N days ago", reload it 3×, go back | The number hasn't changed |
| A6 | FR-3 | Open *Prairie Spin Records* | No phone button (none provided), Instagram + no website, every listing tied to the store |
| A7 | FR-4 | Signed out, open **Store portal** | Sign-in prompt only |
| A8 | FR-4 | Sign in as Casey (collector), open **Store portal** | "Only authorized store staff…" message |
| A9 | FR-4 | Sign in as Jordan, open DevTools console, run `vinylscoutApi.updateListing('l-8',{artist:'x',title:'y'})` | Error 403 "You can only manage your own store." (`l-8` belongs to Needle Drop) |
| A10 | FR-4/10 | As Jordan, go to `#/admin` | "Administrator access only." |
| A11 | FR-5 | As Jordan, **+ Add record** → Publish with empty fields | Inline errors on Artist and Title, and nothing is saved |
| A12 | FR-5 | Add *Feist – The Reminder*, $36 → Publish | Success message. Searching `feist` finds it as "Recently confirmed · today" |
| A13 | FR-5 | Mark *Funeral* "Sold / unavailable", then search `funeral` | No results. Back in stock → it reappears |
| A14 | FR-5 | Edit *Harvest* price without ticking confirm | Price updates, label stays "Unverified" |
| A15 | FR-6 | Admin → Test-run tools → +10 days, search `kind of blue` | Labels move from Recently confirmed to Needs reconfirmation |
| A16 | FR-6 | +31 days, then as Sam press **confirm all available** | Every Needle Drop listing goes back to Recently confirmed |
| A17 | FR-7 | On any listing click Call / Directions | Opens tel: / Maps, and the admin "Contact-link clicks" count goes up |
| A18 | FR-8 | Report a listing as "Possibly sold" | Thank-you message, and the listing is still visible |
| A19 | FR-10 | As Avery, open Admin → hide the reported listing | It disappears from search, and Unhide restores it |
| A21 | Discogs | Search `kind of blue` | Both listings show cover art, and the two pressings (CS 8163 vs MFSL) are told apart by catalogue # |
| A22 | Discogs | Open a listing → **Show tracklist** | Label, country, format and tracklist load, with a "Release data from Discogs" credit |
| A23 | Discogs | As Jordan, **+ Add record** → type `feist the reminder` → pick the Canada pressing | Artist, title, year, cat # and notes fill in, and the "Linked to Discogs release" box shows a cover |
| A24 | Discogs | Search `purple rain` (no store has it) | Empty state lists matching Discogs releases with catalogue numbers |
| A25 | Discogs | Stop the network or wait for a 429 | Clear error message, and the rest of the page still works |
| A20 | FR-10 | As Avery, disable Riley | Prairie Spin leaves Stores and search, and Riley can't sign in |

## B. Launch-readiness checks (PRD §15)

- [ ] Search and the store portal work at phone width (375 px) and on desktop
- [ ] Every page shows that inventory may change and recommends contacting the store
- [ ] Footer makes clear the demo stores are fictional
- [ ] Keyboard only: you can Tab to search, results, buttons and form fields, and focus rings are visible
- [ ] Error messages explain what to fix

## C. Usability sessions (PRD §14, Phase 2)

**Collectors (target 5 participants, success = ≥ 4 finish):**
> "You want a copy of *Kind of Blue*. Use VinylScout to decide which store you'd contact first, and tell me why."

Observe whether they notice the two different pressings (1959 original vs 2015 reissue), whether they read the freshness label, and whether they look for contact details. Ask afterwards: *Did the "last confirmed" date change what you'd do?*

**Store staff (target 2 participants):**
> "You just sold your copy of *Rumours* and got a new used copy of *Purple Rain* in. Update VinylScout."

Time it from portal open to done (PRD target: median under 2 minutes). Ask: *How often could you realistically do this? What would stop you?*

## D. Results log

| Date | Tester | Test(s) | Result | Notes |
|---|---|---|---|---|
| | | | | |
