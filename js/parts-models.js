import * as T from 'three';
function bounds(object){object.updateMatrixWorld(true);return new T.Box3().setFromObject(object)}
export function createPartsModels(nv){
const M={metal:new T.MeshStandardMaterial({color:0xa7b4a3,roughness:.45,metalness:.58}),dark:new T.MeshStandardMaterial({color:0x253226,roughness:.53,metalness:.12}),pcb:new T.MeshStandardMaterial({color:0x235b3d,roughness:.62}),white:new T.MeshStandardMaterial({color:0xeff2e8,roughness:.48}),red:new T.MeshStandardMaterial({color:0xa84837,roughness:.65}),glass:new T.MeshStandardMaterial({color:0x0b1712,roughness:.22,metalness:.25})};
function group(){return new T.Group()}
function box(g,w,h,d,mat,p){const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;g.add(o);return o}
function cylinder(g,r,h,mat,p){const o=new T.Mesh(new T.CylinderGeometry(r,r,h,32),mat);o.position.set(...p);o.castShadow=true;g.add(o);return o}
function sphere(g,r,mat,p){const o=new T.Mesh(new T.SphereGeometry(r,24,16),mat);o.position.set(...p);o.castShadow=true;g.add(o);return o}
function part(key){const o=nv.partByKey[key].clone(true);o.position.set(0,0,0);o.quaternion.identity();o.visible=true;const c=bounds(o).getCenter(new T.Vector3());o.position.sub(c);const g=group();g.add(o);return g}
const vision=group();
const jet=group();vision.add(jet);jet.position.set(-.065,.005,0);box(jet,.10,.014,.085,M.pcb,[0,0,0]);box(jet,.075,.025,.060,M.metal,[-.005,.019,0]);for(let i=0;i<9;i++)box(jet,.003,.022,.056,M.dark,[-.033+i*.008,.04,0]);for(const xx of [-.032,0,.032])box(jet,.021,.014,.014,M.metal,[xx,0,.048]);
const cam=group();cam.position.set(.085,.015,-.02);vision.add(cam);box(cam,.10,.028,.022,M.dark,[0,0,0]);for(const x of [-.034,0,.034]){const c=cylinder(cam,.010,.004,M.metal,[x,0,.014]);c.rotation.x=Math.PI/2;const d=cylinder(cam,.007,.006,M.glass,[x,0,.017]);d.rotation.x=Math.PI/2}
box(vision,.035,.005,.083,M.pcb,[.085,-.016,.068]);box(vision,.022,.006,.045,M.dark,[.085,-.011,.075]);
const baseBoards=group();const rbe=part('rbe');rbe.rotation.x=-Math.PI/2;rbe.position.set(-.064,0,0);baseBoards.add(rbe);const compute=part('compute');compute.position.set(.07,0,.006);baseBoards.add(compute);const imu=part('imu');imu.position.set(.052,0,.094);baseBoards.add(imu);
const mounts=group();for(const[i,x]of [-.065,.065].entries()){box(mounts,.09,.005,.09,M.metal,[x,.0,0]);box(mounts,.09,.033,.005,M.metal,[x,.014,-.042]);for(const xx of [-.032,.032])for(const zz of [-.032,.032])cylinder(mounts,.005,.02,M.dark,[x+xx,.012,zz]);}
const dc=group();for(const x of [-.063,.063]){box(dc,.09,.028,.065,M.metal,[x,0,0]);box(dc,.088,.009,.067,M.dark,[x,-.013,0]);for(let i=0;i<7;i++)box(dc,.007,.004,.058,M.dark,[x-.032+i*.010,.016,0]);box(dc,.060,.014,.020,M.pcb,[x,-.001,.043])}
const supply=group();box(supply,.125,.040,.070,M.dark,[-.04,0,0]);box(supply,.076,.002,.029,M.white,[-.04,.021,0]);cylinder(supply,.018,.010,M.red,[.065,.015,0]);cylinder(supply,.011,.034,M.dark,[.065,-.004,0]);box(supply,.016,.016,.026,M.pcb,[.105,-.003,.030]);
const mechanics=group();for(const[i,x]of [-.045,.045].entries()){const r=new T.Mesh(new T.TorusGeometry(.024,.008,12,40),M.metal);r.rotation.x=Math.PI/2;r.position.set(x,.002,-.025);r.castShadow=true;mechanics.add(r)}for(const x of [-.040,.040])box(mechanics,.058,.008,.07,M.dark,[x,-.014,.065]);const carrier=part('handle');carrier.position.set(0,.035,-.08);carrier.scale.setScalar(.55);mechanics.add(carrier);
const harness=group();for(let i=0;i<4;i++){const curve=new T.CatmullRomCurve3([[0,0,0],[.050,.003,-.07],[.125,.005,-.06],[.155,.005,0],[.12,0,.07],[.04,0,.08],[0,0,0]].map(p=>new T.Vector3(p[0]+i*.007,p[1]+i*.004,p[2])));const mesh=new T.Mesh(new T.TubeGeometry(curve,60,.003,8,false),i%2?M.dark:M.red);mesh.castShadow=true;harness.add(mesh)}box(harness,.020,.014,.025,M.white,[.008,.02,.0]);box(harness,.021,.018,.025,M.dark,[.025,.027,.03]);
const bolts=group();for(let i=0;i<8;i++){const x=(i%4)*.034,z=Math.floor(i/4)*.060;cylinder(bolts,.0045,.035,M.metal,[x,0,z]);cylinder(bolts,.009,.008,M.dark,[x,.021,z])}
const wrists=group();for(const x of [-.055,.055]){const ring=new T.Mesh(new T.TorusGeometry(.028,.007,12,32),M.metal);ring.rotation.x=Math.PI/2;ring.position.set(x,.010,0);wrists.add(ring);box(wrists,.07,.007,.060,M.metal,[x,-.006,0]);box(wrists,.03,.004,.04,M.pcb,[x,.009,.060])}
const commissioning=group();box(commissioning,.14,.025,.06,M.dark,[-.03,.008,0]);for(const x of [-.10,.04])sphere(commissioning,.033,M.dark,[x,0,.02]);for(const x of [-.06,0])cylinder(commissioning,.010,.012,M.metal,[x,.026,.003]);box(commissioning,.030,.014,.070,M.metal,[.10,0,0]);box(commissioning,.030,.004,.025,M.pcb,[.10,.008,.0]);

 function opaque(source){
  const originals=[];source.traverse(o=>{if(o.isMesh)originals.push(o.userData.sourceMaterial||o.material)});
  const g=source.clone(true);g.position.set(0,0,0);g.quaternion.identity();g.visible=true;let index=0;
  g.traverse(o=>{if(!o.isMesh)return;const original=originals[index++];
   o.material=original.clone();o.material.opacity=original.map?original.opacity:1;o.material.transparent=!!original.map;o.material.depthWrite=!original.map;o.castShadow=true;});
  const c=bounds(g).getCenter(new T.Vector3());g.position.sub(c);const wrap=group();wrap.add(g);return wrap;
 }
 function normalized(source,size=1){const object=source.clone(true);const b=bounds(object),c=b.getCenter(new T.Vector3()),d=b.getSize(new T.Vector3());object.position.sub(c);const g=group();g.add(object);g.scale.setScalar(size/Math.max(d.x,d.y,d.z));return g}
 const shell=group();
 const arrangement=[[4,0,.12,.08,.65],[6,0,-.32,.11,.50],[8,-.55,.28,0,.30],[11,.55,.28,0,.30],[40,-.5,-.28,0,.42],[44,.5,-.28,0,.42]];
 for(const [id,x,y,z,size] of arrangement){const p=normalized(opaque(nv.shells.find(o=>o.userData.stl===id)),size);p.position.set(x,y,z);shell.add(p)}
 const head=opaque(nv.joints.head);
 return {shell,head,finish:bolts,vision,base:baseBoards,mounts,power:dc,supply,mechanics,wiring:harness,fasteners:bolts,wrists,tools:commissioning};
}
