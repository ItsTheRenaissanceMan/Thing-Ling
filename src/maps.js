import { WORDS } from './data.js';
import { CHARACTERS, QUESTS } from './story.js';
import { PROP_SIZES } from './props.js';

export { PROP_SIZES } from './props.js';

/**
 * Authored places, not randomized decoration. Coordinates are world coordinates;
 * y is the bottom of a model and the island surface is at 0.45. parentId records
 * an intentional support relationship, never permission for sibling overlap.
 */
const GROUND = 0.45;
function place(config, build) {
  const objects = [];
  const counts = new Map();
  const add = (wordId, x, z, extra = {}) => {
    const count = (counts.get(wordId) || 0) + 1;
    counts.set(wordId, count);
    const object = { id: `${config.id}-${wordId}-${count}`, wordId, x, z, ...extra };
    objects.push(object);
    return object;
  };
  const table = (x, z, contents = [], extra = {}) => {
    const support = add('table', x, z, extra);
    for (const [wordId, dx, dz, options = {}] of contents) {
      add(wordId, x + dx, z + dz, { parentId: support.id, surface: 'table', y: GROUND + 1, ...options });
    }
    return support;
  };
  const row = (wordId, coordinates, extra = {}) => coordinates.map(([x, z]) => add(wordId, x, z, extra));
  build({ add, table, row });
  return {
    groundColor: '#b5cc91', waterColor: '#9bc8ce', skyColor: '#dbe9dd',
    terrain: { shape: 'island', width: 26, depth: 22 },
    camera: { target: [0, 0.8, 0], zoom: 0.95 },
    ...config, objects,
  };
}

