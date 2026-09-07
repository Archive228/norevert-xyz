import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { createNV01 } from "./nv01.js";

const canvas = document.getElementById("stage");
const host = document.querySelector(".hero");
if (!canvas || !host) throw new Error("missing stage");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.58;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0b0e);
scene.fog = new THREE.Fog(0x0a0b0e, 5.5, 11);

const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 30);
const env = new THREE.PMREMGenerator(renderer);
scene.environment = env.fromScene(new RoomEnvironment(), 0.1).texture;
scene.environmentIntensity = 0.28;

const { root: robot, parts, head } = createNV01();
scene.add(robot);

const ground = new Reflector(new THREE.PlaneGeometry(12, 12), {
  clipBias: 0.003,
  textureWidth: 768,
  textureHeight: 768,
  color: 0x12141a,
});
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

scene.add(new THREE.AmbientLight(0x6e747c, 0.2));
const key = new THREE.DirectionalLight(0xe4dfd6, 0.72);
key.position.set(1.6, 2.6, 2.4);
scene.add(key);
const rim = new THREE.DirectionalLight(0x4e5a68, 0.22);
rim.position.set(-2.0, 1.1, -1.2);
scene.add(rim);
const fill = new THREE.PointLight(0xaeb6be, 1.1, 4.5);
fill.position.set(0.4, 1.0, 1.6);
scene.add(fill);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(2, 2), 0.12, 0.5, 0.88));

function fit() {
  const w = host.clientWidth;
  const h = host.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  const need = 1.42;
  const half = THREE.MathUtils.degToRad(camera.fov * 0.5);
  let z = need / 2 / Math.tan(half);
  if (w / h < 0.85) z *= 1.18;
  camera.position.set(0, 0.63, z + 0.15);
  camera.lookAt(0, 0.63, 0);
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
  return Math.min(1, Math.max(0, -r.top / Math.max(host.offsetHeight * 0.92, 1)));
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
    const local = Math.min(1, Math.max(0, (p - o.userData.delay) / (1 - o.userData.delay || 1)));
    o.position.copy(o.userData.rest).addScaledVector(o.userData.dir, local * o.userData.dist);
  }
  look.x += (mouse.x * 0.7 - look.x) * 0.12;
  look.y += (-mouse.y * 0.38 - look.y) * 0.12;
  head.rotation.order = "YXZ";
  head.rotation.y = look.x;
  head.rotation.x = look.y;
  composer.render();
  requestAnimationFrame(frame);
}
frame();
