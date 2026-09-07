// Stage: renderer, studio lighting, floor, orbit, scroll-driven shell strip, callouts, UI.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { createNV01 } from "./nv01.js";

const canvas = document.getElementById("stage");
const stage = document.querySelector(".stage");
const rig = document.querySelector(".rig");
const hero = document.querySelector(".hero");
const hud = document.querySelector(".hud");
const calloutLayer = document.querySelector(".callouts");
const leaders = document.querySelector(".leaders");
const stepsEl = [...document.querySelectorAll(".step")];
const counterEl = document.querySelector("[data-counter]");
if (!canvas || !stage || !rig) throw new Error("stage markup missing");

const params = new URLSearchParams(location.search);
const isMobile = matchMedia("(max-width: 820px)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lite = isMobile || params.get("lite") === "1";
const clean = params.get("clean") === "1"; // render-only: no overlays, centered (used for stills)
if (clean) document.documentElement.classList.add("clean");

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

// ---------- lights ----------
const key = new THREE.DirectionalLight(0xfff3e4, 2.4);
key.position.set(2.4, 3.6, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
key.shadow.camera.left = -1.1; key.shadow.camera.right = 1.1;
key.shadow.camera.top = 1.7; key.shadow.camera.bottom = -0.3;
key.shadow.camera.near = 1; key.shadow.camera.far = 12;
key.shadow.bias = -0.00025; key.shadow.normalBias = 0.012;
scene.add(key);
const rim = new THREE.DirectionalLight(0x9db4ff, 1.4);
rim.position.set(-3, 2.4, -2.6);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xdfe6f2, 0.55);
fill.position.set(-2.2, 1.2, 3);
scene.add(fill);
scene.add(new THREE.HemisphereLight(0x33373f, 0x07080b, 0.7));

// ---------- floor ----------
const floor = new THREE.Group();
scene.add(floor);
if (!lite) {
  const mirror = new Reflector(new THREE.CircleGeometry(3.2, 64), { clipBias: 0.002, textureWidth: 1024, textureHeight: 1024, color: 0x0f1013 });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = -0.002;
  floor.add(mirror);
} else {
  const f = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9, metalness: 0 }));
  f.rotation.x = -Math.PI / 2; f.position.y = -0.002; f.receiveShadow = true;
  floor.add(f);
}
// radial fade to the page background
const fadeTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(256, 256, 40, 256, 256, 256);
  r.addColorStop(0, "rgba(7,8,11,0.35)"); r.addColorStop(0.45, "rgba(7,8,11,0.75)"); r.addColorStop(1, "rgba(7,8,11,1)");
  g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const fade = new THREE.Mesh(new THREE.CircleGeometry(3.25, 64), new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false }));
fade.rotation.x = -Math.PI / 2; fade.position.y = 0.0;
floor.add(fade);
const catcher = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.ShadowMaterial({ opacity: 0.55, color: 0x000000 }));
catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.001; catcher.receiveShadow = true;
floor.add(catcher);
// floor rings + ticks (measurement feel)
{
  const rings = new THREE.Group();
  const lm = new THREE.LineBasicMaterial({ color: 0x2a2e36, transparent: true, opacity: 0.55 });
  for (const rr of [0.55, 1.1]) {
    const pts = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rr, 0.002, Math.sin(a) * rr)); }
    rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
  }
  floor.add(rings);
}

// ---------- model ----------
let nv = null;
const buildModel = () => {
  nv = createNV01();
  scene.add(nv.root);
  window.NV = nv;
  applyStateFromUI();
  stage.classList.add("is-ready");
};
if (document.fonts && document.fonts.ready) {
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(buildModel);
} else buildModel();

