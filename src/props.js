import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// These are model bounds, not approximate placement radii. Maps share this table.
const dimensions = {
  floor:[1,1,.05], water:[.7,.7,.08], tile:[.4,.4,.04], chimney:[.6,.6,1], gate:[1.4,.18,1], flowerpot:[.65,.65,1], napkin:[.4,.4,.025], flour:[.35,.3,.5], honey:[.32,.32,.4], butter:[.35,.25,.18], wheat:[.5,.4,1], lettuce:[.5,.5,.4], cherry:[.35,.3,.4], beehive:[.7,.65,.8], nest:[.55,.55,.25], feather:[.15,.4,.06], log:[.9,.35,.35], hedge:[1.8,.5,.9], stream:[2.4,.8,.04], parcel:[.6,.45,.4], postcard:[.4,.3,.025], jacket:[.8,.2,.85], drawer:[1.5,.7,.9], sail:[.8,.15,1.3], beacon:[.65,.65,1.2], goat:[1.1,.55,.95], hen:[.6,.5,.7], hay:[.8,.5,.5], ink:[.22,.22,.3], envelope:[.4,.3,.03], musicBox:[.55,.4,.35], crystal:[.45,.4,.65],
  house:[4.2,3.4,3.4], tree:[2,2,3.2], table:[2.4,1.5,1], chair:[.8,.8,1.15], bed:[2,3,1.15], lighthouse:[2.6,2.6,7], pond:[4,2.6,.12],
  bridge:[3,1.4,1.2], boat:[3,1.5,1.8], bench:[2,.8,1.1], sofa:[2.8,1,1.1], shelf:[2,.6,2], cabinet:[1.5,.7,1.6], stove:[1.4,1.2,1], oven:[1.4,1.2,1], mountain:[4,3.2,3.2], dock:[3.6,1.6,.65], fountain:[2,2,1.65], well:[1.6,1.6,2.2],
  door:[.8,.18,1.6], window:[.8,.18,.9], roof:[2.4,1.6,.8], wall:[2.4,.15,2], fence:[2.2,.18,1], path:[1,.7,.025], grass:[.8,.8,.14], sand:[.8,.8,.05], soil:[1,.8,.06], leaf:[.5,.4,.1], branch:[.8,.12,.3], trunk:[.45,.45,1.2],
  cloud:[2,.8,.7], sun:[1,.3,1], moon:[.7,.2,.7], star:[.55,.18,.55], rain:[.8,.7,1.2], rainbow:[2,.15,1.25], snow:[.8,.8,.25], wind:[1,.15,.5],
  apple:[.36,.36,.4], banana:[.6,.35,.25], orange:[.38,.38,.38], lemon:[.45,.3,.3], strawberry:[.32,.32,.38], tomato:[.38,.38,.4], carrot:[.26,.26,.65], potato:[.4,.3,.28], onion:[.32,.32,.38], cabbage:[.55,.55,.45], pumpkin:[.65,.65,.55], mushroom:[.4,.4,.45], grape:[.35,.35,.55], peach:[.38,.35,.38], pear:[.35,.35,.5], watermelon:[.65,.55,.5], pineapple:[.4,.4,.8], cucumber:[.25,.55,.22], pepper:[.32,.32,.45], rice:[.6,.6,.35], bread:[.65,.35,.3], egg:[.22,.22,.3], cheese:[.48,.4,.25], milk:[.32,.32,.65], juice:[.32,.32,.6], bottle:[.28,.28,.65], cup:[.4,.3,.35], coffee:[.45,.4,.4], tea:[.45,.4,.4], bowl:[.6,.6,.3], plate:[.65,.65,.08], fork:[.12,.4,.05], spoon:[.14,.4,.06], knife:[.12,.5,.05], pan:[.85,.55,.18], pot:[.65,.65,.55], kettle:[.65,.45,.55], teapot:[.65,.45,.45], cake:[.65,.65,.5], cookie:[.3,.3,.08], salt:[.22,.22,.35], sugar:[.28,.28,.35],
  book:[.45,.35,.14], notebook:[.4,.3,.08], pencil:[.07,.5,.07], pen:[.06,.5,.06], paper:[.5,.4,.02], letter:[.4,.3,.03], map:[.6,.45,.03], ticket:[.35,.2,.03], newspaper:[.6,.4,.03], scissors:[.25,.45,.06], ruler:[.09,.6,.025], magnifyingGlass:[.3,.5,.07], globe:[.7,.7,1], camera:[.55,.35,.4], telescope:[1.2,.8,1.8], telescopeTripod:[1,.8,1.5], compass:[.4,.4,.12], clock:[.65,.18,.65], painting:[1,.12,.8], picture:[1,.12,.8], mirror:[.65,.16,1.1], sign:[1,.2,1.15], flag:[.7,.2,1.5],
  cat:[.85,.5,.65], dog:[1,.5,.75], bird:[.55,.4,.55], butterfly:[.55,.3,.45], fish:[.75,.2,.35], duck:[.65,.45,.65], chicken:[.6,.5,.7], rabbit:[.6,.45,.85], cow:[1.5,.7,1.1], sheep:[1.1,.65,.85], horse:[1.5,.65,1.4], pig:[1,.55,.7], bee:[.4,.35,.3], snail:[.5,.3,.4], frog:[.5,.5,.35], turtle:[.65,.5,.3], crab:[.7,.5,.3], whale:[2.4,1,1.1], dolphin:[1.5,.5,.65], seagull:[.9,.35,.45], octopus:[.8,.8,.6],
  hat:[.7,.7,.3], shoe:[.35,.6,.3], shirt:[.8,.2,.8], coat:[.85,.25,1.1], dress:[.8,.4,1.1], trousers:[.65,.2,.9], pants:[.65,.2,.9], skirt:[.65,.3,.5], sock:[.25,.35,.5], socks:[.5,.35,.5], scarf:[.25,.2,.85], glove:[.3,.15,.45], gloves:[.6,.15,.45], glasses:[.55,.2,.2], watch:[.3,.4,.15], bag:[.65,.35,.65], backpack:[.55,.4,.7], suitcase:[.7,.4,.95], umbrella:[1.5,1.5,2.3], blanket:[1.2,.8,.08], pillow:[.65,.45,.2], towel:[.6,.4,.06], rug:[2,1.4,.03], curtain:[.75,.1,1.5],
  bicycle:[1.7,.6,1.2], train:[2.5,1.1,1.4], bus:[2.4,1.1,1.4], car:[1.7,.9,.8], wheel:[.6,.16,.6], anchor:[.8,.2,1], rope:[.5,.5,.15], oar:[.3,1.5,.1], paddle:[.3,1.5,.1], bucket:[.55,.55,.7], net:[.8,.15,1.1], fishingRod:[.2,.2,1.8], tent:[2.2,2,1.8], campfire:[1,1,.65], fire:[.6,.6,.8], lantern:[.5,.5,.8], lamp:[.6,.6,2.5], candle:[.2,.2,.5], lightbulb:[.25,.25,.4], key:[.22,.12,.45], lock:[.4,.18,.5], bell:[.45,.45,.55], basket:[.65,.55,.65], crate:[.8,.8,.8], barrel:[.8,.8,1], chest:[1.1,.65,.7], mailbox:[.55,.5,1.25], flower:[.5,.5,.65], bush:[1,.8,.7], seed:[.18,.15,.1], seedling:[.4,.3,.5], wateringCan:[.75,.45,.6], shovel:[.3,.12,1.15], rake:[.6,.15,1.25], hoe:[.4,.2,1.2], hammer:[.5,.15,.7], saw:[.65,.15,.35], nail:[.06,.06,.2], screw:[.07,.07,.2], screwdriver:[.12,.12,.55], wrench:[.2,.1,.6], toolbox:[.8,.45,.55], ladder:[.6,.2,2.2], broom:[.4,.2,1.25], mop:[.35,.3,1.2], brush:[.3,.15,.45], paintbrush:[.15,.15,.5], paint:[.4,.4,.45],
  sink:[1,.7,.95], fridge:[.85,.8,1.8], refrigerator:[.85,.8,1.8], bathtub:[1.7,.9,.65], toilet:[.7,.9,.85], tap:[.3,.25,.5], faucet:[.3,.25,.5], soap:[.28,.18,.12], toothbrush:[.1,.1,.4], toothpaste:[.12,.12,.4], comb:[.4,.08,.2], hairbrush:[.2,.1,.4], telephone:[.6,.4,.3], radio:[.7,.35,.5], computer:[.9,.55,.7], keyboard:[.7,.25,.06], screen:[.9,.15,.65], television:[1.2,.2,.8], speaker:[.5,.4,.75], piano:[1.7,.8,1.35], guitar:[.55,.18,1.3], drum:[.7,.7,.6], violin:[.45,.18,1], flute:[.1,.8,.1], trumpet:[.6,.35,.3], ball:[.6,.6,.6], kite:[.8,.15,1.1], toy:[.55,.4,.5], drumstick:[.08,.5,.08],
  stone:[.85,.65,.5], shell:[.4,.35,.18], coral:[.7,.5,.7], seaweed:[.5,.3,.8], sandcastle:[1,.8,.9], treasure:[.8,.6,.5], volcano:[3,3,2.8], waterfall:[1.8,.5,2.4], river:[3,1,.04], snowman:[.9,.9,1.5], ice:[.65,.65,.65], snowflake:[.45,.1,.45], basketBall:[.6,.6,.6], benchPress:[1.5,.7,1],
};
export const PROP_SIZES = Object.freeze(Object.fromEntries(Object.entries(dimensions).map(([id,[width,depth,height]])=>[id,Object.freeze({width,depth,height})])));
export function propSize(id) { return PROP_SIZES[id] || {width:.7,depth:.7,height:.7}; }
export const PALETTE = { grass:'#a6be7d', leaf:'#779e73', leafLight:'#9dbd87', darkLeaf:'#527f64', sand:'#e5cd9c', cream:'#f3e6ca', coral:'#d58b73', roof:'#bb7057', wood:'#b68d61', woodDark:'#79654f', blue:'#8dafb1', blueDark:'#547e87', water:'#9ac7c0', orange:'#e7aa70', pink:'#d9a0a0', white:'#fff1d9', ink:'#46564d', soil:'#997659', gold:'#dab976' };

