/**
 * The island's original story and the small, practical conversations it teaches.
 * Learning records are owned by learning.js; claiming a quest never changes them.
 */
export const REGIONS = [
  {
    id: 'village',
    name: 'Lantern Village',
    subtitle: 'A little hello goes a long way',
    description: 'Warm windows, winding paths, and a café waiting to welcome everyone back.',
    icon: '⌂',
    color: '#edb883',
  },
  {
    id: 'garden',
    name: 'Wildflower Garden',
    subtitle: 'Make room for something to grow',
    description: 'Follow the orchard path, meet the island’s smallest neighbors, and bring the community garden to life.',
    icon: '✿',
    color: '#b6cf8c',
  },
  {
    id: 'harbor',
    name: 'Moonrise Harbor',
    subtitle: 'Every arrival has a story',
    description: 'A quiet waterfront of little boats, forgotten parcels, and a lighthouse that needs its glow back.',
    icon: '⚓',
    color: '#9bc9cf',
  },
];

export const CHARACTERS = [
  {
    id: 'mika',
    name: 'Mika',
    role: 'Café keeper & enthusiastic baker',
    region: 'village',
    emoji: '☕',
    color: '#dda684',
    greeting: 'You made it! Come in. There’s always room for one more.',
    dialogue: [
      'This old Community Almanac used to hold a word for every little thing on our island. Let’s fill its pages together.',
      'A good conversation starts like good bread: a few simple ingredients, and a little patience.',
      'You can come back to a word as often as you like. Some things feel familiar only after a second cup of tea.',
    ],
  },
  {
    id: 'jun',
    name: 'Jun',
    role: 'Gardener & collector of small wonders',
    region: 'garden',
    emoji: '🌱',
    color: '#9ab883',
    greeting: 'Look closely. Something lovely is growing right beside you.',
    dialogue: [
      'The Almanac has a whole section for the garden. Most of the pages are blank, but that makes them rather exciting.',
      'I used to label every plant. Then the rain borrowed my labels. Perhaps we can make some new ones.',
      'A little every day. That’s how gardens grow, and I suspect it works for words, too.',
    ],
  },
  {
    id: 'luna',
    name: 'Luna',
    role: 'Harbormaster & keeper of the evening lights',
    region: 'harbor',
    emoji: '⛵',
    color: '#95b4bd',
    greeting: 'Welcome to the water’s edge. What shall we discover today?',
    dialogue: [
      'Boats carry all sorts of things here. Parcels, visitors, stories. The best ones always bring a few new words.',
      'The lighthouse has been quiet for a while. When the Almanac is full again, we’ll light the way home.',
      'If you lose your way, stop and name one thing you recognize. There’s your starting point.',
    ],
  },
  {
    id: 'theo',
    name: 'Theo',
    role: 'Almanac keeper & happily wandering neighbor',
    region: 'village',
    emoji: '📖',
    color: '#b7a5c3',
    greeting: 'A new face! That’s the first good story of the day.',
    dialogue: [
      'An almanac is a book of things worth remembering. Ours is about the things, and the people, that make this place home.',
      'You don’t have to learn the whole island in a day. One small discovery is a perfectly good beginning.',
      'When a word slips away, it hasn’t gone far. Open your journal and give it another visit.',
    ],
  },
];