// ---------- camera / orbit ----------
const orbit = { theta: 0.42, phi: THREE.MathUtils.degToRad(84), dist: 3.4, target: new THREE.Vector3(0, 0.64, 0) };
const orbitGoal = { theta: 0.42, phi: orbit.phi };
const VIEWS = { front: 0.42, side: Math.PI / 2 + 0.08, back: Math.PI - 0.25 };
let baseDist = 3.4;
let viewShift = 0, viewShiftGoal = 0;
function fit() {
  const w = stage.clientWidth, h = stage.clientHeight;
  camera.aspect = w / h;
  const margin = clean ? parseFloat(params.get("margin") || "1.5") : isMobile ? 2.9 : 1.62;
  baseDist = (margin / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const minForWidth = (0.9 / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.aspect;
  baseDist = Math.max(baseDist, minForWidth);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  viewShiftGoal = clean ? w * parseFloat(params.get("shift") || "0") : isMobile ? 0 : w * 0.21;
  viewShiftYGoal = clean ? 0 : isMobile ? h * 0.22 : 0;
}
window.NVR = renderer;
let viewShiftY = 0, viewShiftYGoal = 0;
fit();
new ResizeObserver(fit).observe(stage);

let dragging = false, lastX = 0, lastY = 0, lastInteract = performance.now(), velTheta = 0;
stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, a")) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY; velTheta = 0;
  lastInteract = performance.now();
  stage.classList.add("is-dragging");
  stage.setPointerCapture?.(e.pointerId);
});
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  orbitGoal.theta += dx * 0.008;
  orbitGoal.phi = THREE.MathUtils.clamp(orbitGoal.phi + dy * 0.004, THREE.MathUtils.degToRad(62), THREE.MathUtils.degToRad(98));
  velTheta = dx * 0.008;
  lastInteract = performance.now();
});
window.addEventListener("pointerup", () => { dragging = false; stage.classList.remove("is-dragging"); });
window.addEventListener("pointercancel", () => { dragging = false; stage.classList.remove("is-dragging"); });

const mouse = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = (e.clientY / innerHeight) * 2 - 1;
});

// ---------- scroll → explode ----------
let progress = 0, progressGoal = 0;
function scrollProgress() {
  const forced = params.get("p");
  if (forced != null) return THREE.MathUtils.clamp(parseFloat(forced) || 0, 0, 1);
  const r = rig.getBoundingClientRect();
  const vh = innerHeight;
  const scrolled = -r.top;               // px scrolled into the rig
  const hold = vh * 0.45;                // hero holds
  const span = r.height - vh - hold - vh * 0.35;
  return THREE.MathUtils.clamp((scrolled - hold) / Math.max(span, 1), 0, 1);
}
let lastScrollAt = performance.now();
window.addEventListener("scroll", () => { lastScrollAt = performance.now(); }, { passive: true });

