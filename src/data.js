// The vocabulary is deliberately shared by exploration, the journal, and review.
// German nouns include their article; readings also accept the bare noun.
// Japanese uses Hepburn romanization and Chinese uses Mandarin pinyin.
export const LANGUAGES = [
  { id: 'de', name: 'German', native: 'Deutsch', locale: 'de-DE' },
  { id: 'ja', name: 'Japanese', native: '日本語', locale: 'ja-JP' },
  { id: 'es', name: 'Spanish', native: 'Español', locale: 'es-ES' },
  { id: 'zh', name: 'Chinese', native: '中文', locale: 'zh-CN' },
];

export const CATEGORIES = [
  { id: 'food', name: 'Food & drink', emoji: '🍎' },
  { id: 'home', name: 'Home & everyday', emoji: '🏠' },
  { id: 'nature', name: 'The natural world', emoji: '🌿' },
  { id: 'animals', name: 'Animal friends', emoji: '🐈' },
  { id: 'travel', name: 'Around the island', emoji: '⛵' },
];

const word = (id, english, emoji, category, region, de, ja, reading, es, zh, pinyin) => ({
  id, english, emoji, category, region,
  translations: {
    de: { text: de, reading: de.replace(/^(der|die|das) /, '') },
    ja: { text: ja, reading },
    es: { text: es, reading: es },
    zh: { text: zh, reading: pinyin },
  },
});