/** Landmark quests include `milestone` for the world and celebration views. */
export const QUESTS = [
  {
    id: 'little-hello',
    title: 'A little hello',
    description: 'Theo has saved you the first page of the Community Almanac. Find an apple, a book, and a flower, then practice their names.',
    characterId: 'theo',
    region: 'village',
    wordIds: ['apple', 'book', 'flower'],
    reward: { xp: 35, coins: 12 },
    requires: [],
    scene: 'discovery',
    completionLine: 'Three little words, and the first page is ours. Welcome to the island.',
  },
  {
    id: 'kettle-on',
    title: 'The kettle is on',
    description: 'Mika is opening the café for a few old friends. Help prepare the drinks and learn how to name the things on the counter.',
    characterId: 'mika',
    region: 'village',
    wordIds: ['coffee', 'cup', 'water', 'tea'],
    reward: { xp: 45, coins: 18 },
    requires: ['little-hello'],
    scene: 'cafe',
    completionLine: 'There we are. A warm cup and a familiar word can make anyone feel at home.',
  },
  {
    id: 'breakfast-club',
    title: 'The breakfast club',
    description: 'The breakfast basket has arrived. Help Mika remember the names of four everyday ingredients before the neighbors come by.',
    characterId: 'mika',
    region: 'village',
    wordIds: ['bread', 'egg', 'milk', 'cheese'],
    reward: { xp: 55, coins: 22 },
    requires: ['kettle-on'],
    scene: 'cafe',
    completionLine: 'The bread is warm, the basket is full, and breakfast has a place in our Almanac.',
  },
  {
    id: 'lantern-cafe',
    title: 'A place at the table',
    description: 'The café needs a few finishing touches. Name its furniture and little comforts, then help Mika reopen the Lantern Café.',
    characterId: 'mika',
    region: 'village',
    wordIds: ['table', 'chair', 'lamp', 'clock'],
    reward: { xp: 90, coins: 40 },
    requires: ['breakfast-club'],
    scene: 'cafe',
    milestone: 'cafe',
    completionLine: 'The Lantern Café is open again! I’ve kept the window seat for you.',
  },
  {
    id: 'first-seedlings',
    title: 'The first seedlings',
    description: 'Follow Jun into the garden. Discover the fruit and vegetables in the growing beds, and the tree watching over them.',
    characterId: 'jun',
    region: 'garden',
    wordIds: ['tree', 'carrot', 'tomato', 'strawberry'],
    reward: { xp: 45, coins: 18 },
    requires: ['little-hello'],
    scene: 'garden',
    completionLine: 'Our first garden page! I’ll tuck it between two clean leaves so it stays safe.',
  },
  {
    id: 'orchard-colors',
    title: 'Colors in the orchard',
    description: 'A butterfly has led Jun to a colorful harvest. Collect four new words along the orchard path.',
    characterId: 'jun',
    region: 'garden',
    wordIds: ['banana', 'orange', 'lemon', 'butterfly'],
    reward: { xp: 55, coins: 22 },
    requires: ['first-seedlings'],
    scene: 'garden',
    completionLine: 'Yellow, orange, and a flutter of wings. This page almost smells like summer.',
  },
  {
    id: 'small-neighbors',
    title: 'Small island neighbors',
    description: 'The garden has some curious visitors. Learn their names and find the smooth stone where Jun leaves their breakfast.',
    characterId: 'jun',
    region: 'garden',
    wordIds: ['cat', 'dog', 'bird', 'stone'],
    reward: { xp: 60, coins: 24 },
    requires: ['orchard-colors'],
    scene: 'garden',
    completionLine: 'Everyone’s accounted for. Even the bird stayed long enough to hear its name.',
  },
  {
    id: 'garden-in-bloom',
    title: 'A garden under the sky',
    description: 'The last garden page is about the world above and beyond the beds. Learn its four words to reopen the community garden.',
    characterId: 'jun',
    region: 'garden',
    wordIds: ['sun', 'rain', 'cloud', 'mountain'],
    reward: { xp: 90, coins: 40 },
    requires: ['small-neighbors'],
    scene: 'garden',
    milestone: 'garden',
    completionLine: 'The community garden is blooming again. All those little visits really did add up.',
  },
  {
    id: 'water-edge',
    title: 'Down by the water',
    description: 'Meet Luna at the harbor. Take a slow walk along the waterfront and learn the names of four things you find.',
    characterId: 'luna',
    region: 'harbor',
    wordIds: ['boat', 'fish', 'shell', 'bridge'],
    reward: { xp: 45, coins: 18 },
    requires: ['little-hello'],
    scene: 'harbor',
    completionLine: 'The harbor has its first page. I can almost hear the old lighthouse waking up.',
  },
  {
    id: 'lost-and-found',
    title: 'The lost-and-found shelf',
    description: 'A visitor left a few things behind. Help Luna label the lost-and-found shelf so everything can find its owner.',
    characterId: 'luna',
    region: 'harbor',
    wordIds: ['bicycle', 'hat', 'bag', 'shoe', 'umbrella'],
    reward: { xp: 65, coins: 26 },
    requires: ['water-edge'],
    scene: 'harbor',
    completionLine: 'Five things with five names. Finding the owners should be much easier now.',
  },
  {
    id: 'homecoming-parcel',
    title: 'A homecoming parcel',
    description: 'Theo is helping a new neighbor settle in. Learn five words for home, then carry their welcome parcel up from the harbor.',
    characterId: 'theo',
    region: 'harbor',
    wordIds: ['house', 'door', 'window', 'key', 'bed'],
    reward: { xp: 70, coins: 28 },
    requires: ['lost-and-found'],
    scene: 'discovery',
    completionLine: 'A key, a warm bed, and a few friendly words. That’s a lovely beginning for a new home.',
  },
  {
    id: 'harbor-lanterns',
    title: 'The harbor shines again',
    description: 'The café is open and the garden is growing. Meet Luna at the evening bench, practice the last sky words, and light the harbor.',
    characterId: 'luna',
    region: 'harbor',
    wordIds: ['moon', 'star', 'bench'],
    reward: { xp: 120, coins: 60 },
    requires: ['homecoming-parcel', 'lantern-cafe', 'garden-in-bloom'],
    scene: 'harbor',
    milestone: 'harbor',
    completionLine: 'Look—the lighthouse! Every word we remembered is a little light to find our way home.',
  },
];

