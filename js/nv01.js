import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function createNV01() {
  const shell = mat(0xc8ccd2, 0.1, 0.55, 0.2);
  const shellIn = mat(0xb4b8be, 0.12, 0.5, 0.15);
  const ink = mat(0x1c1e22, 0.7, 0.4, 0);
  const silver = mat(0xa8adb3, 0.9, 0.24, 0);
  const visor = mat(0x0b0c0f, 0.25, 0.16, 0.5);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.92, metalness: 0 });
  const hand = mat(0x1a1c20, 0.14, 0.64, 0);
  const alu = mat(0x8d9298, 0.55, 0.38, 0);
  const pcb = new THREE.MeshStandardMaterial({ color: 0x1f3d2a, roughness: 0.7, metalness: 0.1 });
  const cell = new THREE.MeshStandardMaterial({ color: 0x2a7a3a, roughness: 0.45, metalness: 0.15 });
  const eye = new THREE.MeshStandardMaterial({ color: 0xe4e4e4, emissive: 0xcfcfcf, emissiveIntensity: 1.05 });
  const dim = new THREE.MeshStandardMaterial({ color: 0x7a7f85, roughness: 0.5, metalness: 0.15 });

  const parts = [];
  const root = new THREE.Group();

  function mat(color, metalness, roughness, clearcoat) {
    return new THREE.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat, clearcoatRoughness: 0.5 });
  }
  function rb(w, h, d, r, m) {
    return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), m);
  }
  function bolt(s = 0.004) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(s, s, s * 0.7, 8), silver));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(s * 1.15, s * 1.15, s * 0.35, 6), silver);
    cap.position.y = s * 0.4;
    g.add(cap);
    return g;
  }
  function ringBolts(parent, n, rad, y, s = 0.0035) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const b = bolt(s);
      b.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
      parent.add(b);
    }
  }
  function mark(obj, dir, dist, delay = 0) {
    obj.userData.rest = obj.position.clone();
    obj.userData.dir = dir.clone().normalize();
    obj.userData.dist = dist;
    obj.userData.delay = delay;
    parts.push(obj);
    return obj;
  }
  function put(parent, mesh, x, y, z) {
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function pancake(r, t, big) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t * 0.7, 32), ink);
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.84, r * 0.84, t * 0.18, 32), silver);
    fl.position.y = t * 0.32;
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, t * 0.5, 18), ink);
    bore.position.y = t * 0.2;
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r, t * 0.08, 32), ink);
    lip.position.y = -t * 0.32;
    g.add(body, fl, bore, lip);
    ringBolts(g, big ? 8 : 6, r * 0.6, t * 0.4, big ? 0.004 : 0.003);
    const port = rb(0.018, 0.01, 0.012, 0.002, ink);
    port.position.set(0, -t * 0.2, r * 0.92);
    g.add(port);
    return g;
  }
  function axis(obj, ax) {
    if (ax === "x") obj.rotation.z = Math.PI / 2;
    if (ax === "z") obj.rotation.x = Math.PI / 2;
    return obj;
  }
  function holes(parent, cols, rows, pitchX, pitchY, x0, y0, z) {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.01, 8), dim);
        h.rotation.x = Math.PI / 2;
        h.position.set(x0 + c * pitchX, y0 - r * pitchY, z);
        parent.add(h);
      }
    }
  }
  function beam(w, h, d, cut) {
    const g = new THREE.Group();
    g.add(rb(w, h, d, 0.004, alu));
    if (cut) {
      const win = rb(w * 0.45, h * 0.35, d + 0.01, 0.003, ink);
      win.material = new THREE.MeshBasicMaterial({ color: 0x0a0b0e });
      win.scale.set(1, 1, 0.2);
      g.add(win);
    }
    return g;
  }

  const HIP_Y = 0.74;
  const HIP_X = 0.0725;
  const KNEE = 0.25;
  const SHIN = 0.3;
  const SH_Y = HIP_Y + 0.255;
  const SH_X = 0.12175;

  const spine = beam(0.04, 0.28, 0.04, true);
  put(root, spine, 0, SH_Y - 0.06, -0.02);
  mark(spine, new THREE.Vector3(0.15, 0.1, -0.4), 0.55, 0.25);
  const x1 = rb(0.22, 0.012, 0.04, 0.002, alu);
  x1.rotation.z = 0.55;
  put(root, x1, 0, SH_Y - 0.02, 0);
  mark(x1, new THREE.Vector3(-0.6, 0.2, 0.3), 0.5, 0.28);
  const x2 = rb(0.22, 0.012, 0.04, 0.002, alu);
  x2.rotation.z = -0.55;
  put(root, x2, 0, SH_Y - 0.02, 0);
  mark(x2, new THREE.Vector3(0.6, 0.2, 0.3), 0.5, 0.28);
  const clampF = rb(0.16, 0.2, 0.012, 0.004, alu);
  put(root, clampF, 0, SH_Y - 0.05, 0.055);
  mark(clampF, new THREE.Vector3(0, 0.1, 0.7), 0.48, 0.3);
  const clampB = rb(0.16, 0.2, 0.012, 0.004, alu);
  put(root, clampB, 0, SH_Y - 0.05, -0.06);
  mark(clampB, new THREE.Vector3(0, 0.1, -0.7), 0.48, 0.3);

  const pack = new THREE.Group();
  pack.position.set(0, HIP_Y + 0.16, -0.1);
  root.add(pack);
  mark(pack, new THREE.Vector3(0, 0, -1), 0.7, 0.22);
  pack.add(rb(0.27, 0.06, 0.07, 0.006, ink));
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 2; j++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.052, 10), cell);
      c.position.set(-0.1 + i * 0.028, 0, -0.012 + j * 0.024);
      pack.add(c);
    }
  }
  const bms = rb(0.04, 0.02, 0.05, 0.002, new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4 }));
  bms.position.set(-0.11, 0.02, 0);
  pack.add(bms);

  const board = rb(0.1, 0.006, 0.075, 0.002, pcb);
  put(root, board, 0.03, SH_Y + 0.02, 0.01);
  mark(board, new THREE.Vector3(0.4, 0.5, 0.2), 0.45, 0.32);

  const waistMotor = axis(pancake(0.055, 0.05, true), "y");
  put(root, waistMotor, 0, HIP_Y + 0.095, 0);
  mark(waistMotor, new THREE.Vector3(0, 0.2, 0.55), 0.42, 0.2);
  const waistSup = rb(0.12, 0.04, 0.1, 0.006, alu);
  put(root, waistSup, 0, HIP_Y + 0.07, 0);
  mark(waistSup, new THREE.Vector3(0, -0.1, 0.4), 0.35, 0.24);

  const chestU = rb(0.34, 0.16, 0.09, 0.036, shell);
  put(root, chestU, 0, SH_Y + 0.02, 0.055);
  mark(chestU, new THREE.Vector3(-0.15, 0.45, 0.75), 0.72, 0);
  const chestD = rb(0.28, 0.13, 0.08, 0.03, shell);
  put(root, chestD, 0, SH_Y - 0.12, 0.05);
  mark(chestD, new THREE.Vector3(0.1, 0.15, 0.8), 0.68, 0.04);
  const backU = rb(0.32, 0.15, 0.07, 0.03, shellIn);
  put(root, backU, 0, SH_Y + 0.02, -0.07);
  mark(backU, new THREE.Vector3(0, 0.4, -0.8), 0.7, 0.02);
  const backD = rb(0.26, 0.12, 0.07, 0.026, shellIn);
  put(root, backD, 0, SH_Y - 0.12, -0.07);
  mark(backD, new THREE.Vector3(0, 0.1, -0.85), 0.66, 0.06);
  const slit = rb(0.14, 0.009, 0.014, 0.002, ink);
  put(root, slit, 0, SH_Y - 0.03, 0.102);
  mark(slit, new THREE.Vector3(0, 0.3, 0.9), 0.5, 0.08);
  holes(chestU, 4, 1, 0.04, 0, -0.06, 0.05, 0.046);

  const logo = document.createElement("canvas");
  logo.width = 512;
  logo.height = 200;
  const ctx = logo.getContext("2d");
  ctx.fillStyle = "#5a5f66";
  ctx.font = "600 46px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("NOREVERT", 24, 80);
  ctx.font = "500 30px IBM Plex Mono, ui-monospace, monospace";
  ctx.fillText("NV-01", 24, 138);
  const lm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(logo), transparent: true, opacity: 0.8 });
  lm.map.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.145, 0.056), lm);
  put(root, plate, -0.058, SH_Y + 0.04, 0.102);
  mark(plate, new THREE.Vector3(-0.3, 0.55, 0.75), 0.55, 0.05);

  const handle = rb(0.23, 0.02, 0.034, 0.008, shell);
  put(root, handle, 0, SH_Y + 0.1, -0.06);
  mark(handle, new THREE.Vector3(0, 0.75, -0.4), 0.55, 0.1);
  const humpShell = rb(0.27, 0.062, 0.072, 0.012, shell);
  put(root, humpShell, 0, HIP_Y + 0.16, -0.12);
  mark(humpShell, new THREE.Vector3(0.1, -0.05, -1), 0.62, 0.07);

  const pelvis = rb(0.255, 0.12, 0.165, 0.03, shell);
  put(root, pelvis, 0, HIP_Y, 0.01);
  mark(pelvis, new THREE.Vector3(0, -0.2, 0.35), 0.48, 0.05);
  put(root, rb(0.11, 0.007, 0.01, 0.002, ink), 0, HIP_Y + 0.02, 0.09);
  put(root, rb(0.1, 0.007, 0.01, 0.002, ink), 0, HIP_Y - 0.015, 0.09);
  const hipCoverL = rb(0.1, 0.06, 0.09, 0.02, ink);
  put(root, hipCoverL, -HIP_X, HIP_Y - 0.055, 0.01);
  mark(hipCoverL, new THREE.Vector3(-0.7, -0.35, 0), 0.4, 0.08);
  const hipCoverR = rb(0.1, 0.06, 0.09, 0.02, ink);
  put(root, hipCoverR, HIP_X, HIP_Y - 0.055, 0.01);
  mark(hipCoverR, new THREE.Vector3(0.7, -0.35, 0), 0.4, 0.08);

  for (const s of [-1, 1]) {
    const hip = axis(pancake(0.076, 0.052, true), "x");
    put(root, hip, HIP_X * s * 1.28, HIP_Y + 0.01, -0.01);
    mark(hip, new THREE.Vector3(s, -0.1, -0.45), 0.62, 0.18);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.043, 0.046, 24), ink);
  put(root, neck, 0, SH_Y + 0.135, 0);
  mark(neck, new THREE.Vector3(0, 0.85, 0), 0.38, 0.12);
  ringBolts(neck, 6, 0.03, 0.02, 0.0025);

  const head = new THREE.Group();
  head.position.set(0, SH_Y + 0.218, 0.01);
  root.add(head);
  mark(head, new THREE.Vector3(0, 1.2, 0.1), 0.82, 0);

  const headFront = rb(0.198, 0.142, 0.07, 0.04, shell);
  headFront.position.set(0, 0, 0.028);
  head.add(headFront);
  const headBack = rb(0.19, 0.138, 0.06, 0.038, shellIn);
  headBack.position.set(0, 0, -0.03);
  head.add(headBack);
  const face = rb(0.168, 0.11, 0.012, 0.016, visor);
  face.position.set(0, 0.002, 0.062);
  head.add(face);
  const recess = rb(0.15, 0.09, 0.008, 0.01, ink);
  recess.position.set(0, 0.002, 0.056);
  head.add(recess);
  const topSlit = rb(0.05, 0.005, 0.01, 0.002, ink);
  topSlit.position.set(0, 0.068, 0.01);
  head.add(topSlit);
  const tick = rb(0.018, 0.003, 0.004, 0.001, eye);
  tick.position.set(0, 0.028, 0.068);
  head.add(tick);
  function pill(x) {
    const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.034, 6, 14), eye);
    e.position.set(x, 0.0, 0.07);
    head.add(e);
  }
  pill(-0.03);
  pill(0.03);
  ringBolts(headFront, 4, 0.07, 0.06, 0.0022);

  function arm(side) {
    const g = new THREE.Group();
    g.position.set(SH_X * side * 1.04, SH_Y, 0);
    root.add(g);
    mark(g, new THREE.Vector3(side * 1.2, 0.25, 0.1), 0.9, 0.02);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.054, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    cap.rotation.z = side * -0.35;
    cap.position.set(0.012 * side, 0.03, 0);
    g.add(cap);
    const sh = axis(pancake(0.044, 0.04, false), "x");
    sh.position.set(0.03 * side, 0, 0);
    g.add(sh);
    const uFront = rb(0.064, 0.185, 0.034, 0.016, shell);
    uFront.position.set(0, -0.1, 0.018);
    g.add(uFront);
    const uBack = rb(0.064, 0.185, 0.034, 0.016, shellIn);
    uBack.position.set(0, -0.1, -0.018);
    g.add(uBack);
    const core = beam(0.028, 0.16, 0.028, true);
    core.position.set(0, -0.1, 0);
    g.add(core);
    const el = axis(pancake(0.032, 0.03, false), "z");
    el.position.set(0, -0.19, 0);
    g.add(el);
    const fg = new THREE.Group();
    fg.position.set(0, -0.19, 0);
    fg.rotation.x = 0.1;
    g.add(fg);
    mark(fg, new THREE.Vector3(side * 0.3, -0.9, 0.4), 0.52, 0.12);
    const fF = rb(0.054, 0.16, 0.03, 0.014, shell);
    fF.position.set(0, -0.09, 0.016);
    fg.add(fF);
    const fB = rb(0.054, 0.16, 0.03, 0.014, shellIn);
    fB.position.set(0, -0.09, -0.016);
    fg.add(fB);
    holes(fF, 2, 2, 0.02, 0.024, -0.01, -0.06, 0.016);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 26, 18), hand);
    ball.position.set(0, -0.195, 0);
    fg.add(ball);
    g.rotation.z = side * 0.07;
  }
  arm(-1);
  arm(1);

  function leg(side) {
    const g = new THREE.Group();
    g.position.set(HIP_X * side, HIP_Y - 0.015, 0);
    root.add(g);
    mark(g, new THREE.Vector3(side * 0.7, -0.95, 0.08), 0.98, 0.03);
    const thF = rb(0.11, KNEE - 0.03, 0.06, 0.024, shell);
    thF.position.set(0, -KNEE / 2, 0.03);
    g.add(thF);
    const thB = rb(0.11, KNEE - 0.03, 0.06, 0.024, shellIn);
    thB.position.set(0, -KNEE / 2, -0.03);
    g.add(thB);
    holes(thF, 2, 3, 0.028, 0.028, -0.014, -0.07, 0.032);
    const thighBeam = beam(0.04, 0.2, 0.04, true);
    thighBeam.position.set(0, -KNEE / 2, 0);
    g.add(thighBeam);
    const kn = axis(pancake(0.05, 0.044, true), "x");
    kn.position.set(0, -KNEE, 0);
    g.add(kn);
    const knCap = rb(0.08, 0.055, 0.04, 0.016, shell);
    knCap.position.set(0, -KNEE, 0.04);
    g.add(knCap);
    const sg = new THREE.Group();
    sg.position.set(0, -KNEE, 0);
    g.add(sg);
    mark(sg, new THREE.Vector3(side * 0.12, -1, 0.28), 0.6, 0.14);
    const shF = rb(0.09, SHIN - 0.05, 0.05, 0.02, shell);
    shF.position.set(0, -SHIN / 2 + 0.02, 0.028);
    sg.add(shF);
    const shB = rb(0.086, SHIN - 0.05, 0.045, 0.018, shellIn);
    shB.position.set(0, -SHIN / 2 + 0.02, -0.02);
    sg.add(shB);
    const calf = beam(0.036, 0.22, 0.036, true);
    calf.position.set(0, -0.14, 0);
    sg.add(calf);
    const hubA = axis(pancake(0.026, 0.02, false), "x");
    hubA.position.set(0.044 * side, -0.1, 0.02);
    sg.add(hubA);
    const hubB = axis(pancake(0.022, 0.018, false), "x");
    hubB.position.set(0.044 * side, -0.22, 0.028);
    sg.add(hubB);
    const rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.2, 8), silver);
    rod1.position.set(0.032 * side, -0.16, 0.04);
    sg.add(rod1);
    const rod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.2, 8), silver);
    rod2.position.set(0.05 * side, -0.16, 0.018);
    sg.add(rod2);
    const ank = axis(pancake(0.03, 0.026, false), "x");
    ank.position.set(0, -SHIN + 0.018, 0.016);
    sg.add(ank);
    const foot = rb(0.108, 0.03, 0.198, 0.01, shell);
    foot.position.set(0, -SHIN - 0.008, 0.034);
    sg.add(foot);
    const sole = rb(0.106, 0.014, 0.192, 0.004, rubber);
    sole.position.set(0, -SHIN - 0.026, 0.034);
    sg.add(sole);
    holes(foot, 2, 1, 0.03, 0, -0.015, 0.002, 0.1);
  }
  leg(-1);
  leg(1);

  return { root, parts, head };
}