export function createPropFactory() {
  const materials=new Map(), geometries=new Map(), generated=new Set();
  const p=PALETTE;
  function mat(color,options={}) {const key=color+JSON.stringify(options);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.9,...options}));return materials.get(key);}
  function geo(type) {if(!geometries.has(type)){let value; if(type==='box')value=new THREE.BoxGeometry(1,1,1);if(type==='ball')value=new THREE.IcosahedronGeometry(.5,1);if(type==='faceted')value=new THREE.IcosahedronGeometry(.5,0);if(type==='cylinder')value=new THREE.CylinderGeometry(.5,.5,1,10);if(type==='cone')value=new THREE.ConeGeometry(.5,1,8);if(type==='torus')value=new THREE.TorusGeometry(.5,.055,5,20);geometries.set(type,value);}return geometries.get(type);}
  function mesh(parent,type,color,x,y,z,w=1,h=1,d=1) {const m=new THREE.Mesh(geo(type),mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const box=(g,c,x,y,z,w,h,d)=>mesh(g,'box',c,x,y,z,w,h,d);
  const ball=(g,c,x,y,z,w,h=w,d=w)=>mesh(g,'ball',c,x,y,z,w,h,d);
  const cyl=(g,c,x,y,z,w,h,d=w)=>mesh(g,'cylinder',c,x,y,z,w,h,d);
  const cone=(g,c,x,y,z,w,h,d=w)=>mesh(g,'cone',c,x,y,z,w,h,d);
  function torus(g,c,x,y,z,r,rx=0,ry=0,rz=0) {const m=mesh(g,'torus',c,x,y,z,r,r,r);m.rotation.set(rx,ry,rz);return m;}
  function rod(g,a,b,r,color) {const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const m=cyl(g,color,...start.clone().add(end).multiplyScalar(.5).toArray(),r,start.distanceTo(end));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;}
  function group(parent) {const g=new THREE.Group();parent.add(g);return g;}
  function semantic(g,id,instanceId) {g.userData.wordId=id;g.userData.instanceId=instanceId;return g;}
  function gable(g,w,d,y,h,color) {const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,h);shape.lineTo(w/2,0);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});generated.add(geometry);const m=new THREE.Mesh(geometry,mat(color));m.position.set(0,y,-d/2);m.castShadow=true;m.receiveShadow=true;g.add(m);for(const side of [-1,1])for(let row=0;row<5;row++)for(let col=0;col<7;col++){const k=(row+.5)/5,len=Math.hypot(w/2,h);const tile=box(g,(row+col)%5===0?p.coral:color,side*w/2*(1-k),y+h*k+.025,-d/2+(col+.5)*d/7,len/5+.025,.045,d/7-.012);tile.rotation.z=-side*Math.atan2(h,w/2);}return m;}
  function vessel(g,color=p.cream,coffee=false) {cyl(g,color,0,.15,0,.3,.28);torus(g,color,.19,.16,0,.17);cyl(g,coffee?'#735747':p.blueDark,0,.295,0,.235,.015);}
  function table(g) {box(g,p.wood,0,.95,0,2.4,.1,1.5);for(const x of [-1,1])for(const z of [-.55,.55])box(g,p.woodDark,x,.46,z,.1,.92,.1);box(g,p.woodDark,0,.68,0,2.2,.12,.12);}
  function flower(g) {cyl(g,p.darkLeaf,0,.26,0,.04,.5);const l=ball(g,p.leaf,.11,.18,0,.22,.07,.12);l.rotation.z=.5;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(g,p.pink,Math.cos(a)*.13,.51,Math.sin(a)*.13,.18,.13,.18);}ball(g,p.gold,0,.55,0,.13,.1,.13);}
  function animal(g,id) {const colors={cat:'#e5bd86',dog:'#bf936e',rabbit:'#ded9ce',cow:'#f4e8d2',horse:'#aa7c56',pig:'#dda8a0',sheep:'#f5ebd6',chicken:'#ead6aa',duck:'#f1dcb5',frog:'#87ad6d',turtle:'#739672',snail:'#ba9c6d'};const c=colors[id]||p.cream;
    if(id==='fish'||id==='dolphin'||id==='whale'){ball(g,p.blueDark,0,.25,0,.8,.35,.28);cone(g,p.blue,-.48,.25,0,.4,.3,.18).rotation.z=Math.PI/2;ball(g,p.ink,.29,.31,.12,.04);cone(g,p.blue,0,.45,0,.2,.25,.15);return;}
    if(id==='butterfly'||id==='bee'){ball(g,p.ink,0,.2,0,.1,.1,.4);for(const side of [-1,1])ball(g,id==='bee'?p.cream:p.gold,side*.18,.23,0,.35,.07,.4).rotation.z=side*.3;if(id==='bee')for(const z of [-.1,.05])ball(g,p.gold,0,.21,z,.12,.12,.12);return;}
    if(id==='bird'||id==='seagull'||id==='duck'||id==='chicken'){ball(g,c,0,.25,0,.48,.4,.6);ball(g,c,0,.52,.18,.3);cone(g,p.orange,0,.5,.4,.16,.22).rotation.x=Math.PI/2;for(const side of [-1,1]){ball(g,id==='seagull'?p.blueDark:p.gold,side*.24,.27,0,.12,.18,.4);rod(g,[side*.1,.1,0],[side*.1,0,.1],.035,p.orange);}ball(g,p.ink,.1,.56,.28,.035);if(id==='chicken')ball(g,p.coral,0,.7,.18,.1,.15,.15);return;}
    if(id==='crab'||id==='octopus'){ball(g,id==='crab'?p.coral:p.pink,0,.3,0,.5,.45,.5);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(g,[Math.cos(a)*.15,.15,Math.sin(a)*.15],[Math.cos(a)*.45,.05,Math.sin(a)*.45],.07,p.coral);}for(const x of [-.1,.1])ball(g,p.ink,x,.4,.24,.04);return;}
    ball(g,c,0,.3,0,.65,.4,.45);ball(g,c,.35,.5,0,.34);for(const side of [-1,1]){const ear=cone(g,c,.3,id==='rabbit'?.85:.72,side*.1,.15,id==='rabbit'?.55:.2);ear.rotation.z=id==='dog'?.6:0;ball(g,p.ink,.48,.54,side*.09,.035);}
    for(const x of [-.22,.2])for(const z of [-.14,.14])cyl(g,c,x,.13,z,.08,.25);rod(g,[-.3,.32,0],[-.48,.55,0],.065,c);ball(g,p.woodDark,.54,.46,0,.07);
    if(id==='cow')for(const x of [-.2,.15])ball(g,p.ink,x,.4,.2,.2,.2,.07);if(id==='sheep')for(let i=0;i<5;i++)ball(g,p.white,(i%3-1)*.2,.4,Math.floor(i/3)*.2-.1,.35);if(id==='turtle'){ball(g,p.darkLeaf,0,.4,0,.7,.4,.55);}if(id==='snail'){torus(g,p.woodDark,0,.5,0,.4);ball(g,p.gold,0,.45,0,.4);}
  }
  function build(id,variant,instanceId,fixtures=true) {const g=new THREE.Group();semantic(g,id,instanceId);
    if(id==='house'){
      box(g,p.sand,0,.08,0,3.9,.16,3.1);
      const wall=semantic(group(g),'wall',`${instanceId}:wall`);
      box(wall,variant==='cafe'?p.coral:p.cream,0,1.2,0,3.7,2.2,2.9);
      for(const x of [-1.76,1.76])box(wall,p.white,x,1.2,1.47,.13,2.2,.1);
      box(wall,p.white,0,2.25,1.49,3.7,.1,.1);
      const roof=semantic(group(g),'roof',`${instanceId}:roof`);
      gable(roof,4.2,3.4,2.3,1.1,variant==='blue'||variant==='boathouse'?p.blueDark:p.roof);
      const chimney=semantic(group(g),'chimney',`${instanceId}:chimney`);
      box(chimney,p.cream,-1.2,2.85,-.5,.38,.6,.42);
      box(chimney,p.roof,-1.2,3.17,-.5,.5,.1,.54);
      box(chimney,p.woodDark,-1.2,3.23,-.5,.25,.015,.28);
      if(fixtures){
        const door=semantic(group(g),'door',`${instanceId}:door`);
        box(door,p.white,0,.92,1.5,.87,1.65,.12);
        box(door,p.blueDark,0,.9,1.57,.69,1.51,.07);
        for(const y of [.5,1.19])box(door,p.blue,0,y,1.615,.5,.42,.025);
        ball(door,p.gold,.22,.89,1.65,.06);
        for(const x of [-1.12,1.12]){
          const window=semantic(group(g),'window',`${instanceId}:window:${x}`);
          box(window,p.white,x,1.55,1.5,.7,.83,.12);
          box(window,p.blueDark,x,1.55,1.57,.56,.69,.035);
          box(window,'#b7d7cd',x-.1,1.67,1.6,.2,.36,.02);
          box(window,p.white,x,1.55,1.63,.035,.7,.025);
          box(window,p.white,x,1.55,1.63,.57,.035,.025);
          for(const side of [-1,1]){
            box(window,p.blue,x+side*.43,1.55,1.51,.18,.85,.11);
            for(let k=0;k<4;k++)box(window,p.blueDark,x+side*.43,1.29+k*.17,1.58,.13,.025,.02);
          }
          const pot=semantic(group(g),'flowerpot',`${instanceId}:planter:${x}`);
          box(pot,p.wood,x,1.04,1.55,.68,.18,.25);
          box(pot,p.soil,x,1.14,1.55,.57,.018,.18);
          const flowers=semantic(group(g),'flower',`${instanceId}:flowers:${x}`);
          for(let k=0;k<3;k++){
            const f=group(flowers);f.position.set(x-.2+k*.2,1.14,1.55);f.scale.setScalar(.33);flower(f);
          }
        }
        const sign=semantic(group(g),'sign',`${instanceId}:sign`);
        box(sign,p.woodDark,0,2.07,1.51,1.38,.28,.13);
        box(sign,p.cream,0,2.07,1.59,1.23,.19,.025);
        for(let k=0;k<5;k++)box(sign,p.blueDark,-.4+k*.2,2.07,1.61,.12,.025,.01);
        if(variant==='cafe'){
          const awning=semantic(group(g),'roof',`${instanceId}:awning`);
          for(let k=0;k<10;k++){
            box(awning,k%2?p.cream:p.coral,-.9+k*.2,2.15,1.54,.195,.07,.3);
            box(awning,k%2?p.cream:p.coral,-.9+k*.2,2.07,1.67,.195,.12,.035);
          }
        }
      }
    }
    else if(id==='seed'){ball(g,'#a48656',0,.05,0,.18,.1,.15);rod(g,[-.055,.09,0],[.055,.09,0],.009,p.cream);}
    else if(id==='tile')box(g,p.roof,0,.02,0,.4,.04,.4);
    else if(id==='chimney'){box(g,p.cream,0,.45,0,.45,.9,.45);box(g,p.roof,0,.92,0,.6,.15,.6);box(g,p.woodDark,0,1.01,0,.35,.02,.35);}
    else if(id==='flowerpot'){cyl(g,p.coral,0,.2,0,.5,.4);cyl(g,p.coral,0,.4,0,.6,.1);cyl(g,p.soil,0,.46,0,.48,.03);const f=group(g);f.position.y=.45;flower(f);}
    else if(id==='napkin'){box(g,p.cream,0,.01,0,.4,.02,.4);box(g,p.pink,.1,.023,0,.02,.002,.4);}
    else if(id==='flour'){box(g,p.cream,0,.25,0,.35,.5,.3);box(g,p.wood,0,.27,.16,.25,.18,.02);}
    else if(id==='honey'||id==='ink'){cyl(g,id==='honey'?p.gold:p.blueDark,0,.18,0,.3,.36);cyl(g,p.wood,0,.38,0,.32,.08);box(g,p.cream,0,.2,.16,.18,.14,.02);}
    else if(id==='butter'){box(g,p.cream,0,.03,0,.35,.06,.25);box(g,p.gold,0,.12,0,.25,.15,.18);}
    else if(id==='wheat'){for(let i=0;i<4;i++){const x=(i-1.5)*.1;rod(g,[x,0,0],[x,.85,0],.02,p.gold);for(let k=0;k<4;k++)for(const s of [-1,1])ball(g,p.gold,x+s*.04,.65+k*.08,0,.07,.13,.07).rotation.z=s*.4;}}
    else if(id==='lettuce'){for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(g,i%2?p.leaf:p.leafLight,Math.cos(a)*.12,.22,Math.sin(a)*.12,.3,.4,.3);}ball(g,p.leafLight,0,.3,0,.3);}
    else if(id==='cherry'){for(const side of [-1,1]){ball(g,p.coral,side*.09,.1,0,.18);rod(g,[side*.09,.18,0],[0,.4,0],.018,p.woodDark);}ball(g,p.leaf,.06,.38,0,.15,.04,.08);}
    else if(id==='beehive'){box(g,p.wood,0,.3,0,.6,.6,.6);gable(g,.7,.7,.6,.2,p.roof);for(const y of [.15,.3,.45])box(g,p.woodDark,0,y,.31,.5,.025,.02);box(g,p.woodDark,0,.1,.32,.2,.06,.03);}
    else if(id==='nest'){for(let i=0;i<5;i++)torus(g,p.wood,0,.08+i*.025,0,.55-i*.055,Math.PI/2);for(const x of [-.1,.1])ball(g,p.cream,x,.18,0,.13,.18,.13);}
    else if(id==='feather'){ball(g,p.cream,0,.04,0,.15,.04,.4);rod(g,[0,.05,-.2],[0,.05,.2],.015,p.wood);}
    else if(id==='log'){cyl(g,p.woodDark,0,.18,0,.35,.9).rotation.z=Math.PI/2;for(const x of [-.46,.46])cyl(g,p.sand,x,.18,0,.28,.02).rotation.z=Math.PI/2;}
    else if(id==='hedge'){for(let i=0;i<5;i++)ball(g,i%2?p.leaf:p.leafLight,(i-2)*.35,.45,0,.55,.9,.5);}
    else if(id==='parcel'){box(g,p.wood,0,.2,0,.6,.4,.45);box(g,p.cream,0,.41,0,.07,.02,.45);box(g,p.cream,0,.41,0,.6,.02,.07);}
    else if(id==='postcard'||id==='envelope'){box(g,p.cream,0,.02,0,.4,.04,.3);if(id==='postcard'){box(g,p.blue,-.08,.045,0,.15,.005,.22);box(g,p.coral,.13,.045,-.1,.05,.005,.05);}else{rod(g,[-.18,.05,-.14],[0,.05,.05],.012,p.coral);rod(g,[.18,.05,-.14],[0,.05,.05],.012,p.coral);}}
    else if(id==='drawer'){box(g,p.woodDark,0,.45,0,1.5,.9,.7);for(let i=0;i<3;i++){box(g,p.cream,0,.17+i*.28,.37,1.4,.24,.04);ball(g,p.gold,0,.17+i*.28,.42,.07);}}
    else if(id==='sail'){rod(g,[-.35,0,0],[-.35,1.3,0],.035,p.woodDark);const shape=new THREE.Shape();shape.moveTo(-.3,.1);shape.lineTo(-.3,1.25);shape.lineTo(.45,.1);shape.closePath();const geometry=new THREE.ShapeGeometry(shape);generated.add(geometry);g.add(new THREE.Mesh(geometry,mat(p.cream,{side:THREE.DoubleSide})));}
    else if(id==='beacon'){cyl(g,p.woodDark,0,.45,0,.13,.9);box(g,p.woodDark,0,.9,0,.6,.08,.6);cyl(g,p.gold,0,1.1,0,.4,.35);cone(g,p.roof,0,1.35,0,.65,.2);}
    else if(id==='goat'||id==='hen'){animal(g,id==='hen'?'chicken':'sheep');if(id==='goat')for(const side of [-1,1])rod(g,[.34,.65,side*.09],[.25,.85,side*.09],.04,p.woodDark);}
    else if(id==='hay'){box(g,p.gold,0,.25,0,.8,.5,.5);for(const x of [-.25,.25]){box(g,p.woodDark,x,.51,0,.025,.02,.5);box(g,p.woodDark,x,.25,.26,.025,.5,.02);}}
    else if(id==='musicBox'){box(g,p.wood,0,.15,0,.55,.3,.4);box(g,p.cream,0,.32,0,.5,.04,.35);torus(g,p.gold,0,.38,0,.18,Math.PI/2);}
    else if(id==='crystal'){cone(g,'#a5b7ce',0,.35,0,.45,.65);cone(g,'#c0d2d6',.15,.2,0,.22,.4);}
    else if(id==='roof')gable(g,2.4,1.6,0,.8,p.roof);
    else if(id==='door'){box(g,p.cream,0,.8,0,.8,1.6,.15);box(g,p.blueDark,0,.77,.08,.64,1.46,.07);for(const y of [.4,1.12])box(g,p.blue,0,y,.123,.45,.45,.025);ball(g,p.gold,.21,.8,.15,.07);}
    else if(id==='window'){box(g,p.cream,0,.45,0,.8,.9,.1);box(g,p.blueDark,0,.45,.06,.66,.76,.06);box(g,'#b8d3c5',-.12,.58,.1,.24,.4,.02);for(const x of [-.08,.08])box(g,p.cream,x,.45,.13,.035,.77,.035);box(g,p.cream,0,.45,.13,.67,.04,.035);}
    else if(id==='tree'){const trunk=semantic(group(g),'trunk',`${instanceId}:trunk`);cyl(trunk,p.woodDark,0,.7,0,.25,1.4);rod(trunk,[0,.9,0],[-.4,1.65,0],.12,p.woodDark);const crown=semantic(group(g),'leaf',`${instanceId}:leaf`);ball(crown,p.leaf,-.44,2,0,1.2,1.5,1.2);ball(crown,p.leafLight,.34,2.4,0,1.45,1.5,1.3);ball(crown,p.leaf,0,2.1,.35,1.5,1.3,1.3);}
    else if(id==='bush'){for(let i=0;i<3;i++)ball(g,[p.leaf,p.leafLight,p.darkLeaf][i],(i-1)*.25,.3,0,.55,.6,.6);}
    else if(id==='flower')flower(g);
    else if(id==='seedling'){cyl(g,p.darkLeaf,0,.2,0,.04,.4);for(const side of [-1,1])ball(g,p.leaf,side*.1,.28,0,.22,.08,.14).rotation.z=side*.4;}
    else if(id==='leaf'){ball(g,p.leaf,0,.05,0,.5,.1,.3);rod(g,[-.2,.09,0],[.2,.09,0],.012,p.darkLeaf);}
    else if(id==='trunk'||id==='branch'){cyl(g,p.woodDark,0,.5,0,.35,1);}
    else if(id==='table')table(g);
    else if(id==='chair'){box(g,p.blue,0,.48,0,.65,.1,.65);for(const x of [-.25,.25])for(const z of [-.25,.25])box(g,p.woodDark,x,.23,z,.07,.46,.07);for(const x of [-.25,.25])box(g,p.blue,x,.8,-.26,.07,.75,.07);box(g,p.blue,0,1.05,-.26,.6,.22,.08);}
    else if(id==='bench'){for(let i=0;i<3;i++)box(g,p.wood,0,.5,-.24+i*.24,2,.09,.2);for(const x of [-.7,.7]){box(g,p.woodDark,x,.25,0,.13,.5,.55);box(g,p.woodDark,x,.8,-.29,.1,.6,.1);}for(const y of [.8,1.02])box(g,p.wood,0,y,-.3,2,.15,.08);}
    else if(id==='bed'){box(g,p.woodDark,0,.25,0,2,.5,3);box(g,p.cream,0,.55,0,2,.15,3);box(g,p.blue,0,.7,.35,2,.16,2.2);box(g,p.wood,0,.65,-1.45,2,.95,.12);box(g,p.white,0,.76,-1,1.3,.2,.55);}
    else if(id==='sofa'){box(g,p.blueDark,0,.32,0,2.6,.5,.9);box(g,p.blue,0,.8,-.38,2.8,.6,.2);for(const x of [-1.25,1.25])box(g,p.blue,x,.58,0,.25,.55,1);for(const x of [-.65,.65])box(g,p.cream,x,.57,.03,1.1,.18,.7);}
    else if(id==='shelf'||id==='cabinet'){for(const x of [-.9,.9])box(g,p.woodDark,x,1,0,.15,2,.6);for(const y of [.08,.7,1.33,1.92])box(g,p.wood,0,y,0,2,.12,.6);box(g,p.woodDark,0,1,-.27,1.8,2,.06);if(id==='cabinet')for(const x of [-.47,.47]){box(g,p.cream,x,1,.32,.9,1.8,.1);ball(g,p.gold,x*.3,1,.4,.08);}}
    else if(id==='fountain'||id==='well'){cyl(g,p.cream,0,.25,0,1.8,.5);cyl(g,p.blue,0,.51,0,1.5,.06);torus(g,p.sand,0,.5,0,1.65,Math.PI/2);if(id==='fountain'){cyl(g,p.cream,0,.9,0,.25,.9);cyl(g,p.sand,0,1.35,0,.85,.12);ball(g,p.cream,0,1.6,0,.3);}else{for(const x of [-.65,.65])box(g,p.wood,x,1.2,0,.13,1.9,.13);gable(g,1.6,1.6,2,.45,p.roof);rod(g,[-.7,1.8,0],[.7,1.8,0],.09,p.woodDark);}}
    else if(id==='lighthouse'){cyl(g,p.cream,0,2.6,0,1.6,5.2);for(const y of [1.6,3.7])cyl(g,p.coral,0,y,0,1.65,.65);cyl(g,p.woodDark,0,5.25,0,2.6,.2);cyl(g,p.blue,0,5.8,0,1.4,.9);for(let i=0;i<8;i++){const a=i*Math.PI/4;cyl(g,p.woodDark,Math.cos(a)*.7,5.8,Math.sin(a)*.7,.07,1);}cone(g,p.roof,0,6.5,0,2.1,.65);ball(g,p.gold,0,6.9,0,.2);}
    else if(id==='bridge'||id==='dock'){for(let i=0;i<12;i++){const x=-1.4+i*.25;box(g,p.wood,x,id==='bridge'?.2+Math.sin(i/11*Math.PI)*.22:.15,0,.22,.12,1.4);}for(const z of [-.65,.65]){for(const x of [-1.35,0,1.35])box(g,p.woodDark,x,.55,z,.09,1.1,.09);rod(g,[-1.4,.95,z],[1.4,.95,z],.06,p.wood);}}
    else if(id==='boat'){const hull=ball(g,p.blueDark,0,.35,0,2.8,.7,1.35);box(g,p.cream,0,.55,0,2.25,.12,1.05);for(const x of [-.65,.25])box(g,p.wood,x,.68,0,.18,.1,1.05);rod(g,[.25,.65,0],[.25,1.75,0],.05,p.woodDark);const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([.3,.8,0,.3,1.75,0,1.25,.8,0],3));geom.computeVertexNormals();generated.add(geom);const sail=new THREE.Mesh(geom,mat(p.white,{side:THREE.DoubleSide}));g.add(sail);}
    else if(['cat','dog','bird','seagull','duck','chicken','cow','horse','sheep','pig','rabbit','fish','butterfly','bee','frog','turtle','snail','crab','octopus','whale','dolphin'].includes(id))animal(g,id);
    else if(['apple','orange','lemon','peach','pear','tomato','potato','onion','watermelon','pumpkin','cabbage','pepper','pineapple'].includes(id)){const colors={apple:'#c96956',orange:p.orange,lemon:'#e7cf78',peach:'#dfa48c',pear:'#bac678',tomato:'#cf7562',potato:'#bba178',onion:'#d5ac81',watermelon:p.leaf,pumpkin:p.orange,cabbage:p.leafLight,pepper:'#c97d61',pineapple:'#c2a36b'};ball(g,colors[id],0,.2,0,.4,.4,.4);cyl(g,p.woodDark,0,.43,0,.045,.1);ball(g,p.leaf,.08,.45,0,.17,.045,.1);if(id==='pineapple')for(let i=0;i<5;i++)cone(g,p.leaf,(i-2)*.035,.64,0,.12,.4).rotation.z=(i-2)*.25;if(id==='pumpkin'||id==='watermelon')for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(g,[Math.cos(a)*.18,.12,Math.sin(a)*.18],[Math.cos(a)*.18,.3,Math.sin(a)*.18],.016,p.darkLeaf);}}
    else if(id==='strawberry'){cone(g,p.coral,0,.2,0,.35,.4).rotation.z=Math.PI;for(let i=0;i<6;i++)ball(g,p.gold,Math.cos(i)*.14,.18,Math.sin(i)*.14,.025);for(let i=0;i<4;i++)ball(g,p.leaf,Math.cos(i*Math.PI/2)*.08,.4,Math.sin(i*Math.PI/2)*.08,.15,.04,.08);}
    else if(id==='banana'){for(let i=0;i<4;i++){const b=ball(g,p.gold,(i-1.5)*.12,.13+Math.abs(i-1.5)*.06,0,.25,.18,.28);b.rotation.z=(i-1.5)*.3;}}
    else if(id==='grape'){for(let row=0;row<3;row++)for(let i=0;i<3-row;i++)ball(g,'#8d91a6',(i-(2-row)/2)*.14,.35-row*.12,0,.17);cyl(g,p.woodDark,0,.48,0,.035,.12);}
    else if(id==='carrot'){cone(g,p.orange,0,.22,0,.22,.45).rotation.z=Math.PI;for(let i=0;i<3;i++)ball(g,p.leaf,(i-1)*.06,.5,0,.08,.3,.1).rotation.z=(i-1)*.25;}
    else if(id==='cucumber'){ball(g,p.darkLeaf,0,.15,0,.22,.22,.6);}
    else if(id==='mushroom'){cyl(g,p.cream,0,.17,0,.13,.34);const cap=ball(g,p.coral,0,.35,0,.45,.22,.45);for(let i=0;i<4;i++)ball(g,p.cream,Math.cos(i)*.13,.43,Math.sin(i)*.13,.06);}
    else if(id==='bread'){ball(g,'#d6a56b',0,.17,0,.7,.32,.4);for(const x of [-.2,0,.2])rod(g,[x-.035,.29,-.08],[x+.035,.29,.08],.02,p.cream);}
    else if(id==='egg'){ball(g,p.cream,0,.18,0,.25,.35,.25);}
    else if(['cup','coffee','tea'].includes(id))vessel(g,id==='tea'?p.leafLight:p.cream,id==='coffee');
    else if(['milk','juice'].includes(id)){box(g,p.cream,0,.25,0,.3,.5,.3);gable(g,.3,.3,.5,.12,p.blue);box(g,id==='milk'?p.blue:p.orange,0,.28,.16,.2,.22,.02);}
    else if(id==='bottle'){cyl(g,p.blue,0,.23,0,.26,.45);cyl(g,p.blue,0,.52,0,.1,.18);cyl(g,p.wood,0,.64,0,.12,.06);}
    else if(id==='cheese'){cyl(g,p.gold,0,.13,0,.5,.26);for(const x of [-.12,.1])ball(g,'#b49457',x,.27,.07,.06,.012,.06);}
    else if(['bowl','plate','rice','pot','pan'].includes(id)){cyl(g,id==='pot'||id==='pan'?p.blueDark:p.cream,0,.14,0,.6,id==='plate'?.05:.28);cyl(g,id==='rice'?p.white:p.woodDark,0,id==='plate'?.17:.29,0,.5,.025);if(id==='pot'||id==='pan')for(const x of [-.39,.39])box(g,p.woodDark,x,.25,0,id==='pan'?.4:.18,.07,.08);}
    else if(id==='kettle'||id==='teapot'){ball(g,p.blue,0,.25,0,.45,.4,.4);cyl(g,p.woodDark,0,.48,0,.3,.05);ball(g,p.woodDark,0,.54,0,.07);rod(g,[.15,.2,0],[.35,.4,0],.12,p.blue);torus(g,p.woodDark,-.15,.3,0,.35);}
    else if(id==='cake'){cyl(g,p.coral,0,.22,0,.6,.4);cyl(g,p.cream,0,.43,0,.62,.08);for(let i=0;i<5;i++)ball(g,p.coral,Math.cos(i*1.26)*.2,.5,Math.sin(i*1.26)*.2,.08);}
    else if(id==='cookie'){cyl(g,'#cba06c',0,.04,0,.3,.08);for(let i=0;i<5;i++)ball(g,p.woodDark,Math.cos(i*2)*.09,.09,Math.sin(i*2)*.09,.035,.02,.035);}
    else if(id==='salt'||id==='sugar'){cyl(g,p.white,0,.16,0,.23,.32);cyl(g,p.wood,0,.34,0,.25,.06);}
    else if(['fork','spoon','knife'].includes(id)){box(g,p.blueDark,0,.03,-.08,.05,.04,.32);if(id==='spoon')ball(g,p.blue,0,.035,.14,.14,.04,.2);if(id==='knife')box(g,p.blue,0,.04,.12,.12,.025,.25);if(id==='fork')for(const x of [-.05,0,.05])box(g,p.blue,x,.03,.15,.025,.03,.18);}
    else if(['book','notebook','paper','letter','map','ticket','newspaper'].includes(id)){const color=id==='book'?p.coral:id==='notebook'?p.blue:p.cream;box(g,color,0,.04,0,.5,.08,.4);if(id==='book'||id==='notebook'){box(g,p.white,.01,.042,0,.46,.04,.36);box(g,color,0,.09,0,.5,.025,.4);}else for(let i=0;i<4;i++)box(g,id==='map'?p.leaf:p.blueDark,0,.085,-.12+i*.075,.28,.004,.012);if(id==='letter'){rod(g,[-.23,.09,.18],[0,.09,0],.009,p.coral);rod(g,[.23,.09,.18],[0,.09,0],.009,p.coral);}}
    else if(id==='pencil'||id==='pen'){cyl(g,id==='pencil'?p.gold:p.blue,0,.04,0,.06,.5).rotation.x=Math.PI/2;cone(g,p.woodDark,0,.04,.28,.06,.1).rotation.x=Math.PI/2;}
    else if(id==='ruler'){box(g,p.gold,0,.03,0,.12,.04,.6);for(let i=0;i<8;i++)box(g,p.ink,.025,.055,-.25+i*.07,.05,.004,.01);}
    else if(id==='scissors'){for(const side of [-1,1]){torus(g,p.coral,side*.07,.04,-.12,.14,Math.PI/2);rod(g,[side*.07,.04,-.07],[-side*.08,.04,.22],.025,p.blueDark);}}
    else if(id==='clock'||id==='compass'||id==='watch'){cyl(g,p.woodDark,0,.35,0,.65,.1).rotation.x=Math.PI/2;cyl(g,p.cream,0,.35,.065,.55,.02).rotation.x=Math.PI/2;rod(g,[0,.35,.08],[0,.55,.08],.018,p.ink);rod(g,[0,.35,.08],[.16,.27,.08],.018,id==='compass'?p.coral:p.ink);}
    else if(id==='globe'){ball(g,p.blue,0,.62,0,.7);ball(g,p.leaf,-.17,.72,.24,.26,.2,.08);ball(g,p.leaf,.14,.51,.26,.19,.25,.08);cyl(g,p.woodDark,0,.2,0,.08,.4);cyl(g,p.woodDark,0,.035,0,.5,.07);torus(g,p.gold,0,.62,0,.85);}
    else if(id==='telescope'){for(let i=0;i<3;i++){const a=i*Math.PI/1.5;rod(g,[0,.9,0],[Math.cos(a)*.45,0,Math.sin(a)*.45],.05,p.woodDark);}const tube=cyl(g,p.blue,0,1.2,0,.28,1.1);tube.rotation.z=-Math.PI/3;const lens=cyl(g,p.ink,.49,1.48,0,.32,.07);lens.rotation.z=-Math.PI/3;}
    else if(['camera','radio','telephone','computer','screen','television','speaker','keyboard'].includes(id)){if(id==='camera'){box(g,p.woodDark,0,.2,0,.55,.4,.25);cyl(g,p.ink,0,.2,.2,.25,.2).rotation.x=Math.PI/2;cyl(g,p.blue,0,.2,.31,.18,.02).rotation.x=Math.PI/2;box(g,p.gold,-.15,.43,0,.12,.05,.12);}else if(['computer','screen','television'].includes(id)){box(g,p.woodDark,0,.45,0,.9,.65,.12);box(g,p.blue,0,.45,.075,.8,.53,.02);box(g,p.woodDark,0,.1,0,.1,.2,.1);box(g,p.woodDark,0,.03,.05,.6,.06,.3);}else{box(g,p.wood,0,.25,0,.7,.5,.3);for(const x of [-.2,.2])cyl(g,p.ink,x,.23,.17,.22,.04).rotation.x=Math.PI/2;box(g,p.blue,0,.43,.17,.25,.08,.03);}}
    else if(id==='painting'||id==='picture'||id==='mirror'){box(g,p.wood,0,.5,0,1,1,.1);box(g,id==='mirror'?p.blue:p.cream,0,.5,.065,.85,.85,.02);if(id!=='mirror'){ball(g,p.gold,.2,.73,.09,.17,.17,.01);cone(g,p.leaf,-.1,.4,.09,.65,.5,.02);}}
    else if(id==='sign'||id==='mailbox'){box(g,p.woodDark,0,.45,0,.1,.9,.1);box(g,id==='sign'?p.cream:p.blue,0,1,0,id==='sign'?1:.55,.5,.2);if(id==='mailbox')box(g,p.woodDark,0,1.1,.115,.35,.035,.02);else for(const x of [-.25,0,.25])box(g,p.leaf,x,1,.115,.13,.04,.015);}
    else if(id==='flag'){cyl(g,p.woodDark,-.25,.75,0,.04,1.5);box(g,p.coral,.05,1.2,0,.6,.4,.025);}
    else if(id==='hat'){cyl(g,p.sand,0,.04,0,.7,.08);cyl(g,p.sand,0,.17,0,.4,.25);cyl(g,p.coral,0,.1,0,.41,.07);}
    else if(id==='shoe'){ball(g,p.woodDark,0,.06,0,.35,.12,.6);ball(g,p.coral,0,.17,-.05,.32,.25,.5);for(let i=0;i<3;i++)box(g,p.cream,0,.29,-.1+i*.08,.2,.015,.025);}
    else if(['shirt','coat','jacket','dress','trousers','pants','skirt','sock','socks','scarf','glove','gloves','towel','blanket','rug','curtain','pillow'].includes(id)){if(['trousers','pants','socks','sock'].includes(id)){box(g,p.blue,0,.7,0,.6,.35,.15);for(const x of [-.17,.17])box(g,p.blueDark,x,.3,0,.25,.6,.2);}else if(['towel','blanket','rug','pillow'].includes(id)){box(g,id==='pillow'?p.cream:p.coral,0,.05,0,1,.1,.7);for(const x of [-.35,.35])box(g,p.cream,x,.11,0,.05,.01,.7);}else{box(g,p.coral,0,.45,0,.5,.8,.16);for(const side of [-1,1])box(g,p.coral,side*.35,.68,0,.25,.25,.15).rotation.z=side*.3;box(g,p.cream,0,.82,.085,.16,.08,.025);}}
    else if(id==='glasses'){for(const side of [-1,1])torus(g,p.woodDark,side*.16,.13,0,.25);rod(g,[-.04,.15,0],[.04,.15,0],.025,p.woodDark);}
    else if(['bag','backpack','suitcase','basket'].includes(id)){box(g,id==='basket'?p.wood:p.blue,0,.28,0,.6,.55,.35);torus(g,p.woodDark,0,.58,0,.4);if(id!=='basket')box(g,p.cream,0,.23,.19,.3,.2,.03);else for(let i=0;i<5;i++)box(g,p.woodDark,-.24+i*.12,.25,.18,.025,.45,.025);}
    else if(id==='umbrella'){cyl(g,p.woodDark,0,1,0,.04,2);cone(g,p.cream,0,2,0,1.5,.4);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(g,[0,2.2,0],[Math.cos(a)*.75,1.8,Math.sin(a)*.75],.02,p.wood);}}
    else if(id==='lamp'||id==='lantern'){const h=id==='lamp'?2.1:.45;cyl(g,p.woodDark,0,h/2,0,.07,h);cyl(g,p.woodDark,0,.04,0,.4,.08);box(g,p.gold,0,h+.15,0,.35,.4,.35);box(g,p.woodDark,0,h-.07,0,.45,.07,.45);cone(g,p.woodDark,0,h+.45,0,.6,.25);}
    else if(id==='candle'||id==='lightbulb'){cyl(g,p.cream,0,.2,0,.2,.4);ball(g,p.gold,0,.48,0,.14,.23,.14);}
    else if(id==='bicycle'){for(const x of [-.55,.55]){torus(g,p.ink,x,.38,0,.7);torus(g,p.cream,x,.38,0,.6);for(let i=0;i<5;i++){const a=i*1.256;rod(g,[x,.38,0],[x+Math.cos(a)*.3,.38+Math.sin(a)*.3,0],.013,p.cream);}}for(const [a,b] of [[[0,.38,0],[-.22,.9,0]],[[-.55,.38,0],[0,.38,0]],[[-.55,.38,0],[-.22,.9,0]],[[-.22,.9,0],[.35,.92,0]],[[.35,.92,0],[0,.38,0]],[[.35,.92,0],[.55,.38,0]]])rod(g,a,b,.05,p.coral);box(g,p.woodDark,-.22,.98,0,.3,.07,.18);rod(g,[.35,.9,0],[.3,1.2,0],.04,p.woodDark);rod(g,[.3,1.2,-.2],[.3,1.2,.2],.04,p.woodDark);}
    else if(['car','bus','train'].includes(id)){box(g,p.blue,0,.45,0,2.3,.7,1);box(g,p.coral,-.2,.95,0,1.7,.65,.95);for(const x of [-.65,.15,.65])for(const side of [-1,1]){box(g,p.cream,x,.98,side*.49,.37,.35,.025);cyl(g,p.ink,x,.2,side*.45,.35,.15).rotation.x=Math.PI/2;}box(g,p.gold,1.17,.5,0,.025,.18,.65);}
    else if(id==='wheel'){torus(g,p.ink,0,.3,0,.6);for(let i=0;i<5;i++){const a=i*1.256;rod(g,[0,.3,0],[Math.cos(a)*.27,.3+Math.sin(a)*.27,0],.02,p.cream);}}
    else if(id==='rope'){for(let i=0;i<4;i++)torus(g,p.wood,0,.04+i*.035,0,.5-i*.07,Math.PI/2);}
    else if(id==='anchor'){torus(g,p.woodDark,0,.9,0,.18);rod(g,[0,.85,0],[0,.12,0],.07,p.woodDark);rod(g,[-.35,.35,0],[0,.1,0],.06,p.woodDark);rod(g,[.35,.35,0],[0,.1,0],.06,p.woodDark);rod(g,[-.25,.6,0],[.25,.6,0],.05,p.woodDark);}
    else if(id==='oar'||id==='paddle'){rod(g,[0,.05,-.7],[0,.05,.6],.05,p.wood);box(g,p.wood,0,.05,-.55,.3,.08,.4);}
    else if(id==='net'||id==='fishingRod'){rod(g,[0,0,0],[0,1,0],.04,p.woodDark);if(id==='net'){torus(g,p.woodDark,0,1,0,.65);for(const x of [-.2,0,.2])rod(g,[x,.76,0],[x,1.25,0],.012,p.cream);}else rod(g,[0,1,0],[.25,.75,0],.012,p.cream);}
    else if(['bucket','wateringCan','pot','paint'].includes(id)){cyl(g,p.blue,0,.23,0,.45,.45);torus(g,p.woodDark,0,.5,0,.45);if(id==='wateringCan')rod(g,[.2,.2,0],[.5,.45,0],.1,p.blue);}
    else if(id==='crate'||id==='chest'||id==='treasure'||id==='toolbox'){box(g,p.wood,0,.4,0,.8,.8,.8);for(const side of [-1,1])box(g,p.woodDark,side*.31,.4,.41,.07,.8,.04);for(const y of [.1,.7])box(g,p.woodDark,0,y,.42,.8,.07,.04);const diag=box(g,p.woodDark,0,.4,.43,.9,.06,.03);diag.rotation.z=.65;}
    else if(id==='barrel'){cyl(g,p.wood,0,.5,0,.8,1);for(const y of [.17,.8])cyl(g,p.woodDark,0,y,0,.82,.08);cyl(g,p.woodDark,0,1.01,0,.73,.025);}
    else if(['shovel','rake','hoe','broom','mop','hammer','saw','screwdriver','wrench','brush','paintbrush','comb','hairbrush','toothbrush','toothpaste','nail','screw'].includes(id)){rod(g,[0,0,0],[0,.9,0],.055,p.wood);if(id==='rake'||id==='comb'){box(g,p.blueDark,0,1,0,.6,.08,.07);for(let i=0;i<6;i++)box(g,p.blueDark,-.25+i*.1,1.1,0,.035,.2,.04);}else if(id==='shovel')ball(g,p.blueDark,0,1,0,.3,.4,.1);else if(id==='broom'||id==='mop')box(g,p.gold,0,.12,0,.4,.25,.18);else if(id==='hammer')box(g,p.blueDark,0,.9,0,.5,.2,.16);else if(id==='saw'){box(g,p.blue,0,.5,0,.6,.3,.08);torus(g,p.woodDark,.3,.5,0,.25);}else box(g,p.blueDark,0,.93,0,.2,.3,.12);}
    else if(id==='ladder'){for(const x of [-.25,.25])box(g,p.wood,x,1.1,0,.08,2.2,.1);for(let i=0;i<7;i++)box(g,p.wood,0,.2+i*.3,0,.5,.06,.09);}
    else if(['stove','oven','sink','fridge','refrigerator'].includes(id)){box(g,p.cream,0,.48,0,1.4,.96,1.2);box(g,p.woodDark,0,.86,.61,1.25,.12,.04);if(id==='sink'){cyl(g,p.blueDark,0,.99,0,.7,.04);rod(g,[.35,1,-.25],[.35,1.3,-.25],.06,p.blue);rod(g,[.35,1.3,-.25],[0,1.3,-.25],.06,p.blue);}else if(id==='fridge'||id==='refrigerator'){box(g,p.blue,0,.5,.62,1.2,.8,.05);box(g,p.woodDark,-.4,.65,.68,.06,.4,.05);}else{box(g,p.woodDark,0,.45,.61,1.05,.5,.06);box(g,p.blue,0,.45,.65,.8,.32,.02);for(const x of [-.35,.35])for(const z of [-.3,.3])torus(g,p.woodDark,x,.98,z,.35,Math.PI/2);}}
    else if(id==='bathtub'||id==='toilet'){box(g,p.cream,0,.3,0,1.5,.6,.9);box(g,p.blue,0,.61,0,1.2,.025,.6);if(id==='toilet')box(g,p.cream,0,.65,-.4,.65,.6,.2);}
    else if(id==='tap'||id==='faucet'){rod(g,[0,0,0],[0,.4,0],.08,p.blue);rod(g,[0,.4,0],[.25,.4,0],.08,p.blue);}
    else if(id==='soap')ball(g,p.pink,0,.07,0,.3,.14,.2);
    else if(id==='guitar'||id==='violin'){ball(g,p.wood,0,.4,0,.55,.65,.15);ball(g,p.wood,0,.7,0,.4,.4,.15);box(g,p.woodDark,0,1,0,.1,.65,.1);ball(g,p.ink,0,.55,.08,.16,.16,.02);for(const x of [-.03,0,.03])rod(g,[x,.15,.1],[x,1.25,.1],.008,p.cream);}
    else if(id==='piano'){box(g,p.woodDark,0,.85,0,1.7,1,.65);box(g,p.cream,0,.75,.45,1.55,.08,.3);for(let i=0;i<15;i++)box(g,p.ink,-.7+i*.1,.8,.4,.025,.04,.2);for(const x of [-.7,.7])box(g,p.woodDark,x,.35,.3,.1,.7,.1);}
    else if(id==='drum'){cyl(g,p.coral,0,.3,0,.7,.6);for(const y of [.02,.6])cyl(g,p.cream,0,y,0,.72,.04);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(g,[Math.cos(a)*.36,.02,Math.sin(a)*.36],[Math.cos(a+.3)*.36,.58,Math.sin(a+.3)*.36],.02,p.woodDark);}}
    else if(id==='ball'||id==='basketBall')ball(g,p.coral,0,.3,0,.6);
    else if(id==='kite'){const m=box(g,p.coral,0,.55,0,.65,.65,.04);m.rotation.z=Math.PI/4;rod(g,[0,.1,0],[.2,0,0],.015,p.cream);}
    else if(id==='tent'){gable(g,2.2,2,0,1.8,p.coral);const entry=cone(g,p.woodDark,0,.65,1.01,1.1,1.3,.025);}
    else if(id==='campfire'||id==='fire'){for(const angle of [-.5,.5]){const log=cyl(g,p.woodDark,0,.08,0,.15,1);log.rotation.set(Math.PI/2,0,angle);}for(const x of [-.18,0,.18])cone(g,x?p.orange:p.gold,x,.4,0,.3,.7);}
    else if(id==='fence'||id==='gate'){for(let i=0;i<5;i++){box(g,p.cream,-1+i*.5,.45,0,.1,.9,.12);cone(g,p.cream,-1+i*.5,.95,0,.18,.2);}for(const y of [.3,.7])box(g,p.cream,0,y,0,2.2,.09,.09);}
    else if(id==='mountain'||id==='volcano'){cone(g,'#8aa08a',0,1.6,0,4,3.2,3.2);if(id==='mountain')cone(g,p.cream,0,2.85,0,1,1,1);else cyl(g,p.coral,0,3,0,.7,.08);}
    else if(id==='stone'||id==='ice')ball(g,id==='ice'?p.blue:'#93a398',0,.25,0,.85,.5,.65);
    else if(id==='shell'){for(let i=0;i<5;i++){const m=ball(g,i%2?p.pink:p.cream,(i-2)*.06,.08,0,.1,.16,.35);m.rotation.y=(i-2)*.25;}}
    else if(id==='sandcastle'){box(g,p.sand,0,.2,0,.7,.4,.6);for(const x of [-.35,.35]){cyl(g,p.sand,x,.45,0,.3,.8);cone(g,p.sand,x,.9,0,.35,.3);}}
    else if(id==='coral'||id==='seaweed'){for(let i=0;i<4;i++)rod(g,[0,0,0],[(i-1.5)*.2,.4+Math.sin(i)*.2,0],.08,id==='coral'?p.pink:p.leaf);}
    else if(id==='cloud'){for(let i=0;i<4;i++)ball(g,p.white,(i-1.5)*.4,.35+(i%2)*.14,0,.8,.6,.6);}
    else if(id==='sun'){ball(g,p.gold,0,.5,0,.65,.65,.15);for(let i=0;i<10;i++){const a=i*Math.PI/5;rod(g,[Math.cos(a)*.4,.5+Math.sin(a)*.4,0],[Math.cos(a)*.5,.5+Math.sin(a)*.5,0],.035,p.gold);}}
    else if(id==='moon'){torus(g,p.cream,0,.35,0,.65);ball(g,p.gold,.15,.5,.01,.35,.35,.13);}
    else if(id==='star'){const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?.12:.27;const x=Math.sin(a)*r,y=Math.cos(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false});generated.add(geometry);const m=new THREE.Mesh(geometry,mat(p.gold));m.position.y=.3;g.add(m);}
    else if(id==='rain'){for(let i=0;i<4;i++)ball(g,p.blue,(i%2)*.35,.2+Math.floor(i/2)*.6,0,.1,.3,.1);}
    else if(id==='snow'||id==='snowflake'){for(let i=0;i<3;i++){const a=i*Math.PI/3;rod(g,[Math.cos(a)*-.3,.3+Math.sin(a)*-.3,0],[Math.cos(a)*.3,.3+Math.sin(a)*.3,0],.035,p.white);}}
    else if(id==='rainbow'){for(let i=0;i<4;i++){const m=torus(g,[p.coral,p.gold,p.leaf,p.blue][i],0,.5,0,1.7-i*.2);}}
    else if(id==='snowman'){ball(g,p.white,0,.45,0,.9);ball(g,p.white,0,1.1,0,.6);cone(g,p.orange,0,1.1,.35,.12,.25).rotation.x=Math.PI/2;for(const x of [-.1,.1])ball(g,p.ink,x,1.2,.28,.04);cyl(g,p.woodDark,0,1.45,0,.65,.07);cyl(g,p.woodDark,0,1.58,0,.4,.25);}
    else if(id==='grass'){for(let i=0;i<5;i++)cone(g,i%2?p.leaf:p.leafLight,(i-2)*.14,.12,0,.15,.25);}
    else if(['floor','sand','soil','path','pond','stream','river','water'].includes(id)){cyl(g,['pond','stream','water','river'].includes(id)?p.water:id==='soil'?p.soil:p.sand,0,.02,0,1,.04,.7);}
    else if(id==='bell'){cone(g,p.gold,0,.3,0,.5,.5);ball(g,p.woodDark,0,.08,0,.09);torus(g,p.woodDark,0,.6,0,.15);}
    else if(id==='key'||id==='lock'){torus(g,p.gold,0,.35,0,.2);box(g,p.gold,0,.15,0,.045,.28,.045);box(g,p.gold,.06,.05,0,.13,.04,.04);if(id==='lock')box(g,p.woodDark,0,.17,0,.35,.3,.15);}
    else if(id==='magnifyingGlass'){torus(g,p.woodDark,0,.35,0,.3);rod(g,[0,.2,0],[0,0,0],.06,p.wood);}
    else if(id==='wall')box(g,p.cream,0,1,0,2.4,2,.15);
    else { // Last-resort crafted token; uncommon words remain individually named and accessible.
      cyl(g,p.wood,0,.04,0,.55,.08);ball(g,p.coral,0,.3,0,.45,.45,.4);torus(g,p.gold,0,.35,.2,.2);
    }
    return g;
  }
  function normalize(g,id) {g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),target=propSize(id);const content=new THREE.Group();while(g.children.length)content.add(g.children[0]);content.position.set(-center.x,-b.min.y,-center.z);g.add(content);g.scale.set(target.width/(size.x||1),target.height/(size.y||1),target.depth/(size.z||1));return g;}
  function batch(g) {g.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(g.matrixWorld).invert(),buckets=new Map();g.traverse(m=>{if(!m.isMesh)return;let parent=m;while(parent&&!parent.userData.wordId)parent=parent.parent;const semanticData={wordId:parent?.userData.wordId||g.userData.wordId,instanceId:parent?.userData.instanceId||g.userData.instanceId};const key=semanticData.instanceId+'/'+m.material.uuid;if(!buckets.has(key))buckets.set(key,{...semanticData,material:m.material,meshes:[]});buckets.get(key).meshes.push(m);});for(const b of buckets.values()){const parts=b.meshes.map(m=>{const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));return geometry;});const geometry=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());if(!geometry)continue;generated.add(geometry);const m=new THREE.Mesh(geometry,b.material);m.castShadow=true;m.receiveShadow=true;m.userData={wordId:b.wordId,instanceId:b.instanceId};g.add(m);b.meshes.forEach(mesh=>{mesh.removeFromParent();if(generated.has(mesh.geometry)){mesh.geometry.dispose();generated.delete(mesh.geometry);}});}return g;}
  return {create(id,{variant,instanceId=id,fixtures=true}={}){return batch(normalize(build(id,variant,instanceId,fixtures),id));},material:mat,geometry:geo,mesh,batch,release(root){root.traverse(o=>{if(o.geometry&&generated.has(o.geometry)){o.geometry.dispose();generated.delete(o.geometry);}});},dispose(){generated.forEach(g=>g.dispose());generated.clear();geometries.forEach(g=>g.dispose());geometries.clear();materials.forEach(m=>m.dispose());materials.clear();}};
}
