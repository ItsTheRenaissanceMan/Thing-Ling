import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Deterministic authored content. Placement checks never drop an object to hide a collision.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vocab = JSON.parse(fs.readFileSync(path.join(root, 'native/data/vocabulary.json'), 'utf8'));
const additions = `
cashRegister|cash register|die Kasse|レジ|reji|caja registradora|收银机|shōuyínjī|home
refrigerator|refrigerator|der Kühlschrank|冷蔵庫|reizōko|nevera|冰箱|bīngxiāng|home
computer|computer|der Computer|コンピューター|konpyūtā|ordenador|电脑|diànnǎo|home
phone|telephone|das Telefon|電話|denwa|teléfono|电话|diànhuà|home
rice|rice|der Reis|米|kome|arroz|大米|dàmǐ|food
pasta|pasta|die Nudeln|パスタ|pasuta|pasta|意大利面|yìdàlìmiàn|food
chocolate|chocolate|die Schokolade|チョコレート|chokorēto|chocolate|巧克力|qiǎokèlì|food
juice|juice|der Saft|ジュース|jūsu|zumo|果汁|guǒzhī|food
yogurt|yogurt|der Joghurt|ヨーグルト|yōguruto|yogur|酸奶|suānnǎi|food
salt|salt|das Salz|塩|shio|sal|盐|yán|food
soap|soap|die Seife|石鹸|sekken|jabón|肥皂|féizào|home
cream|cream|die Sahne|生クリーム|namakurīmu|nata|奶油|nǎiyóu|food
cinnamon|cinnamon|der Zimt|シナモン|shinamon|canela|肉桂|ròuguì|food
mint|mint|die Minze|ミント|minto|menta|薄荷|bòhe|food
ice|ice|das Eis|氷|kōri|hielo|冰|bīng|food
vanilla|vanilla|die Vanille|バニラ|banira|vainilla|香草|xiāngcǎo|food
stamp|postage stamp|die Briefmarke|切手|kitte|sello|邮票|yóupiào|travel
car|car|das Auto|車|kuruma|coche|汽车|qìchē|travel
bus|bus|der Bus|バス|basu|autobús|公共汽车|gōnggòngqìchē|travel
trafficLight|traffic light|die Ampel|信号機|shingōki|semáforo|红绿灯|hónglǜdēng|travel
trashCan|rubbish bin|der Mülleimer|ごみ箱|gomibako|papelera|垃圾桶|lājītǒng|home
guitar|guitar|die Gitarre|ギター|gitā|guitarra|吉他|jítā|home
piano|piano|das Klavier|ピアノ|piano|piano|钢琴|gāngqín|home
drum|drum|die Trommel|太鼓|taiko|tambor|鼓|gǔ|home
microphone|microphone|das Mikrofon|マイク|maiku|micrófono|麦克风|màikèfēng|home
camera|camera|die Kamera|カメラ|kamera|cámara|相机|xiàngjī|home
screen|screen|der Bildschirm|画面|gamen|pantalla|屏幕|píngmù|home
ball|ball|der Ball|ボール|bōru|pelota|球|qiú|home
racket|racket|der Schläger|ラケット|raketto|raqueta|球拍|qiúpāi|home
medicine|medicine|die Medizin|薬|kusuri|medicina|药|yào|home
bandage|bandage|der Verband|包帯|hōtai|venda|绷带|bēngdài|home
thermometer|thermometer|das Thermometer|体温計|taionkei|termómetro|温度计|wēndùjì|home
toothbrush|toothbrush|die Zahnbürste|歯ブラシ|haburashi|cepillo de dientes|牙刷|yáshuā|home
notebook|notebook|das Heft|ノート|nōto|cuaderno|笔记本|bǐjìběn|home
scissors|scissors|die Schere|はさみ|hasami|tijeras|剪刀|jiǎndāo|home
fabric|fabric|der Stoff|布|nuno|tela|布料|bùliào|home
thread|thread|der Faden|糸|ito|hilo|线|xiàn|home
needle|needle|die Nadel|針|hari|aguja|针|zhēn|home
button|button|der Knopf|ボタン|botan|botón|纽扣|niǔkòu|home
suitcase|suitcase|der Koffer|スーツケース|sūtsukēsu|maleta|行李箱|xínglǐxiāng|travel
money|money|das Geld|お金|okane|dinero|钱|qián|home
coin|coin|die Münze|硬貨|kōka|moneda|硬币|yìngbì|home
popcorn|popcorn|das Popcorn|ポップコーン|poppukōn|palomitas|爆米花|bàomǐhuā|food
headphones|headphones|die Kopfhörer|ヘッドホン|heddohon|auriculares|耳机|ěrjī|home
speaker|loudspeaker|der Lautsprecher|スピーカー|supīkā|altavoz|扬声器|yángshēngqì|home
train|train|der Zug|電車|densha|tren|火车|huǒchē|travel
sausage|sausage|die Wurst|ソーセージ|sōsēji|salchicha|香肠|xiāngcháng|food
chicken|chicken meat|das Hähnchen|鶏肉|toriniku|pollo|鸡肉|jīròu|food
oil|cooking oil|das Öl|油|abura|aceite|食用油|shíyòngyóu|food
vinegar|vinegar|der Essig|酢|su|vinagre|醋|cù|food
pepperMill|pepper mill|die Pfeffermühle|胡椒挽き|koshōhiki|molinillo de pimienta|胡椒研磨器|hújiāo yánmóqì|home
apron|apron|die Schürze|エプロン|epuron|delantal|围裙|wéiqún|home
menu|menu|die Speisekarte|メニュー|menyū|carta|菜单|càidān|home
receipt|receipt|der Kassenbon|レシート|reshīto|recibo|收据|shōujù|home
calendar|calendar|der Kalender|カレンダー|karendā|calendario|日历|rìlì|home
plant|houseplant|die Zimmerpflanze|観葉植物|kan'yōshokubutsu|planta de interior|室内植物|shìnèi zhíwù|nature
paint|paint|die Farbe|絵の具|enogu|pintura|颜料|yánliào|home
paintbrush|paintbrush|der Pinsel|絵筆|efude|pincel|画笔|huàbǐ|home
helmet|helmet|der Helm|ヘルメット|herumetto|casco|头盔|tóukuī|travel
skateboard|skateboard|das Skateboard|スケートボード|sukētobōdo|monopatín|滑板|huábǎn|travel
`;
const extra = additions.trim().split('\n').map(line => {
  const [id, english, de, ja, romaji, es, zh, pinyin, category] = line.split('|');
  return {id, english, emoji:'◇', category, region:'village', translations:{de:{text:de,reading:de.replace(/^(der|die|das) /,'')},ja:{text:ja,reading:romaji},es:{text:es,reading:es},zh:{text:zh,reading:pinyin}}};
});
const words = new Set([...vocab.words, ...extra].map(w => w.id));
const extraJSON=JSON.stringify({words:extra},null,2)+'\n';
if(process.argv.includes('--check')){
  if(fs.readFileSync(path.join(root,'native/data/extra_vocabulary.json'),'utf8')!==extraJSON)throw new Error('extra_vocabulary.json differs from deterministic source; regenerate');
}else fs.writeFileSync(path.join(root,'native/data/extra_vocabulary.json'),extraJSON);

