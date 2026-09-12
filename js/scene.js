// Stage: renderer, studio lighting, floor, orbit, two-stage scroll strip (shell → frame), callouts, UI.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createNV01 } from "./nv01.js?v=mobile-framing-2";
import { loadFrame } from "./frame.js";

const canvas = document.getElementById("stage");
const stage = document.querySelector(".stage");
const rig = document.querySelector(".rig");
const hero = document.querySelector(".hero");
const hud = document.querySelector(".hud");
const calloutLayer = document.querySelector(".callouts");
const leaders = document.querySelector(".leaders");
const stepsEl = [...document.querySelectorAll(".step")];
const counterEl = document.querySelector("[data-counter]");
const counterTotal = document.querySelector("[data-counter-total]");
const counterLabel = document.querySelector("[data-counter-label]");
if (!canvas || !stage || !rig) throw new Error("stage markup missing");

const params = new URLSearchParams(location.search);
let isMobile = matchMedia("(max-width: 820px), (max-width: 1000px) and (max-height: 500px)").matches;
let isLandscapePhone = false;
const coarse = matchMedia("(pointer: coarse)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lite = isMobile || params.get("lite") === "1";
const clean = params.get("clean") === "1"; // render-only: no overlays, centered (used for stills)
if (clean) document.documentElement.classList.add("clean");
if (params.get("og") === "1") document.documentElement.classList.add("og");
const ortho = params.get("ortho") === "1"; // orthographic drawing views (front/side/back), frustum exactly 1.6 m tall from y = -0.16

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.5 : params.get("post") === "0" ? 2 : 1.5)); // GTAO runs at ≤1.5× to stay smooth
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = ortho ? 1.15 : 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
window.NVR = renderer;

const scene = new THREE.Scene();
const camera = ortho ? new THREE.OrthographicCamera(-0.6, 0.6, 0.8, -0.8, 0.05, 40) : new THREE.PerspectiveCamera(26, 1, 0.05, 40);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.38;

// ---------- lights ----------
const key = new THREE.DirectionalLight(0xffe8ce, 3.2);
key.position.set(2.6, 3.6, 1.4);
key.castShadow = true;
key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
key.shadow.camera.left = -1.6; key.shadow.camera.right = 1.6;
key.shadow.camera.top = 2.2; key.shadow.camera.bottom = -1.8;
key.shadow.camera.near = 1; key.shadow.camera.far = 12;
key.shadow.bias = -0.0001; key.shadow.normalBias = 0.002;
scene.add(key);
const rim = new THREE.DirectionalLight(0x9dbbff, 2.6); rim.position.set(-2.4, 2.2, -1.6); scene.add(rim);
const fill = new THREE.DirectionalLight(0xcdd8ec, 0.28); fill.position.set(-2.2, 1.2, 3); scene.add(fill);
const ambient = new THREE.HemisphereLight(0x333e55, 0x07080b, 0.45); scene.add(ambient);
const overhead = new THREE.SpotLight(0xc6d8ff, 16, 7, 0.5, 0.8, 2);
overhead.position.set(-0.9, 3.6, -0.5); overhead.target.position.set(0.1, 0.2, 0);
scene.add(overhead, overhead.target);

// ---------- floor ----------
const floor = new THREE.Group();
scene.add(floor);
if (!lite) {
  const mirror = new Reflector(new THREE.CircleGeometry(3.6, 64), { clipBias: 0.002, textureWidth: 1024, textureHeight: 1024, color: 0x080b12 });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.002; floor.add(mirror);
} else {
  const f = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.9, metalness: 0 }));
  f.rotation.x = -Math.PI / 2; f.position.y = -0.002; f.receiveShadow = true; floor.add(f);
}
const fadeTex = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  const r = g.createRadialGradient(256, 256, 40, 256, 256, 256);
  r.addColorStop(0, "rgba(7,8,11,0.64)"); r.addColorStop(0.45, "rgba(7,8,11,0.86)"); r.addColorStop(1, "rgba(7,8,11,1)");
  g.fillStyle = r; g.fillRect(0, 0, 512, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const fade = new THREE.Mesh(new THREE.CircleGeometry(3.65, 64), new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false }));
