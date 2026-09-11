import { OWNED_CENTS, REMAINING_CENTS, usd } from './parts-data.js';

const section = document.querySelector('#parts');
const $ = selector => section.querySelector(selector);
const category = $('#parts-category'), component = $('#parts-component'), search = $('#parts-search');
const detail = $('#parts-detail'), loading = $('.parts-loading');
const zoom = $('#parts-zoom'), explode = $('#parts-explode');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let catalog = [], choices = [], current = null, selectedLayer = null, fullModel = null;
let visible = false, rotating = false, initialization, renderModel = () => {}, disposeModel = () => {};
let factory, loadShell, selectionVersion = 0, frameView = () => {}, rotateView = () => {};

$('[data-remaining-total]').textContent = usd(REMAINING_CENTS);
$('[data-build-total]').textContent = usd(OWNED_CENTS + REMAINING_CENTS);

function renderDetail() {
  if (!current) return;
  const layers = fullModel?.userData.layers || [];
  const layer = layers.find(row => row.id === selectedLayer);
  const included = layer ? catalog.find(row => row.id === layer.included) || current : current;
  const headline = layer ? layer.title.replace(/^\d+ · /, '') : current.name;
  $('[data-part-caption]').textContent = headline;
  $('[data-part-price]').textContent = layer ? 'Included in module' : usd(current.cents);
  $('[data-part-id]').textContent = layer ? `${current.id} / ${layer.id}` : current.id === 'HEAD_ASSEMBLY' ? 'HEAD / CONCEPT ASSEMBLY' : current.id;
  $('[data-part-number]').textContent = selectedLayer ? `LAYER ${String(layer.index + 1).padStart(2, '0')}` : layers.length ? `${layers.length} LAYERS` : `${current.qty} ${current.qty === 1 ? 'UNIT' : 'UNITS'}`;
  $('#parts-explode-control').hidden = !layers.length || !!selectedLayer;
  $('#head-connections').hidden = current.category !== 'head';
  detail.innerHTML = `<span class="part-evidence">${escape(current.geometry)}</span>
    <h3>${escape(headline)}</h3>
    <p>${escape(layer?.description || current.detail)}</p>
    <div class="part-budget"><strong>${layer ? 'Included' : usd(current.cents)}</strong>
      <span>${layer ? `Part of ${escape(included.name)} · ${usd(included.cents)}` : current.id === 'HEAD_ASSEMBLY' ? 'Head subset · already in the remaining budget' : `${current.qty} ${current.qty === 1 ? 'unit' : 'units'} · price for the complete quantity`}</span>
      <small>${layer ? 'No additional charge for this internal layer.' : 'Planning allowance in USD · 2× reserve already applied'}</small>
    </div>
    <dl class="part-specs">${(layer ? included.specs : current.specs).map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
    <a class="part-source" href="${escape(included.source)}" target="_blank" rel="noopener noreferrer">${current.geometry.startsWith('Source') ? 'View source CAD ↗' : 'View component / specification ↗'}</a>
    ${layers.length ? `<h4 class="part-layers-title">${layers.length} layers · inspect each separately</h4><button class="part-whole" type="button" data-layer="" aria-pressed="${!selectedLayer}">Show the whole ${current.id === 'HEAD_ASSEMBLY' ? 'head' : 'module'}</button><ol class="part-layers">${layers.map(row => `<li class="part-layer"><button type="button" data-layer="${row.id}" aria-pressed="${selectedLayer === row.id}">${escape(row.title)}</button></li>`).join('')}</ol><p class="part-inside-note">${current.id === 'HEAD_ASSEMBLY' ? 'Proposed internal layout. Shell fit, clearances and final wiring still need validation. Source CAD panels can be inspected separately in the component menu.' : 'Layers illustrate how the module is constructed. PCB traces and small component positions are schematic.'}</p>` : ''}
    ${current.qty > 1 ? '<p class="part-inside-note">The model shows one representative part or set. The price covers the full quantity above.</p>' : ''}`;
  detail.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => inspectLayer(button.dataset.layer || null)));
}
function inspectLayer(id) {
  selectedLayer = id; zoom.value = 100; $('#parts-zoom-value').value = '100%';
  renderModel(); renderDetail();
  if (matchMedia('(max-width: 800px)').matches) $('.parts-stage').scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block:'center'});
}
function filterChoices(preferred) {
  const query = search.value.trim().toLowerCase();
  choices = catalog.filter(item => (category.value === 'all' || category.value === item.category) && `${item.id} ${item.name} ${item.specs.flat().join(' ')}`.toLowerCase().includes(query));
  if (category.value === 'head' && (!query || 'head assembly teardown'.includes(query))) choices.unshift(headItem());
  component.replaceChildren(...choices.map(item => new Option(`${item.id === 'HEAD_ASSEMBLY' ? '' : item.id + ' · '}${item.name}`, item.id)));
  const next = choices.find(item => item.id === preferred) || choices[0];
  component.disabled = !next;
  for (const button of [$('[data-part-prev]'), $('[data-part-next]')]) button.disabled = choices.length < 2;
  if (next) { component.value = next.id; selectPart(next); }
  else {
    ++selectionVersion; current = null; selectedLayer = null; disposeModel(fullModel); fullModel = null; renderModel();
    detail.innerHTML = '<h3>No matching parts</h3><p>Try a part number, component name or another system.</p>';
    $('[data-part-caption]').textContent = 'No matching parts'; $('[data-part-price]').textContent = ''; $('[data-part-id]').textContent = 'CATALOG'; $('[data-part-number]').textContent = '0 MATCHES';
    $('[data-parts-match]').textContent = '0 matching parts'; loading.hidden = true; $('#parts-explode-control').hidden = true; $('#head-connections').hidden = true;
  }
}
function headItem() {
  return {id:'HEAD_ASSEMBLY', name:'Inside the head', category:'head', model:'headAssembly', qty:1,
    cents:catalog.filter(item => item.category === 'head').reduce((sum, item) => sum + item.cents, 0),
    geometry:'Proposed assembly · 12 layers', source:'https://www.waveshare.com/5inch-hdmi-lcd-h.htm',
    specs:[['Screen','5″ TFT LCD · 800 × 480'],['Audio','reSpeaker Lite · 2 MEMS mics'],['Processor','XMOS XU316 · audio'],['Speaker','4 Ω / 5 W'],['Main computer','In the torso'],['Neck','Passive · no actuator']],
    detail:'A proposed layout of the complete head: shell, visor, one LCD display, audio and internal supports. Select a numbered layer to inspect it on its own. Each cost belongs to an existing budget line.'};
}
async function selectPart(item) {
  const version = ++selectionVersion; current = item; selectedLayer = null;
  disposeModel(fullModel); fullModel = null; renderModel();
  zoom.value = 100; $('#parts-zoom-value').value = '100%';
  explode.value = item.model === 'headAssembly' ? 75 : 45; $('#parts-explode-value').value = `${explode.value}%`;
  $('[data-parts-match]').textContent = `${choices.indexOf(item)+1} / ${choices.length} in this view`;
  loading.hidden = false; loading.textContent = item.model === 'shell' ? 'Loading the source CAD mesh…' : 'Loading the detailed model…';
  section.dataset.partsReady = 'loading'; renderDetail();
  try {
    await start();
    const model = item.model === 'shell' ? await loadShell(item) : factory(item);
    if (version !== selectionVersion) { disposeModel(model); return; }
    fullModel = model; rotateView('three'); renderModel(); renderDetail();
    loading.hidden = true; section.dataset.partsReady = 'true'; section.dataset.selectedPart = item.id;
  } catch (error) {
    if (version !== selectionVersion) return;
    loading.textContent = 'The 3D model could not load. Choose another part or reload to retry.';
    section.dataset.partsReady = 'error'; console.error('Parts inspector:', error);
  }
}
category.addEventListener('change', () => filterChoices());
search.addEventListener('input', () => filterChoices(current?.id));
component.addEventListener('change', () => selectPart(choices.find(item => item.id === component.value)));
function step(direction) { const index = choices.findIndex(item => item.id === current?.id); if (choices.length) { const next = choices[(index + direction + choices.length) % choices.length]; component.value = next.id; selectPart(next); } }
$('[data-part-prev]').addEventListener('click', () => step(-1));
$('[data-part-next]').addEventListener('click', () => step(1));
zoom.addEventListener('input', () => { $('#parts-zoom-value').value = `${zoom.value}%`; frameView(); });
explode.addEventListener('input', () => { $('#parts-explode-value').value = `${explode.value}%`; renderModel(); });
section.querySelectorAll('[data-view-angle]').forEach(button => button.addEventListener('click', () => { rotateView(button.dataset.viewAngle); frameView(); }));
function updateRotation() { $('[data-inspector-rotate]').setAttribute('aria-pressed', String(rotating)); $('[data-inspector-rotate]').textContent = rotating ? 'Pause rotation' : 'Rotate'; }
$('[data-inspector-rotate]').addEventListener('click', () => { rotating = !rotating; updateRotation(); });
reduced.addEventListener('change', () => { if (reduced.matches) { rotating = false; updateRotation(); } });

