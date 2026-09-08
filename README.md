# norevert.xyz

Landing for Norevert Labs / NV-01. Static: HTML + ES modules + Three.js 0.170 from jsDelivr. No build step.

```bash
cd ~/Downloads/norevert.xyz
python3 -m http.server 4173
```

Open http://127.0.0.1:4173 — hard refresh after edits (Cmd+Shift+R).

Deploy: `git push origin main` → GitHub Pages (branch `main`, root `/`, `CNAME` = norevert.xyz, HTTPS enforced).

## Files

| Path | What |
| --- | --- |
| `index.html` | page: copy, CSS, markup, Lenis smooth scroll, anchor nav |
| `js/scene.js` | stage: renderer, studio lights, mirror floor, GTAO post (MSAA composer, desktop), contact shadow, atmosphere (light beam, dust, foggy cage), orbit, two-stage scroll strip, callouts, console HUD, URL params |
| `js/nv01.js` | NV-01 model: kinematic tree from `js/kin.js`, real link meshes, 55 shell panels, head, electronics, looms, poses |
| `js/kin.js` | joint table (offsets + axes) from `description/nv01.urdf`, in Three.js coordinates |
| `js/frame.js` | loader for the packed link meshes |
| `description/meshes/` | `nv01.frame.json` + `nv01.frame.bin`: the 24 URDF link meshes, decimated (~150k tris, 1.6 MB), per-vertex material ids (aluminium / actuator / rubber). `LICENSE` + `NOTICE` inside |
| `dev/frame.html` | dev viewer for the raw link meshes (`?view=side&only=knee&wire=1`) |
| `img/` | lab photos, `nv01-shell.jpg` / `nv01-lab.jpg` / `og.jpg` / `ortho-*.jpg` rendered from the site model, `diagrams/*.svg` |

## Model

- Coordinates: Three.js Y-up, `x` = robot left, `z` = forward. Pelvis at `BASE_Y = 0.755`; head top at 1.25 m.
- Frame = the real link meshes placed on the URDF joint tree. Motors are painted black by geometry at conversion time (cylinders at each joint: Ø120 × 53 for DM 10010L, Ø57 × 56.5 for DM 4340P; plus the two inboard ankle cans on each shin), soles rubber.
- Shell = 55 procedural panels (authors' numbering) on top; head is a torso-mounted box; electronics, looms, handle, E-stop are procedural.
- `setExplode(p)` stage 1: panels peel head-first. `setShellFade(f)`: panels fade between stages. `setKnolling(p)` stage 2: the 24 links and the electronics fly apart along per-part directions, feet stay above the floor.
- `setPose("stand" | "guard")`, `setMode("shell" | "lab")`. The neck never moves (0 DOF); pointer follow uses waist yaw and the LED pills only.

## Mesh pipeline

Source: the public `rpo_description` meshes (CERN-OHL-W-2.0). Converter (not in the repo): open3d quadric decimation → axis swap to Three coords → int16 quantised positions + uint8 material id + u16 indices. Re-run it whenever the meshes change; keep `LICENSE`/`NOTICE` next to the output.

## URL params (debug / stills)

`?p=0.7` shell strip · `?pb=0.5` fade / slide · `?p2=0.8` frame knolling · `?mode=lab` · `?pose=guard` · `?view=front|side|back` · `?lite=1` no mirror, smaller shadows · `?post=0` no GTAO · `?clean=1&margin=1.4&shift=0` render-only stage · `?og=1` hero-only layout for the social image · `?ortho=1&clean=1&view=front|side|back` orthographic drawing views (1.6 m frame from y = −0.16, used for `img/ortho-*.jpg`).

## Rules

No ROBOPARTY / ROBO PARTY marks on the site. Chest reads NOREVERT / NV-01. Numbers only from the manual, the URDF, the BOM. No 20 DOF, no 3 m/s, no league slot, no T800, no G1 brain.
