import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";

const canvas = document.getElementById("stage");
const host = document.querySelector(".hero");
if (!canvas || !host) throw new Error("missing stage");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0b0e);
scene.fog = new THREE.Fog(0x0a0b0e, 4.8, 10);

const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 30);

const env = new THREE.PMREMGenerator(renderer);
scene.environment = env.fromScene(new RoomEnvironment(), 0.08).texture;
scene.environmentIntensity = 0.35;

const shell = new THREE.MeshPhysicalMaterial({
  color: 0xcfd3d8,
  metalness: 0.08,
  roughness: 0.52,
  clearcoat: 0.18,
  clearcoatRoughness: 0.45,
});
const joint = new THREE.MeshPhysicalMaterial({
  color: 0x1a1c20,
  metalness: 0.72,
  roughness: 0.38,
});
const flange = new THREE.MeshPhysicalMaterial({
  color: 0x9aa0a6,
  metalness: 0.88,
  roughness: 0.22,
});
const visor = new THREE.MeshPhysicalMaterial({
  color: 0x0c0d10,
  metalness: 0.2,
  roughness: 0.18,
});
const handMat = new THREE.MeshPhysicalMaterial({
  color: 0x1b1d21,
  metalness: 0.12,
  roughness: 0.62,
});
const sole = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9, metalness: 0 });
const rod = new THREE.MeshPhysicalMaterial({
  color: 0xb4b8bd,
  metalness: 0.9,
  roughness: 0.2,
});
const eyeMat = new THREE.MeshStandardMaterial({
  color: 0xe8e8e8,
  emissive: 0xd8d8d8,
  emissiveIntensity: 1.15,
});
const dimple = new THREE.MeshStandardMaterial({ color: 0x8b9096, roughness: 0.55, metalness: 0.1 });

function rbox(w, h, d, r, mat) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);
}
function add(parent, mesh, x, y, z) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function actuator(r, t) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t * 0.72, 28), joint);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, t * 0.2, 28), flange);
  ring.position.y = t * 0.3;
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, t * 0.55, 16), joint);
  bore.position.y = t * 0.22;
  g.add(body, ring, bore);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.01, 8), flange);
    bolt.position.set(Math.cos(a) * r * 0.62, t * 0.38, Math.sin(a) * r * 0.62);
    g.add(bolt);
  }
  return g;
}
function lay(obj, axis) {
  if (axis === "x") obj.rotation.z = Math.PI / 2;
  if (axis === "z") obj.rotation.x = Math.PI / 2;
  return obj;
}

const parts = [];
function explode(obj, dir, dist) {
  obj.userData.restPos = obj.position.clone();
  obj.userData.expDir = dir.clone().normalize();
  obj.userData.expDist = dist;
  parts.push(obj);
}

const robot = new THREE.Group();
scene.add(robot);

const HIP_Y = 0.76;
const HIP_X = 0.0725;
const KNEE_LEN = 0.25;
const SHIN_LEN = 0.3;
const SHOULDER_Y = HIP_Y + 0.273;
const SHOULDER_X = 0.12175;
const UPPER_ARM = 0.189;

const pelvis = rbox(0.26, 0.13, 0.17, 0.032, shell);
pelvis.position.set(0, HIP_Y, 0);
robot.add(pelvis);
explode(pelvis, new THREE.Vector3(0, -0.15, -0.2), 0.42);
const slitA = rbox(0.12, 0.008, 0.012, 0.002, joint);
add(robot, slitA, 0, HIP_Y + 0.02, 0.086);
explode(slitA, new THREE.Vector3(0, 0, 0.7), 0.35);
const slitB = rbox(0.1, 0.008, 0.012, 0.002, joint);
add(robot, slitB, 0, HIP_Y - 0.018, 0.086);
explode(slitB, new THREE.Vector3(0, -0.1, 0.7), 0.35);
for (const side of [-1, 1]) {
  const hip = lay(actuator(0.078, 0.055), "x");
  hip.position.set(HIP_X * side * 1.25, HIP_Y + 0.01, -0.01);
  robot.add(hip);
  explode(hip, new THREE.Vector3(side, -0.15, -0.35), 0.58);
  const root = rbox(0.09, 0.07, 0.1, 0.02, joint);
  add(robot, root, HIP_X * side, HIP_Y - 0.06, 0.01);
  explode(root, new THREE.Vector3(side * 0.6, -0.4, 0), 0.4);
}

const waist = rbox(0.18, 0.068, 0.16, 0.028, shell);
waist.position.set(0, HIP_Y + 0.1, 0);
robot.add(waist);
explode(waist, new THREE.Vector3(0, 0.15, 0.45), 0.38);

