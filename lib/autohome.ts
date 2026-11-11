// Каталог новых авто из Китая с car.autohome.com.cn (страницы в GBK).
// Страница бренда → модели (фото, класс), страница модели → комплектации (двигатель, мощность, цена в ¥).

export type Power = "ice" | "phev" | "ev" | "erev";
export type Trim = { year: number; price: number; cc: number; hp: number; power: Power; drive: string };
export type Model = { id: string; brand: string; name: string; level: string; photo: string; trims: Trim[] };

// id бренда на autohome
const brandIds: Record<string, number> = {
  Toyota: 3, Volkswagen: 1, Honda: 14, Nissan: 63, Mazda: 58, Kia: 62, Hyundai: 12,
  Geely: 25, "Geely Galaxy": 575, Chery: 26, Exeed: 350, Jetour: 319, Haval: 181, Tank: 458,
  Changan: 76, BYD: 75, "Lynk & Co": 279, Hongqi: 91, Wuling: 114,
};

// Кандидаты в каталог по ликвидности в России, самые ходовые сверху. Названия — как после modelName().
// Из них при обходе отбираются модели с адекватным утильсбором по ценовым группам (pick в lib/customs.ts).
export const pool: [string, string][] = [
  ["Toyota", "Camry"], ["Toyota", "RAV4"], ["Geely", "Monjaro"], ["Geely", "Coolray"], ["Haval", "H6"],
  ["Chery", "Tiggo 7 PLUS"], ["Changan", "CS35PLUS"], ["Changan", "UNI-K"], ["Geely", "Atlas"], ["Chery", "Tiggo 8 PRO"],
  ["Haval", "Dargo"], ["Tank", "300"], ["Volkswagen", "Tiguan L"], ["Honda", "CR-V"], ["Nissan", "X-Trail"], ["Kia", "Sportage"],
  ["Hyundai", "Tucson"], ["Mazda", "CX-5"], ["Toyota", "Corolla"], ["Changan", "CS55PLUS"], ["Changan", "UNI-V"],
  ["Changan", "Eado"], ["Geely", "Emgrand"], ["Geely", "Preface"], ["Geely", "Okavango"], ["Chery", "Tiggo 7"],
  ["Chery", "Arrizo 8"], ["Exeed", "Lanyue"], ["Exeed", "Yaoguang"], ["Jetour", "Dashing"], ["Jetour", "Traveller"],
  ["Toyota", "Highlander"], ["Volkswagen", "Passat"], ["Volkswagen", "Magotan"], ["Volkswagen", "Sagitar"],
  ["Volkswagen", "Lavida"], ["Honda", "Accord"], ["Honda", "Civic"], ["Nissan", "Qashqai"], ["Nissan", "Sylphy"],
  ["Kia", "K5"], ["Kia", "Seltos"], ["Hyundai", "Elantra"], ["Toyota", "Corolla Cross"], ["Mazda", "3"],
  ["BYD", "Seagull"], ["BYD", "Dolphin"], ["Lynk & Co", "01"], ["Lynk & Co", "06"], ["Hongqi", "H5"],
  ["Hongqi", "HS5"], ["Hongqi", "H9"], ["Tank", "500"], ["Volkswagen", "Teramont"], ["Toyota", "Wildlander"],
  ["Toyota", "Frontlander"], ["Wuling", "Hongguang MINIEV"], ["Wuling", "Bingo"], ["Geely Galaxy", "Panda"],
  ["Haval", "Raptor"], ["Haval", "H9"], ["Chery", "Tiggo 9"],
];

export const rank = (m: Model) => pool.findIndex(([b, n]) => b === m.brand && n === m.name);

const base = "https://car.autohome.com.cn";

// Один повтор: соединение с Китаем иногда обрывается по таймауту
async function page(path: string, retry = true): Promise<string> {
  try {
    const res = await fetch(base + path, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`autohome ${path}: ${res.status}`);
    return new TextDecoder("gbk").decode(await res.arrayBuffer());
  } catch (e) {
    if (retry) return page(path, false);
    throw e;
  }
}

