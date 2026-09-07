// NV-01 — procedural model built from the ROBOTO_ORIGIN / RPO V2 URDF and the visual spec.
// Coordinates: Three.js Y-up.  x = robot left, y = up, z = forward.  (URDF x→z, y→x, z→y)
// Base (pelvis) origin sits at BASE_Y above the floor.  Head top lands at 1.25 m.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const D2R = Math.PI / 180;
export const BASE_Y = 0.755;

// Joint origins in base (pelvis) coordinates, from description/nv01.urdf (V2).
export const J = {
  torso: new THREE.Vector3(0, 0.0672, -0.0282),
  armPitch: (s) => new THREE.Vector3(s * 0.12175, 0.2062, 0), // in torso coords
  armRoll: new THREE.Vector3(0, 0, 0.02),
  hipYaw: (s) => new THREE.Vector3(s * 0.0725, -0.0518, -0.0711),
  hipRoll: new THREE.Vector3(0, -0.0723, -0.0177),
  hipPitch: (s) => new THREE.Vector3(s * 0.02085, -0.035, 0.0606),
  knee: new THREE.Vector3(0, -0.25, 0),
  ankle: (s) => new THREE.Vector3(-s * 0.02085, -0.3, 0),
};

export function createNV01() {
  // ---------- materials ----------
  const M = {
    shell: new THREE.MeshPhysicalMaterial({ color: 0xf2f4f6, roughness: 0.42, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
    shellDark: new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, roughness: 0.5, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    motor: new THREE.MeshStandardMaterial({ color: 0x2c2c2e, roughness: 0.55, metalness: 0.45 }),
    motorLip: new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.5, metalness: 0.5 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc6cacf, roughness: 0.62, metalness: 0.55 }),
    aluLight: new THREE.MeshStandardMaterial({ color: 0xdadde1, roughness: 0.68, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.22, metalness: 0.95 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.7, metalness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2, roughness: 0.3 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x1c5b3c, roughness: 0.6, metalness: 0.1 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.5, metalness: 0.2 }),
    battery: new THREE.MeshStandardMaterial({ color: 0x2857c4, roughness: 0.55, metalness: 0.05 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xe9c227, roughness: 0.75, metalness: 0 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85, metalness: 0 }),
    cableWhite: new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.85, metalness: 0 }),
    red: new THREE.MeshStandardMaterial({ color: 0xd8302c, roughness: 0.45, metalness: 0 }),
    led: new THREE.MeshStandardMaterial({ color: 0x35ff7a, emissive: 0x35ff7a, emissiveIntensity: 1.6 }),
    rope: new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 0.9, metalness: 0 }),
  };

  const shells = [];   // exploding shell panels
  const labOnly = [];  // visible only in lab mode
  const shellMode = []; // visible only in shell mode (things hidden by the naked look)
  const leds = [];
  const joints = {};
  const anchors = {};

  // ---------- geometry helpers ----------
  const geoCache = new Map();
  function rbox(w, h, d, r = 0.006, seg = 3) {
    return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));
  }
  function mesh(g, m, x = 0, y = 0, z = 0, parent) {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    if (parent) parent.add(o);
    return o;
  }
  function group(parent, x = 0, y = 0, z = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (parent) parent.add(g);
    return g;
  }
  function cyl(rt, rb, h, seg = 32, open = false) {
    return new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  }
  // orient a Y-axis cylinder-like object along an axis
  function orient(o, axis) {
    if (axis === "x") o.rotation.z = Math.PI / 2;
    else if (axis === "z") o.rotation.x = Math.PI / 2;
    else if (axis instanceof THREE.Vector3) o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
    return o;
  }
  // scale vertices along Y: taper (bottom scale) and ellipse (sx, sz)
  function warp(g, { taper = 1, sx = 1, sz = 1, len = 1 } = {}) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const t = THREE.MathUtils.clamp((y + len / 2) / len, 0, 1);
      const k = THREE.MathUtils.lerp(taper, 1, t);
      p.setX(i, p.getX(i) * sx * k);
      p.setZ(i, p.getZ(i) * sz * k);
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }
  // curved shell panel: sector of a tube, length along Y, angle 0 = +z (front), +angle toward +x
  function arcPanel({ rOut, t = 0.004, len, a0, a1, taper = 1, sx = 1, sz = 1, bevel = 0.0025 }) {
    const key = ["arc", rOut, t, len, a0, a1, taper, sx, sz, bevel].join("|");
    if (geoCache.has(key)) return geoCache.get(key);
    const s = new THREE.Shape();
    const A0 = a0 * D2R - Math.PI / 2, A1 = a1 * D2R - Math.PI / 2;
    s.absarc(0, 0, rOut, A0, A1, false);
    s.absarc(0, 0, rOut - t, A1, A0, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 28 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -len / 2, 0);
    warp(g, { taper, sx, sz, len });
    geoCache.set(key, g);
    return g;
  }
  // dome sector (top of a limb), angle convention as arcPanel
  function domePanel(r, a0, a1, sx = 1, sz = 1) {
    const g = new THREE.SphereGeometry(r, 32, 16, (a0 + 90) * D2R, (a1 - a0) * D2R, 0, Math.PI / 2);
    g.scale(sx, 1, sz);
    return g;
  }
  // flat plate from a polygon (points in XY), extruded along Z (centered), with optional holes
  function plate(points, t, { bevel = 0.002, holes = [] } = {}) {
    const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) {
      const p = new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)));
      s.holes.push(p);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16 });
    g.translate(0, 0, -t / 2);
    return g;
  }
  function roundedRectPts(w, h, r, n = 6) {
    const pts = [];
    const cx = [w / 2 - r, -w / 2 + r, -w / 2 + r, w / 2 - r];
    const cy = [h / 2 - r, h / 2 - r, -h / 2 + r, -h / 2 + r];
    for (let c = 0; c < 4; c++) {
      for (let i = 0; i <= n; i++) {
        const a = (c * 90 + (i / n) * 90) * D2R;
        pts.push([cx[c] + r * Math.cos(a), cy[c] + r * Math.sin(a)]);
      }
    }
    return pts;
  }
  function rectPts(x, y, w, h) {
    return [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]];
  }
  // CNC plate with rectangular windows; plate in XY, thickness along Z
  function cncPlate(w, h, t, windows = [], corner = 0.008) {
    const g = plate(roundedRectPts(w, h, corner), t, { bevel: 0.0012, holes: windows.map(([x, y, ww, hh]) => rectPts(x, y, ww, hh)) });
    return g;
  }
  function tube(pts, r = 0.0035, m = M.cable, seg = 24) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const g = new THREE.TubeGeometry(curve, seg, r, 8, false);
    const o = new THREE.Mesh(g, m);
    o.castShadow = false;
    o.userData.curve = curve;
    return o;
  }
  function flagAlong(o, t, parent, s = 0.012) {
    const p = o.userData.curve.getPoint(t);
    const f = mesh(rbox(s, s * 0.55, s * 0.9, 0.001, 1), M.tape, p.x, p.y, p.z, parent);
    f.rotation.set(Math.random() * 0.6, Math.random() * 0.6, Math.random() * 0.6);
    return f;
  }

  // DM pancake actuator.  Axis along local +Y, output flange at +Y.
  function pancake(r, h, parent, x, y, z, axis, { led = true } = {}) {
    const g = group(parent, x, y, z);
    orient(g, axis);
    mesh(cyl(r, r, h * 0.74, 48), M.motor, 0, -h * 0.05, 0, g);
    mesh(cyl(r * 0.985, r * 0.985, h * 0.16, 48), M.motorLip, 0, h * 0.38, 0, g);
    mesh(cyl(r * 0.94, r * 0.9, h * 0.14, 48), M.motorLip, 0, -h * 0.43, 0, g);
    mesh(cyl(r * 0.6, r * 0.6, h * 0.07, 40), M.steel, 0, h * 0.5, 0, g);
    // flange detail merged: bore + 4 large + 6 small holes (dark), rim bolts (motor-lip)
    const darkParts = [];
    const b = cyl(r * 0.15, r * 0.15, h * 0.12, 20);
    b.translate(0, h * 0.5, 0);
    darkParts.push(b);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const hg = cyl(r * 0.075, r * 0.075, h * 0.1, 12);
      hg.translate(Math.cos(a) * r * 0.38, h * 0.51, Math.sin(a) * r * 0.38);
      darkParts.push(hg);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const hg = cyl(r * 0.035, r * 0.035, h * 0.1, 8);
      hg.translate(Math.cos(a) * r * 0.5, h * 0.51, Math.sin(a) * r * 0.5);
      darkParts.push(hg);
    }
    const bolts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const bg = cyl(r * 0.05, r * 0.05, h * 0.06, 6);
      bg.translate(Math.cos(a) * r * 0.82, h * 0.48, Math.sin(a) * r * 0.82);
      bolts.push(bg);
    }
    mesh(mergeGeometries(darkParts), M.dark, 0, 0, 0, g);
    mesh(mergeGeometries(bolts), M.steel, 0, 0, 0, g);
    // power connector at the base of the can
    mesh(rbox(r * 0.34, h * 0.2, r * 0.16, 0.001, 1), M.dark, 0, -h * 0.36, r * 0.95, g);
    if (led) {
      const l = mesh(new THREE.SphereGeometry(r * 0.06, 8, 8), M.led, r * 0.4, -h * 0.36, r * 0.94, g);
      l.castShadow = false;
      leds.push(l);
    }
    return g;
  }

  // shell registration
  function shell(o, dir, dist, { spin = 0.35, delay = null } = {}) {
    o.userData.shell = { rest: o.position.clone(), rot: o.rotation.clone(), dir: new THREE.Vector3(...dir).normalize(), dist, spin, delay };
    o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    shells.push(o);
    return o;
  }
  function screwDimples(parent, list, r = 0.0036, depth = 0.002) {
    const parts = [];
    for (const [x, y, z, nx, ny, nz] of list) {
      const g = cyl(r, r, depth, 12);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, ny, nz).normalize());
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(m);
      parts.push(g);
    }
    const o = mesh(mergeGeometries(parts), M.dark, 0, 0, 0, parent);
    o.castShadow = false;
    return o;
  }

  // ---------- build ----------
  const root = new THREE.Group();
  const base = group(root, 0, BASE_Y, 0);
  joints.base = base;

  // ===== PELVIS (base_link) =====
  {
    // CNC pelvis frame
    mesh(rbox(0.17, 0.012, 0.13, 0.003, 1), M.alu, 0, 0.032, -0.02, base);
    mesh(rbox(0.17, 0.012, 0.13, 0.003, 1), M.alu, 0, -0.06, -0.03, base);
    for (const s of [-1, 1]) {
      const sp = mesh(cncPlate(0.12, 0.09, 0.006, [[0, 0.006, 0.07, 0.04]]), M.alu, s * 0.085, -0.012, -0.03, base);
      sp.rotation.y = Math.PI / 2;
    }
    const fp = mesh(cncPlate(0.15, 0.08, 0.006, [[-0.035, 0, 0.045, 0.04], [0.035, 0, 0.045, 0.04]]), M.alu, 0, -0.012, 0.045, base);
    // waist yaw actuator (DM 10010L), output up into the torso
    pancake(0.05, 0.05, base, 0, 0.015, -0.028, "y");
    anchors.waist = new THREE.Vector3(0, 0.02, -0.028);
    // yaw seam ring under the torso
    const ring = mesh(cyl(0.095, 0.1, 0.01, 48), M.dark, 0, 0.048, -0.02, base);
    ring.castShadow = false;
    // Pelvis shells #28–31 : 髋上 L/R, 髋下前/后
    const beltY = -0.012, beltZ = -0.008;
    const upL = mesh(rbox(0.128, 0.046, 0.172, 0.02), M.shell, 0.066, beltY + 0.024, beltZ, base);
    const upR = mesh(rbox(0.128, 0.046, 0.172, 0.02), M.shell, -0.066, beltY + 0.024, beltZ, base);
    shell(upL, [1, 0.6, 0], 0.34); shell(upR, [-1, 0.6, 0], 0.34);
    const loF = mesh(rbox(0.25, 0.05, 0.084, 0.02), M.shell, 0, beltY - 0.026, beltZ + 0.044, base);
    const loB = mesh(rbox(0.25, 0.05, 0.084, 0.02), M.shell, 0, beltY - 0.026, beltZ - 0.044, base);
    shell(loF, [0, -0.25, 1], 0.36); shell(loB, [0, -0.25, -1], 0.36);
    // front slots + screw row on the belt (local to each panel)
    mesh(rbox(0.026, 0.0035, 0.006, 0.001, 1), M.dark, 0.012, 0.004, 0.0865, upL);
    mesh(rbox(0.026, 0.0035, 0.006, 0.001, 1), M.dark, -0.012, 0.004, 0.0865, upR);
    screwDimples(loF, [-0.09, -0.045, 0, 0.045, 0.09].map((x) => [x, -0.012, 0.0425, 0, 0, 1]), 0.002);
  }

  // ===== TORSO =====
  const torso = group(base, J.torso.x, J.torso.y, J.torso.z);
  joints.torsoYaw = torso;
  {
    const T = torso;
    // --- CNC frame: front X-truss plate, back plate, side plates, top plate, spine
    const frontPts = [[-0.14, 0.02], [0.14, 0.02], [0.15, 0.245], [-0.15, 0.245]];
    const rib = 0.018;
    const xHoles = [
      [[-rib, 0.14], [-0.11, 0.225], [0.11, 0.225], [rib, 0.14]],            // top triangle
      [[-rib * 0.8, 0.105], [rib * 0.8, 0.105], [0.085, 0.04], [-0.085, 0.04]], // bottom
      [[-0.125, 0.06], [-0.032, 0.122], [-0.125, 0.205]],                    // left
      [[0.125, 0.06], [0.125, 0.205], [0.032, 0.122]],                       // right
    ];
    mesh(plate(frontPts, 0.007, { bevel: 0.0015, holes: xHoles }), M.aluLight, 0, 0, 0.068, T);
    mesh(plate(frontPts, 0.007, { bevel: 0.0015, holes: [[[-0.05, 0.08], [0.05, 0.08], [0.09, 0.15], [0.05, 0.22], [-0.05, 0.22], [-0.09, 0.15]]] }), M.aluLight, 0, 0, -0.066, T);
    for (const s of [-1, 1]) {
      const side = mesh(cncPlate(0.12, 0.2, 0.006, [[0, 0.03, 0.07, 0.05], [0, -0.04, 0.07, 0.04]]), M.alu, s * 0.142, 0.135, 0, T);
      side.rotation.y = Math.PI / 2;
    }
    const top = mesh(cncPlate(0.26, 0.12, 0.007, [[-0.07, 0, 0.06, 0.06], [0.07, 0, 0.06, 0.06]]), M.alu, 0, 0.255, 0, T);
    top.rotation.x = Math.PI / 2;
    mesh(cncPlate(0.05, 0.2, 0.03, [[0, 0.04, 0.03, 0.05], [0, -0.04, 0.03, 0.05]]), M.alu, 0, 0.13, -0.02, T);
    // --- battery 270×60×70 in the lumbar box (blue pack, yellow tape)
    const bat = group(T, 0, 0.045, -0.078);
    mesh(rbox(0.27, 0.06, 0.07, 0.006, 2), M.battery, 0, 0, 0, bat);
    for (const x of [-0.09, 0.0, 0.09]) mesh(rbox(0.022, 0.064, 0.074, 0.001, 1), M.tape, x, 0, 0, bat);
    mesh(rbox(0.03, 0.02, 0.02, 0.002, 1), M.red, 0.12, 0.02, 0.045, bat); // XT90
    mesh(rbox(0.05, 0.015, 0.006, 0.001, 1), M.cableWhite, -0.12, 0.02, 0.036, bat); // BMS lead
    anchors.battery = new THREE.Vector3(0, 0.045, -0.115);
    // --- RBE 3-in-1 board (vertical, behind the front truss)
    const rbe = group(T, 0, 0.145, 0.03);
    mesh(rbox(0.1, 0.075, 0.0016, 0.0005, 1), M.pcb, 0, 0, 0, rbe);
    const chips = [];
    for (const [x, y, w, h] of [[-0.03, 0.015, 0.018, 0.018], [0.02, 0.018, 0.012, 0.012], [0.03, -0.015, 0.02, 0.014], [-0.02, -0.02, 0.01, 0.01]]) {
      const c = rbox(w, h, 0.003, 0.0005, 1); c.translate(x, y, 0.0025); chips.push(c);
    }
    mesh(mergeGeometries(chips), M.chip, 0, 0, 0, rbe);
    const caps = [];
    for (let i = 0; i < 4; i++) { const c = cyl(0.004, 0.004, 0.008, 10); c.rotateX(Math.PI / 2); c.translate(-0.04 + i * 0.012, -0.025, 0.005); caps.push(c); }
    mesh(mergeGeometries(caps), M.steel, 0, 0, 0, rbe);
    for (let i = 0; i < 4; i++) mesh(rbox(0.008, 0.006, 0.006, 0.0005, 1), M.dark, 0.032, 0.03 - i * 0.012, 0.004, rbe); // 4 CAN ports
    anchors.rbe = new THREE.Vector3(0, 0.145, 0.03);
    // --- compute (Orange Pi 5 Plus) flat under the top plate, with heatsink
    const opi = group(T, 0.0, 0.228, -0.01);
    mesh(rbox(0.1, 0.0016, 0.075, 0.0005, 1), M.pcb, 0, 0, 0, opi);
    const fins = [];
    for (let i = 0; i < 9; i++) { const f = rbox(0.048, 0.014, 0.003, 0.0005, 1); f.translate(-0.01, 0.008, -0.028 + i * 0.007); fins.push(f); }
    mesh(mergeGeometries(fins), M.alu, 0, 0, 0, opi);
    mesh(rbox(0.014, 0.006, 0.014, 0.001, 1), M.chip, 0.03, 0.004, 0.02, opi);
    anchors.compute = new THREE.Vector3(0.0, 0.235, -0.01);
    // --- E-stop on the upper back + switch
    const es = group(T, 0.07, 0.215, -0.078);
    mesh(cyl(0.012, 0.012, 0.01, 20), M.tape, 0, 0, 0, es).rotation.x = Math.PI / 2;
    mesh(cyl(0.009, 0.009, 0.012, 20), M.red, 0, 0, -0.008, es).rotation.x = Math.PI / 2;
    mesh(rbox(0.012, 0.008, 0.006, 0.001, 1), M.dark, -0.14, 0, 0.002, es);
    // --- carry handle between the shoulder blades
    const handle = tube([[-0.085, 0.235, -0.07], [-0.08, 0.27, -0.088], [-0.04, 0.29, -0.095], [0.04, 0.29, -0.095], [0.08, 0.27, -0.088], [0.085, 0.235, -0.07]], 0.009, M.aluLight, 32);
    handle.castShadow = true;
    T.add(handle);
    anchors.handle = new THREE.Vector3(0, 0.29, -0.1);
    // --- cable looms with yellow flags
    const looms = [
      [[0.02, 0.135, 0.02], [0.06, 0.12, -0.02], [0.1, 0.16, -0.03], [0.128, 0.205, -0.01]],
      [[-0.02, 0.135, 0.02], [-0.06, 0.12, -0.02], [-0.1, 0.16, -0.03], [-0.128, 0.205, -0.01]],
      [[0.01, 0.12, 0.02], [0.03, 0.05, -0.01], [0.05, -0.02, -0.04], [0.07, -0.09, -0.06]],
      [[-0.01, 0.12, 0.02], [-0.03, 0.05, -0.01], [-0.05, -0.02, -0.04], [-0.07, -0.09, -0.06]],
      [[0.03, 0.14, 0.03], [0.02, 0.2, 0.0], [0.0, 0.225, -0.02]],
    ];
    looms.forEach((pts, i) => {
      const c = tube(pts, 0.0032, i % 2 ? M.cable : M.cableWhite, 20);
      T.add(c);
      flagAlong(c, 0.35, T); if (i < 4) flagAlong(c, 0.75, T, 0.01);
    });
    // wire stub + rope eyes on top (lab look)
    const stub = group(T, 0.0, 0.262, 0.0);
    for (const [x, z, m] of [[-0.01, 0.01, M.red], [0.0, -0.01, M.tape], [0.012, 0.005, M.cable], [-0.004, 0.018, M.cableWhite]]) {
      const w = tube([[x, 0, z], [x * 2, 0.03, z * 1.5], [x * 1.5, 0.05, z * 2.5]], 0.002, m, 10);
      w.position.set(0, 0, 0); stub.add(w);
    }
    labOnly.push(stub);
    for (const s of [-1, 1]) {
      const rope = tube([[s * 0.11, 0.25, -0.03], [s * 0.1, 0.5, -0.03], [s * 0.06, 1.2, -0.02], [s * 0.03, 2.2, 0.0]], 0.005, M.rope, 16);
      T.add(rope); labOnly.push(rope);
      const eye = mesh(new THREE.TorusGeometry(0.009, 0.0025, 8, 16), M.steel, s * 0.11, 0.25, -0.03, T);
      eye.rotation.y = Math.PI / 2;
    }

    // --- Chest shells #4–7
    const chestFU = group(T, 0, 0.115, 0.0);
    mesh(plate([[-0.118, 0], [0.118, 0], [0.15, 0.14], [-0.15, 0.14]], 0.07, { bevel: 0.014 }), M.shell, 0, 0, 0.044, chestFU);
    // shield layer on the upper chest
    const shield = mesh(plate([[-0.096, 0.03], [0.096, 0.03], [0.128, 0.128], [-0.128, 0.128]], 0.012, { bevel: 0.008 }), M.shell, 0, 0, 0.098, chestFU);
    shield.rotation.x = -0.06;
    mesh(rbox(0.058, 0.007, 0.008, 0.002, 1), M.dark, 0, 0.012, 0.0975, chestFU); // chest slit
    shell(chestFU, [0, 0.2, 1], 0.5);
    anchors.chest = new THREE.Vector3(0, 0.2, 0.1);
    const chestFL = group(T, 0, 0.0, 0.0);
    mesh(plate([[-0.088, 0.0], [0.088, 0.0], [0.116, 0.112], [-0.116, 0.112]], 0.062, { bevel: 0.012 }), M.shell, 0, 0, 0.036, chestFL);
    shell(chestFL, [0, -0.15, 1], 0.45);
    const chestBU = group(T, 0, 0.115, 0.0);
    mesh(plate([[-0.118, 0], [0.118, 0], [0.15, 0.14], [-0.15, 0.14]], 0.066, { bevel: 0.014 }), M.shell, 0, 0, -0.04, chestBU);
    shell(chestBU, [0, 0.25, -1], 0.5);
    const chestBL = group(T, 0, 0.0, 0.0);
    mesh(plate([[-0.088, 0.0], [0.088, 0.0], [0.116, 0.112], [-0.116, 0.112]], 0.058, { bevel: 0.012 }), M.shell, 0, 0, -0.034, chestBL);
    mesh(rbox(0.272, 0.068, 0.05, 0.012), M.shell, 0, 0.045, -0.095, chestBL); // battery hump
    shell(chestBL, [0, -0.2, -1], 0.48);

    // logo plate: NOREVERT / NV-01 on the robot's right upper chest (viewer's left)
    const logo = document.createElement("canvas");
    logo.width = 512; logo.height = 256;
    const cx = logo.getContext("2d");
    cx.clearRect(0, 0, 512, 256);
    cx.fillStyle = "#6a6f76";
    cx.font = "700 74px Inter, system-ui, sans-serif";
    cx.textBaseline = "alphabetic";
    cx.fillText("NOREVERT", 16, 120);
    cx.font = "500 44px 'IBM Plex Mono', ui-monospace, monospace";
    cx.fillText("NV-01", 18, 190);
    cx.beginPath(); cx.arc(452, 92, 34, 0, Math.PI * 2); cx.strokeStyle = "#6a6f76"; cx.lineWidth = 8; cx.stroke();
    cx.fillRect(440, 78, 8, 28); cx.fillRect(458, 78, 8, 28);
    const lt = new THREE.CanvasTexture(logo); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8;
    const lm = new THREE.MeshBasicMaterial({ map: lt, transparent: true, opacity: 0.9, depthWrite: false });
    const plaque = mesh(new THREE.PlaneGeometry(0.1, 0.05), lm, -0.062, 0.095, 0.1078, chestFU);
    plaque.rotation.x = -0.06; plaque.castShadow = false;

    // --- Neck #3 (black) and head #1–2
    const neck = mesh(cyl(0.03, 0.033, 0.052, 32), M.shellDark, 0, 0.29, 0.0, T);
    mesh(new THREE.TorusGeometry(0.031, 0.002, 8, 32), M.dark, 0, 0.012, 0, neck).rotation.x = Math.PI / 2;
    shell(neck, [0, 1, 0], 0.22, { spin: 0.1 });
    const head = group(T, 0, 0.372, 0.004);
    joints.head = head;
    const headF = group(head, 0, 0, 0.026);
    mesh(rbox(0.192, 0.116, 0.054, 0.024, 4), M.shell, 0, 0, 0, headF);
    mesh(rbox(0.18, 0.104, 0.006, 0.014, 3), M.dark, 0, 0, 0.026, headF);      // bezel
    mesh(rbox(0.174, 0.098, 0.005, 0.013, 3), M.glass, 0, 0, 0.0285, headF);   // glass
    const eyeL = mesh(new THREE.CapsuleGeometry(0.0092, 0.028, 4, 16), M.eye, 0.03, 0.0, 0.0255, headF);
    const eyeR = mesh(new THREE.CapsuleGeometry(0.0092, 0.028, 4, 16), M.eye, -0.03, 0.0, 0.0255, headF);
    eyeL.castShadow = eyeR.castShadow = false;
    mesh(rbox(0.03, 0.0025, 0.007, 0.001, 1), M.dark, 0, 0.0585, -0.005, headF); // top slit
    mesh(rbox(0.012, 0.002, 0.002, 0.0005, 1), M.dark, 0, 0.038, 0.0315, headF); // tiny tick
    shell(headF, [0, 0.45, 1], 0.36, { spin: 0.25 });
    const headB = mesh(rbox(0.186, 0.112, 0.05, 0.024, 4), M.shell, 0, 0, -0.026, head);
    shell(headB, [0, 0.5, -1], 0.36, { spin: 0.25 });
    joints.eyes = [eyeL, eyeR];
    anchors.head = new THREE.Vector3(0.1, 0.4, 0.03);

    // eye glow sprites
    const glowTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d");
      const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      r.addColorStop(0, "rgba(255,255,255,0.75)"); r.addColorStop(0.35, "rgba(255,255,255,0.18)"); r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    for (const e of [eyeL, eyeR]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
      sp.scale.set(0.09, 0.11, 1); sp.position.set(0, 0, 0.012); e.add(sp);
    }
  }

  // ===== ARMS =====
  function arm(s) {
    const T = torso;
    const ap = group(T, s * 0.12175, 0.2062, 0);
    joints[`shPitch${s > 0 ? "L" : "R"}`] = ap;
    // shoulder pitch actuator (DM 4340P) sticking out of the chest side, axis x
    pancake(0.036, 0.046, ap, s * 0.038, 0, 0, s > 0 ? "x" : new THREE.Vector3(-1, 0, 0));
    // black shoulder shells #8/#9 (upper / lower) around the pitch can
    const shU = mesh(arcPanel({ rOut: 0.046, t: 0.005, len: 0.052, a0: 0, a1: 180 }), M.shellDark, s * 0.036, 0, 0, ap);
    const shD = mesh(arcPanel({ rOut: 0.046, t: 0.005, len: 0.052, a0: 180, a1: 360 }), M.shellDark, s * 0.036, 0, 0, ap);
    shU.rotation.z = -s * Math.PI / 2; shD.rotation.z = -s * Math.PI / 2; // panel length → outward x
    // after the rotation, sector 0..180 covers the lower half on the left arm and the upper half on the right arm
    shell(shU, [s * 0.6, -s, 0], 0.26); shell(shD, [s * 0.6, s, 0], 0.26);
    // roll link
    const ar = group(ap, s * 0.056, 0, 0.02);
    joints[`shRoll${s > 0 ? "L" : "R"}`] = ar;
    pancake(0.03, 0.04, ar, 0, 0, -0.008, "z", { led: false });
    // white dome cap #12/#13 (upper arm, upper front/back)
    const capF = mesh(domePanel(0.045, -90, 90), M.shell, 0, 0.005, -0.02, ar);
    const capB = mesh(domePanel(0.045, 90, 270), M.shell, 0, 0.005, -0.02, ar);
    shell(capF, [s * 0.4, 0.6, 1], 0.28); shell(capB, [s * 0.4, 0.6, -1], 0.28);
    // yaw link: upper arm
    const ay = group(ar, 0, -0.05, -0.02);
    joints[`shYaw${s > 0 ? "L" : "R"}`] = ay;
    pancake(0.03, 0.04, ay, 0, 0.026, 0, "y", { led: false });
    mesh(cyl(0.02, 0.018, 0.16, 24), M.alu, 0, -0.085, 0, ay);            // arm tube
    const armPlate = mesh(cncPlate(0.05, 0.14, 0.005, [[0, 0.02, 0.026, 0.03], [0, -0.03, 0.026, 0.03]]), M.alu, s * 0.014, -0.09, 0, ay);
    armPlate.rotation.y = Math.PI / 2;
    // upper arm panels #14/#15 (lower front/back)
    const uaLen = 0.148;
    const uaF = mesh(arcPanel({ rOut: 0.04, t: 0.004, len: uaLen, a0: -90, a1: 90, taper: 0.94 }), M.shell, 0, -0.088, 0, ay);
    const uaB = mesh(arcPanel({ rOut: 0.04, t: 0.004, len: uaLen, a0: 90, a1: 270, taper: 0.94 }), M.shell, 0, -0.088, 0, ay);
    shell(uaF, [s * 0.3, 0.05, 1], 0.28); shell(uaB, [s * 0.3, 0.05, -1], 0.28);
    // vent slits on the outer upper arm (naked look shows them; keep on the panel)
    for (let i = 0; i < 3; i++) mesh(rbox(0.012, 0.0025, 0.004, 0.0005, 1), M.dark, s * 0.037, -0.04 - i * 0.012, 0.012, uaF).rotation.y = s * 0.9;
    // elbow pitch
    const ep = group(ay, s * 0.02, -0.18875, 0);
    joints[`elPitch${s > 0 ? "L" : "R"}`] = ep;
    pancake(0.032, 0.04, ep, s * -0.018, 0, 0, s > 0 ? "x" : new THREE.Vector3(-1, 0, 0), { led: true });
    const elbowFork = mesh(rbox(0.012, 0.05, 0.04, 0.003), M.dark, s * 0.012, -0.012, 0, ep);
    // elbow yaw: forearm hangs down
    const ey = group(ep, s * -0.02, -0.05, 0);
    joints[`elYaw${s > 0 ? "L" : "R"}`] = ey;
    pancake(0.028, 0.036, ey, 0, 0.012, 0, "y", { led: false });
    mesh(cyl(0.024, 0.02, 0.135, 24), M.alu, 0, -0.07, 0, ey);
    const flange = mesh(cyl(0.027, 0.027, 0.008, 28), M.steel, 0, -0.142, 0, ey);
    // forearm panels #20–23: upper/lower × inner/outer
    const fa = { rOut: 0.036, t: 0.004, len: 0.066, taper: 0.9 };
    const outer = s > 0 ? [0, 180] : [180, 360];
    const inner = s > 0 ? [180, 360] : [0, 180];
    const fUO = mesh(arcPanel({ ...fa, a0: outer[0], a1: outer[1] }), M.shell, 0, -0.038, 0, ey);
    const fUI = mesh(arcPanel({ ...fa, a0: inner[0], a1: inner[1] }), M.shell, 0, -0.038, 0, ey);
    const fLO = mesh(arcPanel({ ...fa, taper: 0.88, a0: outer[0], a1: outer[1] }), M.shell, 0, -0.106, 0, ey);
    const fLI = mesh(arcPanel({ ...fa, taper: 0.88, a0: inner[0], a1: inner[1] }), M.shell, 0, -0.106, 0, ey);
    fLO.scale.set(0.92, 1, 0.92); fLI.scale.set(0.92, 1, 0.92);
    shell(fUO, [s, 0.1, 0.2], 0.26); shell(fUI, [0, -0.2, 1], 0.28);
    shell(fLO, [s, -0.2, 0.2], 0.26); shell(fLI, [0, -0.5, 1], 0.28);
    // 4 screw dimples on the forearm front (outer-front quadrant)
    screwDimples(fLO, [[s * 0.012, 0.012, 0.03, s * 0.35, 0, 1], [s * 0.026, 0.012, 0.022, s * 0.7, 0, 0.7], [s * 0.012, -0.004, 0.03, s * 0.35, 0, 1], [s * 0.026, -0.004, 0.022, s * 0.7, 0, 0.7]], 0.003);
    // hand sphere (shell mode) / blunt flange (lab)
    const ball = mesh(new THREE.SphereGeometry(0.035, 36, 24), M.shellDark, 0, -0.165, 0, ey);
    shellMode.push(ball);
    anchors[`hand${s > 0 ? "L" : "R"}`] = new THREE.Vector3(0, -0.165, 0);
    anchors[`hand${s > 0 ? "L" : "R"}Obj`] = ey;
    return ap;
  }
  arm(1); arm(-1);

  // ===== LEGS =====
  function leg(s) {
    const hy = group(base, s * 0.0725, -0.0518, -0.0711);
    joints[`hipYaw${s > 0 ? "L" : "R"}`] = hy;
    const yawAxis = new THREE.Vector3(0, -0.866, -0.5); // URDF (-0.5,0,-0.866)
    hy.userData.axis = yawAxis;
    pancake(0.05, 0.05, hy, 0, 0.0, 0, yawAxis.clone().negate());
    const hr = group(hy, 0, -0.0723, -0.0177);
    joints[`hipRoll${s > 0 ? "L" : "R"}`] = hr;
    const rollAxis = new THREE.Vector3(0, -0.5, 0.866); // URDF (0.866,0,-0.5)
    hr.userData.axis = rollAxis;
    pancake(0.05, 0.05, hr, 0, 0, 0, rollAxis);
    // hip bracket
    mesh(rbox(0.07, 0.05, 0.06, 0.006), M.alu, s * 0.01, -0.03, 0.02, hr);
    // black hip covers #32–35 (inner/outer) around yaw+roll cans, and root collar #36/37
    const cov = group(hr, s * 0.004, -0.015, 0.01);
    const covO = mesh(rbox(0.05, 0.13, 0.135, 0.024, 4), M.shellDark, s * 0.026, 0, 0, cov);
    const covI = mesh(rbox(0.05, 0.13, 0.135, 0.024, 4), M.shellDark, -s * 0.026, 0, 0, cov);
    shell(covO, [s, -0.3, 0], 0.3); shell(covI, [0, -0.3, 1], 0.3);
    // hip pitch (thigh)
    const hp = group(hr, s * 0.02085, -0.035, 0.0606);
    joints[`hipPitch${s > 0 ? "L" : "R"}`] = hp;
    pancake(0.05, 0.048, hp, s * 0.008, 0, 0, s > 0 ? "x" : new THREE.Vector3(-1, 0, 0));
    anchors[`hip${s > 0 ? "L" : "R"}`] = new THREE.Vector3(s * 0.04, 0, 0);
    anchors[`hip${s > 0 ? "L" : "R"}Obj`] = hp;
    // thigh CNC: two side plates with windows + knee can
    for (const k of [-1, 1]) {
      const pl = mesh(cncPlate(0.06, 0.2, 0.006, [[0, 0.045, 0.036, 0.05], [0, -0.03, 0.036, 0.06]]), M.alu, s * k * 0.036, -0.13, 0, hp);
      pl.rotation.y = Math.PI / 2;
    }
    mesh(rbox(0.07, 0.15, 0.02, 0.004), M.alu, 0, -0.13, -0.02, hp);
    const root = mesh(arcPanel({ rOut: 0.056, t: 0.005, len: 0.04, a0: -180, a1: 180, sz: 0.9 }), M.shellDark, 0, -0.06, 0, hp);
    shell(root, [s * 0.6, 0.2, 0.7], 0.24);
    // thigh panels #38–45: front / outer / back / inner quarters
    const th = { rOut: 0.056, t: 0.0045, len: 0.17, taper: 0.9, sz: 0.88 };
    const thY = -0.165;
    const quarters = [
      ["front", -45, 45, [0, 0, 1]],
      ["outer", 45 * s, 135 * s, [s, 0, 0]],
      ["back", 135, 225, [0, 0.2, -1]],
      ["inner", -135 * s, -45 * s, [0, -0.6, -0.8]],
    ];
    for (const [name, a0, a1, dir] of quarters) {
      const p = mesh(arcPanel({ ...th, a0: Math.min(a0, a1), a1: Math.max(a0, a1) }), M.shell, 0, thY, 0, hp);
      shell(p, dir, 0.3);
      if (name === "front") {
        const d = [];
        for (let r = 0; r < 3; r++) for (const c of [-1, 1]) d.push([c * 0.014, 0.05 - r * 0.045, 0.049, c * 0.25, 0, 1]);
        screwDimples(p, d, 0.0022);
      }
    }
    // knee
    const kn = group(hp, 0, -0.25, 0);
    joints[`knee${s > 0 ? "L" : "R"}`] = kn;
    pancake(0.05, 0.046, kn, s * 0.006, 0, 0, s > 0 ? "x" : new THREE.Vector3(-1, 0, 0));
    const kneeCap = group(kn, s * 0.036, 0, 0.004);
    const kc = mesh(cyl(0.05, 0.05, 0.012, 40), M.shell, 0, 0, 0, kneeCap);
    kc.rotation.z = Math.PI / 2;
    mesh(cyl(0.02, 0.02, 0.014, 24), M.dark, 0, 0, 0, kneeCap).rotation.z = Math.PI / 2;
    shell(kneeCap, [s, 0.1, 0.3], 0.28);
    // shin CNC + ankle actuators (2× DM 4340P stacked on the outer-rear) + parallel rods
    for (const k of [-1, 1]) {
      const pl = mesh(cncPlate(0.05, 0.25, 0.006, [[0, 0.07, 0.03, 0.06], [0, -0.03, 0.03, 0.08]]), M.alu, s * k * 0.03, -0.15, 0.004, kn);
      pl.rotation.y = Math.PI / 2;
    }
    mesh(rbox(0.056, 0.22, 0.016, 0.004), M.alu, 0, -0.16, 0.024, kn);
    const hubA = pancake(0.03, 0.036, kn, s * 0.04, -0.1, -0.024, s > 0 ? "x" : new THREE.Vector3(-1, 0, 0), { led: true });
    const hubB = pancake(0.026, 0.032, kn, s * 0.04, -0.17, -0.026, s > 0 ? "x" : new THREE.Vector3(-1, 0, 0), { led: false });
    anchors[`ankle${s > 0 ? "L" : "R"}`] = new THREE.Vector3(s * 0.065, -0.1, -0.024);
    anchors[`ankle${s > 0 ? "L" : "R"}Obj`] = kn;
    // cranks + rods down to the foot
    for (const [hy0, x, z] of [[-0.1, 0.06, -0.03], [-0.17, 0.048, -0.05]]) {
      mesh(rbox(0.006, 0.03, 0.012, 0.002, 1), M.steel, s * x, hy0 - 0.012, z + 0.006, kn);
      const rodLen = 0.3 - 0.018 + hy0 + 0.024;
      const rod = mesh(cyl(0.0045, 0.0045, rodLen, 12), M.steel, s * x, hy0 - 0.024 - rodLen / 2, z, kn);
      mesh(new THREE.SphereGeometry(0.0065, 12, 10), M.steel, s * x, hy0 - 0.024, z, kn);
      mesh(new THREE.SphereGeometry(0.0065, 12, 10), M.steel, s * x, -0.3 + 0.018, z, kn);
    }
    // shin panels #48–51: front-outer / back-inner halves
    const sh = { rOut: 0.048, t: 0.0045, len: 0.215, taper: 0.84, sz: 0.9 };
    const fo = s > 0 ? [-70, 110] : [-110, 70];
    const bi = s > 0 ? [110, 290] : [70, 250];
    const shinFO = mesh(arcPanel({ ...sh, a0: fo[0], a1: fo[1] }), M.shell, 0, -0.165, 0.004, kn);
    const shinBI = mesh(arcPanel({ ...sh, a0: bi[0], a1: bi[1] }), M.shell, 0, -0.165, 0.004, kn);
    shell(shinFO, [s * 0.6, 0, 0.8], 0.3); shell(shinBI, [0, -0.35, -1], 0.3);
    screwDimples(shinFO, [[s * 0.012, 0.06, 0.044, s * 0.25, 0, 1], [s * -0.012, 0.06, 0.044, -s * 0.25, 0, 1], [s * 0.012, 0.0, 0.041, s * 0.25, 0, 1], [s * -0.012, 0.0, 0.041, -s * 0.25, 0, 1]], 0.002);
    // ankle (pitch+roll at the same point) and foot
    const an = group(kn, -s * 0.02085, -0.3, 0);
    joints[`anklePitch${s > 0 ? "L" : "R"}`] = an;
    const ar = group(an, 0, 0, 0);
    joints[`ankleRoll${s > 0 ? "L" : "R"}`] = ar;
    mesh(rbox(0.05, 0.03, 0.034, 0.004), M.dark, 0, -0.004, 0, an);                    // ankle yoke
    mesh(cyl(0.008, 0.008, 0.07, 12), M.steel, 0, 0, 0, an).rotation.z = Math.PI / 2;  // pitch pin
    for (const [x, z] of [[0.06, -0.03], [0.048, -0.05]]) mesh(rbox(0.014, 0.014, 0.02, 0.002, 1), M.dark, s * x, -0.016, z + 0.004, ar); // rod ends on the foot
    const footPts = roundedRectPts(0.088, 0.208, 0.03, 8);
    const footFrame = mesh(plate(footPts, 0.01, { bevel: 0.001 }), M.alu, 0, -0.026, 0.034, ar);
    footFrame.rotation.x = Math.PI / 2;
    mesh(cncPlate(0.06, 0.05, 0.006, [[0, 0, 0.03, 0.02]]), M.alu, 0, -0.016, 0.03, ar).rotation.x = Math.PI / 2;
    const footTop = mesh(plate(footPts, 0.016, { bevel: 0.004 }), M.shell, 0, -0.02, 0.036, ar);
    footTop.rotation.x = Math.PI / 2;
    screwDimples(footTop, [[0.02, 0.07, -0.0125, 0, 0, -1], [-0.02, 0.07, -0.0125, 0, 0, -1]], 0.0028); // plate -z is the top after the rotation
    const sole = mesh(plate(footPts, 0.012, { bevel: 0.002 }), M.rubber, 0, -0.04, 0.036, ar);
    sole.rotation.x = Math.PI / 2;
    shell(footTop, [0, 0.7, 0.7], 0.2, { spin: 0.15 }); shell(sole, [0, -0.6, 0.8], 0.16, { spin: 0.1 });
    // the lab foot keeps a rubber sole (the real naked feet already have one)
    const labSole = mesh(plate(footPts, 0.012, { bevel: 0.002 }), M.rubber, 0, -0.04, 0.036, ar);
    labSole.rotation.x = Math.PI / 2; labSole.scale.set(0.96, 0.96, 1);
    labOnly.push(labSole);
    return hy;
  }
  leg(1); leg(-1);

  // ---------- explode bookkeeping ----------
  root.updateMatrixWorld(true);
  const _v = new THREE.Vector3();
  for (const o of shells) {
    const d = o.userData.shell;
    if (d.delay == null) {
      o.getWorldPosition(_v);
      d.delay = THREE.MathUtils.clamp((1.28 - _v.y) / 1.28, 0, 1) * 0.55; // head peels first, feet last
    }
    d.axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    d.spinSign = Math.random() > 0.5 ? 1 : -1;
    d.q0 = o.quaternion.clone();
  }

  // ---------- API ----------
  const POSES = {
    stand: { shRollL: 0.07, shRollR: 0.07 },
    guard: {
      torsoYaw: 0.3,
      shPitchL: 0.95, shRollL: 0.34, shYawL: 0.1, elPitchL: 2.25,
      shPitchR: 0.75, shRollR: 0.34, shYawR: -0.1, elPitchR: 2.3,
      hipPitchL: 0.5, kneeL: 0.6, anklePitchL: 0.1,
      hipPitchR: 0.2, kneeR: 0.7, anklePitchR: 0.5,
      hipRollL: 0.06, hipRollR: 0.06,
    },
  };
  const SIGN = { kneeL: -1, kneeR: -1 };
  const JOINT_AXES = {
    torsoYaw: "y",
    shPitchL: "x", shPitchR: "x", shRollL: "z", shRollR: "z", shYawL: "y", shYawR: "y",
    elPitchL: "x", elPitchR: "x", elYawL: "y", elYawR: "y",
    hipYawL: "axis", hipYawR: "axis", hipRollL: "axis", hipRollR: "axis",
    hipPitchL: "x", hipPitchR: "x", kneeL: "x", kneeR: "x",
    anklePitchL: "x", anklePitchR: "x", ankleRollL: "z", ankleRollR: "z",
  };
  const MIRROR = { shRollR: -1, shYawR: -1, hipRollR: -1, hipYawR: -1, ankleRollR: -1 };
  const current = {};
  const target = {};
  for (const k of Object.keys(JOINT_AXES)) { current[k] = 0; target[k] = 0; }
  const _q = new THREE.Quaternion();
  function applyJoint(name, angle) {
    const g = joints[name];
    if (!g) return;
    const ax = JOINT_AXES[name];
    const a = angle * (MIRROR[name] || 1) * (SIGN[name] || 1);
    if (ax === "axis") { g.quaternion.setFromAxisAngle(g.userData.axis, a); return; }
    g.rotation.set(0, 0, 0);
    if (ax === "x") g.rotation.x = -a; // positive = limb swings forward / flexes
    if (ax === "y") g.rotation.y = a;
    if (ax === "z") g.rotation.z = -a; // positive roll = out to the side (left)
  }

  const api = {
    root, base, torso, joints, shells, anchors, leds, materials: M,
    poses: Object.keys(POSES),
    setPose(name) {
      const p = POSES[name] || POSES.stand;
      for (const k of Object.keys(target)) target[k] = p[k] || 0;
    },
    // extra: {joint: delta} added on top (idle motion, mouse-follow)
    update(dt, extra = {}) {
      const k = 1 - Math.pow(0.001, dt); // ~ smooth follow
      for (const j of Object.keys(current)) {
        current[j] += (target[j] - current[j]) * k;
        applyJoint(j, current[j] + (extra[j] || 0));
      }
      // keep the feet on the floor when the knees bend
      const reach = (h, kn) => 0.25 * Math.cos(h) + 0.3 * Math.cos(h - kn);
      const r = Math.max(reach(current.hipPitchL, current.kneeL), reach(current.hipPitchR, current.kneeR));
      base.position.y = BASE_Y - (0.55 - r) + (extra.baseLift || 0);
    },
    setExplode(p) {
      const ease = (t) => t * t * (3 - 2 * t);
      for (const o of shells) {
        const d = o.userData.shell;
        const local = THREE.MathUtils.clamp((p - d.delay) / (1 - d.delay), 0, 1);
        const e = ease(local);
        o.position.copy(d.rest).addScaledVector(d.dir, e * d.dist);
        _q.setFromAxisAngle(d.axis, e * d.spin * d.spinSign);
        o.quaternion.copy(d.q0).multiply(_q);
        o.visible = api.mode !== "lab";
      }
      api.detached = shells.reduce((n, o) => n + ((p - o.userData.shell.delay) / (1 - o.userData.shell.delay) > 0.12 ? 1 : 0), 0);
    },
    detached: 0,
    setMode(mode) {
      const lab = mode === "lab";
      for (const o of shells) o.visible = !lab;
      for (const o of shellMode) o.visible = !lab;
      for (const o of labOnly) o.visible = lab;
      api.mode = mode;
    },
    mode: "shell",
    shellCount: shells.length,
  };
  api.setMode("shell");
  api.setExplode(0);
  return api;
}
