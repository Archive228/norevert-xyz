import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";

const canvas = document.getElementById("stage");
if (!canvas) throw new Error("missing #stage");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080b);
scene.fog = new THREE.Fog(0x07080b, 5.5, 14);

const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.08, 40);
function placeCamera() {
  const wide = window.innerWidth / window.innerHeight;
  const z = wide < 0.85 ? 2.55 : 1.72;
  camera.position.set(0, 0.74, z);
  camera.lookAt(0, 0.7, 0);
}
placeCamera();

const env = new THREE.PMREMGenerator(renderer);
scene.environment = env.fromScene(new RoomEnvironment(), 0.03).texture;

const shell = new THREE.MeshPhysicalMaterial({
  color: 0xf2f4f6,
  metalness: 0.06,
  roughness: 0.32,
  clearcoat: 0.62,
  clearcoatRoughness: 0.22,
});
const joint = new THREE.MeshPhysicalMaterial({
  color: 0x16181c,
  metalness: 0.78,
  roughness: 0.24,
});
const visor = new THREE.MeshPhysicalMaterial({
  color: 0x0a0a0c,
  metalness: 0.35,
  roughness: 0.12,
  clearcoat: 0.8,
});
const sphereHand = new THREE.MeshPhysicalMaterial({
  color: 0x1a1c20,
  metalness: 0.15,
  roughness: 0.55,
});
const sole = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85, metalness: 0.05 });
const rod = new THREE.MeshPhysicalMaterial({
  color: 0xc5c9ce,
  metalness: 0.92,
  roughness: 0.16,
});
const eyeMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 3.4,
});

function chestDecal() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = "#6f757c";
  g.font = "600 54px Inter, system-ui, sans-serif";
  g.textBaseline = "middle";
  g.fillText("NOREVERT", 36, 108);
  g.font = "500 36px IBM Plex Mono, ui-monospace, monospace";
  g.fillText("NV-01", 36, 168);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
}

function rbox(w, h, d, r, mat) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);
}
function disc(r, t, mat, axis = "x") {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 28), mat);
  if (axis === "x") m.rotation.z = Math.PI / 2;
  if (axis === "z") m.rotation.x = Math.PI / 2;
  return m;
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

const pelvis = rbox(0.24, 0.12, 0.16, 0.03, shell);
pelvis.position.set(0, 0.76, 0);
robot.add(pelvis);
explode(pelvis, new THREE.Vector3(0, -0.2, -0.15), 0.55);
const hipL = disc(0.078, 0.05, joint, "x");
hipL.position.set(-0.1, 0.76, 0);
robot.add(hipL);
explode(hipL, new THREE.Vector3(-1, -0.2, 0), 0.7);
const hipR = disc(0.078, 0.05, joint, "x");
hipR.position.set(0.1, 0.76, 0);
robot.add(hipR);
explode(hipR, new THREE.Vector3(1, -0.2, 0), 0.7);

const waist = rbox(0.17, 0.07, 0.15, 0.03, shell);
waist.position.set(0, 0.86, 0);
robot.add(waist);
explode(waist, new THREE.Vector3(0, 0.1, 0.4), 0.45);

const torso = rbox(0.34, 0.32, 0.18, 0.045, shell);
torso.position.set(0, 1.06, 0);
robot.add(torso);
explode(torso, new THREE.Vector3(0, 0.35, -0.15), 0.85);
const slit = rbox(0.16, 0.012, 0.02, 0.004, joint);
slit.position.set(0, 1.1, 0.092);
robot.add(slit);
explode(slit, new THREE.Vector3(0, 0.4, 0.7), 0.55);
const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), chestDecal());
plate.position.set(-0.055, 1.145, 0.092);
robot.add(plate);
explode(plate, new THREE.Vector3(-0.3, 0.5, 0.8), 0.6);
const hump = rbox(0.18, 0.1, 0.1, 0.02, shell);
hump.position.set(0, 0.96, -0.12);
robot.add(hump);
explode(hump, new THREE.Vector3(0, 0, -1), 0.75);
const bar = rbox(0.22, 0.025, 0.04, 0.01, shell);
bar.position.set(0, 1.18, -0.06);
robot.add(bar);
explode(bar, new THREE.Vector3(0, 0.8, -0.5), 0.65);

const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.05, 20), joint);
neck.position.set(0, 1.245, 0);
robot.add(neck);
explode(neck, new THREE.Vector3(0, 1, 0), 0.5);

const head = new THREE.Group();
head.position.set(0, 1.34, 0.01);
robot.add(head);
explode(head, new THREE.Vector3(0, 1.2, 0.2), 0.95);
head.add(rbox(0.2, 0.15, 0.13, 0.045, shell));
const face = rbox(0.168, 0.118, 0.012, 0.02, visor);
face.position.set(0, 0, 0.062);
head.add(face);
function pill(x) {
  const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.036, 6, 12), eyeMat);
  e.position.set(x, 0.004, 0.07);
  head.add(e);
}
pill(-0.032);
pill(0.032);

