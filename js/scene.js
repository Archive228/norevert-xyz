import * as THREE from "three";
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
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080b);
scene.fog = new THREE.Fog(0x07080b, 4.2, 11);

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 40);
camera.position.set(1.15, 1.12, 2.55);

const env = new THREE.PMREMGenerator(renderer);
scene.environment = env.fromScene(new RoomEnvironment(), 0.04).texture;

const frame = new THREE.MeshPhysicalMaterial({
  color: 0xd8dce2,
  metalness: 0.48,
  roughness: 0.34,
  clearcoat: 0.35,
  clearcoatRoughness: 0.28,
});
const motor = new THREE.MeshPhysicalMaterial({
  color: 0x141518,
  metalness: 0.82,
  roughness: 0.22,
});
const dark = new THREE.MeshPhysicalMaterial({
  color: 0x2a2d33,
  metalness: 0.4,
  roughness: 0.5,
});
const battery = new THREE.MeshPhysicalMaterial({
  color: 0x2b5cff,
  metalness: 0.15,
  roughness: 0.45,
});
const tape = new THREE.MeshStandardMaterial({ color: 0xf5d000, roughness: 0.7, metalness: 0.05 });
const led = new THREE.MeshStandardMaterial({
  color: 0x0b1a10,
  emissive: 0x3dff88,
  emissiveIntensity: 2.4,
});

function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = false;
  parent.add(m);
  return m;
}
function cyl(rTop, rBot, h, mat, x, y, z, parent, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 22), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx;
  m.rotation.z = rz;
  parent.add(m);
  return m;
}
function disc(r, t, mat, x, y, z, parent, axis = "z") {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 28), mat);
  m.position.set(x, y, z);
  if (axis === "z") m.rotation.x = Math.PI / 2;
  if (axis === "x") m.rotation.z = Math.PI / 2;
  parent.add(m);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), led);
  light.position.set(x, y, z + (axis === "z" ? t * 0.55 : 0));
  parent.add(light);
  return m;
}

const robot = new THREE.Group();
scene.add(robot);

const pelvis = new THREE.Group();
pelvis.position.y = 0.74;
robot.add(pelvis);
box(0.22, 0.1, 0.14, frame, 0, 0, 0, pelvis);
disc(0.075, 0.045, motor, -0.09, 0.01, 0, pelvis, "x");
disc(0.075, 0.045, motor, 0.09, 0.01, 0, pelvis, "x");

const waist = new THREE.Group();
waist.position.y = 0.82;
robot.add(waist);
cyl(0.07, 0.07, 0.055, frame, 0, 0, 0, waist);

const torso = new THREE.Group();
torso.position.y = 1.02;
robot.add(torso);
box(0.3, 0.3, 0.16, frame, 0, 0, 0, torso);
box(0.16, 0.16, 0.04, dark, 0, 0.01, 0.085, torso);
box(0.11, 0.07, 0.05, battery, 0, -0.01, 0.07, torso);
box(0.22, 0.012, 0.12, dark, 0, 0.04, 0.02, torso);
box(0.012, 0.18, 0.12, dark, -0.05, 0.0, 0.02, torso);
box(0.012, 0.18, 0.12, dark, 0.05, 0.0, 0.02, torso);
box(0.16, 0.08, 0.09, dark, 0, -0.02, -0.11, torso);
box(0.12, 0.055, 0.07, battery, 0, -0.02, -0.13, torso);
box(0.18, 0.018, 0.03, frame, 0, 0.16, -0.02, torso);
box(0.018, 0.04, 0.03, tape, -0.07, 0.08, 0.09, torso);
disc(0.055, 0.04, motor, -0.17, 0.1, 0, torso, "x");
disc(0.055, 0.04, motor, 0.17, 0.1, 0, torso, "x");

function arm(side) {
  const g = new THREE.Group();
  const s = side;
  g.position.set(0.2 * s, 1.12, 0);
  robot.add(g);
  cyl(0.032, 0.03, 0.19, frame, 0, -0.12, 0, g);
  disc(0.038, 0.032, motor, 0, -0.22, 0, g, "z");
  const fore = new THREE.Group();
  fore.position.set(0, -0.22, 0);
  g.add(fore);
  cyl(0.028, 0.024, 0.17, frame, 0, -0.1, 0, fore);
  box(0.04, 0.012, 0.04, tape, 0, -0.04, 0.02, fore);
  cyl(0.022, 0.022, 0.03, dark, 0, -0.2, 0, fore);
  g.userData.fore = fore;
  return g;
}
const leftArm = arm(-1);
const rightArm = arm(1);
leftArm.rotation.z = 0.12;
rightArm.rotation.z = -0.12;
leftArm.userData.fore.rotation.x = 0.35;
rightArm.userData.fore.rotation.x = 0.28;