export const MAPS = [
  place({
    id: 'home', name: 'Lantern Village', subtitle: 'Every path leads to a new story',
    description: 'A spacious village green connects the Almanac courtyard, the café lane, and the harbor trail.',
    region: 'village', questId: null, theme: 'village',
    paths: [
      { points: [[-10, 1], [-5, 1], [0, 2], [5, 1], [10, 1]], width: 1.5 },
      { points: [[0, -3], [0, 2], [-1, 7]], width: 1.6 },
      { points: [[-8, -3], [-8, 1], [-7, 6]], width: 1.15 },
      { points: [[8, -3], [8, 1], [8, 7]], width: 1.15 },
    ],
    npcs: [{ id: 'theo', x: -5.1, z: -.3 }, { id: 'mika', x: 5.1, z: -.3 }, { id: 'jun', x: -5.5, z: 5.2 }, { id: 'luna', x: 5.8, z: 5.2 }],
  }, ({ add, table, row }) => {
    add('house', -8, -6, { variant: 'bookshop' });
    add('house', 0, -6, { variant: 'village' });
    add('house', 8, -6, { variant: 'cafe' });
    row('tree', [[-11.4, -8], [-4.3, -8.1], [4.4, -8.1], [11.4, -8], [-11, 6.6], [-3.4, 8], [3.5, 8], [11, 6.6]]);
    add('fountain', 0, 0);
    table(-7.2, -1.6, [['book', -.65, 0], ['apple', .65, -.25], ['pencil', .65, .45, { scale: .4 }]]);
    table(7.2, -1.6, [['tea', -.65, 0], ['cup', .65, -.25], ['cookie', .65, .45, { scale: .4 }]]);
    add('bicycle', -10, -2.3);
    add('mailbox', -3.4, -4);
    add('sign', 3.5, -3.5);
    add('flowerpot', -9.5, 3.4);
    add('flower', -7.7, 3.5);
    add('wateringCan', -6, 3.4);
    add('basket', -3.8, 4.2);
    add('bench', -.5, 4.7);
    add('lamp', 2.4, 4.5);
    add('cat', -2.8, 1.6);
    add('dog', 3, 1.9);
    add('bird', 5.2, 3.2);
    add('crate', 8.4, 4.4);
    add('barrel', 10.3, 3.7);
    add('lantern', 5.3, 7.5);
    add('shell', 8.3, 7.3);
    add('stone', 10.1, 8.6);
    add('gate', -7, 7.1);
    row('fence', [[-9.3, 8.5], [-6.1, 8.6], [6.8, 8.7]]);
  }),

  place({
    id: 'little-hello', name: 'Almanac Courtyard', subtitle: 'The beginning of every good story',
    description: 'An old bookshop opens onto a reading courtyard with writing desks, fruit baskets, and a quiet fountain.',
    region: 'village', questId: 'little-hello', theme: 'village',
    groundColor: '#b8c990',
    paths: [
      { points: [[0, 9], [0, 4], [1, 0], [0, -4]], width: 2.1 },
      { points: [[-8, 0], [0, 1], [8, -1]], width: 1.3 },
    ],
    npcs: [{ id: 'theo', x: 2.9, z: 1.9 }],
  }, ({ add, table, row }) => {
    add('house', 0, -6.4, { variant: 'bookshop' });
    add('sign', -3.6, -5.1);
    add('mailbox', 3.5, -5.1);
    row('tree', [[-10, -7.7], [9.8, -7.7], [-10.5, 4.5], [10.5, 4.5]]);
    add('fountain', -6.8, -1.1);
    add('bench', -7, 2);
    add('lamp', -9.4, 1.3);
    table(-3.2, -.8, [['book', -.65, 0], ['ink', .45, -.3, { scale: .65 }], ['pen', .65, .4, { scale: .65 }]]);
    add('chair', -3.2, 1.2);
    table(5.6, -1.7, [['apple', -.65, 0], ['postcard', .6, -.3], ['pencil', .7, .45, { scale: .4 }]]);
    add('chair', 5.5, .4);
    add('shelf', 6.8, -5.1);
    add('globe', 9, -3.1);
    add('basket', -4.2, 4.6);
    add('flower', -6, 5.1);
    add('flowerpot', -8.2, 5.6);
    add('paper', -2.1, 6.1);
    add('envelope', -.5, 6.8);
    add('bag', 2, 5.5);
    add('cat', 4.3, 4.9);
    add('bicycle', 7.4, 4.9);
    add('chest', 9.5, 7.6);
    add('feather', 5.1, 7.8);
    add('bird', -3.9, 8.1);
    row('hedge', [[-10.2, -.8], [10.5, -.5], [-6.9, 8.4], [3, 8.6]]);
    add('gate', 0, 8.9);
  }),

  place({
    id: 'kettle-on', name: 'The Copper Tea House', subtitle: 'A slow afternoon, a warm cup',
    description: 'A cutaway tea house with a long serving counter, preparation kitchen, and a separate reading nook.',
    region: 'village', questId: 'kettle-on', theme: 'interior',
    groundColor: '#cfb58c', waterColor: '#b3d3cc', skyColor: '#efe5d3',
    terrain: { shape: 'room', width: 26, depth: 22 },
    paths: [{ points: [[0, 8], [0, 1], [2, -5]], width: 1.4 }],
    npcs: [{ id: 'mika', x: -1, z: -2.3 }],
  }, ({ add, table, row }) => {
    add('stove', -9.4, -7);
    add('sink', -6.9, -7);
    add('cabinet', -5.1, -7.1);
    add('shelf', 3.8, -7.1);
    add('clock', 8.6, -7.5);
    table(-6.8, -2.7, [['kettle', -.55, 0, { scale: .7 }], ['tea', .55, .1, { scale: .65 }]]);
    table(-2.8, -6.8, [['teapot', -.55, -.1, { scale: .7 }], ['cup', .55, .2, { scale: .7 }]]);
    table(2.2, -3, [['coffee', -.55, 0, { scale: .7 }], ['sugar', .55, .1, { scale: .7 }]]);
    table(7, -2.7, [['water', -.6, 0, { scale: .65 }], ['bottle', .55, .15, { scale: .7 }]]);
    add('barrel', 10.1, -6.8);
    add('broom', -10, -3.1);
    add('bucket', -10, -.8);
    add('towel', -7.4, .9);
    add('basket', -4.5, .5);
    add('rug', 6.2, 4.4);
    add('sofa', 6.4, 7.2);
    add('lamp', 9.2, 7.1);
    table(-5.2, 4.4, [['honey', -.6, -.1, { scale: .65 }], ['spoon', .55, .2, { scale: .65 }]]);
    add('chair', -5.2, 6.5);
    add('chair', -7.5, 4.4);
    add('flowerpot', -9.5, 7.8);
    add('book', -2.4, 6.2);
    add('lantern', 1.1, 6.9);
    add('napkin', 1.9, 3.3);
    add('sign', 10.4, 1.3);
    row('candle', [[-1.7, 8], [3.5, 8.3]]);
  }),

  place({
    id: 'breakfast-club', name: 'Sunrise Bakery', subtitle: 'Flour on the counter, sunshine at the door',
    description: 'A working bakery, complete with ovens, a flour store, two preparation benches, and a breakfast terrace.',
    region: 'village', questId: 'breakfast-club', theme: 'bakery',
    groundColor: '#dfbe88', skyColor: '#f6e0bd',
    terrain: { shape: 'room', width: 26, depth: 22 },
    paths: [{ points: [[-1, 8], [-1, 3], [0, -4]], width: 1.5 }],
    npcs: [{ id: 'mika', x: 1.5, z: .4 }],
  }, ({ add, table, row }) => {
    row('oven', [[-8.4, -6.8], [-5.7, -6.8]]);
    add('stove', -2.8, -6.8);
    add('cabinet', 1.3, -7.2);
    add('shelf', 5.4, -7.2);
    add('clock', 9.4, -7.2);
    add('barrel', 10, -4.6);
    table(-7.3, -2, [['flour', -.55, 0, { scale: .7 }], ['bowl', .55, .1, { scale: .7 }]]);
    table(-2.7, -2, [['egg', -.6, 0, { scale: .7 }], ['butter', .55, .1, { scale: .65 }]]);
    table(2.5, -3, [['milk', -.55, 0, { scale: .7 }], ['cheese', .55, .1, { scale: .65 }]]);
    table(7.3, -.8, [['bread', -.55, -.1, { scale: .7 }], ['cookie', .6, .15, { scale: .65 }]]);
    add('wheat', -10.1, -2.4);
    add('basket', -10, .3);
    add('broom', -8.9, 3.4);
    add('bucket', -6.6, 3.2);
    add('crate', -4.1, 3.4);
    add('sugar', -2, 4.3);
    table(3.6, 4.5, [['cake', -.55, 0, { scale: .7 }], ['plate', .6, .1, { scale: .65 }]]);
    add('chair', 3.6, 6.6);
    add('chair', 6, 4.5);
    add('napkin', 8.8, 4.3);
    add('knife', 9.4, 6.3);
    add('flowerpot', -9.2, 7.7);
    add('sign', -4.3, 7.9);
    add('lamp', .1, 7.9);
    add('cat', 7.2, 8);
  }),

  place({
    id: 'lantern-cafe', name: 'Lantern Café', subtitle: 'A place at every table',
    description: 'A welcoming café with four separated seating bays, a little stage, and a repair corner for its reopening.',
    region: 'village', questId: 'lantern-cafe', theme: 'cafe',
    groundColor: '#bda88b', skyColor: '#ede5d7',
    terrain: { shape: 'room', width: 26, depth: 22 },
    paths: [{ points: [[0, 9], [0, 3], [0, -6]], width: 1.8 }],
    npcs: [{ id: 'mika', x: 2.6, z: -3.8 }, { id: 'theo', x: -2.6, z: 3.1 }],
  }, ({ add, table, row }) => {
    add('clock', 0, -8.1);
    add('shelf', -7.5, -7.1);
    add('cabinet', 7.5, -7.1);
    add('radio', -3.6, -7.1);
    add('musicBox', 3.7, -7.1);
    table(-6.5, -2.4, [['cup', -.6, 0, { scale: .7 }], ['coffee', .6, .1, { scale: .7 }]]);
    table(6.5, -2.4, [['teapot', -.6, 0, { scale: .65 }], ['cake', .55, .1, { scale: .7 }]]);
    table(-6.5, 4.1, [['book', -.55, -.1, { scale: .7 }], ['flowerpot', .6, .2, { scale: .6 }]]);
    table(6.5, 4.1, [['plate', -.55, -.1, { scale: .7 }], ['napkin', .65, .2, { scale: .7 }]]);
    row('chair', [[-6.5, -.3], [-8.8, -2.4], [6.5, -.3], [8.8, -2.4], [-6.5, 6.2], [-8.8, 4.1], [6.5, 6.2], [8.8, 4.1]]);
    row('lamp', [[-10.4, -6.5], [10.4, -6.5], [-10.4, 7.9], [10.4, 7.9]]);
    add('toolbox', 2.5, .9);
    add('hammer', 3.2, 2.5);
    add('ladder', -2.4, -3.2);
    add('painting', -3.1, 7.4);
    add('lantern', 0, 6.7);
    add('candle', 2.2, 8.4);
    add('broom', 10.5, .9);
    add('sign', -.8, 9.3);
  }),

  place({
    id: 'first-seedlings', name: 'Seedling Terraces', subtitle: 'Little seeds, a hillside of possibilities',
    description: 'Stepped growing beds surround a greenhouse work area, with tools stored apart from the vegetables.',
    region: 'garden', questId: 'first-seedlings', theme: 'terrace',
    groundColor: '#9ebc78', terrain: { shape: 'terraces', width: 26, depth: 22 },
    paths: [
      { points: [[-10, 7], [-6, 4], [0, 3], [6, 0], [9, -5]], width: 1.6 },
      { points: [[-8, -5], [-4, -2], [1, -1], [5, -5]], width: 1.1 },
    ],
    npcs: [{ id: 'jun', x: 1, z: 4.9 }],
  }, ({ add, table, row }) => {
    row('tree', [[-10, -7.7], [9.9, -7.7], [10.3, 7.6]]);
    row('carrot', [[-7.8, -5.1], [-6.4, -5.1], [-5, -5.1]]);
    row('tomato', [[-.7, -5.1], [.7, -5.1], [2.1, -5.1]]);
    row('strawberry', [[5.1, -3.1], [6.5, -3.1], [7.9, -3.1]]);
    row('lettuce', [[-7.3, -.1], [-5.9, -.1]]);
    row('cabbage', [[-1.7, -.1], [-.3, -.1]]);
    row('potato', [[3.7, 1.1], [5.1, 1.1]]);
    add('well', -9.2, 3.3);
    add('wateringCan', -6.7, 3.8);
    add('shovel', -4.4, 4.5);
    add('rake', -2.6, 5.5);
    table(5.6, 5.1, [['seed', -.6, 0, { scale: .7 }], ['flowerpot', .6, .1, { scale: .65 }]]);
    add('bucket', 8.1, 4.6);
    add('crate', 6.5, 8.1);
    add('basket', 3.7, 8.1);
    add('flower', -.2, 8.1);
    add('bush', -4, 8);
    add('beehive', -7.5, 7.6);
    add('bee', -9.8, 7.6);
    add('sign', 4.9, -7.5);
    add('gate', -3.3, -8.5);
    add('broom', 8, -.3);
  }),

  place({
    id: 'orchard-colors', name: 'Citrus Grove', subtitle: 'A harvest beneath the branches',
    description: 'Three groves stand on either side of an irrigation canal, linked by a small harvest bridge and market tables.',
    region: 'garden', questId: 'orchard-colors', theme: 'orchard',
    groundColor: '#b9c87c', waterColor: '#86c4c1',
    paths: [
      { points: [[-10, 6.3], [-5, 4.7], [0, 2.6], [5, 4.7], [10, 6.3]], width: 1.4 },
      { points: [[-7, -7], [-5, -3], [-5, 1]], width: 1 },
      { points: [[7, -7], [5, -3], [5, 1]], width: 1 },
    ],
    npcs: [{ id: 'jun', x: -2.2, z: 3.8 }],
  }, ({ add, table, row }) => {
    row('tree', [[-9, -7], [-5.5, -5.2], [-9, -1.8], [8.8, -7], [5.4, -5.2], [9, -1.8]]);
    add('stream', 0, -3.9);
    add('bridge', 0, 1.5);
    row('orange', [[-9, 1.3], [-7.2, 1.8], [-4.1, -.3]]);
    row('lemon', [[8.8, 1.3], [7, 1.8], [4.1, -.3]]);
    add('banana', -2.6, -7.2);
    add('pear', 2.6, -7.2);
    add('grape', -2.6, -3.5);
    add('peach', 2.6, -3.5);
    add('cherry', -3.2, 7.9);
    add('butterfly', 3.1, 1.4);
    add('beehive', -10.4, 5.7);
    add('bee', -8.5, 7.9);
    add('nest', 10.1, 5.9);
    add('bird', 8.3, 7.9);
    table(-5.2, 5.8, [['apple', -.55, 0, { scale: .7 }], ['honey', .55, .1, { scale: .7 }]]);
    table(5.2, 5.8, [['basket', -.55, 0, { scale: .65 }], ['seed', .6, .1, { scale: .7 }]]);
    add('crate', -1.8, 5.9);
    add('barrel', 1.5, 6.6);
    add('ladder', -11, 1.6);
    add('wateringCan', 10.6, 2.8);
    add('sign', 0, 9);
  }),

  place({
    id: 'small-neighbors', name: 'Willow Sanctuary', subtitle: 'A home for the island’s small neighbors',
    description: 'Open animal meadows encircle a willow pond, with feed stations, nests, and a quiet observation corner.',
    region: 'garden', questId: 'small-neighbors', theme: 'sanctuary',
    groundColor: '#9ebf92', waterColor: '#80b9bd',
    paths: [{ points: [[-10, 7], [-6, 4], [0, 4], [7, 3], [10, -2]], width: 1.5 }],
    npcs: [{ id: 'jun', x: -4, z: 4.9 }],
  }, ({ add, table, row }) => {
    add('pond', .4, -1.8);
    row('tree', [[-8.7, -6.7], [-4.7, -7.4], [4.8, -7.3], [9.1, -5.9]]);
    add('cat', -8.1, -1.6);
    add('dog', -5.2, -1.5);
    add('bird', -2.3, -5.1);
    add('stone', 4.5, -1.9);
    add('rabbit', -9.3, 2.2);
    add('turtle', 3.9, 1.2);
    add('duck', 1, -5.4);
    add('sheep', 7.3, -.7);
    add('goat', 10.3, -.2);
    add('hen', 7.7, 2.6);
    add('cow', -7.5, 6.8);
    add('horse', 7.4, 6.7);
    add('hay', 10.3, 5.2);
    add('basket', -10.4, 5.1);
    add('bowl', -5.1, 1.6);
    add('carrot', -8.4, 4.2);
    add('nest', 10.4, -8.4);
    add('feather', 4.2, -5.1);
    add('log', -2.3, 1.8);
    add('mushroom', -2.4, -1.4);
    add('branch', -10.5, -3.6);
    add('leaf', 6.2, -4.5);
    add('bush', -1.2, 7.5);
    add('flower', 2.1, 7.8);
    add('bench', 3.7, 5.1);
    add('sign', -3.2, 8.5);
    add('gate', 0, 9.3);
    row('fence', [[-5.3, 9], [5.3, 9], [10.9, 8.2], [-10.9, 8.2]]);
  }),

  place({
    id: 'garden-in-bloom', name: 'Skyglass Conservatory', subtitle: 'A whole sky of new words',
    description: 'A garden observatory combines a mountain view, weather instruments, specimen tables, and a sheltered greenhouse.',
    region: 'garden', questId: 'garden-in-bloom', theme: 'conservatory',
    groundColor: '#a8c5a0', skyColor: '#c4ddea',
    terrain: { shape: 'terraces', width: 26, depth: 22 },
    paths: [{ points: [[-9, 8], [-4, 5], [0, 1], [5, -2], [8, -5]], width: 1.5 }],
    npcs: [{ id: 'jun', x: -2, z: 3.8 }],
  }, ({ add, table, row }) => {
    add('mountain', -7.9, -6.8);
    add('sun', 6, -7, { y: 7.6, surface: 'sky' });
    add('cloud', .3, -7.3, { y: 6.2, surface: 'sky' });
    add('rain', 1, -3.2, { y: 3.8, surface: 'sky' });
    add('globe', 8.6, -6.1);
    add('compass', 5, -4.1);
    add('crystal', -2.7, -6.1);
    row('tree', [[-10.3, -.1], [10.2, -.1], [-10.1, 6.1]]);
    table(-5.8, -.7, [['flowerpot', -.6, 0, { scale: .65 }], ['seed', .6, .1, { scale: .7 }]]);
    table(5.8, 1.7, [['book', -.6, 0, { scale: .7 }], ['map', .6, .1, { scale: .65 }]]);
    add('chair', 5.8, 3.8);
    add('shelf', -4.9, -3.5);
    add('wateringCan', -2.9, -.1);
    add('flower', .1, -1.2);
    add('leaf', 3, -1.5);
    add('mushroom', -8, 2.1);
    add('butterfly', -.3, 5.5);
    add('bee', 3.2, 5.8);
    add('beehive', 9.2, 5.5);
    add('pond', -5.4, 6.7);
    add('bench', 3.4, 8.3);
    add('lamp', 6.2, 8.2);
    add('sign', -.6, 8.8);
    add('bucket', -9.9, 8.9);
    add('rake', 10.3, -3.4);
    add('shovel', 10.3, 3.1);
    add('basket', .2, -5.1);
    add('bottle', 2.3, -5.3);
  }),

  place({
    id: 'water-edge', name: 'Driftwood Cove', subtitle: 'Follow the tide to a new discovery',
    description: 'A pale beach curves around a little marina, with a separate rock-pool corner and a boat-maintenance shed.',
    region: 'harbor', questId: 'water-edge', theme: 'cove',
    groundColor: '#e4d2a8', waterColor: '#81becb', skyColor: '#d6e9e6',
    paths: [{ points: [[-10, 4], [-6, 2], [-1, 3], [5, 1], [9, -2]], width: 1.3 }],
    npcs: [{ id: 'luna', x: 4.3, z: 3.8 }],
  }, ({ add, table, row }) => {
    add('house', -8, -6.6, { variant: 'boathouse' });
    add('dock', 6.7, -5.1);
    add('boat', 6.4, -8.3, { surface: 'water', y: -.28 });
    add('bridge', .3, -3.2);
    add('pond', -6.1, -.8);
    add('fish', -3.1, -.7);
    add('shell', -9.6, 3.1);
    row('stone', [[-10.2, -.8], [-7.6, 1.7], [-4, 2], [-3.6, -3.5]]);
    add('anchor', 3.6, -6.7);
    add('rope', 9.7, -5.4);
    add('sail', 10.2, -8.3);
    add('paddle', 10, -2.7);
    add('net', 7, -1.6);
    add('fishingRod', 3.8, -1.1);
    add('barrel', -2.9, -7.3);
    add('crate', -.5, -7.3);
    add('toolbox', -10.7, -3.6);
    add('turtle', -10, 6.1);
    add('seagull', 8.1, 2.9);
    add('bucket', -6.8, 5.1);
    add('log', -3.8, 5.7);
    add('branch', -1, 6.8);
    add('bench', 2.2, 6.8);
    add('lantern', 5.3, 7.9);
    add('flag', 10.3, 6.8);
    add('sign', -.3, 1.3);
    table(7.9, 6, [['compass', -.6, 0, { scale: .7 }], ['map', .6, .1, { scale: .65 }]]);
    add('basket', -7.9, 8.4);
    add('bottle', -4.4, 8.7);
    add('water', .5, 9.1);
  }),

  place({
    id: 'lost-and-found', name: 'The Parcel Exchange', subtitle: 'Everything has a place, and a story',
    description: 'A small station exchange has sorting counters, a clothing corner, a luggage aisle, and a sheltered bicycle yard.',
    region: 'harbor', questId: 'lost-and-found', theme: 'exchange',
    groundColor: '#b9c6b6', skyColor: '#dae5e3',
    terrain: { shape: 'room', width: 26, depth: 22 },
    paths: [{ points: [[0, 9], [0, 3], [-1, -3], [0, -7]], width: 1.8 }],
    npcs: [{ id: 'luna', x: 2.2, z: -1.6 }],
  }, ({ add, table, row }) => {
    row('shelf', [[-8.2, -7.3], [-4.8, -7.3], [4.8, -7.3], [8.2, -7.3]]);
    add('clock', 0, -8.1);
    add('mailbox', -10.4, -4.3);
    add('bicycle', -7.6, 1.1);
    add('wheel', -10.2, -.5);
    add('umbrella', -5.6, -3.3);
    add('coat', -8.4, -3.8);
    add('jacket', -2.8, -4.4);
    add('scarf', -3.2, -1.2);
    table(4.7, -3.4, [['hat', -.6, 0, { scale: .65 }], ['ticket', .6, .1, { scale: .7 }]]);
    table(8.2, 1, [['key', -.65, 0, { scale: .7 }], ['postcard', .6, .1, { scale: .65 }]]);
    add('bag', -4.9, 2.7);
    add('shoe', -2.4, 2.3);
    add('sock', -.2, 3.5);
    add('trousers', 2.6, 2.6);
    add('dress', 4.7, 4);
    add('parcel', -9.2, 5.6);
    add('crate', -6.8, 6.7);
    add('chest', -3.7, 6.8);
    add('envelope', -.8, 7.4);
    add('paper', 1.2, 8.4);
    add('pen', 3.4, 7.9);
    add('bell', 6.5, 7.3);
    add('lamp', 9.6, 7.4);
    add('sign', 10.5, 4.3);
    add('toolbox', -10.5, 8.7);
    add('radio', 9.6, -3.4);
    add('broom', 6.1, -.3);
  }),

  place({
    id: 'homecoming-parcel', name: 'Hearth Cottage', subtitle: 'A key, a warm bed, a place to call home',
    description: 'A furnished cutaway cottage has a bedroom, kitchen, living room, and a little delivery porch outside.',
    region: 'harbor', questId: 'homecoming-parcel', theme: 'cottage',
    groundColor: '#cfb496', skyColor: '#eee2d2',
    terrain: { shape: 'room', width: 26, depth: 22 },
    paths: [{ points: [[0, 9], [0, 3], [0, -3]], width: 1.45 }],
    npcs: [{ id: 'theo', x: .1, z: 5.4 }],
  }, ({ add, table, row }) => {
    const cottage = add('house', -7.8, -6.6, { variant: 'cottage' });
    add('door', -7.8, -4.86, { parentId: cottage.id, surface: 'wall', y: GROUND });
    add('window', -9.1, -4.86, { parentId: cottage.id, surface: 'wall', y: 1.7, scale: .7 });
    add('bed', 7.3, -6.2);
    add('cabinet', 10.2, -6.8);
    add('mirror', 10.3, -3.7);
    add('pillow', 7, -2.8);
    add('blanket', 4.5, -4.9);
    add('curtain', 3.2, -7.5);
    add('sofa', -6.9, .1);
    add('lamp', -9.8, .1);
    add('rug', -5.6, 3);
    add('painting', -3.4, -2.5);
    add('shelf', -2.9, -6.6);
    add('clock', .4, -7.1);
    add('stove', 4.7, -.8);
    add('sink', 7.3, -.8);
    add('towel', 10.1, -.6);
    table(5.8, 3.5, [['key', -.6, 0, { scale: .7 }], ['cup', .6, .1, { scale: .7 }]]);
    add('chair', 5.8, 5.6);
    add('chair', 8.2, 3.5);
    add('parcel', -8.8, 6.4);
    add('mailbox', -10.5, 8.8);
    add('broom', -5.8, 6.6);
    add('bucket', -3.4, 7.1);
    add('shoe', -.6, 8.5);
    add('coat', 1.8, 8.5);
    add('flowerpot', 4.2, 8.5);
    add('basket', 7.1, 8.2);
    add('cat', 10.2, 6.9);
    add('book', 1.4, 1.4);
    add('candle', -.8, -.7);
    add('drawer', 1.4, -3.8);
  }),

  place({
    id: 'harbor-lanterns', name: 'Moonrise Lighthouse', subtitle: 'Every word is a light to find your way home',
    description: 'A moonlit island, a winding lantern trail, a sheltered keeper’s garden, and a lighthouse ready to shine.',
    region: 'harbor', questId: 'harbor-lanterns', theme: 'lighthouse', night: true,
    groundColor: '#819b92', waterColor: '#577d96', skyColor: '#344957',
    paths: [
      { points: [[-10, 7], [-7, 5], [-3, 5], [0, 2], [4, 1], [7, -2], [7, -5]], width: 1.6 },
      { points: [[-8, -5], [-5, -2], [0, 2]], width: 1.1 },
    ],
    npcs: [{ id: 'luna', x: 3.7, z: 3.9 }, { id: 'theo', x: -4.7, z: 3.3 }],
  }, ({ add, table, row }) => {
    add('lighthouse', 7.1, -6.2);
    add('beacon', 7.1, -6.2, { y: 7.45, surface: 'sky' });
    add('moon', -7, -7, { y: 7, surface: 'sky' });
    add('star', -2.1, -6.7, { y: 8.2, surface: 'sky' });
    add('cloud', 2.6, -8, { y: 6.8, surface: 'sky' });
    add('house', -7.7, -5.9, { variant: 'keeper' });
    add('bench', 1.3, 5.1);
    row('lantern', [[-9.6, 4.8], [-6.6, 7.8], [-3.2, 2.4], [-.8, 7.7], [2, -.7], [5.2, 6.2], [8.7, 1.4], [10.4, -3.2]]);
    row('tree', [[-10.4, -.7], [-3.9, -5.9], [1.4, -4.9], [10.2, 7.4]]);
    add('bell', 4.8, -3.7);
    add('rope', 10.3, -7.4);
    add('anchor', 10.4, -5.2);
    add('barrel', -4.7, -2);
    add('crate', -7.6, -1.5);
    add('shell', -10.8, 7.9);
    add('seagull', 10, 4.4);
    add('stone', -10.5, -8.7);
    add('flag', 4, -7.4);
    add('globe', -1.3, -2.7);
    table(-5.9, 1, [['compass', -.6, 0, { scale: .7 }], ['map', .6, .1, { scale: .65 }]]);
    add('chair', -5.9, -1.1);
    add('chest', 7.7, 7.8);
    add('treasure', 4.3, 8.7);
    add('flower', -2.9, 8.5);
    add('sign', -8.9, 2.3);
  }),
];

