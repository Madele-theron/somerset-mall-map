# Somerset Mall Navigator

A tiny static website: pick where you are and where you want to go, and it draws the walking route and tells you **which entrance to park at** (and whether that parking is paid or free). No backend, no build step — just open `index.html` or host it on GitHub Pages.

> Lower Level only. Store positions are estimated from screenshots of the mall's own map, and the mall is still being renovated, so treat it as a guide and check against the mall's signs.

## How it works

| File | What it is |
|---|---|
| `data.js` | Every shop, restaurant and entrance, with an x/y position. **This is the file you edit most.** |
| `layout.js` | The corridors, junctions and big anchor-shop blocks. Only change if a walkway changes. |
| `route.js` | Shortest-walk routing along the corridors. |
| `script.js`, `style.css`, `index.html` | The app itself. |

## Using it

- Type a shop in **Take me to** to see where to park and the walking route.
- Tick **Free parking only** to skip the paid undercover parking (Entrance 4).
- Tap **I parked at: Entrance N** to set your start, or tap any dot on the map.
- Pinch / scroll to zoom, drag to pan. Zoom in to see all shop names.

## Add or fix a shop (`data.js`)

```js
{ id: "pep", name: "Pep", type: "store", x: 16, y: 31 },
```

- `type` is `"store"`, `"landmark"` (food, services, ATMs) or `"parkade-entrance"`.
- `x` runs west → east (0–100) and `y` north → south (0–85).
- Entrances also have `parking: "free" | "paid"` and a `parkingNote`.

**Finding coordinates:** open the site with `?edit=1` on the end (e.g. `index.html?edit=1`), then tap an empty spot on the map. The x/y appears at the top and is copied to your clipboard.

## Put it online with GitHub Pages

1. On github.com, click **New repository**, name it `somerset-mall-map`, set it to **Public**, and create it.
2. Click **uploading an existing file**, drag in everything from this folder (including the hidden `.nojekyll` file if your system shows it), and **Commit changes**.
3. Go to **Settings → Pages**. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: main**, folder **/(root)**, then **Save**.
4. After a minute or two your site is live at `https://<your-username>.github.io/somerset-mall-map/`.
5. On your phone, open that link and use **Share → Add to Home Screen** so it works like an app.

To update later: edit `data.js` on GitHub (pencil icon) and commit. The site refreshes by itself.

## Known gaps

- Only the Lower Level is mapped (the mall's own map also has a second level, "BL").
- Parking notes for Entrances 1–3 ("free open-air parking") are inferred from the mall's published parking info and its map; confirm on-site which lots sit nearest each entrance.
- Phase 2 of the renovation (due mid-2026) may add or move shops.