fade.rotation.x = -Math.PI / 2; floor.add(fade);
const catcher = new THREE.Mesh(new THREE.CircleGeometry(3.6, 48), new THREE.ShadowMaterial({ opacity: 0.55, color: 0x000000 }));
catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.003; catcher.receiveShadow = true; floor.add(catcher);
{
  const lm = new THREE.LineBasicMaterial({ color: 0x2a2e36, transparent: true, opacity: 0.55 });
  for (const rr of [0.55, 1.1]) {
    const pts = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rr, 0.002, Math.sin(a) * rr)); }
    floor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
  }
}

// ---------- post: MSAA target → GTAO → output ----------
const usePost = !lite && params.get("post") !== "0";
let composer = null, gtao = null;
if (usePost) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.95;
  gtao.updateGtaoMaterial({ radius: 0.09, distanceExponent: 1.5, thickness: 0.6, scale: 1.0, samples: 10, distanceFallOff: 1.0, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 12 });
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
}
// ---------- atmosphere: light cone, dust, a dark cage far behind, fog ----------
scene.fog = new THREE.Fog(0x080b12, 3.8, 10);
const atmo = new THREE.Group(); scene.add(atmo);
{
  // A tapered shaft in world space stays behind the robot when the camera turns.
  // Soft end caps and a grazing-angle fade keep its cone surface out of view.
  const shaftMaterial = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(0xaac5ff) }, strength: { value: 0.012 } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
      void main() { vUv=uv; vec4 p=modelViewMatrix*vec4(position,1.0);
        vNormal=normalize(normalMatrix*normal); vView=normalize(-p.xyz);
        gl_Position=projectionMatrix*p; }`,
    fragmentShader: `uniform vec3 tint; uniform float strength;
      varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
      void main() { float edge=pow(abs(dot(normalize(vNormal),normalize(vView))),1.8);
        float ends=smoothstep(0.0,0.2,vUv.y)*(1.0-smoothstep(0.75,1.0,vUv.y));
        gl_FragColor=vec4(tint,strength*edge*ends); }`,
    transparent: true, depthWrite: false, side: THREE.BackSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 1.0, 3.5, 40, 1, true), shaftMaterial);
  beam.position.set(-0.6, 1.65, -0.95); beam.rotation.z = -0.19; atmo.add(beam);
  // dust motes drifting in the light
  const N = lite ? 120 : 260;
  const pos = new Float32Array(N * 3); const vel = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, rr = 0.25 + Math.random() * 0.85; pos[i * 3] = Math.cos(a) * rr; pos[i * 3 + 1] = Math.random() * 2.0; pos[i * 3 + 2] = Math.sin(a) * rr * 0.8; vel[i] = 0.4 + Math.random(); }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dustTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d"); const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "rgba(255,248,235,1)"); r.addColorStop(0.4, "rgba(255,248,235,0.35)"); r.addColorStop(1, "rgba(255,248,235,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.011, map: dustTex, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  atmo.add(dust); atmo.userData.dust = dust; atmo.userData.vel = vel;
  // the cage: eight dark posts with a diamond mesh, far behind, mostly swallowed by the fog
  const lm = new THREE.LineBasicMaterial({ color: 0x536783, transparent: true, opacity: 0.22 });
  const pts = [];
  const R = 3.9, H = 2.4, sides = 8;
  for (let k = 0; k < sides; k++) {
    const a0 = (k / sides) * Math.PI * 2 + Math.PI / 8, a1 = ((k + 1) / sides) * Math.PI * 2 + Math.PI / 8;
    const p0 = new THREE.Vector3(Math.cos(a0) * R, 0, Math.sin(a0) * R), p1 = new THREE.Vector3(Math.cos(a1) * R, 0, Math.sin(a1) * R);
    pts.push(p0.clone(), p0.clone().setY(H));                                            // post
    for (const y of [0.9, 1.75, H]) pts.push(p0.clone().setY(y), p1.clone().setY(y));  // rails
    const n = 7;                                                                       // diamond mesh
    for (let i = 0; i <= n; i++) {
      const t = i / n; const a = p0.clone().lerp(p1, t);
      const b1 = p0.clone().lerp(p1, Math.min(1, t + 0.28)), b2 = p0.clone().lerp(p1, Math.max(0, t - 0.28));
      pts.push(a.clone().setY(0.9), b1.setY(1.75), a.clone().setY(0.9), b2.setY(1.75));
    }
  }
  const cage = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lm);
  atmo.add(cage);
  // Solid posts and rails give the original cage a readable silhouette and parallax.
  const cageMaterial = new THREE.MeshStandardMaterial({ color: 0x151b27, roughness: 0.62, metalness: 0.72 });
  for (let k = 0; k < sides; k++) {
    const a0 = k / sides * Math.PI * 2 + Math.PI / 8;
    const a1 = (k + 1) / sides * Math.PI * 2 + Math.PI / 8;
    const p0 = new THREE.Vector3(Math.cos(a0) * R, 0, Math.sin(a0) * R);
    const p1 = new THREE.Vector3(Math.cos(a1) * R, 0, Math.sin(a1) * R);
    // Keep the near half open so it cannot cross the hero or the robot.
    if (p0.z > 0.5 || p1.z > 0.5) continue;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, H, 10), cageMaterial);
    post.position.copy(p0).setY(H / 2); atmo.add(post);
    for (const y of [0.12, H]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, p0.distanceTo(p1), 8), cageMaterial);
      rail.position.copy(p0).lerp(p1, 0.5).setY(y);
      rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()); atmo.add(rail);
    }
  }
}
// contact shadow: soft dark blob under the feet
{
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  const r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  r.addColorStop(0, "rgba(0,0,0,0.55)"); r.addColorStop(0.5, "rgba(0,0,0,0.22)"); r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.004; blob.renderOrder = 1; floor.add(blob);
  window.__contact = blob;
}

// ---------- model ----------
let nv = null;
async function buildModel() {
  const loadEl = document.querySelector(".loading b");
  const [frameResult, handResult] = await Promise.allSettled([
    loadFrame("description/meshes/nv01.frame", (f) => { if (loadEl) loadEl.style.transform = `scaleX(${f.toFixed(3)})`; }),
    loadFrame("description/hands/amazinghand"),
  ]);
  const frame = frameResult.status === "fulfilled" ? frameResult.value.geometries : null;
  const hands = handResult.status === "fulfilled" ? handResult.value.geometries : null;
  if (!frame) console.warn("frame meshes unavailable", frameResult.reason);
  if (!hands) console.warn("hand meshes unavailable", handResult.reason);
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
  nv = createNV01({ frame, hands });
  scene.add(nv.root);
  window.NV = nv;
  if (counterTotal) counterTotal.textContent = String(nv.shellCount);
  applyStateFromUI();
  stage.classList.add("is-ready");
  if (params.get("export") === "shells") window.__shells = nv.exportShells();
}
buildModel();

// ---------- camera / orbit ----------
const orbit = { theta: 0.42, phi: THREE.MathUtils.degToRad(84), dist: 3.4, target: new THREE.Vector3(0, 0.64, 0) };
const orbitGoal = { theta: 0.42, phi: orbit.phi };
const VIEWS = { front: 0.42, side: Math.PI / 2 + 0.08, back: Math.PI - 0.25 };
let baseDist = 3.4;
let viewShift = 0, viewShiftGoal = 0, viewShiftY = 0, viewShiftYGoal = 0;
function fit() {
  const w = stage.clientWidth, h = stage.clientHeight;
  isLandscapePhone = w > h && h <= 500 && w <= 1000;
  isMobile = w <= 820 || isLandscapePhone;
  stage.dataset.layout = isMobile ? "mobile" : "desktop";
  scene.environmentIntensity = isMobile ? 0.68 : 0.38;
  fill.intensity = isMobile ? 1.2 : 0.28;
  ambient.intensity = isMobile ? 0.8 : 0.45;
  key.color.set(isMobile ? 0xffffff : 0xffe8ce);
  rim.color.set(isMobile ? 0xffffff : 0x9dbbff);
  fill.color.set(isMobile ? 0xffffff : 0xcdd8ec);
  renderer.toneMappingExposure = ortho ? 1.15 : isMobile ? 1.12 : 1.05;
  if (ortho) { const hh = 1.6, ww = hh * (w / h); camera.left = -ww / 2; camera.right = ww / 2; camera.top = hh / 2; camera.bottom = -hh / 2; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); if (composer) composer.setSize(w, h); return; }
  camera.aspect = w / h;
  const margin = clean ? parseFloat(params.get("margin") || "1.5") : isMobile ? 2.22 : 1.62;
  baseDist = (margin / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const minForWidth = (0.9 / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.aspect;
  baseDist = Math.max(baseDist, minForWidth);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  if (composer) composer.setSize(w, h);
  viewShiftGoal = clean ? w * parseFloat(params.get("shift") || "0") : isMobile ? 0 : w * 0.21;
  viewShiftYGoal = 0;
}
fit();
new ResizeObserver(fit).observe(stage);

// Fit the visible robot, including separated parts, inside the portrait viewport.
// Hidden target shells must not make the current body appear farther away.
const robotBounds = new THREE.Box3(), meshBounds = new THREE.Box3();
const viewCorner = new THREE.Vector3(), inverseView = new THREE.Quaternion();
function mobileDistance(p1, p2) {
  nv.root.updateMatrixWorld(true);
  robotBounds.makeEmpty();
  nv.root.traverseVisible(object => {
    if (!object.isMesh || !object.geometry || object.userData.stageProp) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    meshBounds.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
    robotBounds.union(meshBounds);
  });
  if (robotBounds.isEmpty()) return baseDist;
  inverseView.copy(camera.quaternion).invert();
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const heightFraction = isLandscapePhone ? 0.76 : THREE.MathUtils.lerp(0.57, 0.63, Math.min(1, p1 * 6 + p2));
  const widthFraction = isLandscapePhone ? 0.43 : 0.88;
  let distance = 0;
  for (const x of [robotBounds.min.x, robotBounds.max.x])
    for (const y of [robotBounds.min.y, robotBounds.max.y])
      for (const z of [robotBounds.min.z, robotBounds.max.z]) {
        viewCorner.set(x,y,z).sub(orbit.target).applyQuaternion(inverseView);
        distance = Math.max(distance, viewCorner.z + Math.max(
          Math.abs(viewCorner.x) / (tanY * camera.aspect * widthFraction),
          Math.abs(viewCorner.y) / (tanY * heightFraction)
        ));
      }
  return Math.max(1, distance);
}

let dragging = false, lastX = 0, lastY = 0, lastInteract = performance.now(), velTheta = 0;
stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button, a")) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY; velTheta = 0; lastInteract = performance.now();
  stage.classList.add("is-dragging"); stage.setPointerCapture?.(e.pointerId);
});
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
  orbitGoal.theta += dx * 0.008;
  orbitGoal.phi = THREE.MathUtils.clamp(orbitGoal.phi + dy * 0.004, THREE.MathUtils.degToRad(62), THREE.MathUtils.degToRad(98));
  velTheta = dx * 0.008; lastInteract = performance.now();
});
window.addEventListener("pointerup", () => { dragging = false; stage.classList.remove("is-dragging"); });
window.addEventListener("pointercancel", () => { dragging = false; stage.classList.remove("is-dragging"); });
const mouse = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; });

// ---------- scroll → two stages ----------
// hold (hero) → A: shell strip → B: shells fade, robot slides left → C: frame comes apart → tail
const SEG = { hold: 0.45, A: 2.2, B: 0.7, C: 2.3, tail: 0.55 };
const prog = { p1: 0, pB: 0, p2: 0 };
const goal = { p1: 0, pB: 0, p2: 0 };
function scrollProgress() {
  const f1 = params.get("p"), fB = params.get("pb"), f2 = params.get("p2");
  if (f1 != null || f2 != null || fB != null) {
    return { p1: THREE.MathUtils.clamp(parseFloat(f1 ?? (f2 != null || fB != null ? "1" : "0")) || 0, 0, 1),
             pB: THREE.MathUtils.clamp(parseFloat(fB ?? (f2 != null ? "1" : "0")) || 0, 0, 1),
             p2: THREE.MathUtils.clamp(parseFloat(f2 ?? "0") || 0, 0, 1) };
  }
  const r = rig.getBoundingClientRect();
  const vh = innerHeight;
  const s = -r.top / vh; // viewport heights scrolled into the rig
  const a0 = SEG.hold, b0 = a0 + SEG.A, c0 = b0 + SEG.B;
  return {
    p1: THREE.MathUtils.clamp((s - a0) / SEG.A, 0, 1),
    pB: THREE.MathUtils.clamp((s - b0) / SEG.B, 0, 1),
    p2: THREE.MathUtils.clamp((s - c0) / SEG.C, 0, 1),
  };
}
let lastScrollAt = performance.now();
window.addEventListener("scroll", () => { lastScrollAt = performance.now(); }, { passive: true });

// ---------- callouts ----------
const CALLOUTS = [
  // stage 1 — the shell
  // stage 2 — the frame, priced from the ATOM 01 v1.0.1 BOM (2026-01-05, CNY)
  { stage: 2, link: "torso_link", from: 0.02, until: 0.34, side: "auto", t: "Torso frame", b: "Chest front splint ATOM-01-020 ¥330 · rear splint -019 ¥350 · 2× side cross plates -006 ¥85 · waist support -023 ¥150. 120-grit sandblast, black anodise." },
  { stage: 2, part: "handle", from: 0.05, until: 0.3, side: "auto", t: "Carry bar", b: "Between the shoulder blades. Four M3 lifting eye bolts (GB/T 825) take the hoist ropes." },
  { stage: 2, part: "battery", from: 0.1, until: 0.4, side: "auto", t: "48 V · 15 Ah Li-ion", b: "¥528 on the BOM. WEIPU SF1212 aviation plug for the charger, ¥12.4. Blue pack, yellow tape." },
  { stage: 2, part: "rbe", from: 0.14, until: 0.44, side: "auto", t: "RBE 3-in-1 V2.1", b: "Power hub + USB2CAN + hub on one Gerber. V1 was four boards: distribution ¥54, 4× USB-CAN ¥46, hub ¥16, 48→5 V ¥28." },
  { stage: 2, part: "compute", from: 0.18, until: 0.48, side: "auto", t: "Compute", b: "Horizon RDK X5 8G, ¥599 — or an Orange Pi 5 Plus. Runs the policy at the top of the box." },
  { stage: 2, part: "imu", from: 0.22, until: 0.52, side: "auto", t: "IMU", b: "Chaohe HI13 M0-USB, ¥350, on its own CNC carrier ATOM-01-005, ¥110." },
  { stage: 2, part: "estop", from: 0.26, until: 0.56, side: "auto", t: "E-stop", b: "Emergency stop relay, Lanbo M3, ¥31.5. The compute switch sits next to it on V2." },
  { stage: 2, link: "left_arm_pitch_link", from: 0.32, until: 0.62, side: "auto", t: "Shoulder pitch", b: "DM 4340P, ¥949: 27 N·m peak, 9 N·m rated, 375 g, 40:1, dual encoder. Shoulder CNC ATOM-01-009, ¥160." },
  { stage: 2, link: "left_arm_yaw_link", from: 0.38, until: 0.68, side: "auto", t: "Upper arm", b: "Sandblasted tube from the 'atom arm' CNC set, ATOM-01-001…004: ¥1,900 for four arms. Shoulder yaw can inside." },
  { stage: 2, link: "right_elbow_yaw_link", from: 0.44, until: 0.74, side: "auto", t: "Forearm", b: "Wrist yaw DM 4340P, ¥949. Ends in a blunt flange. A hand was never in the spec." },
  { stage: 2, link: "base_link", from: 0.5, until: 0.8, side: "auto", t: "Pelvis", b: "Hip joint fixation ATOM-01-013 ¥1,800 · 2× hip splint -014 ¥350 · deep-groove bearing 130×165×18 ¥506.6 · waist DM 10010L ¥1,989." },
  { stage: 2, link: "right_thigh_yaw_link", from: 0.56, until: 0.86, side: "auto", t: "Hip yaw + roll", b: "Two DM 10010L per hip, ¥1,989 each: 120 N·m peak, 40 N·m rated, Ø120 × 53 mm, 1.37 kg, 10:1. Universal connector -016, ¥360." },
  { stage: 2, link: "left_thigh_pitch_link", from: 0.62, until: 0.92, side: "auto", t: "Thigh", b: "Inner thigh CNC ATOM-01-007, ¥1,500. Hip pitch and knee: DM 10010L ×2." },
  { stage: 2, link: "left_knee_link", from: 0.7, side: "auto", t: "Calf", b: "Lower leg CNC ATOM-01-018, ¥1,600. Two DM 4340P sit inboard and drive the foot through the long and short rods (-024 ¥70, -025 ¥50)." },
  { stage: 2, link: "right_ankle_roll_link", from: 0.78, side: "auto", t: "Foot", b: "Sole ATOM-01-010 ¥150 · sole connecting rod -011 ¥100 · 2× ankle roll connector -012 ¥35 · 3D-printed rubber sole." },
];
const calloutEls = CALLOUTS.map((c) => {
  const el = document.createElement("div");
  el.className = `callout ${c.side === "auto" ? "right" : c.side}`;
  el.innerHTML = `<span class="dot"></span><div class="card"><b>${c.t}</b><span>${c.b}</span></div>`;
  calloutLayer.appendChild(el);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  leaders.appendChild(line);
  return { el, line, cfg: c, shown: 0 };
});
const _wp = new THREE.Vector3(), _cp = new THREE.Vector3();
function layoutCallouts(p1, p2) {
  if (!nv) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  leaders.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const placed = { left: [], right: [] };
  const mobileFocus = isMobile ? [...calloutEls].reverse().find(({cfg}) => {
    const p = cfg.stage === 2 ? p2 : p1;
    return p >= cfg.from && (cfg.until == null || p < cfg.until) &&
      (cfg.stage === 2 ? p2 > 0 : nv.mode === "target" && p2 <= 0 && nv.fade < 0.6);
  }) : null;
  nv.base.getWorldPosition(_cp).project(camera);
  const centerX = (_cp.x * 0.5 + 0.5) * w;
  for (const c of calloutEls) {
    const cfg = c.cfg;
    const p = cfg.stage === 2 ? p2 : p1;
    const on = (!isMobile || c === mobileFocus) && p >= cfg.from && (cfg.until == null || p < cfg.until) && (cfg.stage === 2 ? p2 > 0 : nv.mode === "target" && p2 <= 0 && nv.fade < 0.6);
    c.shown += ((on ? 1 : 0) - c.shown) * 0.12;
    if (c.shown < 0.02) { c.el.style.opacity = "0"; c.line.style.opacity = "0"; c.el.style.pointerEvents = "none"; continue; }
    let obj;
    if (cfg.link) { obj = nv.linkMeshes[cfg.link]; if (!obj) continue; obj.geometry.boundingBox.getCenter(_wp); }
    else if (cfg.part) { obj = nv.partByKey[cfg.part]; if (!obj) continue; _wp.set(0, 0, 0); }
    else { obj = cfg.objKey ? nv.anchors[cfg.objKey] : nv[cfg.obj]; _wp.copy(nv.anchors[cfg.key]); }
    obj.localToWorld(_wp);
    _wp.project(camera);
    const sx = (_wp.x * 0.5 + 0.5) * w, sy = (-_wp.y * 0.5 + 0.5) * h;
    let side = cfg.side;
    if (side === "auto") { side = sx < centerX - 8 ? "left" : "right"; c.el.classList.toggle("left", side === "left"); c.el.classList.toggle("right", side === "right"); }
    const card = c.el.firstElementChild.nextElementSibling;
    if (isMobile) {
      c.el.classList.remove("left"); c.el.classList.add("right");
      c.el.style.opacity = String(c.shown);
      c.el.style.pointerEvents = "auto";
      c.el.style.transform = `translate(${hud.offsetLeft}px, ${h - 112 - card.offsetHeight + 14}px)`;
      c.line.style.opacity = "0";
      continue;
    }
    const cw = (card ? card.offsetWidth : 236) + 14;
    let lx = side === "left" ? Math.min(sx - 90, w * 0.34) : Math.max(sx + 90, w * 0.66);
    if (cfg.stage === 2 && !isMobile) lx = side === "left" ? Math.min(sx - 70, w * 0.22) : Math.max(sx + 70, w * 0.62);
    if (isMobile) lx = side === "left" ? cw + 6 : w - cw - 6;
    lx = side === "left" ? Math.max(lx, cw + 6) : Math.min(lx, w - cw - 6);
    let ly = sy;
    if (cfg.stage === 2 && side === "right") ly = Math.max(ly, isMobile ? 230 : 250); // keep clear of the stage-2 captions (top right)
    if (isMobile) ly = Math.min(ly, h - 150);
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
const buildLegend = document.querySelector("[data-build-legend]");
const buildCaption = document.querySelector("[data-build-caption]");
const buildMode = (mode) => mode === "target" || mode === "shell" ? "target" : "current";
const state = { mode: buildMode(params.get("mode") ?? "target"), pose: params.get("pose") === "guard" ? "guard" : "stand", view: params.get("view") || "front" };
function applyStateFromUI() {
  if (!nv) return;
  state.mode = buildMode(state.mode);
  nv.setMode(state.mode);
  nv.setPose(state.pose);
  orbitGoal.theta = VIEWS[state.view] ?? VIEWS.front;
  document.querySelectorAll("button[data-mode]").forEach((b) => {
    const selected = b.dataset.mode === state.mode;
    b.classList.toggle("on", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("[data-pose]").forEach((b) => b.classList.toggle("on", b.dataset.pose === state.pose));
  document.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === state.view));
  stage.dataset.mode = state.mode;
  if (buildCaption) buildCaption.textContent = state.mode === "target" ? "Planned build" : "Current build";
  if (buildLegend) buildLegend.textContent = state.mode === "target"
    ? Object.keys(nv.handModules).length === 2
      ? "Target · planned parts · hands awaiting installation"
      : "Target · hand models could not load — reload"
    : "Current · body reference";
}
document.querySelectorAll("button[data-mode]").forEach((b) => b.addEventListener("click", () => { state.mode = b.dataset.mode; lastInteract = performance.now(); applyStateFromUI(); }));
document.querySelectorAll("[data-pose]").forEach((b) => b.addEventListener("click", () => { state.pose = b.dataset.pose; lastInteract = performance.now(); applyStateFromUI(); }));
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { state.view = b.dataset.view; lastInteract = performance.now(); applyStateFromUI(); }));
window.addEventListener("nv:mode", (e) => { state.mode = buildMode(e.detail); applyStateFromUI(); });
window.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.key === "1") { state.mode = "current"; applyStateFromUI(); }
  if (e.key === "2") { state.mode = "target"; applyStateFromUI(); }
  if (e.key === "g") { state.pose = state.pose === "guard" ? "stand" : "guard"; applyStateFromUI(); }
});

// ---------- loop ----------
let stageVisible = true;
new IntersectionObserver(([entry]) => { stageVisible = entry.isIntersecting; }).observe(stage);
const clock = new THREE.Clock();
const extra = {};
let firstFrame = true;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  requestAnimationFrame(frame);
  if (!nv || window.__pause || !stageVisible || document.hidden) return;

  const g = scrollProgress();
  const k = reduce || params.has("p") || params.has("pb") || params.has("p2") ? 1 : 0.1;
  prog.p1 += (g.p1 - prog.p1) * k; prog.pB += (g.pB - prog.pB) * k; prog.p2 += (g.p2 - prog.p2) * k;
  const { p1, pB, p2 } = prog;
  nv.setShellFade(pB);
  nv.setExplode(p1);
  nv.setKnolling(p2);

  // hero / hud / steps
  const heroFade = THREE.MathUtils.clamp(1 - p1 * 6, 0, 1);
  if (hero) { hero.style.opacity = String(heroFade); hero.style.pointerEvents = heroFade > 0.3 ? "auto" : "none"; }
  if (hud) {
    hud.classList.toggle("is-exploded", p1 > 0.03);
    const rb = rig.getBoundingClientRect().bottom;                     // fade the HUD out as the stage scrolls away
    hud.style.opacity = String(THREE.MathUtils.clamp((rb - innerHeight + 140) / 140, 0, 1));
  }
  stepsEl.forEach((s) => {
    const st = s.dataset.stage === "2" ? 2 : 1;
    const p = st === 2 ? p2 : p1;
    const a = parseFloat(s.dataset.from), b = parseFloat(s.dataset.to);
    s.classList.toggle("on", p >= a && p < b && (st === 2 ? pB > 0.5 : pB < 0.5));
  });
  if (counterEl) {
    if (p2 > 0 || pB > 0.5) { counterEl.textContent = String(nv.detached2).padStart(2, "0"); if (counterTotal) counterTotal.textContent = String(nv.partCount); if (counterLabel) counterLabel.textContent = "parts out"; }
    else { counterEl.textContent = String(nv.detached).padStart(2, "0"); if (counterTotal) counterTotal.textContent = String(nv.shellCount); if (counterLabel) counterLabel.textContent = "panels off"; }
  }

  // idle motion + honest pointer follow: waist yaw (a real DOF), never the neck
  const idle = reduce || ortho ? 0 : 1 - p2;
  extra.torsoYaw = (coarse || ortho ? 0 : mouse.x * 0.16) * (1 - pB) + idle * 0.02 * Math.sin(t * 0.7);
  extra.baseLift = idle * 0.0025 * Math.sin(t * 1.4) + 0.22 * p2;
  extra.shRollL = idle * 0.015 * Math.sin(t * 1.4 + 0.4);
  extra.shRollR = idle * 0.015 * Math.sin(t * 1.4 + 0.9);
  extra.hipRollL = idle * 0.006 * Math.sin(t * 0.5);
  extra.hipRollR = idle * 0.006 * Math.sin(t * 0.5);
  extra.elPitchL = idle * 0.02 * Math.sin(t * 1.1);
  extra.elPitchR = idle * 0.02 * Math.sin(t * 1.1 + 1.3);
  nv.update(dt, extra);

  for (const l of nv.leds) l.material.emissiveIntensity = 1.2 + 0.8 * Math.max(0, Math.sin(t * 3));
  {
    const d = atmo.userData.dust, v = atmo.userData.vel, a = d.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * 0.03 * v[i]; if (y < 0) y = 2.0;
      a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.01); a.setZ(i, a.getZ(i) + Math.cos(t * 0.25 + i * 0.7) * dt * 0.01);
    }
    a.needsUpdate = true;
    atmo.visible = pB < 0.9 || p2 > 0;
  }

  // orbit: auto-rotate when idle; the strip turns the model a little, the knolling turns it back to a 3/4 front
  const idleFor = (performance.now() - Math.max(lastInteract, lastScrollAt)) / 1000;
  if (!isMobile && !dragging && !reduce && idleFor > 3.5 && p1 < 0.02) orbitGoal.theta += dt * 0.12;
  if (!dragging) { orbitGoal.theta += velTheta; velTheta *= 0.92; }
  orbit.theta += (orbitGoal.theta + p1 * 0.85 - pB * 0.6 - orbit.theta) * 0.08;
  orbit.phi += (orbitGoal.phi - orbit.phi) * 0.08;
  const distGoal = isMobile && !clean && !ortho ? mobileDistance(p1, p2) : baseDist * (1 + p1 * 0.42 + p2 * 0.5) * (state.pose === "guard" ? 1.02 : 1);
  if (firstFrame) { orbit.dist = distGoal; firstFrame = false; }
  else orbit.dist += (distGoal - orbit.dist) * 0.06;
  orbit.target.y += ((0.64 + p1 * 0.03 + p2 * 0.16) - orbit.target.y) * 0.06;
  if (ortho) {
    const th = { front: 0, side: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 }[state.view] ?? 0;
    camera.position.set(6 * Math.sin(th), 0.64, 6 * Math.cos(th));
    camera.lookAt(0, 0.64, 0);
  } else {
    camera.position.set(
      orbit.target.x + orbit.dist * Math.sin(orbit.phi) * Math.sin(orbit.theta),
      orbit.target.y + orbit.dist * Math.cos(orbit.phi),
      orbit.target.z + orbit.dist * Math.sin(orbit.phi) * Math.cos(orbit.theta),
    );
    camera.lookAt(orbit.target);
  }
  const w = stage.clientWidth, h = stage.clientHeight;
  const leftShift = isMobile || clean ? 0 : -w * 0.2;
  const shiftGoal = isLandscapePhone && !clean ? w * 0.23 : viewShiftGoal * (1 - Math.min(1, p1 * 2.2)) + leftShift * pB;
  viewShift += (shiftGoal - viewShift) * 0.08;
  const shiftYGoal = isLandscapePhone && !clean ? -h * 0.06 : isMobile && !clean ? h * 0.04 * Math.min(1, p1 * 6 + p2) : viewShiftYGoal * (1 - Math.min(1, p1 * 2.2));
  viewShiftY += (shiftYGoal - viewShiftY) * 0.08;
  if (Math.abs(viewShift) > 0.5 || Math.abs(viewShiftY) > 0.5) camera.setViewOffset(w, h, -viewShift, viewShiftY, w, h); else camera.clearViewOffset();

  // Fog stays behind the robot even when portrait framing moves the camera back.
  scene.fog.near = isMobile && !ortho ? Math.max(0.1, orbit.dist - 0.35) : 3.8;
  scene.fog.far = isMobile && !ortho ? orbit.dist + 6.2 : 10;
  if (composer) composer.render(); else renderer.render(scene, camera);
  layoutCallouts(p1, p2);
}
frame();