export function parseBrand(html: string) {
  return html
    .split('<div class="list-cont" data-value="')
    .slice(1)
    .map((b) => ({
      id: b.slice(0, b.indexOf('"')),
      name: b.match(/class="main-title"><a[^>]*>([^<]+)</)?.[1].trim() ?? "",
      level: b.match(/info-gray">([^<]+)</)?.[1] ?? "",
      photo: b.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? "",
    }));
}

// Заголовок группы: «2.0升 涡轮增压 204马力», «1.5升 发动机:101马力 电动机:163马力», «电动 340马力», «增程式 408马力»
export function engine(head: string): Pick<Trim, "power" | "cc" | "hp"> | null {
  const hp = [...head.matchAll(/(\d+)马力/g)].reduce((s, m) => s + Number(m[1]), 0);
  if (!hp) return null;
  if (head.startsWith("电动")) return { power: "ev", cc: 0, hp };
  if (head.startsWith("增程")) return { power: "erev", cc: 0, hp };
  const litres = head.match(/([\d.]+)升/)?.[1];
  if (!litres) return null;
  return { power: head.includes("电动机") ? "phev" : "ice", cc: Math.round(Number(litres) * 1000), hp };
}

export function parseTrims(html: string): Trim[] {
  const onSale = html.slice(html.indexOf('id="divSeries"'));
  return onSale
    .split('interval01-list-cars-text">')
    .slice(1)
    .flatMap((group) => {
      const e = engine(group.slice(0, group.indexOf("<")));
      if (!e) return [];
      return group.split("<li").flatMap((li) => {
        const year = li.match(/>(\d{4})款/)?.[1];
        const price = li.match(/<\/a>\s*([\d.]+)万<\/div>/)?.[1];
        if (!year || !price) return [];
        const drive = /四驱/.test(li) ? "полный" : /前驱/.test(li) ? "передний" : /后驱/.test(li) ? "задний" : "";
        return [{ year: Number(year), price: Math.round(Number(price) * 10_000), ...e, drive }];
      });
    });
}

async function brandSeries(id: number, brand: string) {
  const names = pool.filter(([b]) => b === brand).map(([, n]) => n);
  const series = [];
  for (let path: string | undefined = `/price/brand-${id}.html`; path; ) {
    const html = await page(path);
    for (const s of parseBrand(html)) {
      const name = modelName(s.name);
      if (names.includes(name)) series.push({ ...s, name, brand });
    }
    path = html.match(/class="page-item-next" href="(\/[^"]+)"/)?.[1];
  }
  return series;
}

export async function fetchModels(): Promise<Model[]> {
  const series = (
    await Promise.all(
      Object.entries(brandIds).map(([brand, id]) =>
        brandSeries(id, brand).catch((e) => {
          console.error(`Каталог: бренд ${brand} не загрузился`, e);
          return [];
        }),
      ),
    )
  ).flat();

  // 8 запросов одновременно, порядок моделей сохраняется
  const found: (Model | undefined)[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < series.length) {
        const i = next++;
        const s = series[i];
        const trims = await page(`/price/series-${s.id}.html`).then(parseTrims, () => []);
        const photo = `https:${s.photo}`.replace(/\/\d+x\d+_/, "/{size}_");
        if (trims.length) found[i] = { id: s.id, brand: s.brand, name: s.name, level: levels[s.level] ?? "", photo, trims };
      }
    }),
  );

  // «Tank 400» и «Tank 400 新能源» — одна модель с бензиновыми и гибридными комплектациями
  const models: Model[] = [];
  for (const m of found) {
    if (!m) continue;
    const same = models.find((x) => x.brand === m.brand && x.name === m.name);
    if (same) same.trims.push(...m.trims);
    else models.push(m);
  }
  return models;
}

export const powerName: Record<Power, string> = { ice: "ДВС", phev: "гибрид", ev: "электро", erev: "EREV" };

export const fuels = (m: Model) => [...new Set(m.trims.map((t) => powerName[t.power]))];

export const bodyOf = (level: string) =>
  /кроссовер|внедорожник/.test(level) ? "Кроссовер"
  : /вэн/.test(level) ? "Минивэн"
  : level === "пикап" ? "Пикап"
  : level === "спорткар" ? "Спорткар"
  : level ? "Седан, хэтчбек" : "";