const chest = rbox(0.36, 0.2, 0.18, 0.04, shell);
chest.position.set(0, SHOULDER_Y - 0.04, 0.01);
robot.add(chest);
explode(chest, new THREE.Vector3(0, 0.35, -0.1), 0.7);
const chestLow = rbox(0.28, 0.14, 0.16, 0.032, shell);
chestLow.position.set(0, SHOULDER_Y - 0.18, 0);
robot.add(chestLow);
explode(chestLow, new THREE.Vector3(0, 0.1, 0.35), 0.5);
const chestSlit = rbox(0.15, 0.01, 0.016, 0.003, joint);
add(robot, chestSlit, 0, SHOULDER_Y - 0.06, 0.095);
explode(chestSlit, new THREE.Vector3(0, 0.25, 0.8), 0.42);

const logo = document.createElement("canvas");
logo.width = 512;
logo.height = 220;
const lg = logo.getContext("2d");
lg.fillStyle = "#5c6168";
lg.font = "600 48px Inter, system-ui, sans-serif";
lg.textBaseline = "middle";
lg.fillText("NOREVERT", 28, 88);
lg.font = "500 32px IBM Plex Mono, ui-monospace, monospace";
lg.fillText("NV-01", 28, 148);
const logoMat = new THREE.MeshBasicMaterial({
  map: new THREE.CanvasTexture(logo),
  transparent: true,
  opacity: 0.85,
});
logoMat.map.colorSpace = THREE.SRGBColorSpace;
const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.065), logoMat);
plate.position.set(-0.06, SHOULDER_Y + 0.02, 0.096);
robot.add(plate);
explode(plate, new THREE.Vector3(-0.25, 0.45, 0.7), 0.48);

const hump = rbox(0.27, 0.07, 0.08, 0.016, shell);
hump.position.set(0, HIP_Y + 0.14, -0.11);
robot.add(hump);
explode(hump, new THREE.Vector3(0, 0, -1), 0.62);
const handle = rbox(0.24, 0.022, 0.036, 0.01, shell);
handle.position.set(0, SHOULDER_Y + 0.08, -0.055);
robot.add(handle);
explode(handle, new THREE.Vector3(0, 0.7, -0.45), 0.52);

const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.044, 0.048, 22), joint);
neck.position.set(0, SHOULDER_Y + 0.145, 0);
robot.add(neck);
explode(neck, new THREE.Vector3(0, 0.9, 0), 0.4);

const head = new THREE.Group();
head.position.set(0, SHOULDER_Y + 0.235, 0.012);
robot.add(head);
explode(head, new THREE.Vector3(0, 1.15, 0.15), 0.78);
head.add(rbox(0.2, 0.145, 0.128, 0.042, shell));
const face = rbox(0.17, 0.112, 0.012, 0.018, visor);
face.position.set(0, 0, 0.06);
head.add(face);
const topSlit = rbox(0.055, 0.006, 0.01, 0.002, joint);
topSlit.position.set(0, 0.068, 0.01);
head.add(topSlit);
function pill(x) {
  const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.032, 6, 12), eyeMat);
  e.position.set(x, 0.002, 0.068);
  head.add(e);
}
pill(-0.03);
pill(0.03);

function makeArm(side) {
  const root = new THREE.Group();
  root.position.set(SHOULDER_X * side * 1.05, SHOULDER_Y, 0);
  robot.add(root);
  explode(root, new THREE.Vector3(side * 1.15, 0.28, 0.12), 0.88);
  const capGeo = new THREE.SphereGeometry(0.055, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, shell);
  cap.rotation.z = side > 0 ? -0.4 : 0.4;
  cap.position.set(0.01 * side, 0.028, 0);
  root.add(cap);
  const mot = lay(actuator(0.046, 0.042), "x");
  mot.position.set(0.028 * side, 0, 0);
  root.add(mot);
  const upper = rbox(0.068, UPPER_ARM, 0.068, 0.02, shell);
  upper.position.set(0, -UPPER_ARM / 2, 0);
  root.add(upper);
  const elbow = lay(actuator(0.034, 0.032), "z");
  elbow.position.set(0, -UPPER_ARM, 0);
  root.add(elbow);
  const fore = new THREE.Group();
  fore.position.set(0, -UPPER_ARM, 0);
  fore.rotation.x = 0.12;
  root.add(fore);
  explode(fore, new THREE.Vector3(side * 0.35, -0.85, 0.45), 0.55);
  const forearm = rbox(0.058, 0.17, 0.058, 0.018, shell);
  forearm.position.set(0, -0.095, 0);
  fore.add(forearm);
  for (const [dx, dy] of [
    [-0.012, -0.07],
    [0.012, -0.07],
    [-0.012, -0.095],
    [0.012, -0.095],
  ]) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.01, 8), dimple);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(dx, dy, 0.028);
    fore.add(hole);
  }
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 24, 18), handMat);
  hand.position.set(0, -0.2, 0);
  fore.add(hand);
  root.rotation.z = side * 0.08;
  return root;
}
makeArm(-1);
makeArm(1);