const venues = [
  ['school','Almanac Language School','school','emil','Civic Quarter','#d9dfc6'],
  ['clinic','Willow Community Clinic','clinic','hana','Civic Quarter','#d5e9e3'],
  ['library','The Turning Page Library','library','mei','Civic Quarter','#e1d6be'],
  ['museum','Museum of Everyday Wonders','museum','chen','Civic Quarter','#d9d4c6'],
  ['nightlife','Moonflower Night Market Club','nightlife','lin','Lantern Quarter','#d6c8db'],
  ['cinema','Starlight Picture House','cinema','sora','Lantern Quarter','#ddc7cc'],
  ['music-studio','Resonance Music Studio','music','mateo','Lantern Quarter','#d5d9e4'],
  ['sports-center','Windmill Recreation Hall','sports','liling','Lantern Quarter','#d9e4cd'],
  ['little-hello','Almanac Welcome Courtyard','courtyard','ada','Market Square','#e1d7bd'],
  ['supermarket','Everyday Supermarket','supermarket','greta','Market Square','#e5dfc6'],
  ['restaurant','The Copper Pot Restaurant','restaurant','diego','Market Square','#e0cbb6'],
  ['post-office','Lantern Town Post Office','post','akira','Market Square','#d8ddcc'],
  ['kettle-on','The Copper Tea House','tea','ren','Old Village','#d4d8c2'],
  ['breakfast-club','Sunrise Bakery','bakery','elsa','Old Village','#e6d4b9'],
  ['lantern-cafe','The Original Lantern Café','cafe','nico','Old Village','#e4ceb7'],
  ['bank','Cornerstone Community Bank','bank','leonie','Old Village','#d6ddcf'],
  ['first-seedlings','Jun’s Potting Greenhouse','garden','jun','Garden Terraces','#d7e2bd'],
  ['orchard-colors','Citrus Grove Farm Shop','orchard','ines','Garden Terraces','#e5ddb6'],
  ['small-neighbors','Willow Animal Sanctuary','sanctuary','kenji','Garden Terraces','#ddd3bf'],
  ['garden-in-bloom','Skyglass Conservatory','conservatory','wei','Garden Terraces','#cfe1d4'],
  ['workshop','The Brass Finch Workshop','workshop','pablo','Hearth Lane','#ddcdb5'],
  ['hotel','The Green Lantern Inn','hotel','otto','Hearth Lane','#e4d5c5'],
  ['tailor','Thread and Thimble Atelier','tailor','yuki','Hearth Lane','#e2d4df'],
  ['homecoming-parcel','Hearth Cottage','cottage','kai','Hearth Lane','#e5d5bc'],
  ['water-edge','Driftwood Cove Boathouse','cove','bo','Harbor Boardwalk','#cfdcda'],
  ['lost-and-found','The Parcel Exchange','exchange','carla','Harbor Boardwalk','#dfd7c4'],
  ['station','Lantern Central Station','station','rosa','Harbor Boardwalk','#d5dddc'],
  ['harbor-lanterns','Moonrise Lighthouse','lighthouse','anja','Harbor Boardwalk','#d3d9df'],
].map((v,index) => ({id:v[0],name:v[1],theme:v[2],host:v[3],district:v[4],floor:v[5],x:[-66,-22,22,66][index%4],z:-63+Math.floor(index/4)*21,index}));