export function getMap(id) { return MAPS.find((map) => map.id === id); }
export function getMapForQuest(id) { return MAPS.find((map) => map.questId === id); }

/** Conservative rotated footprint; models must fit the shared PROP_SIZES. */
export function getObjectBounds(object) {
  const size = PROP_SIZES[object.wordId];
  if (!size) return null;
  const scale = object.scale ?? 1;
  const angle = object.rotation ?? 0;
  const width = (Math.abs(Math.cos(angle)) * size.width + Math.abs(Math.sin(angle)) * size.depth) * scale;
  const depth = (Math.abs(Math.sin(angle)) * size.width + Math.abs(Math.cos(angle)) * size.depth) * scale;
  const bottom = object.y ?? GROUND;
  return {
    minX: object.x - width / 2, maxX: object.x + width / 2,
    minZ: object.z - depth / 2, maxZ: object.z + depth / 2,
    minY: bottom, maxY: bottom + size.height * scale,
    width, depth,
  };
}

function intersects(a, b, clearance = 0.08) {
  return a.minX < b.maxX + clearance && a.maxX + clearance > b.minX
    && a.minZ < b.maxZ + clearance && a.maxZ + clearance > b.minZ
    && a.minY < b.maxY - .015 && a.maxY > b.minY + .015;
}