function screws(parent, ox, oy, oz) {
  for (let col = 0; col < 2; col++) {
    for (let row = 0; row < 3; row++) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.01, 8), dimple);
      h.rotation.x = Math.PI / 2;
      h.position.set(ox + (col ? 0.016 : -0.016), oy - row * 0.028, oz);
      parent.add(h);
    }
  }
}

function makeLeg(side) {
  const root = new THREE.Group();
  root.position.set(HIP_X * side, HIP_Y - 0.02, 0);
  robot.add(root);
  explode(root, new THREE.Vector3(side * 0.65, -0.9, 0.12), 0.95);
  const thigh = rbox(0.115, KNEE_LEN - 0.02, 0.125, 0.028, shell);
  thigh.position.set(0, -KNEE_LEN / 2, 0);
  root.add(thigh);
  screws(root, 0, -0.08, 0.06);
  const knee = lay(actuator(0.05, 0.042), "x");
  knee.position.set(0, -KNEE_LEN, 0);
  root.add(knee);
  const shinG = new THREE.Group();
  shinG.position.set(0, -KNEE_LEN, 0);
  root.add(shinG);
  explode(shinG, new THREE.Vector3(side * 0.15, -1, 0.3), 0.62);
  const shin = rbox(0.092, SHIN_LEN - 0.04, 0.1, 0.022, shell);
  shin.position.set(0, -SHIN_LEN / 2 + 0.02, 0.01);
  shinG.add(shin);
  const hubA = lay(actuator(0.028, 0.022), "x");
  hubA.position.set(0.042 * side, -0.1, 0.02);
  shinG.add(hubA);
  const hubB = lay(actuator(0.024, 0.02), "x");
  hubB.position.set(0.042 * side, -0.22, 0.03);
  shinG.add(hubB);
  const rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 8), rod);
  rod1.position.set(0.034 * side, -0.16, 0.038);
  shinG.add(rod1);
  const rod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 8), rod);
  rod2.position.set(0.05 * side, -0.16, 0.02);
  shinG.add(rod2);
  const ankle = lay(actuator(0.032, 0.028), "x");
  ankle.position.set(0, -SHIN_LEN + 0.02, 0.015);
  shinG.add(ankle);
  const foot = rbox(0.11, 0.032, 0.2, 0.012, shell);
  foot.position.set(0, -SHIN_LEN - 0.01, 0.035);
  shinG.add(foot);
  const rubber = rbox(0.108, 0.014, 0.195, 0.004, sole);
  rubber.position.set(0, -SHIN_LEN - 0.028, 0.035);
  shinG.add(rubber);
  return root;
}
makeLeg(-1);
makeLeg(1);

const ground = new Reflector(new THREE.PlaneGeometry(10, 10), {
  clipBias: 0.003,
  textureWidth: 768,
  textureHeight: 768,
  color: 0x14161a,
});
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

scene.add(new THREE.AmbientLight(0x6a7078, 0.22));
const key = new THREE.DirectionalLight(0xe6e0d6, 0.85);
key.position.set(1.8, 2.8, 2.2);
scene.add(key);
const rim = new THREE.DirectionalLight(0x5d6d82, 0.28);
rim.position.set(-2.2, 1.2, -1.4);
scene.add(rim);
const fill = new THREE.PointLight(0xb8c0c8, 1.4, 4.2);
fill.position.set(0.3, 1.1, 1.4);
scene.add(fill);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), 0.16, 0.55, 0.86);
composer.addPass(bloom);

function fit() {
  const w = host.clientWidth;
  const h = host.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  const z = w / h < 0.82 ? 3.35 : 2.55;
  camera.position.set(0, 0.64, z);
  camera.lookAt(0, 0.64, 0);
}
fit();
new ResizeObserver(fit).observe(host);

const mouse = { x: 0, y: 0 };
const look = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

let explodeAmt = 0;
function scrollProgress() {
  const r = host.getBoundingClientRect();
  const range = Math.max(host.offsetHeight * 0.9, 1);
  return Math.min(1, Math.max(0, -r.top / range));
}
function ease(t) {
  return t * t * (3 - 2 * t);
}
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function frame() {
  const target = reduce ? 0 : scrollProgress();
  explodeAmt += (target - explodeAmt) * 0.09;
  const p = ease(explodeAmt);
  for (const o of parts) {
    o.position.copy(o.userData.restPos).addScaledVector(o.userData.expDir, p * o.userData.expDist);
  }
  look.x += (mouse.x * 0.62 - look.x) * 0.12;
  look.y += (-mouse.y * 0.36 - look.y) * 0.12;
  head.rotation.order = "YXZ";
  head.rotation.y = look.x;
  head.rotation.x = look.y;
  composer.render();
  requestAnimationFrame(frame);
}
frame();