const personData = [
 ['theo','Theo','town guide','town','A patient cartographer who remembers everyone’s first day.'],
 ['mika','Mika','café owner','lantern-cafe','A meticulous host who turns everyday service into conversation.'],
 ['jun','Jun','community gardener','first-seedlings','A quiet naturalist who shares the rhythms of the growing year.'],
 ['luna','Luna','harbor keeper','water-edge','An adventurous navigator devoted to her waterfront neighbors.'],
 ['greta','Greta','supermarket manager','supermarket','Friendly and exacting about prices, receipts and helping customers.'],
 ['diego','Diego','head chef','restaurant','Inventive, warm and determined that every guest feels welcome.'],
 ['akira','Akira','postal clerk','post-office','Knows every address and the story behind every parcel.'],
 ['lin','Lin','night market host','nightlife','Loves live music, regional food and hearing travelers’ stories.'],
 ['emil','Emil','language teacher','school','Makes challenging grammar feel like a useful tool for real life.'],
 ['hana','Hana','community nurse','clinic','Asks careful questions and explains health advice calmly.'],
 ['pablo','Pablo','repair technician','workshop','Believes everything deserves a second life.'],
 ['mei','Mei','librarian','library','Connects curious readers with unexpected adventures.'],
 ['otto','Otto','innkeeper','hotel','Remembers a guest’s breakfast order after one visit.'],
 ['yuki','Yuki','tailor','tailor','A precise craftsperson with a talent for colors and stories.'],
 ['rosa','Rosa','station supervisor','station','Keeps the town moving, even when plans change.'],
 ['chen','Chen','museum curator','museum','Collects the small objects that tell large human stories.'],
 ['leonie','Leonie','bank adviser','bank','Explains budgets and savings in welcoming, practical language.'],
 ['sora','Sora','cinema projectionist','cinema','Can recommend a film for every mood.'],
 ['mateo','Mateo','music producer','music-studio','Hears a possible song in every conversation.'],
 ['liling','Liling','sports coach','sports-center','Encourages steady progress and fair play.'],
 ['elsa','Elsa','baker','breakfast-club','Up before dawn to make bread for the whole town.'],
 ['ren','Ren','tea specialist','kettle-on','Treats a well-made cup of tea as an invitation to slow down.'],
 ['nico','Nico','barista','lantern-cafe','Practices latte recipes and local greetings with equal care.'],
 ['wei','Wei','conservatory scientist','garden-in-bloom','Explains weather through hands-on experiments.'],
 ['ines','Inés','orchard grower','orchard-colors','Knows which fruit is ready from its scent.'],
 ['kenji','Kenji','animal carer','small-neighbors','Understands what each small neighbor needs.'],
 ['anja','Anja','lighthouse engineer','harbor-lanterns','Keeps the light safe through fog and storms.'],
 ['bo','Bo','boat builder','water-edge','Repairs wooden boats and shares sea stories.'],
 ['carla','Carla','exchange clerk','lost-and-found','Finds the owner of even the most mysterious lost umbrella.'],
 ['kai','Kai','cottage resident','homecoming-parcel','Welcomes newcomers with thoughtful handmade gifts.'],
 ['ada','Ada','welcome volunteer','little-hello','Enjoys introducing strangers until they become friends.'],
 ['samira','Samira','market shopper','town','An enthusiastic cook hunting for seasonal ingredients.'],
 ['felix','Felix','delivery cyclist','town','Knows every shortcut and always stops for a chat.'],
 ['haru','Haru','student','town','Collects new words, postcards and interesting questions.'],
 ['luz','Luz','street musician','town','Fills the square with original music and warm conversation.'],
 ['tao','Tao','retired sailor','town','Walks the harbor each evening to watch the lights return.'],
];
const npcs = personData.map((p,i)=>({id:p[0],name:p[1],role:p[2],venue:p[3],personality:p[4],bio:p[4],color:['#b77862','#6e9185','#9387a0','#c29a64','#6c8fa0','#a68268'][i%6]}));
let sequence = 0;
function obj(map, wordId, x, z, size=[.65,.7,.65], opts={}) {
  if(!words.has(wordId)) throw new Error(`Unknown word ${wordId}`);
  const o = {id:`${map.id}-${wordId}-${String(++sequence).padStart(5,'0')}`,wordId,x:+x.toFixed(3),z:+z.toFixed(3),y:0,rotation:0,scale:1,size,solid:true,interactable:true,...opts};
  map.objects.push(o); return o;
}
function on(map,parent,wordId,x,z,size=[.5,.55,.5],y=parent.y+parent.size[1],opts={}) {
  return obj(map,wordId,x,z,size,{y,parentId:parent.id,solid:false,...opts});
}
function shelf(map,x,z,items,{levels=3,columns=4,width=4,variant='open-shelf',depth=1.2}={}) {
  const s=obj(map,'shelf',x,z,[width,2.85,depth],{variant});
  for(let row=0;row<levels;row++) for(let col=0;col<columns;col++) {
    const word=items[(row*columns+col)%items.length];
    on(map,s,word,x+(col-(columns-1)/2)*(width-.6)/columns,z,[Math.min(.58,(width-.6)/columns-.12),.52,.58],.36+row*.82,{variant:'stock'});
  }
  return s;
}
function counter(map,x,z,items,{width=5,depth=1.7,variant='counter',levels=1}={}) {
  const s=obj(map,'table',x,z,[width,1.1,depth],{variant});
  const count=items.length;
  for(let i=0;i<count;i++) on(map,s,items[i],x+(i-(count-1)/2)*(width-.8)/count,z,[Math.min(.7,(width-.8)/count-.08),.6,.6]);
  return s;
}
function dining(map,x,z,items=['cup','plate'],variant='dining') {
  const t=counter(map,x,z,items,{width:2.7,depth:1.7,variant});
  obj(map,'chair',x-2.05,z,[.85,1.5,.85],{rotation:Math.PI/2});
  obj(map,'chair',x+2.05,z,[.85,1.5,.85],{rotation:-Math.PI/2});
  return t;
}
function baseInterior(v) {
  const large=v.id==='supermarket', cafe=v.id==='lantern-cafe';
  const width=large?56:cafe?44:40,depth=large?48:cafe?38:36;
  return {id:v.id,name:v.name,description:`Explore ${v.name}: a fully furnished ${v.theme} with working stations, local people and practical language tasks.`,kind:'interior',ambience:v.theme,theme:v.theme,width,depth,spawn:[0,depth/2-4],districts:[],paths:[],objects:[],npcs:[],portals:[{id:`exit-${v.id}`,label:'Return to Lantern Town',x:0,z:depth/2-1.3,target:'town',spawn:[v.x,v.z+7.8],interactionRadius:2.8}],traffic:[],palette:{floor:v.floor,wall:'#f0e6d0',accent:['#9a6a53','#78957e','#688e9a','#a58a5c'][v.index%4]}};
}