function makeArm(side) {
  const root = new THREE.Group();
  root.position.set(0.205 * side, 1.16, 0);
  robot.add(root);
  explode(root, new THREE.Vector3(side * 1.1, 0.35, 0.1), 1.05);
  const cap = rbox(0.1, 0.07, 0.1, 0.03, shell);
  cap.position.set(0, 0.03, 0);
  root.add(cap);
  const motor = disc(0.048, 0.04, joint, "x");
  motor.position.set(0.02 * side, 0, 0);
  root.add(motor);
  const upper = rbox(0.07, 0.2, 0.07, 0.022, shell);
  upper.position.set(0, -0.13, 0);
  root.add(upper);
  const elbow = disc(0.036, 0.034, joint, "z");
  elbow.position.set(0, -0.24, 0);
  root.add(elbow);
  const fore = new THREE.Group();
  fore.position.set(0, -0.24, 0);
  fore.rotation.x = 0.18;
  root.add(fore);
  explode(fore, new THREE.Vector3(side * 0.4, -0.8, 0.5), 0.7);
  const forearm = rbox(0.062, 0.18, 0.062, 0.02, shell);
  forearm.position.set(0, -0.1, 0);
  fore.add(forearm);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 18), sphereHand);
  hand.position.set(0, -0.21, 0);
  fore.add(hand);
  root.rotation.z = side * 0.1;
  return root;
}
makeArm(-1);
makeArm(1);

function makeLeg(side) {
  const root = new THREE.Group();
  root.position.set(0.078 * side, 0.7, 0);
  robot.add(root);
  explode(root, new THREE.Vector3(side * 0.7, -0.85, 0.15), 1.15);
  const thigh = rbox(0.11, 0.24, 0.12, 0.03, shell);
  thigh.position.set(0, -0.1, 0);
  root.add(thigh);
  const knee = disc(0.05, 0.04, joint, "x");
  knee.position.set(0, -0.23, 0);
  root.add(knee);
  const shinG = new THREE.Group();
  shinG.position.set(0, -0.23, 0);
  root.add(shinG);
  explode(shinG, new THREE.Vector3(side * 0.2, -1, 0.35), 0.8);
  const shin = rbox(0.09, 0.26, 0.1, 0.025, shell);
  shin.position.set(0, -0.15, 0);
  shinG.add(shin);
  const rodL = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.2, 8), rod);
  rodL.position.set(-0.03, -0.16, 0.03);
  shinG.add(rodL);
  const rodR = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.2, 8), rod);
  rodR.position.set(0.03, -0.16, 0.03);
  shinG.add(rodR);
  const ankle = disc(0.036, 0.03, joint, "x");
  ankle.position.set(0, -0.29, 0.01);
  shinG.add(ankle);
  const foot = rbox(0.11, 0.035, 0.2, 0.012, shell);
  foot.position.set(0, -0.32, 0.03);
  shinG.add(foot);
  const rubber = rbox(0.105, 0.012, 0.19, 0.004, sole);
  rubber.position.set(0, -0.34, 0.03);
  shinG.add(rubber);
  return root;
}
makeLeg(-1);
makeLeg(1);

const ground = new Reflector(new THREE.PlaneGeometry(16, 16), {
  clipBias: 0.003,
  textureWidth: 1024,
  textureHeight: 1024,
  color: 0x101218,
});
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const grid = new THREE.GridHelper(14, 40, 0x2a3038, 0x14171c);
grid.position.y = 0.002;
scene.add(grid);

scene.add(new THREE.AmbientLight(0x7a808c, 0.4));
const key = new THREE.DirectionalLight(0xfff6ea, 2.35);
key.position.set(2.2, 3.4, 2.4);
scene.add(key);
const rim = new THREE.DirectionalLight(0x7aa6ff, 1.05);
rim.position.set(-2.6, 1.6, -1.4);
scene.add(rim);
const fill = new THREE.PointLight(0xffffff, 4, 5);
fill.position.set(0.2, 1.4, 1.1);
scene.add(fill);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.65, 0.78)
);

const mouse = { x: 0, y: 0 };
const headLook = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

let explodeAmt = 0;
function scrollProgress() {
  const zone = Math.max(window.innerHeight * 1.65, 1);
  return Math.min(1, Math.max(0, window.scrollY / zone));
}

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ease(t) {
  return t * t * (3 - 2 * t);
}

function frameLoop() {
  const target = reduce ? 0 : scrollProgress();
  explodeAmt += (target - explodeAmt) * 0.08;
  const p = ease(explodeAmt);

  for (const o of parts) {
    o.position.copy(o.userData.restPos).addScaledVector(o.userData.expDir, p * o.userData.expDist);
  }

  headLook.x += (mouse.x * 0.7 - headLook.x) * 0.12;
  headLook.y += (-mouse.y * 0.42 - headLook.y) * 0.12;
  head.rotation.order = "YXZ";
  head.rotation.y = headLook.x;
  head.rotation.x = headLook.y;

  camera.position.x += (mouse.x * 0.08 - camera.position.x) * 0.03;
  camera.lookAt(0, 0.7 + p * 0.08, 0);
  composer.render();
  requestAnimationFrame(frameLoop);
}
frameLoop();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  placeCamera();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