export const PHRASES = [
  {
    id: 'hello', english: 'Hello.', scene: 'greetings',
    translations: {
      ja: { text: 'こんにちは。', reading: 'Konnichiwa.' },
      es: { text: 'Hola.', reading: '' },
      de: { text: 'Hallo.', reading: '' },
      zh: { text: '你好。', reading: 'Nǐ hǎo.' },
    },
  },
  {
    id: 'nice-to-meet-you', english: 'Nice to meet you.', scene: 'greetings',
    translations: {
      ja: { text: 'はじめまして。', reading: 'Hajimemashite.' },
      es: { text: 'Mucho gusto.', reading: '' },
      de: { text: 'Freut mich, Sie kennenzulernen.', reading: '' },
      zh: { text: '很高兴认识您。', reading: 'Hěn gāoxìng rènshi nín.' },
    },
  },
  {
    id: 'thank-you', english: 'Thank you.', scene: 'greetings',
    translations: {
      ja: { text: 'ありがとうございます。', reading: 'Arigatō gozaimasu.' },
      es: { text: 'Gracias.', reading: '' },
      de: { text: 'Vielen Dank.', reading: '' },
      zh: { text: '谢谢。', reading: 'Xièxie.' },
    },
  },
  {
    id: 'excuse-me', english: 'Excuse me.', scene: 'greetings',
    translations: {
      ja: { text: 'すみません。', reading: 'Sumimasen.' },
      es: { text: 'Disculpe.', reading: '' },
      de: { text: 'Entschuldigen Sie bitte.', reading: '' },
      zh: { text: '打扰一下。', reading: 'Dǎrǎo yíxià.' },
    },
  },
  {
    id: 'one-coffee', english: 'One coffee, please.', scene: 'cafe',
    translations: {
      ja: { text: 'コーヒーを一つください。', reading: 'Kōhī o hitotsu kudasai.' },
      es: { text: 'Un café, por favor.', reading: '' },
      de: { text: 'Einen Kaffee, bitte.', reading: '' },
      zh: { text: '请给我一杯咖啡。', reading: 'Qǐng gěi wǒ yì bēi kāfēi.' },
    },
  },
  {
    id: 'some-water', english: 'Some water, please.', scene: 'cafe',
    translations: {
      ja: { text: 'お水をください。', reading: 'Omizu o kudasai.' },
      es: { text: 'Agua, por favor.', reading: '' },
      de: { text: 'Etwas Wasser, bitte.', reading: '' },
      zh: { text: '请给我一些水。', reading: 'Qǐng gěi wǒ yìxiē shuǐ.' },
    },
  },
  {
    id: 'how-much', english: 'How much is it?', scene: 'cafe',
    translations: {
      ja: { text: 'いくらですか。', reading: 'Ikura desu ka?' },
      es: { text: '¿Cuánto cuesta?', reading: '' },
      de: { text: 'Wie viel kostet das?', reading: '' },
      zh: { text: '多少钱？', reading: 'Duōshao qián?' },
    },
  },
  {
    id: 'where-cafe', english: 'Where is the café?', scene: 'directions',
    translations: {
      ja: { text: 'カフェはどこですか。', reading: 'Kafe wa doko desu ka?' },
      es: { text: '¿Dónde está la cafetería?', reading: '' },
      de: { text: 'Wo ist das Café?', reading: '' },
      zh: { text: '咖啡馆在哪里？', reading: 'Kāfēiguǎn zài nǎlǐ?' },
    },
  },
  {
    id: 'where-harbor', english: 'Where is the harbor?', scene: 'directions',
    translations: {
      ja: { text: '港はどこですか。', reading: 'Minato wa doko desu ka?' },
      es: { text: '¿Dónde está el puerto?', reading: '' },
      de: { text: 'Wo ist der Hafen?', reading: '' },
      zh: { text: '港口在哪里？', reading: 'Gǎngkǒu zài nǎlǐ?' },
    },
  },
  {
    id: 'dont-understand', english: 'I don’t understand.', scene: 'conversation',
    translations: {
      ja: { text: 'わかりません。', reading: 'Wakarimasen.' },
      es: { text: 'No entiendo.', reading: '' },
      de: { text: 'Ich verstehe nicht.', reading: '' },
      zh: { text: '我不明白。', reading: 'Wǒ bù míngbai.' },
    },
  },
  {
    id: 'more-slowly', english: 'Please speak a little more slowly.', scene: 'conversation',
    translations: {
      ja: { text: 'もう少しゆっくり話してください。', reading: 'Mō sukoshi yukkuri hanashite kudasai.' },
      es: { text: 'Hable un poco más despacio, por favor.', reading: '' },
      de: { text: 'Bitte sprechen Sie etwas langsamer.', reading: '' },
      zh: { text: '请说慢一点。', reading: 'Qǐng shuō màn yìdiǎn.' },
    },
  },
  {
    id: 'see-you', english: 'See you!', scene: 'greetings',
    translations: {
      ja: { text: 'またね。', reading: 'Mata ne!' },
      es: { text: '¡Hasta luego!', reading: '' },
      de: { text: 'Bis bald!', reading: '' },
      zh: { text: '再见！', reading: 'Zàijiàn!' },
    },
  },
];