const stock = ['apple','banana','orange','lemon','strawberry','tomato','carrot','bread','egg','milk','cheese','tea','coffee','water','flour','sugar','honey','butter','cookie','cake','rice','pasta','chocolate','juice','yogurt','salt','soap','lettuce','potato','onion','cucumber','pepper','cabbage','pear','grape','peach','cherry','pumpkin','sausage','chicken','oil','vinegar'];
const drinks=['coffee','tea','milk','water','sugar','honey','lemon','chocolate','cream','cinnamon','mint','ice','vanilla','cup','teapot','kettle','spoon','bottle'];
const garden=['seed','flowerpot','wateringCan','shovel','rake','carrot','tomato','strawberry','flower','soil','leaf','branch'];
const portable = ['book','paper','pen','pencil','notebook','map','compass','ticket'];
const harbor = ['shell','fish','rope','anchor','sail','paddle','net','fishingRod','compass','map','bottle','lantern'];
const interiors = venues.map(baseInterior);
for(const map of interiors) {
  const v=venues.find(v=>v.id===map.id),w=map.width/2,d=map.depth/2;
  // Every wall fixture and architectural part is represented by a word instance too.
  obj(map,'door',0,d-.42,[2.1,3.2,.2],{solid:false,variant:'exit'});
  for(const x of [-w+1.1,w-1.1]) for(const z of [-d+6,0,d-7]) obj(map,'window',x,z,[.18,1.7,2.3],{y:2,solid:false,variant:'indoor-window'});
  obj(map,'clock',0,-d+.45,[1.1,1.1,.18],{y:3.5,solid:false});
  obj(map,'sign',0,d-.4,[4,.7,.15],{y:3.8,solid:false,name:v.name});
  for(const x of [-w+1.6,w-1.6]) for(const z of [-d+1.8,d-2]) obj(map,'plant',x,z,[1.2,2.1,1.2],{variant:'potted'});
  // Authored venue-specific layouts. A continuous six-metre center aisle joins door and host.
  switch(v.theme) {
    case 'supermarket': {
      map.description='A large working supermarket: twelve stocked aisle racks, fresh produce, cold storage, three checkouts, staff preparation and a customer shopping route.';
      for(const x of [-19,-11,11,19]) for(const z of [-14,-5,4]) {
        const rack=shelf(map,x,z,stock.slice((x+z+80)%stock.length).concat(stock),{columns:8,levels:3,width:6.2,variant:'grocery-shelf',depth:1.5});
        on(map,rack,'sign',x,z,[4.4,.5,.18],3.05,{name:['Fresh produce','Pantry staples','Breakfast and dairy','Household essentials'][[-19,-11,11,19].indexOf(x)],variant:'aisle-sign'});
      }
      // 288 distinct shelf placements; produce and checkout objects are additional.
      for(const x of [-19,-10,10,19]) counter(map,x,15, ['cashRegister','receipt','bag'],{width:6,variant:'checkout'});
      for(const x of [-20,-12,12,20]) {const c=obj(map,'refrigerator',x,-21,[5,3,1.2],{variant:'glass-fridge'});for(let j=0;j<5;j++)on(map,c,['milk','yogurt','cheese','juice','butter'][j],x-1.6+j*.8,-21,[.55,.6,.6],.6);}
      break;
    }
    case 'cafe':
      map.description='The original Lantern Café, expanded into a lively café with eighteen ingredients, pastry displays, preparation counters, sink, espresso station and guest tables.';
      for(const x of [-15,-8,8,15]) shelf(map,x,-15,drinks,{columns:6,levels:3,width:5.5,variant:'cafe-ingredient-shelf'});
      counter(map,-11,-8,['coffee','kettle','cup','spoon','milk'],{width:8,variant:'espresso-counter'});
      counter(map,11,-8,['tea','teapot','water','honey','lemon'],{width:8,variant:'tea-counter'});
      counter(map,-11,-3,['cake','cookie','bread','chocolate'],{width:8,variant:'pastry-display'});
      counter(map,11,-3,['cashRegister','menu','receipt'],{width:8,variant:'service-counter'});
      for(const x of [-12,12]) for(const z of [4,11]) dining(map,x,z,['cup','plate','napkin']);
      obj(map,'sink',-19,-8,[2,1.2,1.8]); obj(map,'refrigerator',19,-8,[2,3,1.8]); break;
    case 'tea':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,['tea','teapot','cup','honey','mint','lemon','kettle','water'],{columns:5});
      counter(map,-10,-7,['tea','water','kettle','teapot','cup'],{width:7}); counter(map,10,-7,['honey','sugar','mint','lemon'],{width:7});
      for(const x of [-10,10]) for(const z of [1,9]) dining(map,x,z,['cup','teapot','cookie']);
      obj(map,'sink',-17,-7,[1.7,1.2,1.7]); obj(map,'stove',17,-7,[1.7,1.3,1.7]); break;
    case 'bakery':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,['bread','flour','egg','milk','cheese','butter','sugar','wheat'],{columns:5});
      for(const x of [-14,-7,7,14]) obj(map,'oven',x,-8,[3.8,2.4,2.5],{variant:'bakery-oven'});
      counter(map,-10,-2,['bread','cake','cookie','egg'],{width:7,variant:'bakery-display'});counter(map,10,-2,['flour','butter','milk','sugar'],{width:7,variant:'kneading'});
      for(const x of [-10,10]) dining(map,x,8,['bread','plate','cup']); break;
    case 'restaurant':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,['plate','bowl','rice','pasta','salt','oil','vinegar','pepperMill'],{columns:5});
      for(const x of [-14,-7,7,14]) counter(map,x,-7,['pan','knife','carrot'],{width:4.8,variant:'kitchen'});
      for(const x of [-11,11]) for(const z of [1,8]) dining(map,x,z,['plate','fork','knife','menu']);
      obj(map,'stove',-17,13,[2,1.4,2]);obj(map,'refrigerator',17,13,[2,3,2]);break;
    case 'post': case 'exchange':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,v.theme==='post'?['parcel','envelope','postcard','stamp','paper','ink','pen']:['bag','hat','shoe','umbrella','key','coat','scarf','sock'],{columns:5});
      for(const x of [-11,11]) for(const z of [-6,2]) counter(map,x,z,v.theme==='post'?['parcel','envelope','stamp','pen']:['bag','hat','shoe','umbrella'],{width:6,variant:'sorting-table'});
      counter(map,-10,10,['cashRegister','receipt','ticket'],{width:7});counter(map,10,10,['map','book','paper'],{width:7});
      if(v.theme==='exchange')obj(map,'bicycle',-17,10,[1.1,1.7,2.7]);break;
    case 'garden': case 'orchard': case 'sanctuary': case 'conservatory':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,v.theme==='orchard'?['banana','orange','lemon','apple','pear','grape','peach','cherry']:garden,{columns:5,variant:'potting-shelf'});
      for(const x of [-11,11]) for(const z of [-6,2,10]) {
        if(v.theme==='sanctuary') { const t=counter(map,x,z,['bowl','fish','hay'],{width:5.5,variant:'feeding-station'}); obj(map,['cat','dog','rabbit','bird','duck','turtle'][(x<0?0:3)+Math.round((z+6)/8)],x-3.6,z,[1,1,1],{variant:'animated-animal'}); }
        else counter(map,x,z,v.theme==='garden'?['carrot','tomato','strawberry','seed']:v.theme==='orchard'?['banana','orange','lemon','butterfly']:['flower','leaf','seed','water'],{width:5.7,variant:v.theme==='orchard'?'fruit-display':'raised-bed'});
      }
      obj(map,'tree',-17,-5,[2,4.2,2],{variant:'indoor-citrus'});obj(map,'stone',17,-5,[1.3,.7,1.3]);
      if(v.theme==='conservatory')for(const [word,x,z] of [['sun',-16,13],['rain',-7,13],['cloud',7,13],['mountain',16,13]])obj(map,word,x,z,[2.8,2.3,2],{variant:'education-exhibit'});
      break;
    case 'cove': case 'lighthouse':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,harbor,{columns:5,variant:'maritime-shelf'});
      for(const x of [-11,11]) for(const z of [-6,2]) counter(map,x,z,harbor.slice(z<0?0:4,z<0?4:8),{width:6,variant:'workbench'});
      obj(map,'boat',-11,10,[6,2.2,3.8],{variant:'drydock'});obj(map,'bridge',11,10,[6,1.3,3.8],{variant:'training-bridge'});
      for(const [word,x] of [['moon',-15],['star',-7],['lamp',7],['bench',15]])obj(map,word,x,word==='star'?11:15,[word==='bench'?3:1.2,1.8,1.1],{variant:'beacon-display'});
      break;
    case 'cottage':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,['book','key','bottle','candle','painting','parcel','cup','flower'],{columns:5,variant:'cottage-shelf'});
      obj(map,'bed',-12,-6,[6,1.5,4],{variant:'quilted'});obj(map,'sofa',11,-6,[6,1.8,2.3]);
      counter(map,-11,2,['house','key','parcel','paper'],{width:6,variant:'model-town'});dining(map,11,2,['cup','plate','bread']);
      counter(map,-11,10,['pan','kettle','milk','egg'],{width:6,variant:'cottage-kitchen'});counter(map,11,10,['lamp','radio','book'],{width:6});
      obj(map,'door',-7,-6,[.2,2.8,2],{solid:false,variant:'wardrobe'});obj(map,'window',16,-6,[.2,1.8,2.2],{y:1.5,solid:false});break;
    case 'school':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,['book','notebook','pencil','pen','paper','globe','map','compass'],{columns:5});
      for(const x of [-11,11])for(const z of [-6,2,10])dining(map,x,z,['notebook','pencil','book'],'school-desk');
      obj(map,'screen',0,-16,[5,3,.3],{y:1,solid:false,variant:'blackboard'});break;
    case 'library':
      for(const x of [-14,-7,7,14]) for(const z of [-13,-5,3])shelf(map,x,z,['book','book','book','notebook','paper'],{columns:6,variant:'bookcase'});
      for(const x of [-11,11])dining(map,x,11,['book','lamp','paper']);break;
    case 'clinic':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,['medicine','bandage','thermometer','soap','bottle','towel','toothbrush','water'],{columns:5,variant:'medicine-cabinet'});
      for(const x of [-11,11]) {obj(map,'bed',x,-6,[5.2,1.3,3.8],{variant:'examination'});counter(map,x,2,['thermometer','medicine','bandage','paper'],{width:6});dining(map,x,10,['cup','water','book']);}
      break;
    case 'workshop':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,['toolbox','hammer','nail','screw','wheel','rope','paint','paintbrush'],{columns:5,variant:'tool-rack'});
      for(const x of [-11,11])for(const z of [-6,2,10])counter(map,x,z,['hammer','toolbox','screw','log'],{width:6,variant:'workbench'});
      obj(map,'bicycle',-17,2,[1,1.6,2.5]);obj(map,'ladder',17,2,[1,3,2]);break;
    case 'tailor':
      for(const x of [-13,-6,6,13]) shelf(map,x,-14,['fabric','thread','needle','button','scissors','hat','scarf','dress'],{columns:5,variant:'fabric-rack'});
      for(const x of [-11,11])for(const z of [-6,2,10])counter(map,x,z,['fabric','scissors','thread','button'],{width:6,variant:'cutting-table'});
      obj(map,'mirror',-17,2,[.3,2.8,2]);obj(map,'coat',17,2,[1,2,1]);break;
    case 'hotel':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['key','towel','soap','pillow','blanket','bottle','map','ticket'],{columns:5,variant:'linen-cabinet'});
      for(const x of [-11,11]){obj(map,'bed',x,-6,[5,1.5,4],{variant:'guest-bed'});counter(map,x,2,['phone','key','map','suitcase'],{width:6});dining(map,x,10,['cup','water','book']);}break;
    case 'station':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['ticket','map','compass','suitcase','bag','umbrella','hat','postcard'],{columns:5,variant:'travel-shop'});
      for(const x of [-11,11])counter(map,x,-6,['computer','ticket','map','phone'],{width:6,variant:'ticket-counter'});
      for(const x of [-11,11])for(const z of [2,10]){obj(map,'bench',x,z,[6,1.5,1.6]);obj(map,'suitcase',x+3.8,z,[1,1.3,.8]);}
      break;
    case 'bank':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['money','coin','paper','pen','book','receipt','key','chest'],{columns:5,variant:'secure-cabinet'});
      for(const x of [-11,11])for(const z of [-6,2,10])dining(map,x,z,['computer','paper','pen','coin'],'consultation-desk');break;
    case 'museum':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['crystal','shell','globe','compass','treasure','feather','stone','musicBox'],{columns:5,variant:'glass-display'});
      for(const x of [-11,11])for(const z of [-6,2,10])counter(map,x,z,['painting','bowl','crystal','shell'],{width:6,variant:'museum-plinth'});break;
    case 'cinema':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['popcorn','juice','water','chocolate','cookie','ticket'],{columns:5,variant:'cinema-snacks'});
      obj(map,'screen',0,-10,[9,4,.3],{y:1,solid:false,variant:'cinema-screen'});
      for(const x of [-14,-10,-6,6,10,14])for(const z of [-5,0,5,10])obj(map,'chair',x,z,[1.8,1.8,1.8],{variant:'cinema-seat'});
      counter(map,-11,15,['cashRegister','ticket','popcorn'],{width:6});counter(map,11,15,['juice','chocolate','receipt'],{width:6});break;
    case 'music':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['headphones','microphone','radio','musicBox','paper','guitar','drum','camera'],{columns:5,variant:'music-equipment'});
      obj(map,'piano',-11,-6,[6,2.1,3]);obj(map,'drum',11,-6,[3.4,2,3.4]);
      for(const x of [-11,11])for(const z of [2,10])counter(map,x,z,['microphone','headphones','computer','speaker'],{width:6,variant:'mixing-desk'});break;
    case 'nightlife':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['juice','water','lemon','mint','ice','cup','bottle','chocolate'],{columns:5,variant:'night-bar'});
      counter(map,-11,-6,['microphone','guitar','speaker','radio'],{width:6,variant:'stage'});counter(map,11,-6,['juice','mint','lemon','ice'],{width:6,variant:'mocktail-bar'});
      for(const x of [-11,11])for(const z of [2,10])dining(map,x,z,['cup','menu','candle']);break;
    case 'sports':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['ball','racket','towel','water','helmet','skateboard','shoe','bag'],{columns:5,variant:'sports-lockers'});
      for(const x of [-11,11])for(const z of [-6,2,10])counter(map,x,z,['ball','racket','water','towel'],{width:6,variant:'equipment-station'});break;
    case 'courtyard':
      for(const x of [-13,-6,6,13])shelf(map,x,-14,['book','apple','flower','map','paper','postcard','cup','seed'],{columns:5,variant:'welcome-display'});
      obj(map,'fountain',-11,-6,[4.6,2.8,4.6]);counter(map,11,-6,['book','apple','flower','map'],{width:6});
      for(const x of [-11,11])for(const z of [2,10])dining(map,x,z,['apple','book','flower']);break;
  }
  // Interior architecture is specific to the venue, with open door gaps and routes
  // checked below. Hotel bedrooms, exam bays and gallery wings are real spaces.
  if(v.theme==='hotel') for(const side of [-1,1]) {
    obj(map,'wall',side*11,-10.5,[14,2.7,.22],{variant:'guest-room-partition'});
    for(const [cx,width] of [[14,8],[6,4]])obj(map,'wall',side*cx,-1.3,[width,2.7,.22],{variant:'guest-room-partition'});
    obj(map,'sign',side*9,-1.1,[1.3,.4,.16],{y:2.8,solid:false,name:`Room ${side<0?'101':'102'}`});
  }
  if(v.theme==='clinic')for(const side of [-1,1]) {
    obj(map,'curtain',side*7.5,-6,[.15,2.4,4.8],{variant:'examination-privacy'});
    obj(map,'curtain',side*14.5,-6,[.15,2.4,4.8],{variant:'examination-privacy'});
  }
  if(v.theme==='cottage')for(const side of [-1,1])obj(map,'wall',side*4.2,-6,[.22,2.6,7],{variant:'cottage-room-wall'});
  if(v.theme==='museum')for(const side of [-1,1])for(const z of [-6,5])obj(map,'wall',side*4.2,z,[.22,2.7,6],{variant:'gallery-wing'});
  for(const x of [-13,-6,6,13])obj(map,'painting',x,-d+.32,[2.4,1.6,.12],{y:2,solid:false,variant:v.theme,name:`${v.name} wall illustration`});
  for(const side of [-1,1]){
    obj(map,'lamp',side*(w-2),d-(v.theme==='restaurant'?11:6),[.7,2.6,.7],{variant:'interior-floor-lamp'});
    obj(map,'trashCan',side*(w-2),d-9,[.8,1.1,.8]);
  }
  // A host has clear space to greet a walking player; original mission patrons remain present.
  map.npcs.push({id:v.host,x:0,z:-5,route:[[0,-5],[0,-9],[0,-5],[0,1]],role:'host'});
  const patron = ['little-hello','homecoming-parcel'].includes(v.id)?'theo':['kettle-on','breakfast-club','lantern-cafe'].includes(v.id)?'mika':['first-seedlings','orchard-colors','small-neighbors','garden-in-bloom'].includes(v.id)?'jun':['water-edge','lost-and-found','harbor-lanterns'].includes(v.id)?'luna':null;
  if(patron && patron!==v.host)map.npcs.push({id:patron,x:0,z:5,route:[[0,5],[1,5],[1,8],[0,8]],role:'mission-giver'});
  // Physical mission extras are placed on a dedicated entry-side table, never granted by a label click.
  const questExtras={
    'little-hello':['apple','book','flower'], 'kettle-on':['coffee','cup','water','tea'],
    'breakfast-club':['bread','egg','milk','cheese'], 'lantern-cafe':['cup','lamp'],
    'first-seedlings':['carrot','tomato','strawberry'], 'orchard-colors':['banana','orange','lemon','butterfly'],
    'small-neighbors':['fish','stone'], 'garden-in-bloom':['flower'], 'water-edge':['shell','fish'],
    'lost-and-found':['bag','hat','shoe','umbrella'], 'homecoming-parcel':['key'], 'harbor-lanterns':['lamp']
  };
  if(questExtras[map.id])counter(map,-7,d-3,questExtras[map.id],{width:5,depth:1.5,variant:'mission-supplies'});
}

