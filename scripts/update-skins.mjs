// Оновлює src/data/skins.json з відкритої бази CSGO-API: скіни, стікери, кейси, агенти, брелоки, патчі, музика, графіті, монети, інструменти
import { writeFileSync } from 'node:fs';
const BASE = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/';
// [файл, ключ категорії]
const SRC = [['skins', 'skin'], ['stickers', 'sticker'], ['crates', 'crate'], ['keychains', 'charm'], ['agents', 'agent'],
  ['patches', 'patch'], ['music_kits', 'music'], ['graffiti', 'graffiti'], ['collectibles', 'coll'], ['highlights', 'highlight'], ['tools', 'tool']];
const P = ['https://community.akamai.steamstatic.com/economy/image/', 'https://cdn.steamstatic.com/apps/730/icons/', 'https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/'];
const short = u => { const k = P.findIndex(p => u.startsWith(p)); return k < 0 ? u : k + ':' + u.slice(P[k].length); };
const c = {}, i = [], cnt = {}, seen = new Set();
for (const [f, cat] of SRC) {
  const d = await (await fetch(BASE + f + '.json')).json();
  for (const x of d) {
    const img = x.image || x.thumbnail;
    if (!x.name || !img) continue;
    const r = x.rarity || {};
    const rn = r.name || 'Unknown';
    if (r.color) c[rn] = r.color; else c[rn] ||= '#8899aa';
    const key = cat + '|' + x.name + '|' + img;
    if (seen.has(key)) continue; seen.add(key);
    i.push([x.name, rn, short(img), cat]); cnt[cat] = (cnt[cat] || 0) + 1;
  }
}
writeFileSync('src/data/skins.json', JSON.stringify({ c, p: P, i }));

// Кейси: склад за рідкістю (0 Mil-Spec, 1 Restricted, 2 Classified, 3 Covert) + «золото» (ножі/рукавиці) — лише назви, фото й ціни беруться з каталогу
const T = { 'Mil-Spec Grade': 0, Restricted: 1, Classified: 2, Covert: 3 };
const crates = (await (await fetch(BASE + 'crates.json')).json()).filter(x => x.type === 'Case' && x.image && x.contains?.length);
const dt = x => new Date((x.first_sale_date || '2013/01/01').replace(/\//g, '-')).getTime() || 0;
const cases = crates.sort((a, b) => dt(a) - dt(b)).map(x => [x.name, short(x.image), (x.first_sale_date || '').replace(/\//g, '-'),
  x.contains.filter(y => y.rarity.name in T).map(y => [y.name, T[y.rarity.name]]), (x.contains_rare || []).map(y => y.name)]);
writeFileSync('src/data/cases.json', JSON.stringify({ c: cases }));
console.log(`Збережено ${cases.length} кейсів`);
console.log(`Збережено ${i.length} предметів`, cnt);