function leg(side) {
  const g = new THREE.Group();
  g.position.set(0.075 * side, 0.7, 0);
  robot.add(g);
  disc(0.068, 0.05, motor, 0, 0, 0, g, "x");
  const thigh = new THREE.Group();
  g.add(thigh);
  cyl(0.045, 0.04, 0.22, frame, 0, -0.14, 0, thigh);
  disc(0.055, 0.042, motor, 0, -0.26, 0, thigh, "x");
  const shin = new THREE.Group();
  shin.position.y = -0.26;
  thigh.add(shin);
  cyl(0.036, 0.032, 0.26, frame, 0, -0.15, 0, shin);
  box(0.01, 0.2, 0.01, new THREE.MeshPhysicalMaterial({ color: 0xc0c4c8, metalness: 0.9, roughness: 0.15 }), 0.03, -0.15, 0.02, shin);
  box(0.01, 0.2, 0.01, new THREE.MeshPhysicalMaterial({ color: 0xc0c4c8, metalness: 0.9, roughness: 0.15 }), -0.03, -0.15, 0.02, shin);
  disc(0.04, 0.03, motor, 0, -0.29, 0.01, shin, "x");
  const foot = box(0.12, 0.028, 0.2, frame, 0, -0.32, 0.03, shin);
  box(0.11, 0.01, 0.19, dark, 0, -0.336, 0.03, shin);
  g.userData.thigh = thigh;
  g.userData.shin = shin;
  g.userData.foot = foot;
  return g;
}
const leftLeg = leg(-1);
const rightLeg = leg(1);

robot.traverse((o) => {
  if (o.isMesh) o.castShadow = false;
});

const ground = new Reflector(new THREE.PlaneGeometry(14, 14), {
  clipBias: 0.003,
  textureWidth: 1024,
  textureHeight: 1024,
  color: 0x111318,
});
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

const grid = new THREE.GridHelper(12, 36, 0x2a3038, 0x16181c);
grid.position.y = 0.002;
scene.add(grid);

const dustGeo = new THREE.BufferGeometry();
const dustCount = 220;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 6;
  dustPos[i * 3 + 1] = Math.random() * 3.2;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({ color: 0x9aa3ad, size: 0.012, transparent: true, opacity: 0.45 })
);
scene.add(dust);

scene.add(new THREE.AmbientLight(0x6d7380, 0.35));
const key = new THREE.DirectionalLight(0xfff4e5, 2.1);
key.position.set(2.4, 3.2, 1.6);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6fa2ff, 1.15);
rim.position.set(-2.8, 1.4, -1.2);
scene.add(rim);
const fill = new THREE.PointLight(0x2b5cff, 6, 4.5);
fill.position.set(0.15, 1.05, 0.35);
scene.add(fill);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.7, 0.72);
composer.addPass(bloom);

const mouse = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock = new THREE.Clock();

function frameLoop() {
  const t = clock.getElapsedTime();
  if (!reduce) {
    robot.rotation.y = Math.sin(t * 0.35) * 0.22;
    waist.rotation.y = Math.sin(t * 0.7) * 0.18;
    leftLeg.userData.thigh.rotation.x = 0.08 + Math.sin(t * 1.1) * 0.04;
    rightLeg.userData.thigh.rotation.x = 0.1 + Math.cos(t * 1.1) * 0.04;
    leftArm.rotation.x = Math.sin(t * 0.9) * 0.08;
    rightArm.rotation.x = Math.cos(t * 0.9) * 0.08;
    dust.rotation.y = t * 0.03;
  }
  const tx = 1.15 + mouse.x * 0.35;
  const ty = 1.12 + mouse.y * -0.12;
  camera.position.x += (tx - camera.position.x) * 0.04;
  camera.position.y += (ty - camera.position.y) * 0.04;
  camera.lookAt(0.02, 0.78, 0);
  composer.render();
  requestAnimationFrame(frameLoop);
}
frameLoop();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
