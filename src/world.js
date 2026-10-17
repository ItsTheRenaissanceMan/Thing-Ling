import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Every object in this little world is made from original, reusable geometry.
export function createWorld(container, { onSelect = () => {}, onRegionChange = () => {}, motion = true } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    const note = document.createElement('div');
    note.style.cssText = 'position:absolute;inset:0;display:grid;place-content:center;text-align:center;padding:32px;color:#365348;background:#d3e5da';
    note.textContent = 'Your island needs WebGL. Enable hardware acceleration to explore the 3D world. You can still learn from your field guide.';
    container.appendChild(note);
    return Object.fromEntries(['setRegion', 'setLearned', 'setRestored', 'setProjects', 'setActive', 'setMotion', 'focusObject', 'resize', 'dispose'].map(key => [key, () => {}]));
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c8dfd6');
  scene.fog = new THREE.Fog('#c8dfd6', 65, 120);
  const camera = new THREE.OrthographicCamera(-17, 17, 13, -13, 0.1, 160);
  camera.position.set(25, 30, 36);
  camera.lookAt(0, 0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;outline:none';
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D island. Drag to look around, scroll to zoom, and click objects to learn their names.');
  renderer.domElement.setAttribute('tabindex', '0');
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minZoom = 0.8;
  controls.maxZoom = 2.8;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI / 2.7;
  controls.target.set(0, 0.7, 0);
  controls.update();
  scene.add(new THREE.HemisphereLight('#fff8e7', '#92a9a2', 1.8));
  const sun = new THREE.DirectionalLight('#fff0d5', 2.5);
  sun.position.set(-14, 28, 13);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 70 });
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 4;
  scene.add(sun);
  const light = new THREE.DirectionalLight('#d8f1ef', 0.65);
  light.position.set(10, 15, -20);
  scene.add(light);

  const palette = {
    grass: '#a5bc79', grassLight: '#bed298', leaf: '#6e9a72', leafLight: '#91b889', darkLeaf: '#4f7f67',
    sand: '#e6cd9f', sandLight: '#f1deb4', cream: '#f3e6ca', coral: '#d58b73', roof: '#ba6c53', roofLight: '#d58a6b',
    wood: '#b28b61', woodDark: '#7d6650', blue: '#8cafb2', blueDark: '#547f88', water: '#a1cfc8', orange: '#e3a36a',
    pink: '#dda5a0', white: '#fff2da', ink: '#465852', soil: '#96735a', gold: '#daba77',
  };
  const materials = new Map();
  function mat(color, options = {}) {
    const key = color + JSON.stringify(options);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...options }));
    return materials.get(key);
  }
  function mesh(geometry, color, parent = scene, x = 0, y = 0, z = 0, options) {
    const m = new THREE.Mesh(geometry, mat(color, options));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(parent, color, x, y, z, w, h, d) { return mesh(new THREE.BoxGeometry(w, h, d), color, parent, x, y, z); }
  function ball(parent, color, x, y, z, r, detail = 1) { return mesh(new THREE.IcosahedronGeometry(r, detail), color, parent, x, y, z); }
  function cylinder(parent, color, x, y, z, rt, rb, h, n = 12) { return mesh(new THREE.CylinderGeometry(rt, rb, h, n), color, parent, x, y, z); }
  function group(x = 0, y = 0, z = 0, parent = scene) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  function lineBetween(parent, a, b, radius, color, segments = 7) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const rod = cylinder(parent, color, 0, 0, 0, radius, radius, start.distanceTo(end), segments);
    rod.position.copy(start).add(end).multiplyScalar(0.5);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return rod;
  }
  function torus(parent, color, x, y, z, r, t, rx = 0, ry = 0, rz = 0) {
    const m = mesh(new THREE.TorusGeometry(r, t, 5, 20), color, parent, x, y, z); m.rotation.set(rx, ry, rz); return m;
  }
  function textTexture(text, foreground = '#567260', background = '#f6e8c7', width = 512, height = 128) {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = foreground; ctx.font = `bold ${Math.round(height * 0.45)}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, width / 2, height / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }
  function sign(parent, text, x, y, z, w = 2, h = 0.5) {
    box(parent, palette.woodDark, x, y, z, w + 0.12, h + 0.12, 0.12);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: textTexture(text), roughness: 0.85 }));
    panel.position.set(x, y, z + 0.067); parent.add(panel); return panel;
  }
  const selectable = [], wordGroups = new Map(), markerData = [], discoveryData = new Map(), swaying = [], animated = [];
  const words = { apple: 'Apple', bread: 'Bread', coffee: 'Coffee', cup: 'Cup', water: 'Water', book: 'Book', chair: 'Chair', table: 'Table', house: 'House', door: 'Door', window: 'Window', tree: 'Tree', flower: 'Flower', carrot: 'Carrot', cat: 'Cat', dog: 'Dog', fish: 'Fish', boat: 'Boat', bicycle: 'Bicycle', hat: 'Hat', lamp: 'Lamp', key: 'Key', banana: 'Banana', orange: 'Orange', lemon: 'Lemon', strawberry: 'Strawberry', tomato: 'Tomato', egg: 'Egg', milk: 'Milk', cheese: 'Cheese', tea: 'Tea', bag: 'Bag', clock: 'Clock', bed: 'Bed', shoe: 'Shoe', umbrella: 'Umbrella', mountain: 'Mountain', sun: 'Sun', moon: 'Moon', star: 'Star', cloud: 'Cloud', rain: 'Rain', bridge: 'Bridge', bench: 'Bench', bird: 'Bird', butterfly: 'Butterfly', stone: 'Stone', shell: 'Shell' };
  function interactive(object, id, kind = 'word', name) {
    object.userData.interactive = { id, kind, name: name || words[id] || id };
    selectable.push(object);
    if (kind === 'word' && !wordGroups.has(id)) wordGroups.set(id, object);
    return object;
  }
  function marker(object, text, kind = 'word', offset = 1) {
    const button = document.createElement('button');
    button.className = `world-marker world-marker--${kind}`;
    button.textContent = text;
    button.title = object.userData.interactive.name;
    button.setAttribute('aria-label', `Talk to ${object.userData.interactive.name}`);
    button.style.cssText = 'position:absolute;left:0;top:0;z-index:3;transform:translate(-50%,-100%);pointer-events:auto;border:1px solid rgba(255,255,255,.85);border-radius:18px;background:rgba(255,250,234,.94);color:#405b4c;box-shadow:0 3px 12px #385a4420;font:600 11px system-ui;letter-spacing:.02em;padding:5px 10px;white-space:nowrap;cursor:pointer;backdrop-filter:blur(4px)';
    const activate = e => { e.stopPropagation(); onSelect({ ...object.userData.interactive }); };
    button.addEventListener('click', activate);
    container.appendChild(button);
    markerData.push({ object, button, offset, activate });
  }

  // Hand-shaped island, pale waterline and gently beveled banks.
  const boundary = [[-11, 0], [-10.6,-4], [-8.7,-6.6], [-5.3,-8], [-1.1,-8.5], [3,-8.1], [7.8,-7.1], [10,-4.6], [10.7,-.8], [10.6,3.7], [8.7,6.5], [5,8.1], [.5,8.8], [-3.6,7.7], [-6.8,6], [-9.4,3.8]];
  function islandShape(scale, y, depth, color) {
    const shape = new THREE.Shape();
    boundary.forEach(([x, z], i) => i ? shape.lineTo(x * scale, -z * scale) : shape.moveTo(x * scale, -z * scale)); shape.closePath();
    const m = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.15, bevelThickness: 0.15 }), color, scene, 0, y, 0);
    m.rotation.x = -Math.PI / 2; return m;
  }
  const waterPlane = mesh(new THREE.PlaneGeometry(400, 400), '#bcd8cf', scene, 0, -0.78, 0); waterPlane.rotation.x = -Math.PI / 2; waterPlane.castShadow = false;
  const islandFoam = islandShape(1.065, -0.77, 0.025, '#e0e9d5'); islandFoam.castShadow = false;
  islandShape(1, -0.6, 0.75, palette.sand);
  islandShape(0.965, 0.15, 0.18, palette.grass);
  const G = 0.5;
  // Fine water ripples are deliberately quiet; the world should feel like a slow afternoon.
  const rippleGroup = group();
  let seed = 31;
  function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  for (let i = 0; i < 65; i++) {
    const x = (random() - .5) * 48, z = (random() - .5) * 37;
    if ((x*x/150 + z*z/115) < 1.1) continue;
    const ripple = box(rippleGroup, i % 3 ? '#d3e6dc' : '#a8cfc4', x, -.755, z, .3 + random() * 1, .012, .025);
    ripple.rotation.y = -.16; ripple.castShadow = false;
  }
  function path(points, width, color = palette.sandLight) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x, G + .007, z)));
    const geo = new THREE.BufferGeometry(), vertices = [], indices = [];
    for (let i=0; i<=80; i++) {
      const t=i/80, p=curve.getPoint(t), tangent=curve.getTangent(t), side=new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(width/2);
      vertices.push(p.x+side.x,p.y,p.z+side.z,p.x-side.x,p.y,p.z-side.z);
      if(i<80){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const p=mesh(geo,color);p.material.side=THREE.DoubleSide;p.castShadow=false;return p;
  }
  path([[-7,3],[-4,2],[-1.8,.5],[0,-2],[1.7,-5]],1.65);
  path([[-1.8,.5],[2.2,1],[5,.8],[8.8,2.3]],1.5);
  path([[.1,1.3],[1.6,3.6],[4.6,6.8]],1.45);
  path([[1.8,-3.5],[4.8,-3.8],[7,-5]],1.1);
  // A little stream runs through the eastern half of the island.
  path([[4.7,-7.2],[4,-5.4],[4.3,-3.2],[3,-1],[3.3,2.1],[4,4.6],[6.8,7.5]],.72,palette.water);
  for (let i = 0; i < 25; i++) {
    const t=i/24*Math.PI*2, x=Math.cos(t)*(9.75+random()*.45), z=Math.sin(t)*(7.35+random()*.4);
    if(z>5 && x>2) continue;
    const b=ball(scene,i%2?palette.sandLight:palette.sand,x,.25,z,.2+random()*.17,0);b.scale.y=.5;
  }

  // Trees are a mixture of cypress, softly faceted orchard trees and sculpted shrubs.
  function tree(x,z,size=1,style=0,clickable=false) {
    const g=group(x,G,z);g.scale.setScalar(size);
    cylinder(g,palette.woodDark,0,.7,0,.11,.16,1.4,7);
    if(style===1){
      const crown=group(0,.6,0,g);
      for(let i=0;i<3;i++) cylinder(crown,[palette.darkLeaf,palette.leaf,palette.leafLight][i],0,.7+i*.53,0,.05,.59-i*.1,1.8-i*.15,7);
      swaying.push(crown);
    } else {
      lineBetween(g,[0,.85,0],[-.42,1.6,0],.07,palette.woodDark);
      const crown=group(0,1.6,0,g);
      ball(crown,palette.leaf,-.43,.16,.03,.66,1);ball(crown,palette.leafLight,.28,.36,0,.79,1);ball(crown,palette.leaf,.09,.12,.39,.65,1);
      swaying.push(crown);
    }
    if(clickable) interactive(g,'tree');return g;
  }
  [[-8,-4,1.15,0],[-9,-1.8,1.25,1],[-8.1,1.2,.95,0],[-7,-5.8,1,1],[-2.8,-6.8,1.05,0],[-.8,-7,1,1],[8.6,-2.7,.9,0],[8.8,1.2,1,1],[-5,5.5,.9,0],[-2.7,6.7,.7,1],[7,-6.9,.75,1],[9,-4,.85,1]].forEach((t,i)=>tree(...t,i===0));
  function shrub(x,z,s=1) { const g=group(x,G+.2,z);for(let i=0;i<3;i++)ball(g,[palette.leafLight,palette.leaf,palette.darkLeaf][i],(i-1)*.26,0,0,.35*s,1); return g; }
  [[-6.8,-3.8],[-3.4,-3.8],[-7,3.7],[-6.3,4.2],[.5,-6.8],[9,3.8],[-.9,6.4],[7.5,-2.8]].forEach(p=>shrub(...p));
  function flower(x,z,color=palette.pink,size=1,parent=scene,y=G) {
    const g=group(x,y,z,parent);g.scale.setScalar(size);
    cylinder(g,palette.darkLeaf,0,.19,0,.025,.025,.38,5);
    const leaf=ball(g,palette.leaf,.09,.12,0,.085,0);leaf.scale.set(1.4,.5,1);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4;ball(g,color,Math.cos(a)*.1,.4,Math.sin(a)*.1,.085,0);}
    ball(g,palette.gold,0,.44,0,.06,0);return g;
  }
  for(let i=0;i<65;i++){
    const x=(random()-.5)*18,z=(random()-.5)*13;
    if((x>-7.5&&x<8&&z>-5.8&&z<4.5)||x*x/90+z*z/53>.86)continue;
    flower(x,z,[palette.pink,'#f3d18b','#e8e5cd'][i%3],.5+random()*.5);
  }
  // Charming gabled buildings: individually laid roof tiles, deep doors, shutters and flower boxes.
  function roof(parent,w,d,y,h,color=palette.roof) {
    const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,h);shape.lineTo(w/2,0);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});
    const r=mesh(geo,color,parent,0,y,-d/2);
    for(let side of [-1,1]){
      const pitch=Math.atan2(h,w/2),len=Math.hypot(w/2,h);
      for(let row=0;row<6;row++)for(let col=0;col<Math.floor(d/.4);col++){
        const k=(row+.5)/6,xx=side*(w/2)*(1-k),yy=y+h*k+.035,zz=-d/2+.2+col*.4;
        const tile=box(parent,((row+col)%5===0)?(color===palette.roof?palette.roofLight:'#94afb0'):color,xx,yy,zz,len/6+.025,.055,.39);
        tile.rotation.z=-side*pitch;
      }
    }
    cylinder(parent,color===palette.roof?palette.roofLight:'#94afb0',0,y+h+.05,0,.095,.095,d+.1,8).rotation.x=Math.PI/2;
    return r;
  }
  function windowFront(parent,x,y,z,w=.7,h=.85,shutters=true){
    const g=group(x,y,z,parent);box(g,palette.cream,0,0,0,w+.14,h+.14,.13);box(g,palette.blueDark,0,0,.08,w,h,.04);
    box(g,'#b8d6cd',-.1,.12,.107,w*.38,h*.65,.02);box(g,palette.cream,0,0,.12,.045,h,.035);box(g,palette.cream,0,.03,.12,w,.045,.035);
    if(shutters)for(const s of [-1,1]){box(g,palette.blue,s*(w/2+.22),0,.03,.28,h+.08,.11);for(let k=0;k<4;k++)box(g,palette.blueDark,s*(w/2+.22),-.24+k*.16,.1,.24,.025,.025);}
    return g;
  }
  function door(parent,x,y,z,w=.78,h=1.55,color=palette.blueDark){
    const g=group(x,y,z,parent);box(g,palette.cream,0,h/2,0,w+.2,h+.14,.15);box(g,color,0,h/2,.09,w,h,.08);
    box(g,palette.blue,0,h*.72,.145,w*.67,h*.3,.025);box(g,palette.blue,0,h*.26,.145,w*.67,h*.28,.025);ball(g,palette.gold,w*.3,h*.5,.21,.045,1);
    return g;
  }
  function house(x,z,w,d,h,color,roofColor,type){
    const g=group(x,G,z);box(g,palette.sand,0,.12,0,w+.2,.24,d+.2);box(g,color,0,h/2+.15,0,w,h,d);
    roof(g,w+.5,d+.5,h+.15,1.35,roofColor);
    box(g,palette.cream,0,h+.1,d/2+.02,w+.2,.14,.18);
    for(const xx of [-w/2+.12,w/2-.12])box(g,palette.cream,xx,h/2,d/2+.045,.13,h,.14);
    const front=d/2+.1;
    if(type==='cafe'){
      interactive(door(g,-.75,.17,front,.82,1.65),'door');
      interactive(windowFront(g,1.05,1.42,front,1.3,1.1,false),'window');
      sign(g,'CAFÉ LINGUA',0,2.57,front+.04,2.9,.42);
      const awning=group(1.04,2.25,front+.58,g);
      for(let i=0;i<8;i++){const b=box(awning,i%2?'#f3dfbc':'#c98367',-.875+i*.25,0,0,.25,.11,1.22);b.rotation.x=.13;box(awning,i%2?'#f3dfbc':'#c98367',-.875+i*.25,-.12,.6,.25,.23,.08);}
      for(const xx of [.05,2.05])cylinder(g,palette.wood,xx,1.15,front+1.15,.04,.04,2.3,6);
      const chimney=group(-1.25,h+.7,-.6,g);box(chimney,palette.cream,0,.45,0,.52,.9,.6);box(chimney,palette.roof,0,.92,0,.68,.15,.72);
      const smoke=group(0,1.1,0,chimney);for(let i=0;i<3;i++){const p=ball(smoke,'#f0eee0',i*.15,i*.38,0,.18+i*.06,1);p.material=mat('#f0eee0',{transparent:true,opacity:.45});}animated.push({type:'smoke',object:smoke});
    } else {
      door(g,0,.17,front,.86,1.65,palette.blueDark);
      windowFront(g,-w*.32,1.45,front,.65,.8);
      windowFront(g,w*.32,1.45,front,.65,.8);
      const attic=windowFront(g,0,h+.55,front,.5,.65,false);attic.scale.setScalar(.85);
      for(const xx of [-w*.32,w*.32]){
        box(g,palette.wood,xx,.85,front+.14,.9,.25,.32);
        for(let i=0;i<4;i++)flower(xx-.3+i*.2,front+.15,palette.pink,.45,g,.98);
      }
      box(g,palette.cream,0,.18,front+.3,1.3,.22,.7);
    }
    return g;
  }
  const cafe=house(-4.6,-2.25,4.5,3.3,2.8,palette.coral,palette.roof,'cafe');
  const cottage=interactive(house(.35,-5.35,3.7,3.0,2.65,'#f0e2bc','#72979a','house'),'house');
  // A round clock on the cafe's side wall.
  const clock=group(-7.01,2.1,-2.3);clock.rotation.y=-Math.PI/2;
  cylinder(clock,palette.woodDark,0,0,0,.37,.37,.12,20).rotation.x=Math.PI/2;
  cylinder(clock,palette.cream,0,0,.08,.31,.31,.02,20).rotation.x=Math.PI/2;
  lineBetween(clock,[0,0,.1],[0,.2,.1],.018,palette.ink);lineBetween(clock,[0,0,.1],[.13,-.07,.1],.018,palette.ink);interactive(clock,'clock');
  // Lighthouse and its lantern gallery.
  const lighthouse=group(7.1,G,-5.3);
  cylinder(lighthouse,palette.cream,0,2.1,0,.62,.95,4.2,12);
  cylinder(lighthouse,palette.coral,0,1.25,0,.79,.84,.65,12);cylinder(lighthouse,palette.coral,0,3.1,0,.67,.71,.55,12);
  cylinder(lighthouse,palette.woodDark,0,4.23,0,1.03,1.03,.15,16);
  const lighthouseGlass=cylinder(lighthouse,'#b4d7d0',0,4.7,0,.55,.55,.8,12);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;cylinder(lighthouse,palette.woodDark,Math.cos(a)*.65,4.7,Math.sin(a)*.65,.035,.035,.86,6);cylinder(lighthouse,palette.cream,Math.cos(a)*.94,4.45,Math.sin(a)*.94,.025,.025,.46,6);}
  torus(lighthouse,palette.cream,0,4.65,0,.94,.027,Math.PI/2);
  cylinder(lighthouse,palette.roof,0,5.25,0,0,.89,.55,12);ball(lighthouse,palette.gold,0,5.6,0,.1,1);
  door(lighthouse,0,0,.87,.5,1.1,palette.blueDark);
  windowFront(lighthouse,0,2.35,.75,.3,.5,false);
  const flagpole=group(0,5.65,0,lighthouse);cylinder(flagpole,palette.woodDark,0,.35,0,.025,.025,.7,6);
  const flag=box(flagpole,palette.coral,.29,.57,0,.58,.3,.025);animated.push({type:'flag',object:flag});

  // Central square: a friendly fountain, cafe furniture and a busy market stall.
  cylinder(scene,palette.sand, -1.05,G+.02,1.55,2,2,.1,24);
  const fountain=group(-.3,G,1.9);
  cylinder(fountain,palette.cream,0,.19,0,.8,.88,.35,16);cylinder(fountain,palette.blue,0,.35,0,.66,.66,.07,16);
  torus(fountain,palette.sandLight,0,.4,0,.77,.11,Math.PI/2);
  cylinder(fountain,palette.cream,0,.64,0,.15,.2,.8,10);cylinder(fountain,palette.sandLight,0,1.05,0,.45,.38,.12,12);ball(fountain,palette.cream,0,1.26,0,.18,1);
  interactive(fountain,'water');
  function cafeTable(x,z){
    const g=group(x,G,z);cylinder(g,palette.wood,0,.94,0,.65,.65,.13,16);cylinder(g,palette.woodDark,0,.45,0,.065,.065,.9,8);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;lineBetween(g,[0,.22,0],[Math.cos(a)*.42,.03,Math.sin(a)*.42],.04,palette.woodDark);}
    return g;
  }
  function chair(x,z,rotation=0){
    const g=group(x,G,z);g.rotation.y=rotation;
    box(g,palette.blue,0,.48,0,.5,.09,.48);
    for(const xx of [-.18,.18]){for(const zz of [-.17,.17])cylinder(g,palette.woodDark,xx,.25,zz,.03,.04,.5,6);cylinder(g,palette.blue,xx,.82,-.2,.03,.03,.65,6);}
    box(g,palette.blue,0,1.05,-.2,.48,.18,.06);return g;
  }
  const table=interactive(cafeTable(-4.8,1.65),'table');interactive(chair(-5.75,1.8,Math.PI/2),'chair');chair(-3.9,1.5,-Math.PI/2);
  cafeTable(-6.6,3.35);chair(-7.4,3.3,Math.PI/2);chair(-6,4,Math.PI);
  function cup(x,y,z,id='cup',parent=scene,color=palette.cream){
    const g=group(x,y,z,parent);cylinder(g,color,0,.14,0,.14,.115,.26,12);cylinder(g,palette.woodDark,0,.278,0,.113,.113,.012,12);
    torus(g,color,.145,.15,0,.085,.029,0,Math.PI/2);cylinder(g,color,0,.015,0,.23,.23,.025,16);
    return interactive(g,id);
  }
  cup(-4.55,G+1.02,1.6,'coffee');cup(-6.65,G+1.02,3.3,'cup');
  const book=group(-5.03,G+1.04,1.55);book.rotation.y=.2;box(book,palette.blue,0,0,0,.38,.07,.5);box(book,palette.cream,0,.025,.01,.32,.04,.45);interactive(book,'book');
  const market=group(-2.1,G,-1.8);
  for(const x of [-1.05,1.05]){for(const z of [-.4,.4])cylinder(market,palette.wood,x,.8,z,.045,.045,1.6,7);}
  box(market,palette.wood,0,.78,0,2.5,.17,1.15);box(market,palette.woodDark,0,.35,.48,2.4,.65,.12);
  for(let i=0;i<10;i++){const s=box(market,i%2?'#eedab4':'#9caf88',-1.2+i*.26,1.75,0,.26,.1,1.5);s.rotation.x=-.05;box(market,i%2?'#eedab4':'#9caf88',-1.2+i*.26,1.6,.74,.26,.22,.05);}
  sign(market,'FRESH & LOCAL',0,.48,.565,1.8,.25);
  function fruit(x,y,z,color,kind='apple',parent=scene,s=.18){
    const g=group(x,y,z,parent);const f=ball(g,color,0,s*.8,0,s,1);
    if(kind==='lemon')f.scale.set(1.35,.8,.8);
    cylinder(g,palette.woodDark,0,s*1.8,0,.018,.024,.12,5);const l=ball(g,palette.leaf,.06,s*1.7,0,.05,0);l.scale.x=1.6;
    return interactive(g,kind);
  }
  for(let i=0;i<7;i++)fruit(-.82+(i%3)*.2,.92, -.17+Math.floor(i/3)*.18,'#c96753','apple',market,.13);
  for(let i=0;i<5;i++)fruit(.22+(i%3)*.19,.92,-.15+Math.floor(i/3)*.2,palette.orange,'orange',market,.13);
  for(let i=0;i<3;i++)fruit(.8+(i%2)*.15,.92,-.14+Math.floor(i/2)*.2,'#dfc56e','lemon',market,.11);
  const bread=group(-2.23,G+.97,-1.45);const loaf=ball(bread,'#d6a56f',0,.12,0,.24,1);loaf.scale.set(1.9,.7,.9);for(let i=0;i<3;i++){const cut=box(bread,palette.cream,-.17+i*.17,.265,0,.035,.025,.23);cut.rotation.y=-.3;}interactive(bread,'bread');
  // The first quest's apple has an unobstructed home on a cafe table.
  const questApple=fruit(-4.84,G+1.04,1.9,'#c96753','apple',scene,.19);wordGroups.set('apple',questApple);
  const banana=group(-1.38,G+.98,-1.65);for(let i=0;i<3;i++){const b=torus(banana,'#e3cd79',i*.065,.08,0,.13,.042,Math.PI/2,0,.4);b.geometry.dispose();b.geometry=new THREE.TorusGeometry(.14,.045,5,10,Math.PI*1.2);}interactive(banana,'banana');
  // Village noticeboard and the first sign of an adventure.
  const notice=group(-7.1,G,.6);cylinder(notice,palette.woodDark,-.53,.8,0,.055,.055,1.6,6);cylinder(notice,palette.woodDark,.53,.8,0,.055,.055,1.6,6);box(notice,palette.woodDark,0,1.5,0,1.5,1.15,.17);box(notice,'#dfc59c',0,1.5,.09,1.31,.98,.025);sign(notice,'W E L C O M E',0,1.85,.12,1.2,.2);
  box(notice,palette.cream,-.27,1.39,.12,.39,.49,.02).rotation.z=.08;box(notice,palette.pink,.27,1.38,.12,.32,.43,.02).rotation.z=-.09;
  // Bench, lamp and bicycle all have distinct, readable silhouettes.
  function bench(x,z,rotation=0){const g=group(x,G,z);g.rotation.y=rotation;for(let i=0;i<3;i++)box(g,palette.wood,0,.55,-.21+i*.21,1.65,.09,.18);for(const xx of [-.58,.58]){box(g,palette.woodDark,xx,.27,0,.13,.55,.45);box(g,palette.woodDark,xx,.86,-.25,.09,.65,.1);}for(let i=0;i<2;i++)box(g,palette.wood,0,.85+i*.2,-.29,1.65,.15,.08);return g;}
  interactive(bench(-2.6,4.65,.12),'bench');bench(6.8,-3.2,-.35);
  function lamp(x,z){const g=group(x,G,z);cylinder(g,palette.woodDark,0,1.25,0,.05,.085,2.5,8);cylinder(g,palette.woodDark,0,.1,0,.18,.22,.2,8);box(g,palette.gold,0,2.54,0,.28,.43,.28);cylinder(g,palette.woodDark,0,2.86,0,0,.3,.25,6);box(g,palette.woodDark,0,2.28,0,.36,.07,.36);return g;}
  interactive(lamp(-.9,-1.6),'lamp');lamp(4.7,4.1);lamp(-5.8,4.8);
  const bicycle=group(-5.6,G,-4.5);bicycle.rotation.y=-.25;
  for(const xx of [-.55,.55]){torus(bicycle,palette.ink,xx,.4,0,.38,.045);torus(bicycle,palette.cream,xx,.4,0,.3,.017);for(let i=0;i<6;i++){const a=i*Math.PI/3;lineBetween(bicycle,[xx,.4,0],[xx+Math.cos(a)*.34,.4+Math.sin(a)*.34,0],.009,palette.cream);}}
  [[[-.55,.4,0],[-.19,.91,0]], [[-.19,.91,0],[.15,.4,0]],[[.15,.4,0],[-.55,.4,0]],[[.15,.4,0],[.4,1.06,0]],[[.4,1.06,0],[-.19,.91,0]],[[.4,1.06,0],[.55,.4,0]]].forEach(p=>lineBetween(bicycle,...p,.035,palette.coral));box(bicycle,palette.woodDark,-.22,.97,0,.29,.07,.15);lineBetween(bicycle,[.4,1.06,0],[.35,1.25,0],.025,palette.ink);lineBetween(bicycle,[.35,1.25,-.15],[.35,1.25,.15],.025,palette.ink);interactive(bicycle,'bicycle');

  // Garden: a miniature working kitchen garden, orchard and potting shed.
  const garden=group(6.3,G,.6);
  for(let row=0;row<3;row++){
    box(garden,palette.wood,0,.1,-1.35+row*1.17,3.3,.21,.86);box(garden,palette.soil,0,.22,-1.35+row*1.17,3.1,.04,.69);
    for(let col=0;col<7;col++){
      const x=-1.28+col*.42,z=-1.35+row*1.17;
      if(row===0){const carrot=group(x,.25,z,garden);cylinder(carrot,palette.orange,0,.06,0,.11,.02,.25,7);for(let n=0;n<3;n++){const stem=ball(carrot,n%2?palette.leafLight:palette.darkLeaf,Math.sin(n*2)*.06,.27,Math.cos(n*2)*.06,.11,0);stem.scale.set(.5,1.9,.6);}interactive(carrot,'carrot');}
      else if(row===1){const tomato=group(x,.25,z,garden);cylinder(tomato,palette.wood,0,.33,0,.018,.018,.7,5);ball(tomato,palette.leaf,0,.3,0,.17,0);fruit(.08,.28,.03,'#ce7560','tomato',tomato,.09);}
      else{const cabbage=ball(garden,palette.leafLight,x,.38,z,.22,1);const mid=ball(garden,palette.leaf,x,.49,z,.12,1);}
    }
  }
  const flowerPot=group(7.95,G,3.1);cylinder(flowerPot,palette.coral,0,.22,0,.32,.22,.44,10);cylinder(flowerPot,palette.soil,0,.43,0,.28,.28,.03,10);flower(0,0,'#d8ad9e',1.6,flowerPot,.44);interactive(flowerPot,'flower');
  const watering=group(4.9,G,2.8);cylinder(watering,palette.blue,0,.22,0,.24,.24,.45,10);torus(watering,palette.blue,0,.56,0,.23,.035,0,Math.PI/2);lineBetween(watering,[.18,.19,0],[.56,.48,0],.075,palette.blue);cylinder(watering,palette.blue,.57,.48,0,.13,.05,.08,8).rotation.z=-.7;
  function fence(x,z,length,rot=0){const g=group(x,G,z);g.rotation.y=rot;for(let i=0;i<=length;i++){box(g,palette.cream,i*.58,.47,0,.11,.94,.11);cylinder(g,palette.cream,i*.58,.98,0,0,.11,.15,4);}for(const y of [.3,.7])box(g,palette.cream,length*.29,y,0,length*.58,.09,.08);return g;}
  fence(4.5,-1.7,6);fence(8.2,-1.7,7,Math.PI/2);fence(5.6,3.1,4);
  const appleTree=tree(8.4,-.2,.85,0);for(let i=0;i<6;i++){const a=i*2.4;fruit(Math.cos(a)*.5,1.75+(i%2)*.25,Math.sin(a)*.5,'#c96753','apple',appleTree,.105);}
  const sack=group(8.6,G,2.3);const sackbody=ball(sack,'#c7ab7b',0,.32,0,.4,1);sackbody.scale.y=1.25;cylinder(sack,palette.woodDark,0,.68,0,.16,.19,.06,8);interactive(sack,'bag');
  // An arched little bridge is the point where village paths meet the garden.
  const bridge=group(3.13,G+.1,.15);bridge.rotation.y=-.2;
  for(let i=0;i<11;i++){const x=-1.1+i*.22,y=.12+Math.sin(i/10*Math.PI)*.28;box(bridge,palette.wood,x,y,0,.2,.1,1.05);}
  for(const z of [-.55,.55]){
    for(const x of [-1.05,0,1.05])box(bridge,palette.woodDark,x,.57,z,.07,.9,.07);
    for(let i=0;i<10;i++){const a=-1.05+i*.21,b=a+.21;lineBetween(bridge,[a,.83+Math.sin(i/10*Math.PI)*.25,z],[b,.83+Math.sin((i+1)/10*Math.PI)*.25,z],.035,palette.wood);}
  }interactive(bridge,'bridge');

  // Wooden harbor with mooring ropes, stacked crates and a tiny fishing boat.
  const dock=group(6.4,.16,7.0);dock.rotation.y=-.27;
  for(let i=0;i<16;i++)box(dock,palette.wood,-.75,0,-1.1+i*.23,2.2,.16,.205);
  for(const x of [-1.85,.35])for(const z of [-1.1,.6,2.3]){cylinder(dock,palette.woodDark,x,-.18,z,.1,.12,1.35,7);cylinder(dock,palette.wood,x,.45,z,.14,.14,.12,8);}
  for(const x of [-1.75,.25])lineBetween(dock,[x,.35,-1],[x,.25,2.25],.032,palette.cream);
  function crate(x,y,z,s=.65,parent=scene){const g=group(x,y,z,parent);box(g,palette.wood,0,s/2,0,s,s,s);for(const xx of [-s*.4,s*.4])box(g,palette.woodDark,xx,s*.5,s/2+.02,.055,s,.035);for(const yy of [.12,.48])box(g,palette.woodDark,0,yy/s*.65,s/2+.03,s,.045,.045);const diag=box(g,palette.woodDark,0,s/2,s/2+.04,s*1.2,.055,.035);diag.rotation.z=.7;return g;}
  crate(4.35,G,6.2);crate(4.8,G,6.7,.55);crate(4.4,G+.66,6.2,.45);
  crate(-2.1,G,-.2,.5);bread.position.set(-2.1,G+.57,-.2);
  function boat(x,z,rotation=0){
    const g=group(x,-.45,z);g.rotation.y=rotation;
    const sh=new THREE.Shape();sh.moveTo(0,-1.35);sh.quadraticCurveTo(.82,-.6,.65,.8);sh.quadraticCurveTo(.45,1.35,0,1.45);sh.quadraticCurveTo(-.45,1.35,-.65,.8);sh.quadraticCurveTo(-.82,-.6,0,-1.35);
    const hull=mesh(new THREE.ExtrudeGeometry(sh,{depth:.45,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:1}),palette.blueDark,g,0,.05,0);hull.rotation.x=-Math.PI/2;
    const inner=mesh(new THREE.ShapeGeometry(sh),palette.cream,g,0,.52,0);inner.rotation.x=-Math.PI/2;inner.scale.setScalar(.85);
    for(let i=0;i<3;i++)box(g,palette.wood,0,.58,-.65+i*.7,1.15,.08,.23);
    lineBetween(g,[-.9,.7,.6],[.75,.68,-.6],.035,palette.woodDark);const paddle=box(g,palette.wood,-.85,.7,.57,.18,.04,.5);paddle.rotation.y=-.9;
    return g;
  }
  const fishingBoat=interactive(boat(8.05,8.05,-.62),'boat');animated.push({type:'boat',object:fishingBoat,base:-.45});
  const sailboat=boat(-8.8,8,.8);sailboat.scale.setScalar(.8);cylinder(sailboat,palette.woodDark,0,1.65,0,.04,.04,2.5,6);
  const sailGeo=new THREE.BufferGeometry();sailGeo.setAttribute('position',new THREE.Float32BufferAttribute([.06,.7,0,.06,2.8,0,1.15,.8,0],3));sailGeo.computeVertexNormals();mesh(sailGeo,palette.cream,sailboat,0,0,0,{side:THREE.DoubleSide});animated.push({type:'boat',object:sailboat,base:-.45});
  const fishing=group(5.3,G,5.7);const fish=ball(fishing,palette.blueDark,0,.16,0,.24,1);fish.scale.set(1.7,.6,.8);const tail=cylinder(fishing,palette.blue,-.43,.16,0,.22,0,.26,3);tail.rotation.z=Math.PI/2;ball(fishing,palette.ink,.26,.22,.12,.025,1);interactive(fishing,'fish');
  const shell=group(2.75,.3,7.6);for(let i=0;i<5;i++){const s=ball(shell,i%2?palette.pink:palette.cream,(i-2)*.07,.06,0,.12,0);s.scale.set(.65,.55,1.7);s.rotation.y=(i-2)*.2;}interactive(shell,'shell');
  const stone=ball(scene,'#92a59c',-8.6,.45,4.5,.5,0);stone.scale.set(1.3,.55,.9);interactive(stone,'stone');
  for(const [x,z,s] of [[-14,-3,.7],[13,-8,1.2],[12,7,.7],[-12,8,.5],[-4,-12,.8]]){const rock=ball(scene,'#99b6aa',x,-.4,z,s,0);rock.scale.set(1.2,.8,1);}

  // Warm, wordless characters whose poses and clothes distinguish their roles.
  function person(id,name,x,z,clothes,hat=false){
    const g=group(x,G,z);g.rotation.y=-.2;
    for(const side of [-1,1]){cylinder(g,palette.ink,side*.125,.29,0,.085,.07,.47,7);box(g,palette.woodDark,side*.13,.085,.065,.19,.13,.29);}
    cylinder(g,clothes,0,.75,0,.23,.28,.58,9);
    ball(g,'#e6b18c',0,1.3,0,.265,2);
    const hair=ball(g,'#695c4e',0,1.41,-.045,.267,1);hair.scale.set(1, .7, 1);
    for(const side of [-1,1]){ball(g,palette.ink,side*.085,1.32,.242,.021,1);lineBetween(g,[side*.24,.92,0],[side*.34,.58,.05],.073,clothes);ball(g,'#e6b18c',side*.34,.57,.05,.075,1);}
    const smile=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.045,1.22,.252),new THREE.Vector3(0,1.205,.262),new THREE.Vector3(.045,1.22,.252)]),new THREE.LineBasicMaterial({color:palette.ink}));g.add(smile);
    if(hat){cylinder(g,palette.sandLight,0,1.54,0,.35,.35,.06,12);cylinder(g,palette.sandLight,0,1.63,0,.21,.24,.19,12);cylinder(g,palette.coral,0,1.56,0,.24,.24,.045,12);}
    const shadow=cylinder(g,'#77986b',0,.008,0,.32,.32,.008,20);shadow.castShadow=false;shadow.material=mat('#77986b',{transparent:true,opacity:.22});
    interactive(g,id,'npc',name);marker(g,name,'npc',1.96);animated.push({type:'person',object:g,base:0});return g;
  }
  person('theo','Theo',-2.0,2.7,palette.blue,true);
  person('mika','Mika',-4,.1,palette.cream);person('jun','Jun',5.1,1.8,palette.pink,true);person('luna','Luna',5.9,5.3,palette.blueDark,true);
  // A sleepy cat and a small dog add life to the square.
  function pet(x,z,isDog){
    const g=group(x,G,z);const color=isDog?'#c99d73':'#e7c18e';const body=ball(g,color,0,.25,0,.26,1);body.scale.set(1.3, .85,.8);
    const head=ball(g,color,.28,.42,0,.19,1);for(const side of [-1,1]){const ear=cylinder(g,color,.22,.6,side*.11,0,.1,.19,3);ear.rotation.z=isDog?.6:0;ball(g,palette.ink,.42,.45,side*.07,.018,1);}
    for(const xx of [-.18,.2])for(const zz of [-.12,.12])cylinder(g,color,xx,.11,zz,.04,.04,.2,6);
    lineBetween(g,[-.28,.26,0],[-.47,.53,.03],.045,color);ball(g,palette.woodDark,.46,.38,0,.045,1);return interactive(g,isDog?'dog':'cat');
  }
  pet(-3.5,3.5,false);pet(.8,3.55,true);
  // A few additional discoveries on the cafe counter and porch.
  const extras=group(-3.5,G,-.35);
  const milk=group(-.3,0,0,extras);box(milk,palette.cream,0,.32,0,.23,.57,.23);roof(milk,.23,.23,.61,.12,palette.blue);box(milk,palette.blue,0,.32,.122,.17,.18,.012);interactive(milk,'milk');
  const cheese=group(.17,0,.02,extras);cylinder(cheese,palette.gold,0,.1,0,.18,.18,.2,3);ball(cheese,'#be995d',0,.2,.07,.035,1);interactive(cheese,'cheese');
  const egg=ball(extras,palette.cream,.55,.15,.02,.14,2);egg.scale.y=1.35;interactive(egg,'egg');
  const tea=cup(-3.2,G+1.03,1.8,'tea',scene,'#abc1a0');
  const strawberry=fruit(-2.9,G+.04,-.15,'#c77570','strawberry',scene,.17);
  const hat=group(-2.68,G+.7,4.45);cylinder(hat,palette.sandLight,0,.04,0,.32,.32,.05,12);cylinder(hat,palette.sandLight,0,.14,0,.18,.23,.2,12);interactive(hat,'hat');
  const key=group(-7.1,G+1.4,.73);torus(key,palette.gold,0,.02,.02,.045,.015);box(key,palette.gold,0,-.07,.02,.025,.13,.025);box(key,palette.gold,.025,-.12,.02,.06,.025,.025);interactive(key,'key');
  const umbrella=group(-6.6,G,3.35);cylinder(umbrella,palette.woodDark,0,1.45,0,.035,.035,2.9,7);const canopy=cylinder(umbrella,palette.cream,0,2.86,0,0,1.15,.52,8);for(let i=0;i<8;i++){const a=i*Math.PI/4;lineBetween(umbrella,[0,3.13,0],[Math.cos(a)*1.15,2.6,Math.sin(a)*1.15],.016,palette.wood);}interactive(umbrella,'umbrella');
  // A sleeping nook visible through an open-front tiny beach hut.
  const bed=group(-4.6,G,5.65);box(bed,palette.woodDark,0,.3,0,.8,.45,1.3);box(bed,palette.cream,0,.57,0,.8,.15,1.3);box(bed,palette.blue,0,.68,.16,.83,.12,.9);box(bed,palette.cream,0,.7,-.4,.56,.14,.27);box(bed,palette.wood,0,.8,-.66,.86,.8,.1);interactive(bed,'bed');
  const shoe=group(-4.05,G,5.7);const sole=ball(shoe,palette.woodDark,0,.08,0,.18,1);sole.scale.set(.7,.5,1.6);const upper=ball(shoe,palette.coral,0,.15,-.02,.15,1);upper.scale.set(.7,.7,1.3);interactive(shoe,'shoe');
  const butterfly=group(5.8,G+1.1,2.6);for(const side of [-1,1]){const wing=ball(butterfly,palette.gold,side*.1,0,0,.13,1);wing.scale.set(.9,.14,1.4);wing.rotation.z=side*.35;}cylinder(butterfly,palette.woodDark,0,0,0,.018,.018,.2,6).rotation.x=Math.PI/2;interactive(butterfly,'butterfly');animated.push({type:'butterfly',object:butterfly,base:G+1.1});
  // Distant details make the sea feel wide without competing with the island.
  for(let i=0;i<4;i++){
    const cloud=group(-15+i*9,7.4+(i%2)*1.2,-13-(i%2)*2);
    for(let j=0;j<4;j++){const puff=ball(cloud,'#edf0e2',(j-1.5)*.65,j%2*.25,0,.65,1);puff.scale.set(1.3,.62,.75);puff.castShadow=false;}
    if(i===0)interactive(cloud,'cloud');animated.push({type:'cloud',object:cloud,base:cloud.position.x});
  }
  const birds=[];
  for(let i=0;i<4;i++){
    const bird=group(-6+i*4,7+(i%2),-6+i);const wing1=lineBetween(bird,[-.33,.1,0],[0,0,0],.025,palette.cream);const wing2=lineBetween(bird,[0,0,0],[.33,.1,0],.025,palette.cream);
    interactive(bird,'bird');birds.push(bird);animated.push({type:'bird',object:bird,base:bird.position.y});
  }
  // The sky's words live on a little celestial sculpture near the cottage.
  const celestial=group(-.3,G,-3.2);cylinder(celestial,palette.wood,0,.4,0,.035,.035,.8,6);
  const sunDisc=ball(celestial,palette.gold,0,1.0,0,.25,1);interactive(sunDisc,'sun');
  const moon=torus(celestial,palette.cream,.54,.8,0,.18,.065);interactive(moon,'moon');
  const star=mesh(new THREE.OctahedronGeometry(.18),palette.gold,celestial,-.52,.75,0);star.rotation.z=.35;interactive(star,'star');
  const mountain=mesh(new THREE.ConeGeometry(.5,.8,5),'#7d9a8b',scene,-9.1,G+.4,2.8);interactive(mountain,'mountain');
  const rain=group(-8.8,G,3.4);cylinder(rain,palette.blue,0,.15,0,.22,.26,.3,10);for(let i=0;i<3;i++)lineBetween(rain,[-.12+i*.12,.35,0],[-.15+i*.12,.65,0],.017,palette.blueDark);interactive(rain,'rain');

  // Restoring the island changes its architecture and wildlife, one chapter at a time.
  const restorationGroups=[group(),group(),group()];
  restorationGroups.forEach(g=>{g.visible=false;});
  const warmMaterial=new THREE.MeshStandardMaterial({color:'#ffe7a4',emissive:'#f6bd58',emissiveIntensity:1,roughness:.6});
  function glow(parent,x,y,z,r=.1){const light=mesh(new THREE.IcosahedronGeometry(r,1),'#f4d494',parent,x,y,z);light.material=warmMaterial;light.castShadow=false;return light;}
  function paperLantern(parent,x,y,z,scale=1){
    const g=group(x,y,z,parent);g.scale.setScalar(scale);
    cylinder(g,palette.woodDark,0,.17,0,.018,.018,.33,6);
    const shade=ball(g,'#eac991',0,-.08,0,.19,1);shade.scale.set(1,1.3,1);shade.material=mat('#eac991',{emissive:'#d59b42',emissiveIntensity:.4});
    for(const yy of [-.3,.13])cylinder(g,palette.woodDark,0,yy,0,.105,.105,.04,8);
    return g;
  }
  const cafeReward=restorationGroups[0];
  const cablePoints=[];
  for(let i=0;i<=20;i++){
    const k=i/20,x=-6.9+k*6.05,z=-.22-k*1.3,y=3.6-Math.sin(k*Math.PI)*.46;
    cablePoints.push(new THREE.Vector3(x,y,z));
    if(i%2===0){lineBetween(cafeReward,[x,y,z],[x,y-.17,z],.01,palette.woodDark);glow(cafeReward,x,y-.23,z,.075);}
  }
  const cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints(cablePoints),new THREE.LineBasicMaterial({color:palette.woodDark}));cafeReward.add(cable);
  paperLantern(cafeReward,-6.65,2.7,-.08,.9);paperLantern(cafeReward,-2.55,2.7,-.08,.9);
  const warmWindow=mesh(new THREE.PlaneGeometry(1.24,1.02),'#ffe7a4',cafeReward,-3.55,G+1.42,-.367,{transparent:true,opacity:.43,emissive:'#f2b44e',emissiveIntensity:.45});warmWindow.castShadow=false;
  const gardenReward=restorationGroups[1];
  for(let i=0;i<32;i++){
    const side=i<16?0:1,k=i%16,a=k*2.4,r=.25+(k%4)*.16;
    flower((side?8.5:4.5)+Math.cos(a)*r,(side?3.5:-2.1)+Math.sin(a)*r,['#c58c87','#e7c876','#e5d8bf'][i%3],.75+random()*.35,gardenReward);
  }
  for(let i=0;i<3;i++){
    const b=group(4.7+i*1.1,G+1.1+(i%2)*.25,2.9-i*.7,gardenReward);
    for(const side of [-1,1]){const wing=ball(b,i%2?palette.pink:palette.gold,side*.11,0,0,.13,1);wing.scale.set(.9,.14,1.4);}
    cylinder(b,palette.woodDark,0,0,0,.018,.018,.2,6).rotation.x=Math.PI/2;animated.push({type:'butterfly',object:b,base:b.position.y});
  }
  const harborReward=restorationGroups[2];
  glow(harborReward,7.1,G+4.7,-5.3,.34);
  const beacon=new THREE.PointLight('#ffdb94',2,7,2);beacon.position.set(7.1,G+4.7,-5.3);harborReward.add(beacon);
  const beamStart=new THREE.Vector3(7.1,G+4.7,-5.3),beamEnd=new THREE.Vector3(12.5,G+3.3,4.6);
  const beam=mesh(new THREE.ConeGeometry(1.4,beamStart.distanceTo(beamEnd),20,1,true),'#f7dc9b',harborReward,0,0,0,{transparent:true,opacity:.095,depthWrite:false,side:THREE.DoubleSide,emissive:'#f7dc9b',emissiveIntensity:.25});
  beam.position.copy(beamStart).add(beamEnd).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),beamStart.clone().sub(beamEnd).normalize());beam.castShadow=false;
  paperLantern(harborReward,4.55,1.6,7.1,.7);paperLantern(harborReward,6.68,1.4,8.8,.7);
  // Optional projects occupy the clearings rather than replacing useful discoveries.
  const projectGroups={lanterns:group(),picnic:group(),wildflowers:group()};
  Object.values(projectGroups).forEach(g=>{g.visible=false;});
  for(const [x,z] of [[-6,2.4],[-3.8,3.3],[.8,.2],[1.2,4.8],[5,4.25],[3.9,-2.3]]){
    cylinder(projectGroups.lanterns,palette.woodDark,x,G+.32,z,.065,.09,.64,7);
    box(projectGroups.lanterns,palette.woodDark,x,G+.73,z,.29,.09,.29);
    const glass=box(projectGroups.lanterns,'#ead18e',x,G+.58,z,.22,.27,.22);glass.material=warmMaterial;
    cylinder(projectGroups.lanterns,palette.woodDark,x,G+.87,z,0,.24,.22,6);
  }
  const picnic=group(-5.05,G+.02,4.05,projectGroups.picnic);picnic.rotation.y=.18;
  for(let x=0;x<8;x++)for(let z=0;z<6;z++)box(picnic,(x+z)%2?'#d9a394':'#f0ddbb',-.875+x*.25,.008,-.625+z*.25,.247,.016,.247);
  const basket=group(.56,.05,-.38,picnic);cylinder(basket,palette.wood,0,.18,0,.22,.18,.36,9);torus(basket,palette.woodDark,0,.38,0,.21,.025,Math.PI/2);torus(basket,palette.woodDark,0,.52,0,.18,.025);
  const picnicBread=ball(picnic,'#d6a56f',-.15,.13,-.12,.2,1);picnicBread.scale.set(1.5,.6,.8);fruit(.27,.03,.25,'#c96753','apple',picnic,.12);
  for(const [x,z] of [[-1.25,0],[.95,.9]]){const cushion=ball(picnic,palette.blue,x,.1,z,.3,1);cushion.scale.set(1,.35,1);}
  for(let i=0;i<58;i++){
    const patch=i%3,a=i*2.4,r=.2+random()*.75;
    flower([-7.4,-1.6,8.65][patch]+Math.cos(a)*r,[3.6,6.4,-3.0][patch]+Math.sin(a)*r,['#d496a0','#e9c974','#e7e5cf'][i%3],.55+random()*.65,projectGroups.wildflowers);
  }

  // Batch static shapes without losing object identities, reward visibility or animated branches.
  // One tiled roof or meadow should cost a few material draws, rather than one draw per tile/petal.
  scene.updateMatrixWorld(true);
  const movingRoots=new Set([...swaying,...animated.map(a=>a.object)]);
  const batchRoots=new Set([scene,...restorationGroups,...Object.values(projectGroups),...selectable.filter(o=>o.isGroup),...[...movingRoots].filter(o=>o.isGroup)]);
  const buckets=new Map();
  scene.traverse(object=>{
    if(!object.isMesh||object===lighthouseGlass||movingRoots.has(object)||object.userData.interactive||Array.isArray(object.material))return;
    let root=object.parent;
    while(root&&!batchRoots.has(root))root=root.parent;
    if(!root)return;
    const key=`${root.uuid}/${object.material.uuid}/${object.castShadow}/${object.receiveShadow}`;
    if(!buckets.has(key))buckets.set(key,{root,material:object.material,cast:object.castShadow,receive:object.receiveShadow,objects:[]});
    buckets.get(key).objects.push(object);
  });
  for(const {root,material,cast,receive,objects} of buckets.values()){
    if(objects.length<2)continue;
    const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert();
    const geometries=objects.map(object=>{
      const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
      for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(name))geometry.deleteAttribute(name);
      if(!geometry.attributes.normal)geometry.computeVertexNormals();
      if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
      return geometry;
    });
    const geometry=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    if(!geometry)continue;
    const batch=new THREE.Mesh(geometry,material);batch.castShadow=cast;batch.receiveShadow=receive;root.add(batch);
    objects.forEach(object=>{object.removeFromParent();object.geometry.dispose();});
  }

  const tooltip=document.createElement('div');
  tooltip.className='world-tooltip';
  tooltip.style.cssText='position:absolute;z-index:5;display:none;pointer-events:none;transform:translate(-50%,-145%);background:#fff9e9;color:#435c4e;padding:7px 12px;border:1px solid #fff;border-radius:8px;font:600 12px system-ui;box-shadow:0 4px 14px #385a4420;white-space:nowrap';
  container.appendChild(tooltip);
  const ring=mesh(new THREE.TorusGeometry(.55,.025,6,40),'#fff5cf');ring.rotation.x=-Math.PI/2;ring.visible=false;ring.castShadow=false;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),projected=new THREE.Vector3();
  let hover=null,down=null,disposed=false,raf=0,frame=0,restored=0,restorationKey=null,focused=null,active=true,lastRender=0,lastPick=0;
  let activeRegion='village',cameraMove=null;
  const learned=new Set();
  function pick(event){
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(scene.children,true);
    for(const hit of hits){
      if(hit.object===ring)continue;
      let visible=true;for(let parent=hit.object;parent;parent=parent.parent)if(!parent.visible){visible=false;break;}if(!visible)continue;
      let object=hit.object;while(object&&!object.userData.interactive)object=object.parent;
      if(object)return object;
      // Opaque roofs, walls and hills correctly hide discoveries behind them.
      if(hit.object.material?.opacity!==0)return null;
    }
    return null;
  }
  function pointerMove(event){
    if(!active)return;
    if(down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>6){tooltip.style.display='none';return;}
    if(performance.now()-lastPick<45)return;lastPick=performance.now();
    hover=pick(event);renderer.domElement.style.cursor=hover?'pointer':down?'grabbing':'grab';
    if(hover){const rect=container.getBoundingClientRect();tooltip.textContent=`${learned.has(hover.userData.interactive.id)?'✓  ':''}${hover.userData.interactive.name}`;tooltip.style.left=`${event.clientX-rect.left}px`;tooltip.style.top=`${event.clientY-rect.top}px`;tooltip.style.display='block';}else tooltip.style.display='none';
  }
  function pointerDown(event){if(!active)return;down={x:event.clientX,y:event.clientY};cameraMove=null;}
  function pointerUp(event){if(active&&down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<6){const object=pick(event);if(object){onSelect({...object.userData.interactive});focused=object;}}down=null;}
  function pointerLeave(){hover=null;tooltip.style.display='none';down=null;}
  renderer.domElement.addEventListener('pointermove',pointerMove);
  renderer.domElement.addEventListener('pointerdown',pointerDown);
  renderer.domElement.addEventListener('pointerup',pointerUp);
  renderer.domElement.addEventListener('pointerleave',pointerLeave);
  function resize(){const w=container.clientWidth||1000,h=container.clientHeight||700;const aspect=w/h;const size=Math.max(12.2,14.6/aspect);camera.left=-size*aspect;camera.right=size*aspect;camera.top=size;camera.bottom=-size;camera.setViewOffset(w,h,w>650?Math.min(150,w*.105):0,w<=650?-h*.02:0,w,h);camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  let lastTime=performance.now();
  let animTime=0;
  function animate(){
    if(disposed)return;raf=requestAnimationFrame(animate);
    const now=performance.now();
    if(!active||document.hidden){lastTime=now;return;}
    if(now-lastRender<1000/30)return;
    const delta=Math.min((now-lastTime)/1000,.25);lastTime=now;lastRender=now;if(motion)animTime+=delta;
    const t=animTime;
    if(cameraMove){const k=1-Math.exp(-delta*4.5);controls.target.lerp(cameraMove.target,k);camera.position.lerp(cameraMove.position,k);camera.zoom=THREE.MathUtils.lerp(camera.zoom,cameraMove.zoom,k);camera.updateProjectionMatrix();if(controls.target.distanceTo(cameraMove.target)<.015&&Math.abs(camera.zoom-cameraMove.zoom)<.004)cameraMove=null;}
    controls.update();
    if(motion){
      swaying.forEach((tree,i)=>{tree.rotation.z=Math.sin(t*.65+i)*.018;tree.rotation.x=Math.cos(t*.55+i)*.012;});
      animated.forEach(({type,object,base},i)=>{
        if(type==='boat'){object.position.y=base+Math.sin(t*.75+i)*.04;object.rotation.z=Math.sin(t*.7+i)*.025;}
        if(type==='person')object.rotation.z=Math.sin(t*1.2+i)*.012;
        if(type==='smoke'){object.position.x=Math.sin(t*.3)*.1;object.scale.setScalar(.95+Math.sin(t*.5)*.08);}
        if(type==='flag')object.scale.z=1+Math.sin(t*2)*.05;
        if(type==='bird'){object.position.y=base+Math.sin(t*.6+i)*.2;object.rotation.z=Math.sin(t*2+i)*.15;object.position.x+=Math.sin(t*.2+i)*delta*.05;}
        if(type==='butterfly'){object.position.y=base+Math.sin(t*1.5)*.15;object.rotation.z=Math.sin(t*5)*.3;object.rotation.y=t*.2;}
        if(type==='cloud')object.position.x=base+Math.sin(t*.05+i)*.7;
      });
      rippleGroup.position.x=Math.sin(t*.17)*.05;
    }
    if(focused){focused.getWorldPosition(projected);ring.position.set(projected.x,G+.06,projected.z);ring.visible=true;ring.scale.setScalar(1+Math.sin(t*2)*.08);}else ring.visible=false;
    if(frame++%2===0){
      const w=container.clientWidth,h=container.clientHeight;
      markerData.forEach(({object,button,offset})=>{
        object.getWorldPosition(projected);projected.y+=offset;projected.project(camera);
        const x=(projected.x*.5+.5)*w,y=(-projected.y*.5+.5)*h;
        button.style.left=`${x}px`;button.style.top=`${y}px`;button.style.display=(x<15||x>w-15||y<20||y>h-30||projected.z>1)?'none':'block';
      });
      discoveryData.forEach(({object,button,offset})=>{
        object.getWorldPosition(projected);projected.y+=offset;projected.project(camera);
        const x=(projected.x*.5+.5)*w,y=(-projected.y*.5+.5)*h;
        button.style.left=`${x}px`;button.style.top=`${y}px`;button.style.display=(x<15||x>w-15||y<15||y>h-25||projected.z>1)?'none':'block';
      });
    }
    renderer.render(scene,camera);
  }
  animate();
  const regions={village:{target:new THREE.Vector3(-2,.7,0),zoom:1.12},garden:{target:new THREE.Vector3(5.5,.7,.6),zoom:1.55},harbor:{target:new THREE.Vector3(5.3,.5,5.9),zoom:1.55},island:{target:new THREE.Vector3(0,.7,0),zoom:1}};
  return {
    setRegion(region){const view=regions[region]||regions.village;const offset=new THREE.Vector3(25,29.3,36);cameraMove={target:view.target.clone(),position:view.target.clone().add(offset),zoom:view.zoom};if(activeRegion!==region){activeRegion=region;onRegionChange(region);}},
    setLearned(ids){
      learned.clear();(ids||[]).forEach(id=>learned.add(id));
      wordGroups.forEach((object,id)=>{
        object.userData.learned=learned.has(id);
        if(learned.has(id)&&!discoveryData.has(id)){
          const button=document.createElement('button');button.className='world-discovery-marker';button.textContent='✓';button.title=`Learned: ${words[id]}`;button.setAttribute('aria-label',`Review ${words[id]}`);
          button.style.cssText='position:absolute;left:0;top:0;z-index:2;transform:translate(-50%,-100%);width:17px;height:17px;padding:0;border:1.5px solid #fff8dc;border-radius:50%;background:#608267;color:#fff9e9;font:700 10px system-ui;box-shadow:0 2px 6px #385a4430;cursor:pointer';
          const activate=e=>{e.stopPropagation();onSelect({...object.userData.interactive});};button.addEventListener('click',activate);container.appendChild(button);
          const bounds=new THREE.Box3().setFromObject(object),position=new THREE.Vector3();object.getWorldPosition(position);
          discoveryData.set(id,{object,button,activate,offset:bounds.max.y-position.y+.2});
        }else if(!learned.has(id)&&discoveryData.has(id)){
          const data=discoveryData.get(id);data.button.removeEventListener('click',data.activate);data.button.remove();discoveryData.delete(id);
        }
      });
    },
    setRestored(input){
      const locations=['cafe','garden','harbor'];
      const ids=Array.isArray(input)?locations.filter(id=>input.includes(id)):locations.slice(0,Math.max(0,Math.min(3,Math.floor(Number(input)||0))));
      const key=ids.join(',');if(key===restorationKey)return;restorationKey=key;restored=ids.length;
      restorationGroups.forEach((g,i)=>{g.visible=ids.includes(locations[i]);});
      lighthouseGlass.material=ids.includes('harbor')?mat('#f1d897',{emissive:'#ffcb66',emissiveIntensity:.7,transparent:true,opacity:.8}):mat('#b4d7d0');
      const tint=new THREE.Color(palette.grass).lerp(new THREE.Color('#afc98a'),restored/3);const landMat=materials.get(palette.grass+'{}');if(landMat)landMat.color.copy(tint);
      container.dataset.restorations=key;
      renderer.domElement.setAttribute('aria-label',`Interactive 3D island. Drag to look around, scroll to zoom, and click objects to learn their names.${ids.length?` Restored locations: ${ids.join(', ')}.`:''}`);
      renderer.shadowMap.needsUpdate=true;
    },
    setProjects(ids){const projects=new Set(ids||[]);Object.entries(projectGroups).forEach(([id,object])=>{const visible=projects.has(id);if(object.visible!==visible){object.visible=visible;renderer.shadowMap.needsUpdate=true;}});},
    setActive(value){active=Boolean(value);controls.enabled=active;if(!active){tooltip.style.display='none';down=null;hover=null;}},
    setMotion(value){motion=Boolean(value);},
    focusObject(id){const object=wordGroups.get(id)||selectable.find(o=>o.userData.interactive?.id===id);if(!object)return;focused=object;object.getWorldPosition(projected);const target=new THREE.Vector3(projected.x,.7,projected.z);cameraMove={target,position:target.clone().add(new THREE.Vector3(25,29.3,36)),zoom:1.8};},
    resize,
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointerleave',pointerLeave);[...markerData,...discoveryData.values()].forEach(({button,activate})=>{button.removeEventListener('click',activate);button.remove();});tooltip.remove();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();},
  };
}