const town={id:'town',name:'Lantern Town',description:'A living, walkable town: the original café, fountain square, market stall, terraced garden, orchard, stone bridge, harbor piers and lighthouse are joined by civic streets, shops, nightlife and homes.',kind:'outdoor',ambience:'town',theme:'town',width:180,depth:180,spawn:[0,3],districts:[{id:'village',name:'Old Village',x:0,z:3},{id:'market',name:'Market Square',x:0,z:-21},{id:'civic',name:'Civic Quarter',x:0,z:-63},{id:'nightlife',name:'Lantern Quarter',x:0,z:-42},{id:'garden',name:'Garden Terraces',x:0,z:21},{id:'hearth',name:'Hearth Lane',x:0,z:42},{id:'harbor',name:'Harbor Boardwalk',x:0,z:63}],paths:[],objects:[],npcs:[],portals:[],traffic:[],palette:{floor:'#b2c58f',wall:'#ead9bd',accent:'#ad6f56'}};
for(const x of [-44,0,44])town.paths.push({points:[[x,-77],[x,77]],width:6,kind:'road'});
for(const z of [-52.5,-31.5,-10.5,10.5,31.5,52.5])town.paths.push({points:[[-86,z],[86,z]],width:4,kind:'road'});
for(const v of venues) {
  const isLighthouse=v.id==='harbor-lanterns';
  const b=obj(town,isLighthouse?'lighthouse':'house',v.x,v.z,isLighthouse?[8,14,8]:[12,7,10],{id:`building-${v.id}`,variant:v.theme,name:v.name,buildingMap:v.id});
  const front=isLighthouse?4:5;
  on(town,b,'door',v.x,v.z+front+.06,[2.1,3.1,.16],0,{variant:'building-door'});
  for(const dx of [-3.3,3.3])on(town,b,'window',v.x+dx,v.z+front+.07,[1.7,1.4,.15],2.5,{variant:'shuttered'});
  on(town,b,'sign',v.x,v.z+front+.09,[4,.65,.14],4.2,{name:v.name});
  on(town,b,'chimney',v.x+(isLighthouse?3:4.8),v.z-2,[1.1,2,1.1],6.6,{variant:'brick'});
  on(town,b,'flag',v.x-4.5,v.z+3,[.6,2.2,.4],6.2,{variant:'town-banner'});
  town.portals.push({id:`enter-${v.id}`,label:`Enter ${v.name}`,x:v.x,z:v.z+front+1.4,target:v.id,spawn:[0,interiors.find(m=>m.id===v.id).depth/2-4],buildingId:b.id,interactionRadius:2.7});
  town.paths.push({points:[[v.x,v.z+front+1.5],[v.x,v.z+9.4]],width:3,kind:'footpath'});
  for(const side of [-1,1]) {
    obj(town,'lamp',v.x+side*8,v.z+7,[.7,3.3,.7],{variant:v.district==='Lantern Quarter'?'paper-lantern':'street-lamp'});
    obj(town,'tree',v.x+side*16,v.z-6,[2.8,5,2.8],{variant:v.district==='Garden Terraces'?'fruit-tree':'shade-tree'});
    obj(town,'bush',v.x+side*16,v.z-1,[2.2,1.4,2.2]);
    for(const dz of [-7,-3,1,5])obj(town,'fence',v.x+side*19,v.z+dz,[.2,1.2,2.8],{variant:'picket'});
    for(const dx of [10.2,12.4])for(const dz of [-7,-4.8,-2.6])obj(town,v.district==='Garden Terraces'?['carrot','tomato','flower'][(Math.round((dz+7)/2.2))%3]:'flower',v.x+side*dx,v.z+dz,[.65,.8,.65],{variant:v.district==='Garden Terraces'?'garden-row':'flower-border'});
  }
  const t=counter(town,v.x-12,v.z+4.6,v.district==='Market Square'?['apple','bread','cheese','bottle']:v.district==='Garden Terraces'?['seed','flowerpot','wateringCan','shovel']:v.district==='Harbor Boardwalk'?['shell','fish','rope','compass']:['cup','book','flower','apple'],{width:3.2,depth:1.5,variant:v.district==='Market Square'?'market-stall':'garden-table'});
  obj(town,'chair',v.x-14.5,v.z+4.6,[1,1.5,1]);obj(town,'chair',v.x-9.5,v.z+4.6,[1,1.5,1]);
  obj(town,'bench',v.x+12,v.z+5,[3.4,1.5,1.1]);
  obj(town,'mailbox',v.x-6.8,v.z+7,[.75,1.6,.7]);obj(town,'trashCan',v.x+16,v.z+5,[.9,1.3,.9]);
  obj(town,'bicycle',v.x+12,v.z+8,[2.3,1.5,.7]);
  // Distinctive details retain the original island's landmarks in their matching neighborhoods.
  if(v.id==='lantern-cafe') {obj(town,'fountain',v.x+12,v.z,[3.4,2.3,3.4]);for(const dx of [-4,4])on(town,b,'lantern',v.x+dx,v.z+5.7,[.7,.9,.7],3.9,{variant:'glowing'});}
  if(v.id==='first-seedlings') {obj(town,'well',v.x+12,v.z+1,[2.5,2,2.5]);obj(town,'wateringCan',v.x+16,v.z+8,[.85,.8,.7]);obj(town,'goat',v.x-12,v.z+1,[1.8,1.5,1.6],{variant:'animated-animal'});obj(town,'hen',v.x-15,v.z+1,[.7,.8,.8],{variant:'animated-animal'});}
  if(v.id==='orchard-colors') {for(const dx of [-4,0,4])obj(town,'flowerpot',v.x+dx,v.z-7.6,[1.2,1.5,1.2],{variant:'citrus-pot'});obj(town,'cow',v.x+12,v.z+1,[2.3,2.1,2.5],{variant:'animated-animal'});obj(town,'horse',v.x-12,v.z+1,[2.1,2.4,2.8],{variant:'animated-animal'});obj(town,'beehive',v.x+16,v.z+8,[1,1.4,1]);obj(town,'bee',v.x+16,v.z+8,[.45,.4,.45],{y:1.8,solid:false,variant:'animated-insect'});}
  if(v.id==='small-neighbors') {obj(town,'cat',v.x+12,v.z+1,[1,.8,1.2],{variant:'animated-animal'});obj(town,'dog',v.x-12,v.z+8,[1.3,1.1,1.5],{variant:'animated-animal'});}
  if(v.id==='garden-in-bloom'){obj(town,'pond',v.x+12,v.z+1,[3.2,.15,2.8],{solid:false,variant:'fish-pond'});obj(town,'sheep',v.x-12,v.z+1,[1.8,1.5,1.9],{variant:'animated-animal'});}
  if(v.id==='water-edge') {obj(town,'boat',v.x+12,v.z+1,[4.2,1.7,2.1],{variant:'harbor-boat'});obj(town,'anchor',v.x-17,v.z+7,[1,1.6,1]);}
  if(v.id==='lost-and-found') {obj(town,'barrel',v.x+12,v.z+1,[1.4,1.7,1.4]);obj(town,'crate',v.x+15,v.z+1,[1.3,1.3,1.3]);}
  if(v.id==='harbor-lanterns') {obj(town,'beacon',v.x+12,v.z+1,[1.2,2.2,1.2]);obj(town,'rope',v.x-17,v.z+7,[1.2,.5,1.2]);}
  // Front-of-parcel host stands beside the entrance, outside its opening and footpath.
  town.npcs.push({id:v.host,x:v.x+4,z:v.z+7.4,route:[[v.x+4,v.z+7.4],[v.x+5,v.z+7.4],[v.x+5,v.z+8.5],[v.x+4,v.z+8.5]],role:'neighbor'});
}
// Original village/garden/harbor guides remain at meaningful visible locations.
town.npcs.push({id:'theo',x:4,z:3,route:[[4,3],[6,3],[6,6],[4,6]],role:'town guide'});
town.npcs.push({id:'mika',x:27,z:8,route:[[27,8],[29,8],[29,9],[27,9]],role:'café owner'});
town.npcs.push({id:'luna',x:-60,z:72,route:[[-60,72],[-57,72],[-57,74],[-60,74]],role:'harbor keeper'});
for(const [id,x,z] of [['samira',-2.1,-21],['felix',-2.1,0],['haru',2.1,-63],['luz',-2.1,-42],['tao',2.1,67]])town.npcs.push({id,x,z,route:[[x,z],[x,z+5],[x,z+2],[x,z]],role:'resident'});
// A pedestrian waterfront boardwalk runs beyond the last row of buildings.
town.paths.push({points:[[-85,76],[85,76]],width:4.5,kind:'boardwalk'});
for(const x of [-78,-60,-42,-24,-6,12,30,48,66,84]) {
  const dock=obj(town,'dock',x,77,[8,.35,1.8],{solid:false,variant:'boardwalk-planks'});
  obj(town,'lantern',x-3,74.9,[.6,2.1,.6],{variant:'pier-lantern'});
  on(town,dock,'seagull',x+2,77.4,[.65,.6,.65],.35,{solid:false,variant:'animated-animal'});
}
const canal=obj(town,'stream',0,84.5,[174,.1,9],{solid:false,variant:'harbor-water'});
for(const x of [-70,-26,18,62]) {
  on(town,canal,'dock',x,81.95,[3,.3,8],.15,{solid:false,variant:'pier'});
  for(const offset of [-1,1])obj(town,'rope',x+offset*1.2,83.7,[.2,.2,2.5],{y:.5,solid:false,variant:'mooring-rope'});
  on(town,canal,'boat',x+4.2,84.5,[3.8,1.8,2.7],.15,{solid:false,variant:'moored-sailboat'});
}
on(town,canal,'bridge',0,84,[4,1.2,10],.15,{solid:false,variant:'original-stone-bridge'});
town.paths.push({points:[[0,76],[0,89]],width:3.5,kind:'stone-bridge-walk'});
town.traffic=[
 {id:'coral-car',wordId:'car',color:'#d18a77',speed:5,route:[[-44,-73],[-44,52.5],[44,52.5],[44,-73]],loop:true},
 {id:'blue-car',wordId:'car',color:'#7eacb6',speed:4.3,route:[[44,73],[44,-52.5],[-44,-52.5],[-44,73]],loop:true},
 {id:'town-bus',wordId:'bus',color:'#d1b76b',speed:3.5,route:[[0,-73],[0,73],[44,73],[44,-73]],loop:true},
];

