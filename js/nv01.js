// NV-01 — real link meshes from description/meshes (24 links, decimated CAD) + procedural shell, head, electronics.
// Coordinates: Three.js Y-up.  x = robot left, y = up, z = forward.  (URDF x→z, y→x, z→y)
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { LINKS, BASE_Y } from "./kin.js";

export { BASE_Y };
const D2R = Math.PI / 180;

// Stage-2 explode: world-space direction + distance + delay for every frame link.
const FRAME_EXPLODE = {
  base_link: null,
  torso_link: [[0, 1, -0.25], 0.42, 0.0],
  left_arm_pitch_link: [[1, 0.7, 0], 0.3, 0.06], right_arm_pitch_link: [[-1, 0.7, 0], 0.3, 0.06],
  left_arm_roll_link: [[1, 0.5, 0.35], 0.45, 0.1], right_arm_roll_link: [[-1, 0.5, 0.35], 0.45, 0.1],
  left_arm_yaw_link: [[1, 0.15, 0.25], 0.6, 0.14], right_arm_yaw_link: [[-1, 0.15, 0.25], 0.6, 0.14],
  left_elbow_pitch_link: [[1, -0.15, 0.45], 0.68, 0.18], right_elbow_pitch_link: [[-1, -0.15, 0.45], 0.68, 0.18],
  left_elbow_yaw_link: [[1, -0.4, 0.55], 0.78, 0.22], right_elbow_yaw_link: [[-1, -0.4, 0.55], 0.78, 0.22],
  left_thigh_yaw_link: [[0.8, 0.15, -1], 0.36, 0.2], right_thigh_yaw_link: [[-0.8, 0.15, -1], 0.36, 0.2],
  left_thigh_roll_link: [[1, -0.05, -0.55], 0.5, 0.26], right_thigh_roll_link: [[-1, -0.05, -0.55], 0.5, 0.26],
  left_thigh_pitch_link: [[1, -0.3, 0.35], 0.56, 0.3], right_thigh_pitch_link: [[-1, -0.3, 0.35], 0.56, 0.3],
  left_knee_link: [[0.9, -0.45, 0.65], 0.62, 0.36], right_knee_link: [[-0.9, -0.45, 0.65], 0.62, 0.36],
  left_ankle_pitch_link: [[0.8, -0.35, 1], 0.64, 0.42], right_ankle_pitch_link: [[-0.8, -0.35, 1], 0.64, 0.42],
  left_ankle_roll_link: [[0.7, -0.25, 1], 0.74, 0.46], right_ankle_roll_link: [[-0.7, -0.25, 1], 0.74, 0.46],
};

