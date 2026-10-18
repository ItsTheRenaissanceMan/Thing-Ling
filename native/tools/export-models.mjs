import fs from 'node:fs';
import * as THREE from 'three';
import {createPropFactory,PROP_SIZES} from '../../src/props.js';
import {WORDS} from '../../src/data.js';
// Preserve the handcrafted mesh library as native GPU data. Colors are authored
// vertex colors, and repeated props become MultiMesh instances in Godot.
const handcrafted=new Set(['cashRegister','phone','pasta','chocolate','yogurt','cream','cinnamon','mint','vanilla','stamp','trafficLight','trashCan','microphone','racket','medicine','bandage','thermometer','fabric','thread','needle','button','money','coin','popcorn','headphones','sausage','oil','vinegar','pepperMill','apron','menu','receipt','calendar','plant','helmet','skateboard']);
function custom(id){
 const g=new THREE.Group(), C={cream:'#f1e4c7',wood:'#a78661',dark:'#52625f',blue:'#82aeb6',coral:'#d18a77',green:'#87aa7b',gold:'#dab96f',white:'#fff2dd'};
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.92});
 function shape(type,c,x,y,z,w,h,d=w){let geo=type==='box'?new THREE.BoxGeometry(w,h,d):type==='ball'?new THREE.SphereGeometry(.5,8,5):type==='cyl'?new THREE.CylinderGeometry(.5,.5,1,12):new THREE.TorusGeometry(.5,.06,5,20);let m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);if(type!=='box')m.scale.set(w,h,d);g.add(m);return m}
 const b=(c,x,y,z,w,h,d)=>shape('box',c,x,y,z,w,h,d),s=(c,x,y,z,w,h=w,d=w)=>shape('ball',c,x,y,z,w,h,d),c=(co,x,y,z,w,h,d=w)=>shape('cyl',co,x,y,z,w,h,d),t=(co,x,y,z,w,h=w,d=w)=>shape('torus',co,x,y,z,w,h,d);
 if(id==='cashRegister'){b(C.cream,0,.12,0,1,.24,.8);b(C.dark,0,.25,.43,.88,.05,.035);b(C.blue,.16,.38,0,.55,.28,.55);for(let x=0;x<4;x++)for(let z=0;z<3;z++)b(C.cream,-.28+x*.14,.54,.0+z*.13,.10,.04,.08);b(C.dark,-.22,.61,-.22,.09,.65,.08);b(C.dark,-.22,.93,-.2,.66,.35,.12);b('#a4cfb0',-.22,.93,-.13,.54,.23,.02);}
 else if(id==='phone'){b(C.dark,0,.06,0,.44,.12,.85);b(C.blue,0,.13,-.02,.37,.02,.65);s(C.cream,0,.15,.34,.055,.01,.055);for(let i=0;i<4;i++)b(C.white,-.1+(i%2)*.2,.15,-.22+Math.floor(i/2)*.2,.1,.015,.12);}
 else if(id==='trafficLight'){c(C.dark,0,1,0,.1,2);b(C.dark,0,2.1,0,.48,1.2,.25);for(let i=0;i<3;i++)c(['#cf6c5f','#e4bf6f','#87ba86'][i],0,2.47-i*.36,.16,.26,.08).rotation.x=Math.PI/2;}
 else if(id==='trashCan'){c(C.dark,0,.48,0,.65,.96);for(let i=0;i<10;i++){let a=i*Math.PI/5;b(C.blue,Math.cos(a)*.32,.48,Math.sin(a)*.32,.04,.85,.04)}c(C.cream,0,.99,0,.75,.10);t(C.dark,0,1.1,0,.25,.15,.25).rotation.x=Math.PI/2;}
 else if(id==='microphone'){c(C.dark,0,.04,0,.52,.08);c(C.dark,0,.75,0,.05,1.5);let mic=s(C.dark,0,1.56,0,.25,.42,.25);mic.rotation.z=.5;for(let y=0;y<4;y++)t(C.blue,0,1.46+y*.06,0,.24,.24,.24).rotation.x=Math.PI/2;}
 else if(id==='racket'){t(C.wood,0,.8,0,.7,.9,.7);for(let i=-2;i<=2;i++){b(C.cream,i*.10,.8,0,.012,.7,.015);b(C.cream,0,.8+i*.12,0,.52,.012,.015)}b(C.dark,0,.2,0,.09,.6,.08);}
 else if(id==='headphones'){t(C.dark,0,.65,0,1,1,1);for(let side of[-1,1]){b(C.dark,side*.43,.3,0,.2,.4,.3);b(C.coral,side*.43,.3,.17,.16,.32,.05)}}
 else if(id==='helmet'){s(C.blue,0,.32,0,.7,.55,.65);b(C.dark,0,.13,.2,.5,.15,.35);for(let x of[-.15,0,.15])b(C.cream,x,.59,0,.05,.02,.28);}
 else if(id==='skateboard'){s(C.coral,0,.20,0,.48,.12,1.25);for(let z of[-.38,.38])for(let x of[-.24,.24])c(C.dark,x,.1,z,.16,.10).rotation.z=Math.PI/2;b(C.gold,0,.27,0,.1,.01,.75);}
 else if(id==='medicine'||id==='yogurt'||id==='cream'||id==='oil'||id==='vinegar'){let co=id==='medicine'?C.cream:id==='yogurt'?C.blue:id==='cream'?C.cream:id==='oil'?'#c1b06e':'#996b55';c(co,0,.3,0,.42,.6);c(C.dark,0,.68,0,.25,.16);b(C.white,0,.32,.218,.3,.25,.02);if(id==='medicine'){b(C.coral,0,.32,.235,.18,.05,.02);b(C.coral,0,.32,.235,.05,.18,.02)}else b(C.green,0,.32,.235,.17,.12,.02);}
 else if(id==='bandage'){c(C.cream,0,.15,0,.6,.30);c(C.wood,0,.31,0,.2,.01);b(C.white,.35,.03,0,.5,.05,.4);b(C.coral,.45,.06,0,.05,.01,.2);b(C.coral,.45,.06,0,.2,.01,.05);}
 else if(id==='thermometer'){b(C.white,0,.45,0,.16,.9,.08);s(C.coral,0,.08,.055,.14);b(C.coral,0,.33,.055,.025,.5,.02);for(let i=0;i<6;i++)b(C.dark,.04,.2+i*.10,.055,.045,.01,.01);}
 else if(id==='thread'){c(C.wood,0,.05,0,.5,.1);c(C.coral,0,.3,0,.35,.5);c(C.wood,0,.58,0,.5,.08);for(let i=0;i<8;i++)t('#b9736c',0,.1+i*.06,0,.35,.35,.35).rotation.x=Math.PI/2;}
 else if(id==='needle'){c(C.blue,0,.4,0,.025,.8);t(C.dark,0,.84,0,.07,.14,.07);}
 else if(id==='button'||id==='coin'){c(id==='button'?C.coral:C.gold,0,.04,0,.45,.08);if(id==='button')for(let x of[-.065,.065])for(let z of[-.065,.065])c(C.dark,x,.085,z,.04,.01);else t(C.wood,0,.087,0,.34,.34,.34).rotation.x=Math.PI/2;}
 else if(id==='money'||id==='receipt'||id==='stamp'||id==='calendar'||id==='menu'){b(C.cream,0,.02,0,.6,.04,.85);if(id==='money'){b(C.green,0,.05,0,.55,.01,.78);s(C.cream,0,.06,0,.25,.01,.4)}else if(id==='stamp'){b(C.coral,0,.05,0,.5,.01,.75);s(C.gold,0,.06,0,.3,.01,.4)}else{for(let i=0;i<7;i++)b(C.dark,0,.05,-.30+i*.1,.40,.01,.02);if(id==='calendar')for(let i=0;i<6;i++)b(C.coral,-.22+i*.09,.06,-.4,.03,.04,.06);if(id==='menu'){b(C.coral,0,.06,-.23,.35,.02,.1);b(C.green,0,.06,.1,.27,.02,.15)}}}
 else if(id==='fabric'){for(let i=0;i<3;i++)b([C.coral,C.blue,C.gold][i],(i-1)*.07,.06+i*.12,0,.8,.11,.62);for(let i=0;i<6;i++)b(C.cream,-.3+i*.12,.42,0,.025,.01,.6);}
 else if(id==='apron'){b(C.coral,0,.5,0,.6,.65,.08);b(C.coral,0,.92,0,.35,.4,.08);t(C.cream,0,1.15,0,.25,.32,.25);b(C.cream,0,.5,.05,.32,.22,.04);for(let side of[-1,1])b(C.cream,side*.4,.68,0,.3,.035,.03);}
 else if(id==='popcorn'){c(C.coral,0,.3,0,.5,.6);for(let i=0;i<7;i++){let a=i*(Math.PI*2)/7;b(C.cream,Math.cos(a)*.25,.3,Math.sin(a)*.25,.04,.58,.04)}for(let i=0;i<14;i++)s(C.cream,Math.sin(i*2.4)*.20,.62+Math.sin(i)*.08,Math.cos(i*2.4)*.2,.15);}
 else if(id==='pepperMill'){c(C.wood,0,.25,0,.3,.5);s(C.wood,0,.62,0,.42,.35,.42);c(C.dark,0,.83,0,.12,.06);}
 else if(id==='chocolate'){b('#795849',0,.07,0,.6,.14,.45);for(let x=0;x<3;x++)for(let z=0;z<2;z++)b('#96715c',-.19+x*.19,.15,-.1+z*.2,.17,.05,.17);b(C.cream,-.2,.18,0,.2,.02,.47);}
 else if(id==='pasta'){c(C.cream,0,.12,0,.7,.24);for(let i=0;i<12;i++){let noodle=t(C.gold,(i%3-1)*.13,.25+Math.floor(i/3)*.025,Math.sin(i)*.13,.25,.25,.25);noodle.rotation.x=Math.PI/2;}s(C.coral,0,.3,0,.2,.08,.2);}
 else if(id==='cinnamon'||id==='sausage'){for(let i=0;i<(id==='cinnamon'?3:1);i++){let stick=c(id==='cinnamon'?'#a77a53':'#c37a69',(i-1)*.12,.13,0,.16,.65);stick.rotation.x=Math.PI/2;}}
 else if(id==='mint'||id==='plant'||id==='vanilla'){if(id==='plant'){c(C.coral,0,.16,0,.4,.32);c(C.wood,0,.33,0,.35,.02)}c(C.green,0,.6,0,.035,.7);for(let i=0;i<7;i++){let a=i*2.4;let leaf=s(C.green,Math.cos(a)*.14,.4+i*.07,Math.sin(a)*.14,.3,.05,.17);leaf.rotation.z=Math.cos(a)*.4}if(id==='vanilla')for(let i=0;i<5;i++)s(C.cream,Math.cos(i*(Math.PI*2)/5)*.13,1.0,Math.sin(i*(Math.PI*2)/5)*.13,.2,.07,.2);}
 g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(g),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());const content=new THREE.Group();while(g.children.length)content.add(g.children[0]);content.position.set(-center.x,-bounds.min.y,-center.z);g.add(content);g.scale.set(1/(size.x||1),1/(size.y||1),1/(size.z||1));return g;
}