// ---------- callouts ----------
const CALLOUTS = [
  { key: "chest", obj: "torso", from: 0.03, until: 0.4, side: "left", t: "55 shell panels", b: "Static display. Authors say so. Not signed off for a run or a hit." },
  { key: "head", obj: "torso", from: 0.12, until: 0.5, side: "right", t: "Head, 0 DOF", b: "A display box on the torso. Two LED pills. No neck in the URDF." },
  { key: "handR", objKey: "handRObj", from: 0.3, until: 0.66, side: "left", t: "No hands", b: "Sphere in the shell. Blunt flange in the lab. Foam cup in a fight." },
  { key: "handle", obj: "torso", from: 0.42, until: 0.8, side: "right", t: "Carry bar", b: "Between the shoulder blades. The hand in every honest walk is here." },
  { key: "battery", obj: "torso", from: 0.52, side: "right", t: "48 V · 15 Ah", b: "270 × 60 × 70 mm box in the lower back. That hump is the profile." },
  { key: "rbe", obj: "torso", from: 0.58, side: "left", t: "RBE 3-in-1 V2", b: "Power + USB2CAN + hub. ~100 × 75 mm. Four CAN ports." },
  { key: "compute", obj: "torso", from: 0.66, side: "right", t: "Compute", b: "Orange Pi 5 Plus and/or Horizon RDK X5 8G under the top plate." },
  { key: "waist", obj: "base", from: 0.72, side: "left", t: "Waist, 1 DOF", b: "Yaw only, about ±180°. The only joint in the torso." },
  { key: "hipL", objKey: "hipLObj", from: 0.8, side: "right", t: "DM 10010L", b: "~120 N·m class. Nine of them: hips, knees, waist." },
  { key: "ankleL", objKey: "ankleLObj", from: 0.88, side: "left", t: "DM 4340P", b: "~27 N·m class. Fourteen: arms and ankles. Two per shin drive the foot through the rods." },
];
const calloutEls = CALLOUTS.map((c) => {
  const el = document.createElement("div");
  el.className = `callout ${c.side}`;
  el.innerHTML = `<span class="dot"></span><div class="card"><b>${c.t}</b><span>${c.b}</span></div>`;
  calloutLayer.appendChild(el);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  leaders.appendChild(line);
  return { el, line, cfg: c, shown: 0 };
});
const _wp = new THREE.Vector3();
function layoutCallouts(p) {
  if (!nv) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  leaders.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const placed = { left: [], right: [] };
  for (const c of calloutEls) {
    const cfg = c.cfg;
    const on = p >= cfg.from && (cfg.until == null || p < cfg.until) && nv.mode === "shell";
    c.shown += ((on ? 1 : 0) - c.shown) * 0.12;
    if (c.shown < 0.02) { c.el.style.opacity = "0"; c.line.style.opacity = "0"; c.el.style.pointerEvents = "none"; continue; }
    const obj = cfg.objKey ? nv.anchors[cfg.objKey] : nv[cfg.obj];
    _wp.copy(nv.anchors[cfg.key]);
    obj.localToWorld(_wp);
    _wp.project(camera);
    const sx = (_wp.x * 0.5 + 0.5) * w, sy = (-_wp.y * 0.5 + 0.5) * h;
    const side = cfg.side;
    let lx = side === "left" ? Math.min(sx - 90, w * 0.34) : Math.max(sx + 90, w * 0.66);
    if (isMobile) lx = side === "left" ? 16 : w - 16;
    let ly = sy;
    const card = c.el.firstElementChild.nextElementSibling;
    const hh = (card ? card.offsetHeight : 70) + 12;
    const list = placed[side];
    list.sort((a, b) => a.y - b.y);
    for (const o of list) if (ly > o.y - hh && ly < o.y + o.h) ly = o.y + o.h;
    list.push({ y: ly, h: hh });
    c.el.style.opacity = String(c.shown);
    c.el.style.pointerEvents = "auto";
    c.el.style.transform = `translate(${lx}px, ${ly}px)`;
    c.line.setAttribute("x1", sx); c.line.setAttribute("y1", sy);
    c.line.setAttribute("x2", lx); c.line.setAttribute("y2", ly);
    c.line.style.opacity = String(c.shown * 0.8);
  }
}

// ---------- UI ----------
const state = { mode: params.get("mode") === "lab" ? "lab" : "shell", pose: params.get("pose") === "guard" ? "guard" : "stand", view: params.get("view") || "front" };
function applyStateFromUI() {
  if (!nv) return;
  nv.setMode(state.mode);
  nv.setPose(state.pose);
  orbitGoal.theta = VIEWS[state.view] ?? VIEWS.front;
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
  document.querySelectorAll("[data-pose]").forEach((b) => b.classList.toggle("on", b.dataset.pose === state.pose));
  document.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === state.view));
  stage.dataset.mode = state.mode;
}
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => { state.mode = b.dataset.mode; lastInteract = performance.now(); applyStateFromUI(); }));
document.querySelectorAll("[data-pose]").forEach((b) => b.addEventListener("click", () => { state.pose = b.dataset.pose; lastInteract = performance.now(); applyStateFromUI(); }));
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { state.view = b.dataset.view; lastInteract = performance.now(); applyStateFromUI(); }));
window.addEventListener("nv:mode", (e) => { state.mode = e.detail === "lab" ? "lab" : "shell"; applyStateFromUI(); });
window.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.key === "1") { state.mode = "shell"; applyStateFromUI(); }
  if (e.key === "2") { state.mode = "lab"; applyStateFromUI(); }
  if (e.key === "g") { state.pose = state.pose === "guard" ? "stand" : "guard"; applyStateFromUI(); }
});