function bounds(o) {
  const s=o.size||[1,1,1], c=Math.abs(Math.cos(o.rotation||0)),n=Math.abs(Math.sin(o.rotation||0));
  const hx=(s[0]*c+s[2]*n)/2,hz=(s[0]*n+s[2]*c)/2;
  return {x1:o.x-hx,x2:o.x+hx,z1:o.z-hz,z2:o.z+hz,y1:o.y,y2:o.y+s[1]};
}
function intersects(a,b,margin=.035) {return a.x1<b.x2-margin&&a.x2>b.x1+margin&&a.z1<b.z2-margin&&a.z2>b.z1+margin&&a.y1<b.y2-margin&&a.y2>b.y1+margin;}
function validateMap(m) {
  const errors=[], ids=new Set(),byId=new Map(m.objects.map(o=>[o.id,o]));
  for(const o of m.objects) {
    if(ids.has(o.id)) errors.push(`duplicate instance ${o.id}`);ids.add(o.id);
    if(!words.has(o.wordId))errors.push(`missing vocabulary ${o.wordId}`);
    const b=bounds(o);
    if(b.x1 < -m.width/2 || b.x2 >m.width/2 ||b.z1 < -m.depth/2 ||b.z2 >m.depth/2)errors.push(`outside map ${o.id}`);
    if(o.parentId&&!byId.has(o.parentId))errors.push(`missing parent ${o.id}`);
    if(o.parentId&&byId.has(o.parentId)) {
      const p=byId.get(o.parentId),pb=bounds(p);
      // Wall/roof fittings intentionally protrude from their architectural support.
      const shorelineSupport=p.wordId==='stream'&&['dock','bridge'].includes(o.wordId);
      if(!['house','lighthouse'].includes(p.wordId)&&!shorelineSupport&&(b.x1<pb.x1-.025||b.x2>pb.x2+.025||b.z1<pb.z1-.025||b.z2>pb.z2+.025))errors.push(`unsupported tabletop/shelf object ${o.id}`);
    }
  }
  for(let i=0;i<m.objects.length;i++)for(let j=i+1;j<m.objects.length;j++){
    const a=m.objects[i],b=m.objects[j];
    if(a.parentId===b.id||b.parentId===a.id)continue;
    if(intersects(bounds(a),bounds(b))) errors.push(`overlap ${a.id} / ${b.id}`);
  }
  for(const p of m.portals){
    if(!interiors.some(v=>v.id===p.target)&&p.target!=='town')errors.push(`missing portal target ${p.target}`);
    for(const o of m.objects){if(!o.solid||o.id===p.buildingId||o.parentId===p.buildingId)continue;const b=bounds(o);if(p.x>b.x1-.5&&p.x<b.x2+.5&&p.z>b.z1-.5&&p.z<b.z2+.5)errors.push(`blocked portal ${p.id} by ${o.id}`);}
  }
  const solid=m.objects.filter(o=>o.solid&&o.y<1.7).map(o=>({o,b:bounds(o)}));
  const blocked=(x,z,r=.4)=>solid.find(({b})=>x>b.x1-r&&x<b.x2+r&&z>b.z1-r&&z<b.z2+r);
  if(blocked(m.spawn[0],m.spawn[1]))errors.push('blocked map spawn');
  for(const n of m.npcs){const route=n.route||[[n.x,n.z]];for(let j=0;j<route.length;j++){
    const from=route[j],to=route[(j+1)%route.length],steps=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])*3));
    for(let s=0;s<=steps;s++){const b=blocked(from[0]+(to[0]-from[0])*s/steps,from[1]+(to[1]-from[1])*s/steps,.32);if(b){errors.push(`blocked NPC route ${n.id} by ${b.o.id}`);break;}}
  }}
  for(const vehicle of m.traffic)for(let j=0;j<vehicle.route.length;j++){
    const from=vehicle.route[j],to=vehicle.route[(j+1)%vehicle.route.length],steps=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])*2);
    for(let s=0;s<=steps;s++){const b=blocked(from[0]+(to[0]-from[0])*s/steps,from[1]+(to[1]-from[1])*s/steps,.95);if(b){errors.push(`blocked traffic route ${vehicle.id} by ${b.o.id}`);break;}}
  }
  // Flood-fill the actual collision footprint. Every door, NPC and word instance must
  // be within normal E-interaction range of the same connected walking area.
  const step=1,cols=Math.ceil(m.width/step),rows=Math.ceil(m.depth/step),walk=new Uint8Array(cols*rows);
  const coord=(x,z)=>[Math.max(0,Math.min(cols-1,Math.floor(x+m.width/2))),Math.max(0,Math.min(rows-1,Math.floor(z+m.depth/2)))];
  const center=(x,z)=>[x+.5-m.width/2,z+.5-m.depth/2];
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){const [px,pz]=center(x,z);walk[z*cols+x]=blocked(px,pz,.34)?0:1;}
  const start=coord(...m.spawn),queue=[start[1]*cols+start[0]],visited=new Uint8Array(cols*rows);visited[queue[0]]=1;
  for(let head=0;head<queue.length;head++){
    const index=queue[head],x=index%cols,z=Math.floor(index/cols);
    for(const [nx,nz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]){const next=nz*cols+nx;if(nx<0||nx>=cols||nz<0||nz>=rows||!walk[next]||visited[next])continue;visited[next]=1;queue.push(next);}
  }
  const reachable=(x,z,r=2.85)=>{
    const [cx,cz]=coord(x,z),range=Math.ceil(r);
    for(let oz=-range;oz<=range;oz++)for(let ox=-range;ox<=range;ox++){
      const nx=cx+ox,nz=cz+oz;if(nx<0||nx>=cols||nz<0||nz>=rows||!visited[nz*cols+nx])continue;
      const [px,pz]=center(nx,nz);if(Math.hypot(px-x,pz-z)<=r)return true;
    }return false;
  };
  for(const p of m.portals)if(!reachable(p.x,p.z,2.3))errors.push(`unreachable portal ${p.id}`);
  for(const n of m.npcs)if(!reachable(n.x,n.z,2.5))errors.push(`unreachable NPC ${n.id}`);
  for(const o of m.objects)if(o.interactable&&!reachable(o.x,o.z)){
    // Interaction measures distance to a large fixture's surface, as the native world does.
    const b=bounds(o),sides=[[o.x,b.z2+.5],[o.x,b.z1-.5],[b.x1-.5,o.z],[b.x2+.5,o.z]];
    if(!sides.some(([x,z])=>reachable(x,z,2.3)))errors.push(`unreachable word instance ${o.id}`);
  }
  return errors;
}
const maps=[town,...interiors],report=[];
for(const m of maps){const errors=validateMap(m);report.push({id:m.id,objects:m.objects.length,types:new Set(m.objects.map(o=>o.wordId)).size,npcs:m.npcs.length,portals:m.portals.length,errors});}
const failures=report.flatMap(m=>m.errors.map(e=>`${m.id}: ${e}`));
if(failures.length){console.error(failures.slice(0,100).join('\n'));throw new Error(`${failures.length} content validation errors; nothing removed to conceal them`);}
const data={version:2,maps,npcs};
const json=JSON.stringify(data,null,2)+'\n';
if(process.argv.includes('--check')){
  if(fs.readFileSync(path.join(root,'native/data/town.json'),'utf8')!==json)throw new Error('town.json differs from deterministic source; regenerate');
}else fs.writeFileSync(path.join(root,'native/data/town.json'),json);
console.log(JSON.stringify({maps:maps.length,interiors:interiors.length,npcs:npcs.length,words:words.size,townObjects:town.objects.length,totalObjects:maps.reduce((n,m)=>n+m.objects.length,0),report},null,2));
