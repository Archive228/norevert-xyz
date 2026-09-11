import { PARTS, OWNED_CENTS, REMAINING_CENTS, usd } from './parts-data.js';

const section = document.querySelector('#parts');
const tabs = [...section.querySelectorAll('[data-parts-tab]')];
const panel = section.querySelector('#parts-panel');
const loading = section.querySelector('.parts-loading');
const caption = section.querySelector('[data-part-caption]');
const captionPrice = section.querySelector('[data-part-price]');
const stageNumber = section.querySelector('[data-part-number]');
const rotateButton = section.querySelector('[data-parts-rotate]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let category = 0, selected = null, rotating = !reduced.matches, visible = false, models = null;
let displayModels = () => {}, initialization = null;

section.querySelector('[data-remaining-total]').textContent = usd(REMAINING_CENTS);
section.querySelector('[data-build-total]').textContent = usd(OWNED_CENTS + REMAINING_CENTS);

function updateCaption() {
  const group = PARTS[category], item = group.items.find(item => item.model === selected);
  caption.textContent = item ? item.name : group.label;
  captionPrice.textContent = usd(item ? item.cents : group.items.reduce((sum, row) => sum + row.cents, 0));
  stageNumber.textContent = `${String(category + 1).padStart(2, '0')} / 03`;
  panel.querySelectorAll('[data-part-model]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.partModel === selected)));
}

function showCategory(index) {
  category = index; selected = null;
  const group = PARTS[index], total = group.items.reduce((sum, row) => sum + row.cents, 0);
  tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(index === i)); tab.tabIndex = index === i ? 0 : -1; });
  panel.setAttribute('aria-labelledby', tabs[index].id);
  panel.innerHTML = `<h3>${group.title}</h3><p>${group.description}</p><div class="parts-subtotal"><span>This group · reserve included</span><strong>${usd(total)}</strong></div><div class="parts-items">${group.items.map(item => `<div class="parts-item"><button type="button" data-part-model="${item.model}" aria-pressed="false" aria-label="Inspect ${item.name} in 3D, ${usd(item.cents)}"><span>${item.name}</span><b>${usd(item.cents)}</b></button><p>${item.detail}</p></div>`).join('')}</div>`;
  panel.querySelectorAll('[data-part-model]').forEach(button => button.addEventListener('click', () => {
    selected = selected === button.dataset.partModel ? null : button.dataset.partModel;
    displayModels(); updateCaption();
    if (selected && matchMedia('(max-width: 900px)').matches) section.querySelector('.parts-stage').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });
  }));
  displayModels(); updateCaption();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showCategory(index));
  tab.addEventListener('keydown', event => {
    const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); showCategory(next); tabs[next].focus(); }
  });
});
section.querySelector('[data-parts-reset]').addEventListener('click', () => { selected = null; displayModels(); updateCaption(); });
function updateRotation() { rotateButton.setAttribute('aria-pressed', String(rotating)); rotateButton.textContent = rotating ? 'Pause rotation' : 'Rotate'; }
rotateButton.addEventListener('click', () => { rotating = !rotating; updateRotation(); });
reduced.addEventListener('change', () => { rotating = !reduced.matches; updateRotation(); });
updateRotation(); showCategory(0);

async function initialize() {
  const [T, { RoomEnvironment }, { createNV01 }, { loadFrame }, { createPartsModels }] = await Promise.all([
    import('three'), import('three/addons/environments/RoomEnvironment.js'), import('./nv01.js'), import('./frame.js'), import('./parts-models.js'),
  ]);
  const canvas = section.querySelector('.parts-canvas');
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new T.Scene(), root = new T.Group(); scene.add(root);
  const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; room.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight(0xf2f5ff, 0x32384b, 2));
  for (const [color, intensity, position] of [[0xffffff, 4, [-2, 3, 4]], [0xb9caff, 2, [3, 1, -2]], [0xf7d976, 1.3, [-3, 0, -1]]]) {
    const light = new T.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
  }
  const camera = new T.PerspectiveCamera(32, 1, .01, 40);
  camera.position.set(0, .48, 3.9); camera.lookAt(0, 0, 0);
  const ring = new T.Mesh(new T.TorusGeometry(1.05, .002, 6, 120), new T.MeshBasicMaterial({ color: 0xe9c227, transparent: true, opacity: .22 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -.80; scene.add(ring);
  const ring2 = ring.clone(); ring2.scale.setScalar(.68); scene.add(ring2);
  const pack = await loadFrame('./description/meshes/nv01.frame');
  const nv = createNV01({ frame: pack.geometries }); nv.setMode('target'); nv.update(1); nv.setExplode(0);
  models = createPartsModels(nv);

  function normalize(source, size) {
    const object = source.clone(true); object.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(object), center = bounds.getCenter(new T.Vector3()), dimensions = bounds.getSize(new T.Vector3());
    object.position.sub(center); const wrapper = new T.Group(); wrapper.add(object);
    wrapper.scale.setScalar(size / Math.max(dimensions.x, dimensions.y, dimensions.z)); return wrapper;
  }
  let angle = 0, targetAngle = 0, dragging = false, startX = 0, startAngle = 0;
  displayModels = () => {
    root.clear(); angle = targetAngle = 0;
    const items = selected ? PARTS[category].items.filter(item => item.model === selected) : PARTS[category].items;
    const positions = items.length === 1 ? [[0, .03, 0, 1.60]]
      : items.length === 3 ? [[-.45, .10, .04, 1.0], [.60, .37, 0, .72], [.52, -.43, .10, .52]]
      : items.length === 4 ? [[-.53, .36, 0, .84], [.53, .36, 0, .82], [-.53, -.40, .05, .76], [.53, -.40, .05, .76]]
      : [[-.68, .36, 0, .56], [0, .36, 0, .55], [.68, .36, 0, .56], [-.68, -.39, 0, .52], [0, -.39, 0, .53], [.68, -.39, 0, .56]];
    items.forEach((item, i) => {
      const [x, y, z, size] = positions[i];
      const model = normalize(models[item.model], size); model.position.set(x, y, z);
      if (item.model !== 'shell' && item.model !== 'head') model.rotation.x = .48;
      model.userData.restY = y; root.add(model);
    });
  };
  displayModels();
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = camera.aspect < 1 ? 3.9 / camera.aspect : 3.9; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(canvas); resize();
  canvas.addEventListener('pointerdown', event => { dragging = true; startX = event.clientX; startAngle = targetAngle; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => { if (dragging) targetAngle = startAngle + (event.clientX - startX) * .008; });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  const clock = new T.Clock();
  function render() {
    requestAnimationFrame(render); const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    if (!visible || document.hidden) return;
    if (rotating && !dragging) targetAngle += dt * .12;
    angle += (targetAngle - angle) * .1; root.rotation.y = angle;
    root.children.forEach((object, i) => { object.position.y = object.userData.restY + (reduced.matches ? 0 : Math.sin(t * .8 + i) * .015); });
    renderer.render(scene, camera);
  }
  loading.hidden = true; section.dataset.partsReady = 'true'; render();
}
const observer = new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  if (visible && !initialization) initialization = initialize().catch(error => {
    loading.textContent = '3D preview unavailable. All parts and prices are listed alongside.';
    console.error('Parts preview:', error);
  });
}, { rootMargin: '300px' });
observer.observe(section);