/**
 * A real geometry audit used by both tests and the game. Explicit parent
 * relationships allow a cup on its table or a window in its wall; siblings are
 * still checked. Water/sky entities are checked at their actual elevations.
 */
export function validateMap(map) {
  const errors = [], overlaps = [], unlabelled = [];
  const words = new Set(WORDS.map(({ id }) => id));
  const instances = new Map();
  const bounds = new Map();
  const terrain = map.terrain || { width: 26, depth: 22 };
  for (const object of map.objects || []) {
    if (!object.id || instances.has(object.id)) errors.push(`Duplicate or missing instance id: ${object.id}`);
    instances.set(object.id, object);
    if (!words.has(object.wordId)) unlabelled.push(object.id);
    const bound = getObjectBounds(object);
    if (!bound) { errors.push(`${object.id} has no model footprint`); continue; }
    if (![object.x, object.z, bound.minY, bound.maxY].every(Number.isFinite)) errors.push(`${object.id} has invalid coordinates`);
    if (bound.minX < -terrain.width / 2 || bound.maxX > terrain.width / 2 || bound.minZ < -terrain.depth / 2 || bound.maxZ > terrain.depth / 2) errors.push(`${object.id} extends outside the map`);
    bounds.set(object.id, bound);
  }
  for (const object of map.objects || []) {
    if (!object.parentId) continue;
    const support = instances.get(object.parentId);
    if (!support) { errors.push(`${object.id} has a missing support`); continue; }
    if (!['table', 'wall'].includes(object.surface)) errors.push(`${object.id} has an unsupported parent relationship`);
    if (object.surface === 'table') {
      const child = bounds.get(object.id), parent = bounds.get(support.id);
      if (child && parent && (child.minX < parent.minX - .02 || child.maxX > parent.maxX + .02 || child.minZ < parent.minZ - .02 || child.maxZ > parent.maxZ + .02)) errors.push(`${object.id} is outside its tabletop`);
      if (child && parent && Math.abs(child.minY - parent.maxY) > .05) errors.push(`${object.id} is not resting on its tabletop`);
    }
    if (object.surface === 'wall') {
      const child = bounds.get(object.id), parent = bounds.get(support.id);
      if (child && parent) {
        const wallDistance = Math.min(Math.abs(object.x - parent.minX), Math.abs(object.x - parent.maxX), Math.abs(object.z - parent.minZ), Math.abs(object.z - parent.maxZ));
        if (wallDistance > .35 || child.minY < parent.minY || child.maxY > parent.maxY + .05) errors.push(`${object.id} is not attached to its supporting wall`);
      }
    }
  }
  const objects = map.objects || [];
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i], b = objects[j];
      if (a.parentId === b.id || b.parentId === a.id) continue;
      if (bounds.has(a.id) && bounds.has(b.id) && intersects(bounds.get(a.id), bounds.get(b.id))) overlaps.push([a.id, b.id]);
    }
  }
  const npcs = map.npcs || [];
  const characters = new Set(CHARACTERS.map(({ id }) => id));
  const seenNpcs = new Set();
  for (const npc of npcs) {
    if (!characters.has(npc.id) || seenNpcs.has(npc.id)) errors.push(`Unknown or duplicate character: ${npc.id}`);
    seenNpcs.add(npc.id);
    const npcBounds = { minX: npc.x - .4, maxX: npc.x + .4, minZ: npc.z - .4, maxZ: npc.z + .4, minY: GROUND, maxY: GROUND + 1.65 };
    for (const object of objects) if (bounds.has(object.id) && intersects(npcBounds, bounds.get(object.id), .1)) overlaps.push([`character:${npc.id}`, object.id]);
  }
  for (let i = 0; i < npcs.length; i++) for (let j = i + 1; j < npcs.length; j++) {
    if (Math.abs(npcs[i].x - npcs[j].x) < .9 && Math.abs(npcs[i].z - npcs[j].z) < .9) overlaps.push([`character:${npcs[i].id}`, `character:${npcs[j].id}`]);
  }
  const quest = QUESTS.find(({ id }) => id === map.questId);
  if (quest) for (const id of quest.wordIds) if (!objects.some(({ wordId }) => wordId === id)) errors.push(`Quest target ${id} is absent`);
  errors.push(...overlaps.map(([a, b]) => `Overlap: ${a} / ${b}`));
  errors.push(...unlabelled.map((id) => `Unlabelled object: ${id}`));
  return { valid: errors.length === 0, errors, overlaps, unlabelled, objectCount: objects.length };
}

export function assertAllMapsValid() {
  const failures = MAPS.map((map) => ({ id: map.id, ...validateMap(map) })).filter(({ valid }) => !valid);
  if (failures.length) throw new Error(failures.map(({ id, errors }) => `${id}: ${errors.join('; ')}`).join('\n'));
  return true;
}
