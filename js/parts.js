import { OWNED_CENTS, REMAINING_CENTS, usd } from './parts-data.js';

const section = document.querySelector('#parts'), rig = section.querySelector('.parts-cinema');
const stage = section.querySelector('.cinema-stage'), canvas = section.querySelector('#parts-film');
const $ = selector => section.querySelector(selector);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = x => Math.max(0, Math.min(1,x));
const ease = x => { x=clamp(x); return x*x*(3-2*x); };
const beats = [...section.querySelectorAll('.cinema-track > div')];
const navigation = [...section.querySelectorAll('.cinema-bottom nav a')];
$('[data-remaining-total]').textContent = usd(REMAINING_CENTS);
$('[data-build-total]').textContent = usd(OWNED_CENTS+REMAINING_CENTS);
let catalog, visible=false, initialization, active=-1, phase=-1, requested=-1;
let updateScene = () => {}, timeline = [], currentProgress=0;
const cache = new Map();
const chapters = [
  {key:'head', eyebrow:'THE HEAD', title:'A face.<br>A world inside.', description:'The shell opens to reveal the display, audio and the structures behind the face.', label:'Head allowance · 2× reserve included',
    phases:[['One complete head','Proposed internal layout'],['The face opens','Shell, visor and touch glass'],['Light becomes a face','One LCD matrix · 800 × 480'],['Everything behind it','Controller, microphones, speaker and mounts']], duration:4.2},
  {key:'display', eyebrow:'THE DISPLAY', title:'One screen.<br>Four layers.', description:'Two eyes on one matrix. Glass, pixels, backlight and a controller separate in space.',label:'Display module · all four layers included',
    phases:[['A single display module','Waveshare 5″ HDMI LCD (H)'],['The touch surface lifts','Capacitive glass · USB touch'],['Pixels and light','LCD matrix and backlight'],['The control board','HDMI video · USB touch · one module']],duration:3.2},
  {key:'compute',eyebrow:'THE COMPUTE',title:'Under<br>the surface.',description:'The cooling assembly lifts away from the carrier board and its connections.',label:'Jetson developer kit · 2× reserve included',
    phases:[['A computer in the torso','Jetson Orin Nano Super developer kit'],['Cooling separates','Fan above the finned heatsink'],['The carrier is revealed','Compute, ports and board-level components'],['Ready to be integrated','Mounts, data and power have their own budget lines']],duration:3.4},
  {key:'power',eyebrow:'THE POWER',title:'Current.<br>Connection.<br>Control.',description:'Voltage converters, protection and power leads form the next electrical layer.',label:'Additional module power · 2× reserve included',
    phases:[['Power for the next modules','Proposed component arrangement'],['Two voltage branches','48 V input → 5 V and 12 V outputs'],['Protection comes with it','Auxiliary fuses and switches'],['Every branch has a destination','Final routing and protection to validate']],duration:3.2},
  {key:'shell',eyebrow:'THE OUTER SKIN',title:'A body,<br>one panel<br>at a time.',description:'The chest separates into four source CAD panels. Fifty-five panels make up the complete outer shell.',label:'All 55 panels · 4 chest panels shown',
    phases:[['The chest, assembled','Four source CAD panels · arrangement study'],['Front and rear separate','Upper and lower chest shells'],['The inner surfaces emerge','Ribs, openings and mounting features'],['One part of a larger body','55 panels in the complete catalog']],duration:3.4},
  {key:'hands',eyebrow:'THE NEXT CONNECTION',title:'Two hands.<br>The missing<br>connection.',description:'The hands have arrived. Wrist adapters, servo interfaces and wiring are the next step.',label:'Integration for both hands · 2× reserve included',
    phases:[['The interface to the hands','Both hands delivered, awaiting installation'],['The wrist adapters separate','Mechanical connection to the forearms'],['Signal and power follow','Servo bus boards and leads'],['A part becomes an ability','Install → connect → test']],duration:3.2},
];
function priceFor(chapter) {
  const sums = ids => catalog.filter(row=>ids.includes(row.id)).reduce((sum,row)=>sum+row.cents,0);
  return chapter.key==='head' ? catalog.filter(row=>row.category==='head').reduce((s,r)=>s+r.cents,0)
    : chapter.key==='display' ? sums(['FACE']) : chapter.key==='compute' ? sums(['JETSON'])
    : chapter.key==='power' ? sums(['DC5','DC12','AUX_FUSE']) : chapter.key==='shell' ? catalog.filter(row=>row.model==='shell').reduce((s,r)=>s+r.cents,0)
    : catalog.filter(row=>row.category==='hands').reduce((s,r)=>s+r.cents,0);
}
function caption(index,progress) {
  const chapter=chapters[index], nextPhase=Math.min(3,Math.floor(progress*4));
  if (active!==index) {
    active=index;phase=-1;
    $('.cinema-number').textContent=String(index+1).padStart(2,'0');
    $('.cinema-eyebrow').textContent=`${String(index+1).padStart(2,'0')} / 06 · ${chapter.eyebrow}`;
    $('#parts-title').innerHTML=chapter.title;
    $('[data-cinema-description]').textContent=chapter.description;
    $('[data-cinema-price]').textContent=usd(priceFor(chapter));
    $('[data-cinema-allowance]').textContent=chapter.label;
    navigation.forEach((link,i)=>{if(i===index)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
    rig.dataset.chapter=chapter.key;
  }
  if(phase!==nextPhase){phase=nextPhase; $('[data-cinema-phase]').textContent=`0${phase+1} — ${['ASSEMBLED','OPENING','INSIDE','SEPARATED'][phase]}`; $('[data-cinema-focus]').textContent=chapter.phases[phase][0]; $('[data-cinema-note]').textContent=chapter.phases[phase][1];}
}
function measure(){ timeline=beats.map(beat=>({top:beat.offsetTop,height:beat.offsetHeight})); }
measure(); new ResizeObserver(measure).observe(rig);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();},{rootMargin:'500px'}).observe(rig);
// The complete existing inspector stays available without loading a third renderer upfront.
$('#parts-index').addEventListener('toggle',async event=>{if(event.target.open&&!event.target.dataset.initialized){event.target.dataset.initialized='true';try{await import('./parts-index.js')}catch(error){event.target.dataset.initialized='';console.error('Parts index:',error)}}});
async function start(){if(initialization)return initialization;initialization=initialize().catch(error=>{rig.dataset.cinemaReady='error';$('.cinema-loading').textContent='3D could not load. The full parts index is available below.';console.error('Anatomy:',error)});return initialization;}
async function initialize(){
  const [T,{RoomEnvironment},models,rows]=await Promise.all([import('three'),import('three/addons/environments/RoomEnvironment.js'),import('./parts-detailed-models.js'),fetch('./description/parts/catalog.json').then(r=>{if(!r.ok)throw Error('Catalog '+r.status);return r.json()})]);
  catalog=rows;
  if(catalog.reduce((sum,row)=>sum+row.cents,0)!==REMAINING_CENTS)throw Error('Catalog total mismatch');
  const item=id=>catalog.find(row=>row.id===id);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,matchMedia('(max-width:700px)').matches?1.4:1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(), root=new T.Group();scene.add(root);scene.fog=new T.Fog(0x090909,10,22);
  const camera=new T.OrthographicCamera(-3,3,2,-2,.01,40);camera.position.set(6,3,8);camera.lookAt(0,0,0);
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.05);scene.environment=environment.texture;scene.environmentIntensity=.36;room.dispose();pmrem.dispose();
  const key=new T.DirectionalLight(0xffffff,3.7);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:18});key.shadow.bias=-.0003;key.shadow.normalBias=.008;scene.add(key);
  const rim=new T.DirectionalLight(0xffffff,3.1);rim.position.set(3,2,-4);scene.add(rim);
  const fill=new T.DirectionalLight(0xffffff,.65);fill.position.set(2,0,5);scene.add(fill);scene.add(new T.HemisphereLight(0xaaaaaa,0x070707,.5));
  const floor=new T.Group();scene.add(floor);
  const plane=new T.Mesh(new T.PlaneGeometry(35,35),new T.ShadowMaterial({opacity:.28,color:0x000000}));plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;floor.add(plane);

  // A subtle shaft of neutral light, with soft edges rather than a visible cone.
  const beamMaterial=new T.ShaderMaterial({vertexShader:'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){float a=pow(abs(dot(normalize(vN),normalize(vV))),2.)*smoothstep(0.,.22,vUv.y)*(1.-smoothstep(.72,1.,vUv.y));gl_FragColor=vec4(vec3(1.),a*.023);}',transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending});
  const beam=new T.Mesh(new T.CylinderGeometry(.07,3,10,48,1,true),beamMaterial);beam.position.set(0,2,-3);beam.rotation.z=-.32;scene.add(beam);
  const dustPositions=new Float32Array(180*3);for(let i=0;i<180;i++){dustPositions[i*3]=Math.sin(i*18.83)*5;dustPositions[i*3+1]=(i%31)/31*6-2;dustPositions[i*3+2]=Math.cos(i*12.91)*4-2;}
  const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(dustPositions,3));const dust=new T.Points(dustGeometry,new T.PointsMaterial({color:0xcccccc,size:.009,transparent:true,opacity:.28,depthWrite:false}));scene.add(dust);
  const materialCache=new Map();
  function monochrome(object){object.traverse(node=>{if(!node.material)return;node.castShadow=true;node.receiveShadow=true;const convert=source=>{if(!materialCache.has(source)){const material=source.clone();if(material.color){const hsl={};material.color.getHSL(hsl);material.color.setHSL(0,0,hsl.l);}if(material.emissive){const hsl={};material.emissive.getHSL(hsl);material.emissive.setHSL(0,0,hsl.l);}materialCache.set(source,material);}return materialCache.get(source)};node.material=Array.isArray(node.material)?node.material.map(convert):convert(node.material);});}
  function centered(object,size){object.updateMatrixWorld(true);const box=new T.Box3().setFromObject(object),center=box.getCenter(new T.Vector3()),dimensions=box.getSize(new T.Vector3());object.position.sub(center);const wrapper=new T.Group();wrapper.add(object);wrapper.scale.setScalar(size/Math.max(dimensions.x,dimensions.y,dimensions.z));return wrapper;}
  function bundle(entries){const group=new T.Group();for(const [object,size,base,move,rotation]of entries){const wrapper=centered(object,size);wrapper.position.set(...base);if(rotation)wrapper.rotation.set(...rotation);wrapper.userData.base=base;wrapper.userData.move=move;group.add(wrapper);}return group;}
  async function build(index){
    let object;const key=chapters[index].key;
    if(key==='head'){object=models.buildDetailedModel({model:'headAssembly'});const rear=object.children.find(part=>part.name==='rear');rear.children[1].scale.z=3.1;rear.children[1].position.z+=30;}
    else if(key==='display')object=models.buildDetailedModel(item('FACE'));
    else if(key==='compute')object=models.buildDetailedModel(item('JETSON'));
    else if(key==='power')object=bundle([
      [models.buildDetailedModel(item('DC5')),95,[-51,0,0],[-72,24,35]],
      [models.buildDetailedModel(item('DC12')),95,[51,0,0],[72,24,-22]],
      [models.buildDetailedModel(item('AUX_FUSE')),43,[0,-46,12],[0,-65,28]],
    ]);
    else if(key==='shell'){
      const shellRows=['SH04','SH05','SH06','SH07'];const shells=await Promise.all(shellRows.map(id=>models.loadShell(item(id))));
      object=bundle(shells.map((shell,i)=>[shell, i<2?170:135,[0,i<2?60:-66,i%2?-36:36],[i%2?90:-90,i<2?44:-44,i%2?-80:80],[0,i%2?Math.PI:0,0]]));
    } else object=bundle([
      [models.buildDetailedModel(item('HAND_MOUNT')),74,[-43,0,0],[-64,22,12]],
      [models.buildDetailedModel(item('HAND_MOUNT')),74,[43,0,0],[64,22,-12]],
      [models.buildDetailedModel(item('HAND_BUS')),43,[-38,-28,-12],[-38,-64,32]],
      [models.buildDetailedModel(item('HAND_BUS')),43,[38,-28,-12],[38,-64,-32]],
      [models.buildDetailedModel(item('HAND_WIRES')),86,[0,-65,12],[0,-60,38]],
    ]);
    monochrome(object);
    const pieces=object.children.map((part,i)=>{
      const base=new T.Vector3(...(part.userData.base||part.position.toArray()));
      const move=new T.Vector3(...(part.userData.move||[0,0,0]));
      part.position.copy(base);object.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(part);
      return {part,base,move,bounds,delay:key==='head'?Math.min(i*.034,.24):i*.055};
    });
    const bounds=new T.Box3();for(const piece of pieces)bounds.union(piece.bounds.clone().translate(piece.move));
    const scale=3.8/Math.max(...bounds.getSize(new T.Vector3()).toArray());
    const pivot=new T.Group();pivot.add(object);pivot.scale.setScalar(scale);
    return{object,pivot,pieces,scale};
  }
  function load(index){if(!cache.has(index))cache.set(index,build(index));return cache.get(index);}
  let model=null, modelIndex=-1, token=0;
  async function choose(index){if(index===requested)return;requested=index;const version=++token;$('.cinema-loading').hidden=false;
    try {const result=await load(index);if(version!==token)return;root.clear();model=result;modelIndex=index;root.add(model.pivot);if(!reduced.matches)canvas.animate([{opacity:0},{opacity:1}],{duration:420,easing:'ease-out'});$('.cinema-loading').hidden=true;rig.dataset.cinemaReady='true';if(index+1<chapters.length)load(index+1).catch(()=>{});}catch(error){if(version!==token)return;$('.cinema-loading').textContent='This model could not load. Its components are available in the index below.';console.error('Anatomy chapter:',error);}
  }
  const box=new T.Box3(),partBox=new T.Box3(),center=new T.Vector3(),size=new T.Vector3(),projected=new T.Box3(),point=new T.Vector3();
  updateScene=(index,progress,dt)=>{
    choose(index);if(!model||modelIndex!==index)return;
    const q=reduced.matches ? (progress>.45?1:0) : ease((progress-.13)/.70);
    box.makeEmpty();
    for(const piece of model.pieces){const separation=ease((q-piece.delay)/(1-piece.delay));piece.part.position.copy(piece.base).addScaledVector(piece.move,separation);partBox.copy(piece.bounds).translate(piece.move.clone().multiplyScalar(separation));box.union(partBox);}
    box.getCenter(center);model.object.position.copy(center).negate();model.pivot.rotation.y=reduced.matches?0:(-.13+q*.23);
    model.pivot.updateMatrixWorld(true);
    const turn=reduced.matches?0:Math.sin(progress*Math.PI)*.16;
    camera.position.set(6+turn,2.5+turn,8);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
    projected.makeEmpty();box.getSize(size);const sx=size.x*model.scale/2,sy=size.y*model.scale/2,sz=size.z*model.scale/2;
    for(const x of [-sx,sx])for(const y of [-sy,sy])for(const z of [-sz,sz]){point.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);projected.expandByPoint(point);}
    projected.getSize(size);const mobile=canvas.clientWidth<=700,aspect=canvas.clientWidth/canvas.clientHeight;
    const half=Math.max(size.y/(mobile?1.08:1.45),size.x/(aspect*(mobile?1.74:1.29)),.45),horizontal=half*aspect,offset=mobile?0:horizontal*.35;
    camera.left=-horizontal-offset;camera.right=horizontal-offset;camera.top=half+(mobile?half*.12:0);camera.bottom=-half+(mobile?half*.12:0);camera.updateProjectionMatrix();
    floor.position.y=-sy-.16;
    canvas.style.opacity='1';
    if(!reduced.matches)dust.rotation.y+=dt*.008;
    rig.dataset.explode=q.toFixed(3);rig.dataset.model=chapters[index].key;
    renderer.render(scene,camera);
  };
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h)renderer.setSize(w,h,false);measure();}
  new ResizeObserver(resize).observe(stage);resize();
  const clock=new T.Clock();let lastIndex=-1;
  function render(){requestAnimationFrame(render);const dt=Math.min(clock.getDelta(),.05);if(!visible||document.hidden)return;
    const distance=Math.max(0,-rig.getBoundingClientRect().top);let index=0;for(let i=0;i<timeline.length;i++)if(distance>=timeline[i].top)index=i;
    const raw=clamp((distance-timeline[index].top)/timeline[index].height);
    if(lastIndex!==index){currentProgress=raw;lastIndex=index;}else currentProgress+= (raw-currentProgress)*(reduced.matches?1:1-Math.exp(-dt*14));
    const progress=clamp(currentProgress);caption(index,progress);updateScene(index,progress,dt);
    $('[data-cinema-progress]').textContent=`${String(Math.round(progress*100)).padStart(2,'0')}%`;$('.cinema-progress i').style.transform=`scaleX(${progress})`;
  }
  render();
}