/** Each conversation practices a useful exchange, rather than isolated labels. */
export const CONVERSATIONS = [
  {
    id: 'cafe-conversation',
    title: 'Your first café order',
    characterId: 'mika',
    description: 'Step up to Mika’s counter and order a little afternoon pick-me-up.',
    steps: [
      {
        prompt: 'Mika asks what you would like. Order one coffee politely.',
        phraseId: 'one-coffee',
        reply: 'One coffee, coming right up! I’ll put the kettle on.',
        distractorIds: ['where-cafe', 'see-you'],
      },
      {
        prompt: 'Your coffee is ready, and you would also like a glass of water. Ask for some.',
        phraseId: 'some-water',
        reply: 'Of course. Here’s a fresh glass of water to go with it.',
        distractorIds: ['nice-to-meet-you', 'where-harbor'],
      },
      {
        prompt: 'You have everything you need. Ask Mika how much your order costs.',
        phraseId: 'how-much',
        reply: 'For a neighbor helping with the Almanac? This first cup is on the house.',
        distractorIds: ['dont-understand', 'one-coffee'],
      },
    ],
    reward: { xp: 25, coins: 8 },
  },
  {
    id: 'village-conversation',
    title: 'Finding your feet',
    characterId: 'theo',
    description: 'Meet the Almanac keeper and find your way to a warm welcome at the café.',
    steps: [
      {
        prompt: 'Theo waves as you reach the village square. Say hello.',
        phraseId: 'hello',
        reply: 'Hello there! I’m Theo, keeper of this rather well-traveled Almanac.',
        distractorIds: ['see-you', 'some-water'],
      },
      {
        prompt: 'Theo has introduced himself. Tell him you are pleased to meet him.',
        phraseId: 'nice-to-meet-you',
        reply: 'Likewise! A new neighbor gives us another story worth remembering.',
        distractorIds: ['how-much', 'more-slowly'],
      },
      {
        prompt: 'Theo suggests visiting Mika. Ask where the café is.',
        phraseId: 'where-cafe',
        reply: 'Just follow the little lanterns through the village. Mika’s door is always open.',
        distractorIds: ['where-harbor', 'one-coffee'],
      },
    ],
    reward: { xp: 25, coins: 8 },
  },
  {
    id: 'garden-conversation',
    title: 'A little help in the garden',
    characterId: 'jun',
    description: 'Practice asking for help when a conversation moves a little too quickly.',
    steps: [
      {
        prompt: 'Jun explains how to care for a new seedling, but the instructions are unfamiliar. Say that you do not understand.',
        phraseId: 'dont-understand',
        reply: 'That’s all right. We can take it one small step at a time.',
        distractorIds: ['how-much', 'see-you'],
      },
      {
        prompt: 'Jun starts again, still a little excited. Politely ask for slower speech.',
        phraseId: 'more-slowly',
        reply: 'Of course. A little water, a little light, and plenty of patience.',
        distractorIds: ['where-cafe', 'nice-to-meet-you'],
      },
      {
        prompt: 'Now you understand, and your seedling is safely planted. Thank Jun for the help.',
        phraseId: 'thank-you',
        reply: 'You’re very welcome. Asking for help is how every good gardener begins.',
        distractorIds: ['some-water', 'excuse-me'],
      },
    ],
    reward: { xp: 25, coins: 8 },
  },
  {
    id: 'harbor-conversation',
    title: 'The way to the water',
    characterId: 'luna',
    description: 'Find Luna beside the signpost and ask how to reach the waterfront.',
    steps: [
      {
        prompt: 'Luna is checking the village signpost. Politely get her attention.',
        phraseId: 'excuse-me',
        reply: 'Oh, hello! Looking for somewhere in particular?',
        distractorIds: ['see-you', 'how-much'],
      },
      {
        prompt: 'You would like to see the boats. Ask where the harbor is.',
        phraseId: 'where-harbor',
        reply: 'Take the path toward the water, then cross the little bridge. You’ll hear the gulls.',
        distractorIds: ['where-cafe', 'more-slowly'],
      },
      {
        prompt: 'You are ready to follow the path. Say a friendly goodbye to Luna.',
        phraseId: 'see-you',
        reply: 'See you by the water! Save a moment for the view from the bench.',
        distractorIds: ['hello', 'some-water'],
      },
    ],
    reward: { xp: 25, coins: 8 },
  },
];

