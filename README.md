# norevert.xyz

Landing for Norevert Labs / NV-01. Static: HTML + ES modules + Three.js 0.170 from jsDelivr. No build step.

```bash
cd ~/Downloads/norevert.xyz
python3 -m http.server 4173
```

Open http://127.0.0.1:4173 — hard refresh after edits (Cmd+Shift+R).

Deploy: `git push origin main` → GitHub Pages (branch `main`, root `/`, `CNAME` = norevert.xyz).

## Files

| Path | What |
| --- | --- |
| `index.html` | page: copy, CSS, markup, Lenis smooth scroll, anchor nav |
| `js/scene.js` | stage: renderer, studio lights, mirror floor, orbit, scroll → shell strip, callouts, HUD, URL params |
| `js/nv01.js` | NV-01 model: 23-joint kinematic tree from `nv01.urdf`, 55 shell panels, CNC frame, DM actuators, battery, boards, looms, ankle rods, poses |
| `img/` | lab photos (no ROBOPARTY mark), `nv01-shell.jpg` + `og.jpg` rendered from the site model, `diagrams/*.svg` |

## Model

- Coordinates: Three.js Y-up, `x` = robot left, `z` = forward. Joint origins come straight from the V2 URDF (`J` in `nv01.js`). Pelvis sits at `BASE_Y = 0.755`; head top lands at 1.25 m.
- `createNV01()` returns `{ root, joints, shells, anchors, setPose, setMode, setExplode, update }`.
- `setMode("shell" | "lab")` — 55 panels + spheres, or the naked frame with ropes and the wire stub.
- `setExplode(p)` — 0..1, panels peel head-first along per-panel directions; `detached` counts panels off.
- `setPose("stand" | "guard")` — joint targets; `update(dt, extra)` eases joints and keeps the feet on the floor when the knees bend.
- The neck never moves (0 DOF in the canon). Pointer follow uses waist yaw and the LED pills only.

## URL params (debug / stills)

`?p=0.7` force strip progress · `?mode=lab` · `?pose=guard` · `?view=front|side|back` · `?lite=1` no mirror, smaller shadows · `?clean=1&margin=1.4&shift=0` render-only stage for screenshots.

## Rules

No ROBOPARTY / ROBO PARTY marks on the site. Chest reads NOREVERT / NV-01. Numbers only from the manual, the URDF, the BOM. No 20 DOF, no 3 m/s, no league slot, no T800, no G1 brain.