const factory=createPropFactory(), floats=[], models={};
function glasshouse(){
 const g=new THREE.Group();function box(c,x,y,z,w,h,d,word='wall'){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.85}));m.position.set(x,y,z);m.userData.wordId=word;g.add(m);return m}
 box('#d9cba9',0,.10,0,4.1,.20,3.3);
 for(let side of[-1,1]){
   box('#a9d0cb',side*1.86,1.25,0,.10,2.10,2.9,'window');
   for(let z of[-1.45,-.72,0,.72,1.45])box('#e8ead6',side*1.91,1.25,z,.10,2.15,.07);
   for(let y of[.25,1.15,2.30])box('#e8ead6',side*1.92,y,0,.10,.08,3.0);
   box('#a9d0cb',side*1.20,1.25,1.46,1.1,2.10,.10,'window');
   for(let x of[.65,1.25,1.82])box('#e8ead6',side*x,1.25,1.53,.06,2.10,.06);
 }
 box('#9fc4bc',0,1.25,-1.46,3.7,2.1,.10,'window');
 for(let x of[-1.8,-1.2,-.6,0,.6,1.2,1.8])box('#e8ead6',x,1.25,-1.52,.06,2.1,.06);
 box('#7e9b89',0,1.17,1.52,1.1,2.0,.12,'door');box('#bad5ce',0,1.5,1.60,.84,1.15,.03,'door');
 let angle=Math.atan2(1.05,2.1),length=Math.hypot(2.1,1.05);
 for(let side of[-1,1]){
   let panel=box('#b2d5cf',side*1.05,2.80,0,length,.06,3.4,'roof');panel.rotation.z=-side*angle;
   for(let z of[-1.65,-1.1,-.55,0,.55,1.1,1.65]){let frame=box('#e7e6d3',side*1.05,2.84,z,length,.07,.055,'roof');frame.rotation.z=-side*angle;}
   for(let row=0;row<4;row++){let u=row/3;box('#e7e6d3',side*2.1*(1-u),2.3+u*1.05,0,.07,.07,3.4,'roof')}
 }
 return g;
}
function venueHouse(variant){
 if(['garden','conservatory'].includes(variant))return glasshouse();
 const palettes={school:['#e4cfa6','#627f94'],clinic:['#e9e4cf','#83a89a'],library:['#dcb897','#977666'],museum:['#ddd4b7','#83968f'],nightlife:['#a391b1','#62566d'],cinema:['#bf9388','#6e647b'],music:['#d6b78f','#a37464'],sports:['#d8c8a4','#739e9c'],courtyard:['#e8d9b9','#ad795c'],supermarket:['#e6dfbc','#7e9e79'],restaurant:['#dcaf94','#ac6b56'],post:['#e3c7a3','#7d9ba4'],tea:['#d4c9a4','#829480'],bakery:['#e6c68e','#ba7b59'],bank:['#cdd5c1','#879a9c'],orchard:['#dac7a0','#aa8a5d'],sanctuary:['#d4ccae','#83a491'],workshop:['#c9ae8f','#83766a'],hotel:['#e4d0ac','#6f907d'],tailor:['#d5b6b0','#ac7f87'],cottage:['#e4d6b7','#9d765b'],cove:['#c2d6ce','#5a8992'],exchange:['#d6c4aa','#898c9b'],station:['#d8cbb0','#7c9191']};
 const roof=palettes[variant]?.[1];
 const g=factory.create('house',{variant:['cafe','tea','bakery','restaurant','supermarket','nightlife'].includes(variant)?'cafe':variant==='cove'?'blue':undefined,instanceId:'model'});
 g.traverse(m=>{if(!m.isMesh)return;m.material=m.material.clone();const word=m.userData.wordId;const hex=m.material.color.getHexString();if(word==='wall'&&['f3e6ca','d58b73'].includes(hex)&&palettes[variant])m.material.color.set(palettes[variant][0]);if(word==='roof'&&roof){let color=new THREE.Color(roof);if(hex==='d58b73')color.offsetHSL(0,0,.08);m.material.color.copy(color)}if(word==='window'&&variant==='nightlife'&&hex==='547e87')m.material.color.set('#d0b17f');});
 return g;
}
function openShelf(){
 const g=new THREE.Group();function box(c,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.9}));m.position.set(x,y,z);g.add(m)}
 for(const x of[-.475,.475])box('#927453',x,.5,0,.05,1,1);
 box('#bb9d75',0,.5,-.475,.9,1,.05);
 for(const top of[.1263,.414,.702,1])box('#c4a67d',0,top-.022,0,1,.044,1);
 for(const top of[.1263,.414,.702])box('#f0deba',0,top-.022,.49,.90,.055,.025);
 return g;
}
function stoneBridge(){
 const g=new THREE.Group();function box(c,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:c,roughness:.9}));m.position.set(x,y,z);g.add(m)}
 box('#b5b9a4',0,.012,0,1,.024,1);
 for(const x of[-.46,.46]){for(let z=-.45;z<=.46;z+=.15){box('#a8b1a0',x,.43,z,.08,.86,.08);box('#d1cfb8',x,.91,z,.12,.10,.12)}box('#c3c7b0',x,.73,0,.07,.10,1)}
 return g;
}