export function getConversation(id) {
  return CONVERSATIONS.find((conversation) => conversation.id === id);
}

/** The app calls this after all scenario choices have been answered correctly. */
export function awardConversation(progress, id) {
  const conversation = getConversation(id);
  const completed = Array.isArray(progress?.conversations) ? progress.conversations : [];
  if (!conversation || completed.includes(id)) return progress;
  return {
    ...progress,
    conversations: [...completed, id],
    xp: (Number.isFinite(progress?.xp) ? progress.xp : 0) + conversation.reward.xp,
    coins: (Number.isFinite(progress?.coins) ? progress.coins : 0) + conversation.reward.coins,
  };
}

export function getCharacter(id) {
  return CHARACTERS.find((character) => character.id === id);
}

function completedQuestIds(progress) {
  return Array.isArray(progress?.quests) ? progress.quests : [];
}

function hasLearnedWord(progress, id) {
  const learned = progress?.learned;
  if (learned instanceof Set) return learned.has(id);
  if (Array.isArray(learned)) return learned.includes(id);
  return learned != null && Object.hasOwn(learned, id) && learned[id] != null;
}

/** Completed quests stay completed even when a later review becomes due. */
export function getQuestState(quest, progress) {
  if (!quest) return 'locked';
  const completed = completedQuestIds(progress);
  if (completed.includes(quest.id)) return 'completed';
  if (!quest.requires.every((id) => completed.includes(id))) return 'locked';
  return quest.wordIds.every((id) => hasLearnedWord(progress, id)) ? 'ready' : 'available';
}

/** Return actionable quests; pass a region id to limit the board to that region. */
export function getAvailableQuests(progress, region) {
  return QUESTS.filter((quest) => {
    if (region && quest.region !== region) return false;
    const state = getQuestState(quest, progress);
    return state === 'available' || state === 'ready';
  });
}

/**
 * Claim after the app completes the quest's practice round. Idempotent and
 * immutable: locked, unfinished, unknown, and already claimed quests are no-ops.
 */
export function awardQuest(progress, questId) {
  const quest = QUESTS.find((entry) => entry.id === questId);
  if (getQuestState(quest, progress) !== 'ready') return progress;
  return {
    ...progress,
    quests: [...completedQuestIds(progress), quest.id],
    xp: (Number.isFinite(progress?.xp) ? progress.xp : 0) + quest.reward.xp,
    coins: (Number.isFinite(progress?.coins) ? progress.coins : 0) + quest.reward.coins,
  };
}