// ---------- loop ----------
const clock = new THREE.Clock();
let blinkAt = 3 + Math.random() * 4, blinkT = 0;
const extra = {};
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  requestAnimationFrame(frame);
  if (!nv || window.__pause) return;

  // scroll progress
  progressGoal = reduce ? scrollProgress() : scrollProgress();
  progress += (progressGoal - progress) * (reduce ? 1 : 0.1);
  const p = progress;
  nv.setExplode(p);

  // hero / hud fade with scroll
  const heroFade = THREE.MathUtils.clamp(1 - p * 6, 0, 1);
  if (hero) { hero.style.opacity = String(heroFade); hero.style.pointerEvents = heroFade > 0.3 ? "auto" : "none"; }
  if (hud) hud.classList.toggle("is-exploded", p > 0.03);
  stepsEl.forEach((s) => {
    const a = parseFloat(s.dataset.from), b = parseFloat(s.dataset.to);
    s.classList.toggle("on", p >= a && p < b);
  });
  if (counterEl) counterEl.textContent = String(nv.detached).padStart(2, "0");

  // idle motion + honest pointer follow: waist yaw (a real DOF), never the neck
  const idle = reduce ? 0 : 1;
  extra.torsoYaw = (coarse ? 0 : mouse.x * 0.16) + idle * 0.02 * Math.sin(t * 0.7);
  extra.baseLift = idle * 0.0025 * Math.sin(t * 1.4);
  extra.shRollL = idle * 0.015 * Math.sin(t * 1.4 + 0.4);
  extra.shRollR = idle * 0.015 * Math.sin(t * 1.4 + 0.9);
  extra.hipRollL = idle * 0.006 * Math.sin(t * 0.5);
  extra.hipRollR = idle * 0.006 * Math.sin(t * 0.5);
  extra.elPitchL = idle * 0.02 * Math.sin(t * 1.1);
  extra.elPitchR = idle * 0.02 * Math.sin(t * 1.1 + 1.3);
  nv.update(dt, extra);

  // eyes: LED pills shift on the glass and blink (display animation, not a neck)
  const [eL, eR] = nv.joints.eyes;
  const ex = (coarse ? 0 : mouse.x) * 0.006, ey = (coarse ? 0 : -mouse.y) * 0.004;
  eL.position.x = 0.03 + ex; eR.position.x = -0.03 + ex; eL.position.y = eR.position.y = ey;
  blinkT += dt;
  let sy = 1;
  if (blinkT > blinkAt) {
    const k = (blinkT - blinkAt) / 0.16;
    sy = k < 1 ? 1 - Math.sin(k * Math.PI) * 0.85 : 1;
    if (k >= 1) { blinkT = 0; blinkAt = 2.5 + Math.random() * 5; }
  }
  eL.scale.y = eR.scale.y = sy;
  for (const l of nv.leds) l.material.emissiveIntensity = 1.2 + 0.8 * Math.max(0, Math.sin(t * 3));

  // orbit: auto-rotate when idle, scroll adds a slow turn
  const idleFor = (performance.now() - Math.max(lastInteract, lastScrollAt)) / 1000;
  if (!dragging && !reduce && idleFor > 3.5 && p < 0.02) orbitGoal.theta += dt * 0.12;
  if (!dragging) { orbitGoal.theta += velTheta; velTheta *= 0.92; }
  orbit.theta += (orbitGoal.theta + p * 0.85 - orbit.theta) * 0.08;
  orbit.phi += (orbitGoal.phi - orbit.phi) * 0.08;
  const distGoal = baseDist * (1 + p * 0.42) * (state.pose === "guard" ? 1.02 : 1);
  orbit.dist += (distGoal - orbit.dist) * 0.06;
  orbit.target.y += ((0.64 + p * 0.03) - orbit.target.y) * 0.06;
  camera.position.set(
    orbit.target.x + orbit.dist * Math.sin(orbit.phi) * Math.sin(orbit.theta),
    orbit.target.y + orbit.dist * Math.cos(orbit.phi),
    orbit.target.z + orbit.dist * Math.sin(orbit.phi) * Math.cos(orbit.theta),
  );
  camera.lookAt(orbit.target);
  const shiftGoal = viewShiftGoal * (1 - Math.min(1, p * 2.2));
  viewShift += (shiftGoal - viewShift) * 0.08;
  const shiftYGoal = viewShiftYGoal * (1 - Math.min(1, p * 2.2));
  viewShiftY += (shiftYGoal - viewShiftY) * 0.08;
  const w = stage.clientWidth, h = stage.clientHeight;
  if (Math.abs(viewShift) > 0.5 || Math.abs(viewShiftY) > 0.5) camera.setViewOffset(w, h, -viewShift, viewShiftY, w, h); else camera.clearViewOffset();

  renderer.render(scene, camera);
  layoutCallouts(p);
}
frame();
