# Prototypes: earlier hero designs

These are hero designs we built, tried in the browser, and replaced. They are kept to show the iteration behind the final design (see `docs/BUILD_PROCESS.md` §3). **None of them are part of the running app**, and the build doesn't include them.

| File | What it was | Why we moved on |
|---|---|---|
| `vinyls-hero/VinylScene.jsx` | three.js 3D turntable: drag to scratch, tonearm drop | Replaced by the "record sunrise", which prints your search on the label: more connected to what the user is doing |
| `stores-hero/CrateScene.jsx` | three.js 3D record crate, one sleeve per shop | Fun, but it didn't help you choose a shop |
| `stores-hero/LabelMaker.jsx` | Embossing label maker that stamps your search onto red tape | Too busy; not useful |
| `stores-hero/LetterBoard.jsx` | Felt letterboard sign showing your search | Didn't look good enough |
| `stores-hero/ShopMarquee.jsx` | Shop names drifting in big poster type | Neat, but not useful or fun enough |
| `stores-hero/RecordStacks.jsx` | Live record stacks per shop for a searched artist | Searched *records* on the *Stores* tab, duplicating the Vinyls tab |
| `stores-hero/ShopShowdown.jsx` | Shops as stacks compared by nearest, catalogue or genre, with an ad banner | Close; evolved into the final **holographic shop cards** (`src/ShopCards.jsx`) |

To try one again, move it back into `src/` (its import paths assume it lives there) and render it in the hero in `src/pages/Collector.jsx`. The 3D ones need the `three` package, which is still in `package.json`.