export const engineText = (t: Trim) =>
  `${t.cc ? `${t.power === "phev" ? "гибрид " : ""}${(t.cc / 1000).toFixed(1)} л` : powerName[t.power]}, ${t.hp} л. с.`;

// Фото autohome отдаёт в любом размере: 240x180, 480x360, 800x600
export const modelPhoto = (m: Model, size: string) => m.photo.replace("{size}", size);

export const levels: Record<string, string> = {
  微型车: "микроавто",
  小型车: "малый класс",
  紧凑型车: "компактный класс",
  中型车: "средний класс",
  中大型车: "бизнес-класс",
  大型车: "представительский класс",
  小型SUV: "малый кроссовер",
  紧凑型SUV: "компактный кроссовер",
  中型SUV: "средний кроссовер",
  中大型SUV: "большой кроссовер",
  大型SUV: "полноразмерный внедорожник",
  紧凑型MPV: "компактвэн",
  中型MPV: "минивэн",
  中大型MPV: "минивэн",
  大型MPV: "большой минивэн",
  跑车: "спорткар",
  皮卡: "пикап",
};

// Китайские названия → экспортные или пиньинь. Префиксы брендов и «新能源/燃油» убираются:
// тип двигателя виден в карточке. Модель с непереведёнными иероглифами не попадает в каталог.
const words = Object.entries({
  比亚迪: "", 吉利: "", 银河: "", 长安: "", 哈弗: "", 长城: "", 红旗: "", 领克: "", 捷途: "",
  理想: "", 星途: "", 岚图: "", 极氪: "", 坦克: "", 小米: "", 深蓝: "", 问界: "", 新能源: "", 燃油: "",
  丰田: "", 大众: "", 本田: "", 日产: "", 马自达: "", 起亚: "", 北京现代: "", 现代: "", 五菱: "", 荣放: "", 昂克赛拉: "",
  凯美瑞: "Camry", 汉兰达: "Highlander", 卡罗拉: "Corolla", 锐放: "Cross", 威兰达: "Wildlander", 锋兰达: "Frontlander",
  途观: "Tiguan", 帕萨特: "Passat", 迈腾: "Magotan", 速腾: "Sagitar", 朗逸: "Lavida", 探岳: "Tayron", 途昂: "Teramont",
  雅阁: "Accord", 思域: "Civic", 皓影: "Breeze", 奇骏: "X-Trail", 逍客: "Qashqai", 轩逸: "Sylphy", 天籁: "Teana",
  狮铂拓界: "Sportage", 赛图斯: "Seltos", 途胜: "Tucson", 伊兰特: "Elantra", 索纳塔: "Sonata", 宏光: "Hongguang", 缤果: "Bingo",
  海鸥: "Seagull", 海豚: "Dolphin", 海豹: "Seal", 海狮: "Sealion", 驱逐舰: "Destroyer",
  大汉: "Dahan", 大唐: "Datang", 秦: "Qin", 汉: "Han", 唐: "Tang", 宋: "Song", 元: "Yuan", 夏: "Xia",
  旅行版: "универсал",
  帝豪: "Emgrand", 星瑞: "Preface", 缤越: "Coolray", 牛仔: "Cowboy", 星越L: "Monjaro", 博越L: "Atlas",
  博越: "Boyue", 豪越L: "Okavango", 熊猫: "Panda", 星耀: "Starshine", 星舰: "Starship",
  艾瑞泽: "Arrizo", 瑞虎: "Tiggo", 大狗: "Dargo", 猛龙: "Raptor", 枭龙: "Xiaolong",
  逸动: "Eado", 锐程: "Raeton", 天工: "Tiangong", 大圣: "Dashing", 旅行者: "Traveller",
  瑶光: "Yaoguang", 揽月: "Lanyue", 凌云: "Lingyun", 追风: "Zhuifeng",
  追光: "Passion", 知音: "Courage", 泰山: "Taishan", 梦想家: "Dream",
}).sort(([a], [b]) => b.length - a.length);

export function modelName(name: string) {
  let s = name;
  for (const [cn, en] of words) s = s.replaceAll(cn, ` ${en} `);
  s = s.replace(/\s+/g, " ").trim();
  return !s || /[一-鿿]/.test(s) ? "" : s;
}