const extraPath=new URL('../data/extra_vocabulary.json',import.meta.url);const extra=fs.existsSync(extraPath)?JSON.parse(fs.readFileSync(extraPath,'utf8')):[];
const townPath=new URL('../data/town.json',import.meta.url);const town=fs.existsSync(townPath)?JSON.parse(fs.readFileSync(townPath,'utf8')):{maps:[]};
const houseVariants=new Set(['','cafe','blue','boathouse',...town.maps.flatMap(m=>m.objects.filter(o=>o.wordId==='house').map(o=>o.variant||''))]);
for(const id of new Set([...WORDS.map(w=>w.id),...(extra.words||extra).map(w=>w.id),'car','bus','waterfall','river'])){
  for(const variant of id==='house'?[...houseVariants]:id==='shelf'||id==='cabinet'?['','open']:id==='bridge'?['','original-stone-bridge']:['']){
    const unit=(id==='shelf'||id==='cabinet')&&variant==='open'||id==='bridge'&&variant==='original-stone-bridge';
    const root=unit?(id==='bridge'?stoneBridge():openShelf()):id==='house'&&variant?venueHouse(variant):handcrafted.has(id)?custom(id):factory.create(id,{variant,instanceId:'model'});root.updateMatrixWorld(true);
    // Native placement dimensions are exact, including decorative frames.
    const expected=unit||handcrafted.has(id)?[1,1,1]:[PROP_SIZES[id]?.width||.7,PROP_SIZES[id]?.height||.7,PROP_SIZES[id]?.depth||.7];
    const bounds=new THREE.Box3().setFromObject(root),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    if(extent.x>expected[0]+.0001||extent.y>expected[1]+.0001||extent.z>expected[2]+.0001){root.scale.multiply(new THREE.Vector3(expected[0]/extent.x,expected[1]/extent.y,expected[2]/extent.z));root.updateMatrixWorld(true);}
    const offset=floats.length, semantics=[];
    root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry;
      const pos=geo.getAttribute('position'),normal=geo.getAttribute('normal');
      const color=new THREE.Color('#'+mesh.material.color.getHexString());
      const hex=mesh.material.color.getHexString();const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);
      const vertex=new THREE.Vector3(),n=new THREE.Vector3(),normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      for(let t=0;t<pos.count;t+=3)for(const i of [t,t+2,t+1]){
        vertex.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);
        n.fromBufferAttribute(normal,i).applyNormalMatrix(normalMatrix);
        floats.push(vertex.x,vertex.y,vertex.z,n.x,n.y,n.z,...rgb,1);
      }
      const box=new THREE.Box3().setFromObject(mesh),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
      const wordId=mesh.userData.wordId||id;
      if(wordId!==id)semantics.push({wordId,center:center.toArray(),size:size.toArray()});
    });
    const merged=new Map();for(const s of semantics){const b=new THREE.Box3(new THREE.Vector3(...s.center).addScaledVector(new THREE.Vector3(...s.size),-.5),new THREE.Vector3(...s.center).addScaledVector(new THREE.Vector3(...s.size),.5));if(merged.has(s.wordId))merged.get(s.wordId).union(b);else merged.set(s.wordId,b)}
    models[id+(variant?'@'+variant:'')]={offset,count:(floats.length-offset)/10,size:unit||handcrafted.has(id)?[1,1,1]:[PROP_SIZES[id]?.width||.7,PROP_SIZES[id]?.height||.7,PROP_SIZES[id]?.depth||.7],parts:[...merged].map(([wordId,b])=>({wordId,center:b.getCenter(new THREE.Vector3()).toArray(),size:b.getSize(new THREE.Vector3()).toArray()}))};
    factory.release(root);
  }
}
const data=new Float32Array(floats);
fs.writeFileSync(new URL('../data/models.bin',import.meta.url),Buffer.from(data.buffer));
fs.writeFileSync(new URL('../data/models.json',import.meta.url),JSON.stringify({format:'ThingLing native vertex library 1',stride:10,models}));
console.log(`${Object.keys(models).length} native models; ${data.length/10} vertices; ${data.byteLength} bytes`);