function start() { return initialization ||= initialize().catch(error => { initialization = null; throw error; }); }
async function initialize() {
  const [T, {OrbitControls}, {RoomEnvironment}, models] = await Promise.all([
    import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/environments/RoomEnvironment.js'), import('./parts-detailed-models.js'),
  ]);
  factory = models.buildDetailedModel; loadShell = models.loadShell;
  const canvas = $('.parts-canvas'), renderer = new T.WebGLRenderer({canvas, alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  const scene = new T.Scene(), root = new T.Group(); scene.add(root);
  const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; scene.environmentIntensity = .7; room.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight(0xe5edff,0x414b5c,1.25));
  for (const [color, intensity, position] of [[0xffffff,2.8,[-3,4,5]],[0xb6d4ff,1.5,[4,0,-2]],[0xf7d884,.8,[-3,-1,-3]]]) { const light = new T.DirectionalLight(color,intensity); light.position.set(...position); scene.add(light); }
  const camera = new T.OrthographicCamera(-2,2,2,-2,.01,100);
  const controls = new OrbitControls(camera,canvas); controls.enableDamping = true; controls.dampingFactor = .10;
  controls.enableZoom = false; controls.enablePan = false; controls.autoRotateSpeed = .55;
  const labels = document.createElement('div'); labels.className = 'part-markers'; $('.parts-stage').append(labels);
  let shown = null, markerButtons = [];
  disposeModel = object => {
    if (!object) return;
    const geometries = new Set(), textures = new Set(), materials = new Set();
    object.traverse(node => { if (node.geometry) geometries.add(node.geometry); for (const material of [].concat(node.material || [])) { if (material.map) { textures.add(material.map); materials.add(material); } } });
    geometries.forEach(geometry => geometry.dispose()); textures.forEach(texture => texture.dispose()); materials.forEach(material => material.dispose());
  };
  rotateView = mode => {
    camera.position.set(...(mode === 'front' ? [0,0,8] : mode === 'back' ? [0,0,-8] : [5,2.4,6]));
    controls.target.set(0,0,0); camera.lookAt(controls.target); controls.update();
    section.querySelectorAll('[data-view-angle]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.viewAngle === mode)));
  };
  frameView = () => {
    if (!shown) return;
    root.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const points = [];
    root.traverse(node => {
      if (!node.geometry) return;
      node.geometry.computeBoundingBox(); const bounds = node.geometry.boundingBox;
      for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) points.push(new T.Vector3(x,y,z).applyMatrix4(node.matrixWorld).applyMatrix4(camera.matrixWorldInverse));
    });
    const projected = new T.Box3().setFromPoints(points).getSize(new T.Vector3());
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const halfHeight = Math.max(projected.y / 1.42, projected.x / (aspect * 1.62), .2);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.zoom = Number(zoom.value) / 100; camera.updateProjectionMatrix();
  };
  renderModel = () => {
    root.clear(); shown = null; labels.replaceChildren(); markerButtons = [];
    if (!fullModel) return;
    const source = selectedLayer ? fullModel.children.find(child => child.name === selectedLayer).clone(true) : fullModel;
    if (selectedLayer) { source.position.set(0,0,0); }
    else for (const child of source.children) if (child.userData.base) { child.position.fromArray(child.userData.base).addScaledVector(new T.Vector3(...child.userData.move), Number(explode.value)/100); }
    source.removeFromParent(); source.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(source), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
    const offset = new T.Group(); offset.add(source); offset.position.copy(center).negate();
    shown = new T.Group(); shown.add(offset); shown.scale.setScalar(2.8/Math.max(size.x,size.y,size.z)); root.add(shown);
    if (!selectedLayer) for (const layer of fullModel.userData.layers || []) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = String(layer.index+1).padStart(2,'0'); button.title = layer.title; button.setAttribute('aria-label', `Inspect ${layer.title}`); button.addEventListener('click', () => inspectLayer(layer.id)); labels.append(button);
      markerButtons.push({button, object:fullModel.children.find(child => child.name === layer.id)});
    }
    section.dataset.selectedLayer = selectedLayer || 'all'; frameView();
  };
  function resize() { const w=canvas.clientWidth, h=canvas.clientHeight; if (!w || !h) return; renderer.setSize(w,h,false); frameView(); }
  new ResizeObserver(resize).observe(canvas); rotateView('three'); resize();
  const markerPosition = new T.Vector3(), markerBounds = new T.Box3(), clock = new T.Clock();
  function render() {
    requestAnimationFrame(render); const dt = Math.min(clock.getDelta(), .05);
    if (!visible || document.hidden) return;
    controls.autoRotate = rotating; controls.update(dt); renderer.render(scene,camera);
    const placed = [];
    for (const {button, object} of markerButtons) {
      markerBounds.setFromObject(object); markerBounds.getCenter(markerPosition).project(camera);
      const px = (markerPosition.x*.5+.5)*canvas.clientWidth; let py = (-markerPosition.y*.5+.5)*canvas.clientHeight;
      while (placed.some(([x,y]) => Math.hypot(px-x,py-y) < 34)) py -= 34;
      placed.push([px,py]); button.style.left = `${px}px`; button.style.top = `${py}px`;
      button.hidden = Math.abs(markerPosition.x)>.96 || Math.abs(markerPosition.y)>.82;
    }
  }
  render();
}
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, {rootMargin:'180px'}).observe($('.parts-stage'));
fetch('./description/parts/catalog.json').then(response => { if (!response.ok) throw Error(`Catalog ${response.status}`); return response.json(); }).then(rows => {
  catalog = rows;
  if (catalog.length !== 145 || catalog.reduce((sum,item) => sum+item.cents,0) !== REMAINING_CENTS) throw Error('Catalog budget mismatch');
  filterChoices();
}).catch(error => { loading.textContent = 'The component catalog could not load. Please reload to retry.'; section.dataset.partsReady='error'; console.error(error); });
