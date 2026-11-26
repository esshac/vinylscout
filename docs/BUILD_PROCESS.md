# How VinylScout was built: tools and process

This file records **what we used to build VinylScout and how**, for the ENTI 333 (Fall 2026) final project: GitHub documentation, presentation and blog post.

**Team:** Declan McGowan · Esshac Limson · Keenan McGowan · Priyana Moses

---

## 1. Tools at a glance

| Category | Tool | What we used it for |
|---|---|---|
| **AI coding environment** | **Claude Code** (Anthropic), in the Claude desktop app's Code tab, running the Claude Opus 5.5 model | The main development tool. It turned the PRD into a working app, wrote and edited the React and CSS code, ran the dev server and builds, debugged, and wrote the docs. Every feature was requested in plain English and reviewed in the browser. |
| **AI testing** | Claude Code's built-in browser pane | Live previews, clicking through flows, and checking phone (375px) and desktop layouts in light and dark mode. Used to find real bugs: sideways scrolling on phones, a blocked confirmation popup on "Remove listing", text overlapping the poster title. |
| **AI browser agent** | Claude in Chrome | Read the Discogs API Terms of Use and generated our Discogs personal access token in our own signed-in browser, with our explicit approval to accept the terms. |
| **Requirements** | [Lab 4 PRD: fill in the tools you used, e.g. ChatGPT / Claude] | Product requirements, user stories, acceptance criteria (FR-1 to FR-10), pilot metrics. The app and `docs/TEST_PLAN.md` trace back to these. |
| **Framework** | React 18 + Vite 5 | UI components and the fast dev server and build. |
| **Graphics** | Hand-written SVG and CSS animations | The gig-poster map of Calgary, record-sleeve layouts, the Vinyls hero (record + sun-rays + tonearm), the holographic shop trading cards (foil shimmer and 3D tilt), and the rainbow ad border. |
| **3D (prototypes)** | three.js 0.170 | Earlier hero versions: a 3D turntable, a 3D city of shop pins and a 3D record crate. They were replaced by simpler 2D designs; all earlier hero designs are kept in `prototypes/` (with notes on why each was dropped) to show our iterations. |
| **Record data** | **Discogs API** | Search, release details (tracklists, labels, covers), and popularity (most wanted / most collected). Called through our own proxy so the token stays secret. |
| **Shop data** | Google Maps | The list of 12 real Calgary record shops (name, address, phone), collected from Maps searches. "Directions" links open Google Maps. |
| **Fonts** | Google Fonts: Anton, DM Mono, Bricolage Grotesque | The poster and record-sleeve typography. |
| **Sharing previews** | localhost.run (SSH tunnel) | Temporary public links to show the group work in progress. |
| **Hosting** | **Vercel** | Production hosting at [vinylscout-xi.vercel.app](https://vinylscout-xi.vercel.app): the static site plus serverless functions in `/api` for the Discogs proxy, with the Discogs token stored as an environment variable. |
| **Runtime** | Node.js, npm, macOS | Local development. |
| **Docs and code hosting** | GitHub | Repository, README, MIT license, test plan, this file. |
| **Version control** | Git (SSH deploy key) | Commit history of every change, pushed to GitHub. A repo-only deploy key gives push access without sharing an account password. |
| **Continuous deployment** | Vercel for GitHub | Connects the repo to Vercel so every push to `main` redeploys the live site automatically. |

---

## 2. How the app is put together

```
Browser (React app, hash routes)
   ├── src/api.js        "mock backend": data in localStorage + server-style permission checks
   ├── src/simulate.js   simulated inventory: each Calgary shop carries ~60–88% of Discogs
   ├── src/discogs.js    Discogs client: search, releases, popularity, 5-hour cache, rate-limit queue
   └── /api/discogs/…    ──►  Vercel function (or the Vite dev proxy locally) ──►  api.discogs.com
                              adds the secret token, only allows search + release lookups
```

- **Collector side:** Vinyls tab (search, popular charts, release pages), Stores tab (shop showdown, poster map, sleeve tracklist), shop pages.
- **Store side:** store portal (add records with Discogs autofill, mark sold, confirm stock), admin "pilot control room" (metrics, reports, the paid ad spot with impressions and clicks).

---

## 3. Build timeline

1. **PRD → first working prototype.** Fed the Lab 4 PRD to Claude Code and got a three-portal React app (collector, store, admin) with freshness labels, permissions and a test plan.
2. **Discogs integration.** Added a server-side proxy so the API token is never shipped to browsers. Read the Discogs terms and complied with them: "Data provided by Discogs" credits, the required notice, and a cache under 6 hours.
3. **Landing page and interaction.** Search tabs (Vinyls / Stores), animations, a 3D turntable, a Google Maps preview.
4. **Real Calgary shops + simulated stock.** Replaced fictional stores with 12 real shops from Google Maps. Every shop "carries" most of the Discogs catalogue with simulated availability, price and condition. This is disclosed in the site footer.
5. **A design language.** A screen-printed gig-poster map and record-sleeve tracklist, then the same style applied site-wide: headers, heroes, results, release pages, shop pages, the store portal and admin.
6. **Hero iterations** (the biggest learning loop):
   - *Vinyls:* 3D turntable → **record "sunrise" that prints your search on its label**, with drag-to-spin.
   - *Stores:* 3D city → 3D crate → label maker → letterboard → name marquee → live record stacks → shop showdown → **holographic shop trading cards** with a dig list.
   - Each was built, tried, and kept or rejected on whether it was useful as well as fun.
7. **Business model.** A labelled **Ad** slot (rainbow border) in the Stores hero, controlled from Admin, with impressions and clicks to price it. Sloth Records is the example placement.
8. **Polish and bugs.** Phone overflow, a blocked confirmation popup, title overlaps, a city picker (Calgary pilot), and a cleaner header.
9. **Deployment.** Code pushed to GitHub (`esshac/vinylscout`) and imported into Vercel, with the Discogs token as an environment variable. Vercel serverless functions replace the dev-only proxy. The first deploy's proxy returned 404 because plain Vercel functions don't support `[...path]` catch-all routes; a `vercel.json` rewrite to a single function fixed it. Live at [vinylscout-xi.vercel.app](https://vinylscout-xi.vercel.app), and every push to `main` redeploys automatically.

---

## 4. Example prompts (our actual words to the AI)

These worked well as screenshots for the blog post:

- *"use the discogs api in the background to pull vinyl data"*
- *"assume all the stores in calgary are participating in my thing. and assume each store has most of the vinyls from discogs's database. make up availability, as this is a test run"*
- *"there is stores/vinyls in two places, can you recommend some ways to make the UX/UI neat"*
- *"see the design language of the 'calgary record shops' and apply that design style to the vinyls page too"*
- *"i just find those other heros useless or not fun or fancy"*: feedback that led to the useful-and-fun Stores hero.
- *"yea maybe biggest catalogs, and maybe a 'featured' or 'ad' spot as well, so i can charge local stores for an ad spot"*
- *"ok, but i cant seem to remove a listing"*: a bug report the AI reproduced and fixed.

---

## 5. What the AI did vs. what we decided

| AI (Claude Code) | Us (the team) |
|---|---|
| Wrote and refactored the code, CSS and SVG | Chose the product, the market (Calgary) and the features |
| Proposed design options with trade-offs | Picked directions and rejected designs that weren't useful |
| Ran builds and browser tests, found and fixed bugs | Reported problems we saw ("I can't remove a listing") |
| Read API terms and flagged compliance issues | Approved accepting the Discogs terms and creating the token |
| Drafted documentation | Reviewed and edited docs (Read and Revise Until You Own) |

---

## 6. Responsible-use notes

- **Simulated data:** shop names and addresses are real (Google Maps), but stock, prices and shop stats are simulated. This is disclosed in the footer. The shops have not joined VinylScout, and Sloth Records has not bought an ad.
- **API terms:** we display "Data provided by Discogs" plus the required non-affiliation notice, and cache Discogs data for under 6 hours.
- **Secrets:** the Discogs token lives only in `.env.local` (git-ignored) or Vercel environment variables. The proxy only allows read-only search and release calls.

---

## 7. Lessons learned (starters for the blog)

- [AI is fast at building, so the real work becomes *deciding*. We went through seven Stores hero ideas before one was both useful and fun.]
- [Testing in a real browser caught bugs we'd never have found by reading code.]
- [Being explicit about honesty (simulated data, ad labels) mattered more once the app looked real.]
- [Add your own.]