export function createNV01({ frame = null } = {}) {
  // ---------- materials ----------
  const M = {
    shell: new THREE.MeshPhysicalMaterial({ color: 0xf2f4f6, roughness: 0.42, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
    shellDark: new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, roughness: 0.5, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.58, metalness: 0.42 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc6cacf, roughness: 0.62, metalness: 0.55 }),
    aluLight: new THREE.MeshStandardMaterial({ color: 0xdadde1, roughness: 0.68, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.22, metalness: 0.95 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.7, metalness: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 }),
    eye: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2, roughness: 0.3 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x1c5b3c, roughness: 0.6, metalness: 0.1 }),
    pcbBlue: new THREE.MeshStandardMaterial({ color: 0x1f3d7a, roughness: 0.6, metalness: 0.1 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.5, metalness: 0.2 }),
    battery: new THREE.MeshStandardMaterial({ color: 0x2857c4, roughness: 0.55, metalness: 0.05 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xe9c227, roughness: 0.75, metalness: 0 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85, metalness: 0 }),
    cableWhite: new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.85, metalness: 0 }),
    red: new THREE.MeshStandardMaterial({ color: 0xd8302c, roughness: 0.45, metalness: 0 }),
    led: new THREE.MeshStandardMaterial({ color: 0x35ff7a, emissive: 0x35ff7a, emissiveIntensity: 1.6 }),
    rope: new THREE.MeshStandardMaterial({ color: 0xe6e3da, roughness: 0.9, metalness: 0 }),
  };

  const shells = [];    // stage-1 exploding shell panels
  const parts = [];     // stage-2 exploding frame links + electronics
  const labOnly = [];   // visible only in lab mode
  const shellMode = []; // visible only with the shell (hand spheres)
  const leds = [];
  const joints = {};
  const groups = {};
  const anchors = {};
  const fadeMats = [M.shell, M.shellDark, M.glass, M.eye];

  // ---------- geometry helpers ----------
  const geoCache = new Map();
  function rbox(w, h, d, r = 0.006, seg = 3) { return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)); }
  function mesh(g, m, x = 0, y = 0, z = 0, parent) {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
    if (parent) parent.add(o); return o;
  }
  function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
  function cyl(rt, rb, h, seg = 32, open = false) { return new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); }
  function warp(g, { taper = 1, sx = 1, sz = 1, len = 1 } = {}) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const t = THREE.MathUtils.clamp((y + len / 2) / len, 0, 1);
      const k = THREE.MathUtils.lerp(taper, 1, t);
      p.setX(i, p.getX(i) * sx * k); p.setZ(i, p.getZ(i) * sz * k);
    }
    p.needsUpdate = true; g.computeVertexNormals(); return g;
  }
  // curved shell panel: sector of a tube, length along Y, angle 0 = +z (front), +angle toward +x
  function arcPanel({ rOut, t = 0.004, len, a0, a1, taper = 1, sx = 1, sz = 1, bevel = 0.0025 }) {
    const key = ["arc", rOut, t, len, a0, a1, taper, sx, sz, bevel].join("|");
    if (geoCache.has(key)) return geoCache.get(key);
    const s = new THREE.Shape();
    const A0 = a0 * D2R - Math.PI / 2, A1 = a1 * D2R - Math.PI / 2;
    s.absarc(0, 0, rOut, A0, A1, false); s.absarc(0, 0, rOut - t, A1, A0, true); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 28 });
    g.rotateX(-Math.PI / 2); g.translate(0, -len / 2, 0); warp(g, { taper, sx, sz, len });
    geoCache.set(key, g); return g;
  }
  function domePanel(r, a0, a1, sx = 1, sz = 1) {
    const g = new THREE.SphereGeometry(r, 32, 16, (a0 + 90) * D2R, (a1 - a0) * D2R, 0, Math.PI / 2); g.scale(sx, 1, sz); return g;
  }
  function plate(points, t, { bevel = 0.002, holes = [] } = {}) {
    const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16 });
    g.translate(0, 0, -t / 2); return g;
  }
  function roundedRectPts(w, h, r, n = 6) {
    const pts = []; const cx = [w / 2 - r, -w / 2 + r, -w / 2 + r, w / 2 - r]; const cy = [h / 2 - r, h / 2 - r, -h / 2 + r, -h / 2 + r];
    for (let c = 0; c < 4; c++) for (let i = 0; i <= n; i++) { const a = (c * 90 + (i / n) * 90) * D2R; pts.push([cx[c] + r * Math.cos(a), cy[c] + r * Math.sin(a)]); }
    return pts;
  }
  function tube(pts, r = 0.0035, m = M.cable, seg = 24) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const o = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 8, false), m); o.castShadow = false; o.userData.curve = curve; return o;
  }
  function flagAlong(o, t, parent, s = 0.012) {
    const p = o.userData.curve.getPoint(t);
    const f = mesh(rbox(s, s * 0.55, s * 0.9, 0.001, 1), M.tape, p.x, p.y, p.z, parent);
    f.rotation.set(Math.random() * 0.6, Math.random() * 0.6, Math.random() * 0.6); return f;
  }
  function screwDimples(parent, list, r = 0.0036, depth = 0.002) {
    const gs = [];
    for (const [x, y, z, nx, ny, nz] of list) {
      const g = cyl(r, r, depth, 12);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, ny, nz).normalize());
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1))); gs.push(g);
    }
    const o = mesh(mergeGeometries(gs), M.dark, 0, 0, 0, parent); o.castShadow = false; return o;
  }
  function shell(o, dir, dist, { spin = 0.35, delay = null } = {}) {
    o.userData.shell = { rest: o.position.clone(), dir: new THREE.Vector3(...dir).normalize(), dist, spin, delay };
    o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    shells.push(o); return o;
  }
  function part(o, key, dir, dist, delay, spin = 0.12) {
    o.userData.part = { key, rest: o.position.clone(), q0: o.quaternion.clone(), dir: new THREE.Vector3(...dir).normalize(), dist, delay, spin, axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize() };
    parts.push(o); return o;
  }

  // ---------- kinematic tree + real link meshes ----------
  const root = new THREE.Group();
  const base = group(root, 0, BASE_Y, 0);
  groups.base_link = base; joints.base = base;
  for (const l of LINKS) {
    if (!l.parent) continue;
    const g = group(groups[l.parent], ...l.offset);
    g.userData.axis = new THREE.Vector3(...l.axis);
    groups[l.name] = g; joints[l.joint] = g;
  }
  const linkMeshes = {};
  for (const l of LINKS) {
    const geo = frame && frame.get(l.name);
    if (!geo) continue;
    const m = mesh(geo, M.frame, 0, 0, 0, groups[l.name]);
    linkMeshes[l.name] = m;
    const ex = FRAME_EXPLODE[l.name];
    if (ex) part(m, l.name, ex[0], ex[1], ex[2]);
  }
  const torso = groups.torso_link;
  joints.torsoYaw = torso;
  anchors.waist = new THREE.Vector3(0, 0.03, -0.028);
  let api_loom = null, api_sprites = [];

  // ---------- PELVIS shells #28–31 ----------
  {
    const beltY = -0.012, beltZ = -0.022;
    const upL = mesh(rbox(0.14, 0.046, 0.19, 0.02), M.shell, 0.071, beltY + 0.024, beltZ, base);
    const upR = mesh(rbox(0.14, 0.046, 0.19, 0.02), M.shell, -0.071, beltY + 0.024, beltZ, base);
    shell(upL, [1, 0.6, 0], 0.34); shell(upR, [-1, 0.6, 0], 0.34);
    const loF = mesh(rbox(0.274, 0.05, 0.093, 0.02), M.shell, 0, beltY - 0.026, beltZ + 0.0485, base);
    const loB = mesh(rbox(0.274, 0.05, 0.093, 0.02), M.shell, 0, beltY - 0.026, beltZ - 0.0485, base);
    shell(loF, [0, -0.25, 1], 0.36); shell(loB, [0, -0.25, -1], 0.36);
    mesh(rbox(0.026, 0.0035, 0.006, 0.001, 1), M.dark, 0.012, 0.004, 0.0955, upL);
    mesh(rbox(0.026, 0.0035, 0.006, 0.001, 1), M.dark, -0.012, 0.004, 0.0955, upR);
    screwDimples(loF, [-0.09, -0.045, 0, 0.045, 0.09].map((x) => [x, -0.012, 0.047, 0, 0, 1]), 0.002);
  }

  // ---------- TORSO: electronics, cables, handle, chest shells, neck, head ----------
  {
    const T = torso;
    // battery 48 V 15 Ah in the lumbar box
    const bat = group(T, 0, 0.05, -0.062);
    mesh(rbox(0.235, 0.06, 0.07, 0.006, 2), M.battery, 0, 0, 0, bat);
    for (const x of [-0.08, 0.0, 0.08]) mesh(rbox(0.022, 0.064, 0.074, 0.001, 1), M.tape, x, 0, 0, bat);
    mesh(rbox(0.028, 0.018, 0.02, 0.002, 1), M.red, 0.1, 0.018, 0.045, bat);
    mesh(rbox(0.05, 0.015, 0.006, 0.001, 1), M.cableWhite, -0.1, 0.02, 0.036, bat);
    part(bat, "battery", [0, 0.25, -1], 0.6, 0.05);
    anchors.battery = new THREE.Vector3(0, 0.05, -0.1);
    // RBE 3-in-1 board behind the front truss
    const rbe = group(T, 0, 0.145, 0.045);
    mesh(rbox(0.1, 0.075, 0.0016, 0.0005, 1), M.pcb, 0, 0, 0, rbe);
    const chips = [];
    for (const [x, y, w, h] of [[-0.03, 0.015, 0.018, 0.018], [0.02, 0.018, 0.012, 0.012], [0.03, -0.015, 0.02, 0.014], [-0.02, -0.02, 0.01, 0.01]]) { const c = rbox(w, h, 0.003, 0.0005, 1); c.translate(x, y, 0.0025); chips.push(c); }
    mesh(mergeGeometries(chips), M.chip, 0, 0, 0, rbe);
    const caps = [];
    for (let i = 0; i < 4; i++) { const c = cyl(0.004, 0.004, 0.008, 10); c.rotateX(Math.PI / 2); c.translate(-0.04 + i * 0.012, -0.025, 0.005); caps.push(c); }
    mesh(mergeGeometries(caps), M.steel, 0, 0, 0, rbe);
    for (let i = 0; i < 4; i++) mesh(rbox(0.008, 0.006, 0.006, 0.0005, 1), M.dark, 0.032, 0.03 - i * 0.012, 0.004, rbe);
    part(rbe, "rbe", [0, 0.55, 1], 0.55, 0.08);
    anchors.rbe = new THREE.Vector3(0, 0.145, 0.05);
    // compute under the top plate
    const opi = group(T, 0.0, 0.222, -0.01);
    mesh(rbox(0.1, 0.0016, 0.075, 0.0005, 1), M.pcbBlue, 0, 0, 0, opi);
    const fins = [];
    for (let i = 0; i < 9; i++) { const f = rbox(0.048, 0.012, 0.003, 0.0005, 1); f.translate(-0.01, 0.007, -0.028 + i * 0.007); fins.push(f); }
    mesh(mergeGeometries(fins), M.alu, 0, 0, 0, opi);
    mesh(rbox(0.014, 0.005, 0.014, 0.001, 1), M.chip, 0.03, 0.0035, 0.02, opi);
    part(opi, "compute", [0.35, 1, 0.15], 0.55, 0.1);
    anchors.compute = new THREE.Vector3(0.0, 0.228, -0.01);
    // IMU on its carrier plate
    const imu = group(T, -0.03, 0.09, -0.02);
    mesh(rbox(0.04, 0.003, 0.03, 0.001, 1), M.alu, 0, 0, 0, imu);
    mesh(rbox(0.03, 0.0016, 0.022, 0.0005, 1), M.pcb, 0, 0.0025, 0, imu);
    mesh(rbox(0.008, 0.003, 0.008, 0.0005, 1), M.chip, 0.004, 0.005, 0.002, imu);
    part(imu, "imu", [-0.4, 0.95, 0.1], 0.5, 0.12);
    anchors.imu = new THREE.Vector3(-0.03, 0.095, -0.02);
    // E-stop relay + switch on the upper back
    const es = group(T, 0.07, 0.215, -0.1);
    mesh(cyl(0.012, 0.012, 0.01, 20), M.tape, 0, 0, 0, es).rotation.x = Math.PI / 2;
    mesh(cyl(0.009, 0.009, 0.012, 20), M.red, 0, 0, -0.008, es).rotation.x = Math.PI / 2;
    mesh(rbox(0.012, 0.008, 0.006, 0.001, 1), M.dark, -0.14, 0, 0.002, es);
    part(es, "estop", [0.5, 0.8, -1], 0.45, 0.14);
    anchors.estop = new THREE.Vector3(0.07, 0.215, -0.11);
    // carry handle
    const handle = tube([[-0.085, 0.235, -0.08], [-0.08, 0.27, -0.098], [-0.04, 0.29, -0.105], [0.04, 0.29, -0.105], [0.08, 0.27, -0.098], [0.085, 0.235, -0.08]], 0.009, M.aluLight, 32);
    handle.castShadow = true; T.add(handle);
    part(handle, "handle", [0, 1, -0.7], 0.55, 0.04);
    anchors.handle = new THREE.Vector3(0, 0.29, -0.11);
    // cable looms
    const looms = [
      [[0.02, 0.135, 0.03], [0.06, 0.12, -0.02], [0.1, 0.16, -0.03], [0.128, 0.205, -0.01]],
      [[-0.02, 0.135, 0.03], [-0.06, 0.12, -0.02], [-0.1, 0.16, -0.03], [-0.128, 0.205, -0.01]],
      [[0.01, 0.12, 0.03], [0.03, 0.05, -0.01], [0.05, -0.02, -0.04], [0.07, -0.09, -0.06]],
      [[-0.01, 0.12, 0.03], [-0.03, 0.05, -0.01], [-0.05, -0.02, -0.04], [-0.07, -0.09, -0.06]],
      [[0.03, 0.14, 0.04], [0.02, 0.2, 0.0], [0.0, 0.222, -0.02]],
    ];
    const loomGroup = group(T, 0, 0, 0);
    looms.forEach((pts, i) => { const c = tube(pts, 0.0032, i % 2 ? M.cable : M.cableWhite, 20); loomGroup.add(c); flagAlong(c, 0.35, loomGroup); if (i < 4) flagAlong(c, 0.75, loomGroup, 0.01); });
    api_loom = loomGroup;
    // wire stub + rope eyes (lab look)
    const stub = group(T, 0.0, 0.245, 0.0);
    for (const [x, z, m] of [[-0.01, 0.01, M.red], [0.0, -0.01, M.tape], [0.012, 0.005, M.cable], [-0.004, 0.018, M.cableWhite]]) stub.add(tube([[x, 0, z], [x * 2, 0.03, z * 1.5], [x * 1.5, 0.05, z * 2.5]], 0.002, m, 10));
    labOnly.push(stub);
    for (const s of [-1, 1]) {
      const rope = tube([[s * 0.11, 0.245, -0.03], [s * 0.1, 0.5, -0.03], [s * 0.06, 1.2, -0.02], [s * 0.03, 2.2, 0.0]], 0.005, M.rope, 16);
      T.add(rope); labOnly.push(rope);
      mesh(new THREE.TorusGeometry(0.009, 0.0025, 8, 16), M.steel, s * 0.11, 0.245, -0.03, T).rotation.y = Math.PI / 2;
    }

    // chest shells #4–7
    const chestFU = group(T, 0, 0.115, 0.0);
    mesh(plate([[-0.128, 0], [0.128, 0], [0.152, 0.14], [-0.152, 0.14]], 0.072, { bevel: 0.014 }), M.shell, 0, 0, 0.046, chestFU);
    const shield = mesh(plate([[-0.1, 0.03], [0.1, 0.03], [0.13, 0.128], [-0.13, 0.128]], 0.012, { bevel: 0.008 }), M.shell, 0, 0, 0.1, chestFU);
    shield.rotation.x = -0.06;
    mesh(rbox(0.058, 0.007, 0.008, 0.002, 1), M.dark, 0, 0.012, 0.0995, chestFU);
    shell(chestFU, [0, 0.2, 1], 0.5);
    anchors.chest = new THREE.Vector3(0, 0.2, 0.1);
    const chestFL = group(T, 0, 0.0, 0.0);
    mesh(plate([[-0.104, 0.0], [0.104, 0.0], [0.128, 0.115], [-0.128, 0.115]], 0.066, { bevel: 0.012 }), M.shell, 0, 0, 0.042, chestFL);
    shell(chestFL, [0, -0.15, 1], 0.45);
    const chestBU = group(T, 0, 0.115, 0.0);
    mesh(plate([[-0.128, 0], [0.128, 0], [0.152, 0.14], [-0.152, 0.14]], 0.09, { bevel: 0.014 }), M.shell, 0, 0, -0.058, chestBU);
    shell(chestBU, [0, 0.25, -1], 0.5);
    const chestBL = group(T, 0, 0.0, 0.0);
    mesh(plate([[-0.104, 0.0], [0.104, 0.0], [0.128, 0.115], [-0.128, 0.115]], 0.084, { bevel: 0.012 }), M.shell, 0, 0, -0.052, chestBL);
    mesh(rbox(0.272, 0.068, 0.05, 0.012), M.shell, 0, 0.05, -0.108, chestBL); // battery hump
    shell(chestBL, [0, -0.2, -1], 0.48);

    // logo plate on the robot's right upper chest
    const logo = document.createElement("canvas"); logo.width = 512; logo.height = 256;
    const cx = logo.getContext("2d"); cx.clearRect(0, 0, 512, 256); cx.fillStyle = "#6a6f76";
    cx.font = "700 74px Inter, system-ui, sans-serif"; cx.textBaseline = "alphabetic"; cx.fillText("NOREVERT", 16, 120);
    cx.font = "500 44px 'IBM Plex Mono', ui-monospace, monospace"; cx.fillText("NV-01", 18, 190);
    cx.beginPath(); cx.arc(452, 92, 34, 0, Math.PI * 2); cx.strokeStyle = "#6a6f76"; cx.lineWidth = 8; cx.stroke();
    cx.fillRect(440, 78, 8, 28); cx.fillRect(458, 78, 8, 28);
    const lt = new THREE.CanvasTexture(logo); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 8;
    const lm = new THREE.MeshBasicMaterial({ map: lt, transparent: true, opacity: 0.9, depthWrite: false });
    fadeMats.push(lm);
    const plaque = mesh(new THREE.PlaneGeometry(0.1, 0.05), lm, -0.062, 0.095, 0.1098, chestFU);
    plaque.rotation.x = -0.06; plaque.castShadow = false;

    // neck #3 + head #1–2
    const neck = mesh(cyl(0.03, 0.033, 0.052, 32), M.shellDark, 0, 0.29, 0.0, T);
    mesh(new THREE.TorusGeometry(0.031, 0.002, 8, 32), M.dark, 0, 0.012, 0, neck).rotation.x = Math.PI / 2;
    shell(neck, [0, 1, 0], 0.22, { spin: 0.1 });
    const head = group(T, 0, 0.372, 0.004);
    joints.head = head;
    const headF = group(head, 0, 0, 0.026);
    mesh(rbox(0.192, 0.116, 0.06, 0.024, 4), M.shell, 0, 0, -0.003, headF);
    mesh(rbox(0.18, 0.104, 0.006, 0.014, 3), M.dark, 0, 0, 0.026, headF);
    mesh(rbox(0.174, 0.098, 0.005, 0.013, 3), M.glass, 0, 0, 0.0285, headF);
    const eyeL = mesh(new THREE.CapsuleGeometry(0.0092, 0.028, 4, 16), M.eye, 0.03, 0.0, 0.0255, headF);
    const eyeR = mesh(new THREE.CapsuleGeometry(0.0092, 0.028, 4, 16), M.eye, -0.03, 0.0, 0.0255, headF);
    eyeL.castShadow = eyeR.castShadow = false;
    mesh(rbox(0.03, 0.0025, 0.007, 0.001, 1), M.dark, 0, 0.0585, -0.005, headF);
    mesh(rbox(0.012, 0.002, 0.002, 0.0005, 1), M.dark, 0, 0.038, 0.0315, headF);
    shell(headF, [0, 0.45, 1], 0.36, { spin: 0.25 });
    const headB = mesh(rbox(0.19, 0.115, 0.05, 0.024, 4), M.shell, 0, 0, -0.03, head);
    shell(headB, [0, 0.5, -1], 0.36, { spin: 0.25 });
    joints.eyes = [eyeL, eyeR];
    anchors.head = new THREE.Vector3(0.1, 0.4, 0.03);
    const glowTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
      const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      r.addColorStop(0, "rgba(255,255,255,0.75)"); r.addColorStop(0.35, "rgba(255,255,255,0.18)"); r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const sprites = [];
    for (const e of [eyeL, eyeR]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
      sp.scale.set(0.09, 0.11, 1); sp.position.set(0, 0, 0.012); e.add(sp); sprites.push(sp);
    }
    api_sprites = sprites;
  }

  // ---------- ARMS: shells only (frame is the real mesh) ----------
  function arm(s) {
    const side = s > 0 ? "left" : "right";
    const ap = groups[`${side}_arm_pitch_link`];
    const ar = groups[`${side}_arm_roll_link`];
    const ay = groups[`${side}_arm_yaw_link`];
    const ey = groups[`${side}_elbow_yaw_link`];
    // black shoulder shells #8/#9 around the pitch can (can extends outward to x ≈ 0.084)
    const shA = mesh(arcPanel({ rOut: 0.047, t: 0.005, len: 0.06, a0: 0, a1: 180 }), M.shellDark, s * 0.032, 0, 0, ap);
    const shB = mesh(arcPanel({ rOut: 0.047, t: 0.005, len: 0.06, a0: 180, a1: 360 }), M.shellDark, s * 0.032, 0, 0, ap);
    shA.rotation.z = -s * Math.PI / 2; shB.rotation.z = -s * Math.PI / 2;
    shell(shA, [s * 0.6, -s, 0], 0.26); shell(shB, [s * 0.6, s, 0], 0.26);
    // white dome caps #12/#13 over the roll can
    const capF = mesh(domePanel(0.047, -90, 90), M.shell, 0, 0.006, -0.02, ar);
    const capB = mesh(domePanel(0.047, 90, 270), M.shell, 0, 0.006, -0.02, ar);
    shell(capF, [s * 0.4, 0.6, 1], 0.28); shell(capB, [s * 0.4, 0.6, -1], 0.28);
    // upper arm panels #14/#15
    const uaLen = 0.15;
    const uaF = mesh(arcPanel({ rOut: 0.041, t: 0.004, len: uaLen, a0: -90, a1: 90, taper: 0.95 }), M.shell, 0, -0.092, 0, ay);
    const uaB = mesh(arcPanel({ rOut: 0.041, t: 0.004, len: uaLen, a0: 90, a1: 270, taper: 0.95 }), M.shell, 0, -0.092, 0, ay);
    shell(uaF, [s * 0.3, 0.05, 1], 0.28); shell(uaB, [s * 0.3, 0.05, -1], 0.28);
    for (let i = 0; i < 3; i++) mesh(rbox(0.012, 0.0025, 0.004, 0.0005, 1), M.dark, s * 0.038, -0.04 - i * 0.012, 0.012, uaF).rotation.y = s * 0.9;
    // forearm: the URDF forearm points along local +z; build it hanging along -y in a sub-group
    const fore = group(ey, 0, 0, 0);
    fore.rotation.x = -Math.PI / 2;
    const fa = { rOut: 0.037, t: 0.004, len: 0.066, taper: 0.92 };
    const outer = s > 0 ? [0, 180] : [180, 360];
    const inner = s > 0 ? [180, 360] : [0, 180];
    const fUO = mesh(arcPanel({ ...fa, a0: outer[0], a1: outer[1] }), M.shell, 0, -0.04, 0, fore);
    const fUI = mesh(arcPanel({ ...fa, a0: inner[0], a1: inner[1] }), M.shell, 0, -0.04, 0, fore);
    const fLO = mesh(arcPanel({ ...fa, taper: 0.88, a0: outer[0], a1: outer[1] }), M.shell, 0, -0.108, 0, fore);
    const fLI = mesh(arcPanel({ ...fa, taper: 0.88, a0: inner[0], a1: inner[1] }), M.shell, 0, -0.108, 0, fore);
    fLO.scale.set(0.93, 1, 0.93); fLI.scale.set(0.93, 1, 0.93);
    shell(fUO, [s, 0.1, 0.2], 0.26); shell(fUI, [0, -0.2, 1], 0.28);
    shell(fLO, [s, -0.2, 0.2], 0.26); shell(fLI, [0, -0.5, 1], 0.28);
    screwDimples(fLO, [[s * 0.012, 0.012, 0.031, s * 0.35, 0, 1], [s * 0.027, 0.012, 0.022, s * 0.7, 0, 0.7], [s * 0.012, -0.004, 0.031, s * 0.35, 0, 1], [s * 0.027, -0.004, 0.022, s * 0.7, 0, 0.7]], 0.003);
    const ball = mesh(new THREE.SphereGeometry(0.035, 36, 24), M.shellDark, 0, -0.166, 0, fore);
    shellMode.push(ball);
    anchors[`hand${s > 0 ? "L" : "R"}`] = new THREE.Vector3(0, -0.166, 0);
    anchors[`hand${s > 0 ? "L" : "R"}Obj`] = fore;
  }
  arm(1); arm(-1);

  // ---------- LEGS: shells only ----------
  function leg(s) {
    const side = s > 0 ? "left" : "right";
    const hr = groups[`${side}_thigh_roll_link`];
    const hp = groups[`${side}_thigh_pitch_link`];
    const kn = groups[`${side}_knee_link`];
    const ar = groups[`${side}_ankle_roll_link`];
    // black hip covers #32–35 wrapping the hip pitch can (Ø120) — inner / outer halves
    const cov = group(hr, s * -0.005, -0.03, 0.06);
    const covO = mesh(rbox(0.043, 0.112, 0.124, 0.03, 4), M.shellDark, s * 0.0215, 0, 0, cov);
    const covI = mesh(rbox(0.043, 0.112, 0.124, 0.03, 4), M.shellDark, -s * 0.0215, 0, 0, cov);
    shell(covO, [s, -0.3, 0], 0.3); shell(covI, [0, -0.3, 1], 0.3);
    // thigh root collar #36/37
    const rootC = mesh(arcPanel({ rOut: 0.064, t: 0.005, len: 0.04, a0: -180, a1: 180, sz: 0.9 }), M.shellDark, 0, -0.072, 0, hp);
    shell(rootC, [s * 0.6, 0.2, 0.7], 0.24);
    // thigh panels #38–45
    const th = { rOut: 0.058, t: 0.0045, len: 0.165, taper: 0.9, sz: 0.86 };
    const thY = -0.176;
    for (const [name, a0, a1, dir] of [["front", -45, 45, [0, 0, 1]], ["outer", 45 * s, 135 * s, [s, 0, 0]], ["back", 135, 225, [0, 0.2, -1]], ["inner", -135 * s, -45 * s, [0, -0.6, -0.8]]]) {
      const p = mesh(arcPanel({ ...th, a0: Math.min(a0, a1), a1: Math.max(a0, a1) }), M.shell, 0, thY, 0, hp);
      shell(p, dir, 0.3);
      if (name === "front") { const d = []; for (let r = 0; r < 3; r++) for (const c of [-1, 1]) d.push([c * 0.014, 0.05 - r * 0.045, 0.049, c * 0.25, 0, 1]); screwDimples(p, d, 0.0022); }
    }
    // knee cap #46/47 over the outer face of the knee can
    const kneeCap = group(kn, s * 0.066, 0.004, 0.0);
    mesh(rbox(0.014, 0.138, 0.118, 0.05, 5), M.shell, 0, 0, 0, kneeCap);
    mesh(cyl(0.02, 0.02, 0.014, 24), M.dark, 0, 0, 0, kneeCap).rotation.z = Math.PI / 2;
    shell(kneeCap, [s, 0.1, 0.3], 0.28);
    // shin panels #48–51 (inner half is wider: it hides the two inboard ankle cans)
    const sh = { rOut: 0.05, t: 0.0045, len: 0.215, taper: 0.86, sx: 1.26, sz: 0.95 };
    const fo = s > 0 ? [-70, 110] : [-110, 70];
    const bi = s > 0 ? [110, 290] : [70, 250];
    const shinFO = mesh(arcPanel({ ...sh, a0: fo[0], a1: fo[1] }), M.shell, 0, -0.168, 0.0, kn);
    const shinBI = mesh(arcPanel({ ...sh, a0: bi[0], a1: bi[1] }), M.shell, 0, -0.168, 0.0, kn);
    shell(shinFO, [s * 0.6, 0, 0.8], 0.3); shell(shinBI, [0, -0.35, -1], 0.3);
    screwDimples(shinFO, [[s * 0.012, 0.06, 0.046, s * 0.25, 0, 1], [s * -0.012, 0.06, 0.046, -s * 0.25, 0, 1], [s * 0.012, 0.0, 0.043, s * 0.25, 0, 1], [s * -0.012, 0.0, 0.043, -s * 0.25, 0, 1]], 0.002);
    anchors[`ankle${s > 0 ? "L" : "R"}`] = new THREE.Vector3(s * 0.06, -0.12, -0.02);
    anchors[`ankle${s > 0 ? "L" : "R"}Obj`] = kn;
    anchors[`hip${s > 0 ? "L" : "R"}`] = new THREE.Vector3(s * 0.065, 0, 0);
    anchors[`hip${s > 0 ? "L" : "R"}Obj`] = hp;
    // foot shells #52–55
    const footPts = roundedRectPts(0.092, 0.212, 0.03, 8);
    const footTop = mesh(plate(footPts, 0.014, { bevel: 0.004 }), M.shell, 0, -0.018, 0.04, ar);
    footTop.rotation.x = Math.PI / 2;
    screwDimples(footTop, [[0.02, 0.07, -0.0115, 0, 0, -1], [-0.02, 0.07, -0.0115, 0, 0, -1]], 0.0028);
    const sole = mesh(plate(footPts, 0.01, { bevel: 0.002 }), M.rubber, 0, -0.041, 0.04, ar);
    sole.rotation.x = Math.PI / 2;
    shell(footTop, [0, 0.7, 0.7], 0.2, { spin: 0.15 }); shell(sole, [0, -0.6, 0.8], 0.16, { spin: 0.1 });
  }
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 });
  leg(1); leg(-1);

  // ---------- bookkeeping ----------
  // authors' STL numbering, in the order the panels were registered above
  const SHELL_IDS = [29, 28, 30, 31, 4, 6, 5, 7, 3, 1, 2,
    11, 10, 14, 15, 18, 19, 23, 22, 27, 26,
    8, 9, 12, 13, 16, 17, 21, 20, 25, 24,
    35, 34, 37, 42, 45, 43, 44, 47, 50, 51, 54, 55,
    33, 32, 36, 38, 41, 39, 40, 46, 48, 49, 52, 53];
  root.updateMatrixWorld(true);
  const _v = new THREE.Vector3();
  shells.forEach((o, i) => { o.userData.stl = SHELL_IDS[i]; });
  for (const o of shells) {
    const d = o.userData.shell;
    if (d.delay == null) { o.getWorldPosition(_v); d.delay = THREE.MathUtils.clamp((1.28 - _v.y) / 1.28, 0, 1) * 0.55; }
    d.axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    d.spinSign = Math.random() > 0.5 ? 1 : -1;
    d.q0 = o.quaternion.clone();
  }

  // ---------- poses / joints ----------
  const POSES = {
    stand: { shRollL: 0.05, shRollR: 0.05 },
    guard: {
      torsoYaw: 0.3,
      shPitchL: 0.95, shRollL: 0.34, shYawL: 0.1, elPitchL: 2.25,
      shPitchR: 0.75, shRollR: 0.34, shYawR: -0.1, elPitchR: 2.3,
      hipPitchL: 0.5, kneeL: 0.6, anklePitchL: 0.1,
      hipPitchR: 0.2, kneeR: 0.7, anklePitchR: 0.5,
      hipRollL: 0.06, hipRollR: 0.06,
    },
  };
  // sign so that positive angles mean: pitch = forward, knee = flex, roll = out, yaw = turn out
  const JSIGN = {
    torsoYaw: 1,
    shPitchL: -1, shPitchR: -1, shRollL: 1, shRollR: -1, shYawL: -1, shYawR: 1,
    elPitchL: -1, elPitchR: -1, elYawL: 1, elYawR: -1,
    hipYawL: 1, hipYawR: -1, hipRollL: 1, hipRollR: -1,
    hipPitchL: -1, hipPitchR: -1, kneeL: 1, kneeR: 1,
    anklePitchL: -1, anklePitchR: -1, ankleRollL: 1, ankleRollR: -1,
  };
  const REST = { elPitchL: Math.PI / 2, elPitchR: Math.PI / 2 }; // URDF zero has the forearm forward; hang it
  const current = {}, target = {};
  for (const k of Object.keys(JSIGN)) { current[k] = 0; target[k] = 0; }
  function applyJoint(name, angle) {
    const g = joints[name]; if (!g) return;
    g.quaternion.setFromAxisAngle(g.userData.axis, angle * JSIGN[name] + (REST[name] || 0));
  }

  const _q = new THREE.Quaternion(), _d = new THREE.Vector3(), _q2 = new THREE.Quaternion();
  const ease = (t) => t * t * (3 - 2 * t);
  const api = {
    root, base, torso, joints, groups, shells, parts, anchors, leds, materials: M, linkMeshes,
    poses: Object.keys(POSES),
    setPose(name) { const p = POSES[name] || POSES.stand; for (const k of Object.keys(target)) target[k] = p[k] || 0; },
    update(dt, extra = {}) {
      const k = 1 - Math.pow(0.001, dt);
      for (const j of Object.keys(current)) { current[j] += (target[j] - current[j]) * k; applyJoint(j, current[j] + (extra[j] || 0)); }
      const reach = (h, kn) => 0.25 * Math.cos(h) + 0.3 * Math.cos(h - kn);
      const r = Math.max(reach(current.hipPitchL, current.kneeL), reach(current.hipPitchR, current.kneeR));
      base.position.y = BASE_Y - (0.55 - r) + (extra.baseLift || 0);
    },
    // stage 1: shells peel (api.fade adds the between-stage drift)
    setExplode(p) {
      const drift = api.fade * 0.9;
      for (const o of shells) {
        const d = o.userData.shell;
        const e = ease(THREE.MathUtils.clamp((p - d.delay) / (1 - d.delay), 0, 1));
        o.position.copy(d.rest).addScaledVector(d.dir, e * d.dist + drift);
        _q.setFromAxisAngle(d.axis, e * d.spin * d.spinSign);
        o.quaternion.copy(d.q0).multiply(_q);
      }
      api.detached = shells.reduce((n, o) => n + ((p - o.userData.shell.delay) / (1 - o.userData.shell.delay) > 0.12 ? 1 : 0), 0);
    },
    // between stages: shells fade out (call before setExplode)
    setShellFade(f) {
      api.fade = f;
      const on = f < 0.97 && api.mode !== "lab";
      for (const m of fadeMats) { const logo = m === fadeMats[4]; m.transparent = f > 0.001 || logo; m.opacity = (logo ? 0.9 : 1) * (1 - f); m.depthWrite = f < 0.5; }
      for (const s of api_sprites) s.material.opacity = 0.55 * (1 - f);
      for (const o of shells) o.visible = on;
      for (const o of shellMode) o.visible = on;
    },
    // stage 2: the frame comes apart link by link, electronics leave the box
    setKnolling(p) {
      let n = 0;
      for (const o of parts) {
        const d = o.userData.part;
        const local = THREE.MathUtils.clamp((p - d.delay) / (1 - d.delay), 0, 1);
        const e = ease(local);
        if (local > 0.1) n++;
        o.parent.getWorldQuaternion(_q2).invert();
        _d.copy(d.dir).applyQuaternion(_q2);
        o.position.copy(d.rest).addScaledVector(_d, e * d.dist);
        _q.setFromAxisAngle(d.axis, e * d.spin);
        o.quaternion.copy(d.q0).multiply(_q);
      }
      if (api_loom) api_loom.visible = p < 0.25;
      api.detached2 = n;
      api.knolling = p;
    },
    detached: 0, detached2: 0, fade: 0, knolling: 0,
    setMode(mode) {
      const lab = mode === "lab";
      api.mode = mode;
      for (const o of shells) o.visible = !lab;
      for (const o of shellMode) o.visible = !lab;
      for (const o of labOnly) o.visible = lab;
    },
    mode: "shell",
    shellCount: shells.length,
    partCount: parts.length,
    partByKey: Object.fromEntries(parts.map((o) => [o.userData.part.key, o])),
    // dev: every shell's vertices in its link-local frame (for registering the authors' STL panels)
    exportShells() {
      root.updateMatrixWorld(true);
      const linkOf = (o) => { let p = o; while (p) { for (const [n, g] of Object.entries(groups)) if (g === p) return n; p = p.parent; } return null; };
      const inv = new THREE.Matrix4(), m = new THREE.Matrix4(), v = new THREE.Vector3();
      return shells.map((o) => {
        const link = linkOf(o);
        inv.copy(groups[link].matrixWorld).invert();
        const verts = [];
        o.traverse((c) => {
          if (!c.isMesh || c.material === M.dark || c.isSprite || c.geometry.type === "PlaneGeometry") return;
          m.multiplyMatrices(inv, c.matrixWorld);
          const p = c.geometry.attributes.position;
          const step = Math.max(1, Math.floor(p.count / 1500));
          for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(m); verts.push(+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5)); }
        });
        return { stl: o.userData.stl, link, verts };
      });
    },
  };
  api.setMode("shell");
  api.setExplode(0);
  return api;
}