export const WORDS = [
  word('apple', 'apple', '🍎', 'food', 'village', 'der Apfel', 'りんご', 'ringo', 'manzana', '苹果', 'píngguǒ'),
  word('bread', 'bread', '🍞', 'food', 'village', 'das Brot', 'パン', 'pan', 'pan', '面包', 'miànbāo'),
  word('coffee', 'coffee', '☕', 'food', 'village', 'der Kaffee', 'コーヒー', 'kōhī', 'café', '咖啡', 'kāfēi'),
  word('cup', 'cup', '🍵', 'home', 'village', 'die Tasse', 'カップ', 'kappu', 'taza', '杯子', 'bēizi'),
  word('water', 'water', '💧', 'food', 'harbor', 'das Wasser', '水', 'mizu', 'agua', '水', 'shuǐ'),
  word('book', 'book', '📖', 'home', 'village', 'das Buch', '本', 'hon', 'libro', '书', 'shū'),
  word('chair', 'chair', '🪑', 'home', 'village', 'der Stuhl', '椅子', 'isu', 'silla', '椅子', 'yǐzi'),
  word('table', 'table', '🪵', 'home', 'village', 'der Tisch', 'テーブル', 'tēburu', 'mesa', '桌子', 'zhuōzi'),
  word('house', 'house', '🏡', 'home', 'village', 'das Haus', '家', 'ie', 'casa', '房子', 'fángzi'),
  word('door', 'door', '🚪', 'home', 'village', 'die Tür', 'ドア', 'doa', 'puerta', '门', 'mén'),
  word('window', 'window', '🪟', 'home', 'village', 'das Fenster', '窓', 'mado', 'ventana', '窗户', 'chuānghu'),
  word('tree', 'tree', '🌳', 'nature', 'garden', 'der Baum', '木', 'ki', 'árbol', '树', 'shù'),
  word('flower', 'flower', '🌷', 'nature', 'garden', 'die Blume', '花', 'hana', 'flor', '花', 'huā'),
  word('carrot', 'carrot', '🥕', 'food', 'garden', 'die Karotte', 'にんじん', 'ninjin', 'zanahoria', '胡萝卜', 'húluóbo'),
  word('cat', 'cat', '🐈', 'animals', 'village', 'die Katze', '猫', 'neko', 'gato', '猫', 'māo'),
  word('dog', 'dog', '🐕', 'animals', 'village', 'der Hund', '犬', 'inu', 'perro', '狗', 'gǒu'),
  word('fish', 'fish', '🐟', 'animals', 'harbor', 'der Fisch', '魚', 'sakana', 'pez', '鱼', 'yú'),
  word('boat', 'boat', '⛵', 'travel', 'harbor', 'das Boot', '船', 'fune', 'barco', '船', 'chuán'),
  word('bicycle', 'bicycle', '🚲', 'travel', 'village', 'das Fahrrad', '自転車', 'jitensha', 'bicicleta', '自行车', 'zìxíngchē'),
  word('hat', 'hat', '👒', 'home', 'village', 'der Hut', '帽子', 'bōshi', 'sombrero', '帽子', 'màozi'),
  word('lamp', 'lamp', '💡', 'home', 'village', 'die Lampe', 'ランプ', 'ranpu', 'lámpara', '灯', 'dēng'),
  word('key', 'key', '🔑', 'home', 'village', 'der Schlüssel', '鍵', 'kagi', 'llave', '钥匙', 'yàoshi'),
  word('banana', 'banana', '🍌', 'food', 'village', 'die Banane', 'バナナ', 'banana', 'plátano', '香蕉', 'xiāngjiāo'),
  word('orange', 'orange', '🍊', 'food', 'garden', 'die Orange', 'オレンジ', 'orenji', 'naranja', '橙子', 'chéngzi'),
  word('lemon', 'lemon', '🍋', 'food', 'garden', 'die Zitrone', 'レモン', 'remon', 'limón', '柠檬', 'níngméng'),
  word('strawberry', 'strawberry', '🍓', 'food', 'garden', 'die Erdbeere', 'いちご', 'ichigo', 'fresa', '草莓', 'cǎoméi'),
  word('tomato', 'tomato', '🍅', 'food', 'garden', 'die Tomate', 'トマト', 'tomato', 'tomate', '西红柿', 'xīhóngshì'),
  word('egg', 'egg', '🥚', 'food', 'village', 'das Ei', '卵', 'tamago', 'huevo', '鸡蛋', 'jīdàn'),
  word('milk', 'milk', '🥛', 'food', 'village', 'die Milch', '牛乳', 'gyūnyū', 'leche', '牛奶', 'niúnǎi'),
  word('cheese', 'cheese', '🧀', 'food', 'village', 'der Käse', 'チーズ', 'chīzu', 'queso', '奶酪', 'nǎilào'),
  word('tea', 'tea', '🫖', 'food', 'village', 'der Tee', 'お茶', 'ocha', 'té', '茶', 'chá'),
  word('bag', 'bag', '👜', 'home', 'village', 'die Tasche', 'かばん', 'kaban', 'bolso', '包', 'bāo'),
  word('clock', 'clock', '🕰️', 'home', 'village', 'die Uhr', '時計', 'tokei', 'reloj', '时钟', 'shízhōng'),
  word('bed', 'bed', '🛏️', 'home', 'village', 'das Bett', 'ベッド', 'beddo', 'cama', '床', 'chuáng'),
  word('shoe', 'shoe', '👟', 'home', 'village', 'der Schuh', '靴', 'kutsu', 'zapato', '鞋', 'xié'),
  word('umbrella', 'umbrella', '☂️', 'home', 'harbor', 'der Regenschirm', '傘', 'kasa', 'paraguas', '雨伞', 'yǔsǎn'),
  word('mountain', 'mountain', '⛰️', 'nature', 'garden', 'der Berg', '山', 'yama', 'montaña', '山', 'shān'),
  word('sun', 'sun', '☀️', 'nature', 'garden', 'die Sonne', '太陽', 'taiyō', 'sol', '太阳', 'tàiyáng'),
  word('moon', 'moon', '🌙', 'nature', 'harbor', 'der Mond', '月', 'tsuki', 'luna', '月亮', 'yuèliang'),
  word('star', 'star', '⭐', 'nature', 'harbor', 'der Stern', '星', 'hoshi', 'estrella', '星星', 'xīngxing'),
  word('cloud', 'cloud', '☁️', 'nature', 'garden', 'die Wolke', '雲', 'kumo', 'nube', '云', 'yún'),
  word('rain', 'rain', '🌧️', 'nature', 'garden', 'der Regen', '雨', 'ame', 'lluvia', '雨', 'yǔ'),
  word('bridge', 'bridge', '🌉', 'travel', 'harbor', 'die Brücke', '橋', 'hashi', 'puente', '桥', 'qiáo'),
  word('bench', 'bench', '🪑', 'home', 'garden', 'die Bank', 'ベンチ', 'benchi', 'banco', '长椅', 'chángyǐ'),
  word('bird', 'bird', '🐦', 'animals', 'garden', 'der Vogel', '鳥', 'tori', 'pájaro', '鸟', 'niǎo'),
  word('butterfly', 'butterfly', '🦋', 'animals', 'garden', 'der Schmetterling', '蝶', 'chō', 'mariposa', '蝴蝶', 'húdié'),
  word('stone', 'stone', '🪨', 'nature', 'harbor', 'der Stein', '石', 'ishi', 'piedra', '石头', 'shítou'),
  word('shell', 'shell', '🐚', 'nature', 'harbor', 'die Muschel', '貝殻', 'kaigara', 'concha', '贝壳', 'bèiké'),
];
