import type { Model, Trim } from "./autohome";

// Ориентировочная цена под ключ для физлица, новое авто (до 3 лет), ставки 2026 года:
// авто по курсу ЦБ + доставка + таможенные платежи + утильсбор + оформление + комиссия.

// Расходы кроме таможни. Значения тестовые — поправьте под реальные.
export const fees = {
  commission: 0.05, // комиссия продавца от цены авто
  delivery: 265_000, // до границы 140 000 + по России ~125 000, ₽
  services: 95_000, // брокер, СВХ, СБКТС и ЭПТС, ₽
};

export type Rates = { cny: number; eur: number; date: string };

export async function fetchRates(): Promise<Rates> {
  const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", { signal: AbortSignal.timeout(10_000) });
  const { Date: date, Valute: v } = await res.json();
  return { cny: v.CNY.Value / v.CNY.Nominal, eur: v.EUR.Value / v.EUR.Nominal, date };
}

const band = <T,>(rows: [number, T][], x: number) => rows.find(([max]) => x <= max)![1];

// Пошлина ЕТС (ДВС, гибриды, EREV): стоимость до N €, % от стоимости, но не меньше € за см³
const ets: [number, [number, number]][] = [
  [8_500, [0.54, 2.5]],
  [16_700, [0.48, 3.5]],
  [42_300, [0.48, 5.5]],
  [84_500, [0.48, 7.5]],
  [169_000, [0.48, 15]],
  [Infinity, [0.48, 20]],
];

// Акциз для электромобилей, ₽ за 1 л. с. всей мощности
const excise: [number, number][] = [
  [90, 0],
  [150, 64],
  [200, 613],
  [300, 1_004],
  [400, 1_711],
  [500, 1_771],
  [Infinity, 1_829],
];

// Сбор за таможенное оформление (постановление № 1638), по стоимости в ₽
const clearance: [number, number][] = [
  [200_000, 1_231],
  [450_000, 2_462],
  [1_200_000, 4_924],
  [2_700_000, 13_541],
  [4_200_000, 18_465],
  [5_500_000, 21_344],
  [10_000_000, 49_240],
  [Infinity, 73_860],
];

// Утильсбор, ₽ (постановление № 1291 в ред. с 01.12.2025). ДВС и параллельные гибриды: строки — мощность
// до N л. с., столбцы — объём до 1, 2, 3, 3,5 л и больше. Льгота 3 400 ₽ — до 160 л. с. и до 3 л.
const hpBands = [160, 190, 220, 250, 280, 310, 340, 370, 400, 430, 460, 500, Infinity];
const ccBands = [1000, 2000, 3000, 3500, Infinity];
const util = [
  [297_600, 800_800, 2_250_400, 2_584_000, 3_290_600],
  [307_200, 900_000, 2_306_800, 2_635_200, 3_345_600],
  [316_800, 952_800, 2_364_000, 2_688_000, 3_403_200],
  [324_000, 1_010_400, 2_402_400, 2_743_200, 3_460_800],
  [345_600, 1_142_400, 2_520_000, 2_810_400, 3_530_400],
  [345_600, 1_291_200, 2_620_800, 2_880_000, 3_600_000],
  [345_600, 1_459_200, 2_726_400, 3_038_400, 3_727_200],
  [345_600, 1_663_200, 2_834_400, 3_206_400, 3_857_600],
  [345_600, 1_896_000, 2_949_600, 3_384_000, 3_993_600],
  [345_600, 2_160_000, 3_067_200, 3_568_800, 4_132_800],
  [345_600, 2_464_800, 3_189_600, 3_765_600, 4_276_800],
  [345_600, 2_808_000, 3_316_800, 3_972_000, 4_425_600],
  [345_600, 3_201_600, 3_448_800, 4_190_400, 4_581_600],
];
// Электромобили и EREV: по мощности электромоторов, льгота 3 400 ₽ — до 80 л. с.
const utilElectric: [number, number][] = [
  [80, 3_400],
  [100, 991_200],
  [130, 1_317_600],
  [160, 1_560_000],
  [190, 1_848_000],
  [220, 2_193_600],
  [250, 2_599_200],
  [280, 3_079_200],
  [Infinity, 3_648_000],
];

// Мощность — пиковая с autohome. Закон берёт 30-минутную, она обычно ниже, так что для электро
// и EREV расчёт — верхняя граница. ponytail: у EREV autohome не даёт объём ДВС, берём типичные 1,5 л.
export function turnkey(t: Trim, r: Rates) {
  const car = t.price * r.cny;
  const eur = car / r.eur;
  const cc = t.power === "erev" ? 1500 : t.cc;
  let customs = band(clearance, car);
  if (t.power === "ev") {
    const duty = car * 0.15;
    const ex = t.hp * band(excise, t.hp);
    customs += duty + ex + (car + duty + ex) * 0.22;
  } else {
    const [pct, perCc] = band(ets, eur);
    customs += Math.max(eur * pct, cc * perCc) * r.eur;
  }
  const recycling =
    t.power === "ev" || t.power === "erev"
      ? band(utilElectric, t.hp)
      : t.hp <= 160 && cc <= 3000
        ? 3_400
        : util[hpBands.findIndex((h) => t.hp <= h)][ccBands.findIndex((c) => cc <= c)];
  const commission = car * fees.commission;
  const total = car + fees.delivery + customs + recycling + fees.services + commission;
  return { car, delivery: fees.delivery, customs, recycling, services: fees.services, commission, total };
}

// Отбор в каталог: комплектации с утильсбором до 1,2 млн ₽ (без «миллионных» ставок), затем модели
// по цене под ключ — бюджетные до 1,3 млн: до 4 шт., до 4 млн: до 36, дороже: до 8. Внутри группы — по rank.
// Дешевле 1 млн при текущих fees (доставка + оформление = 360 000 ₽) не выходит ни одна модель.
const utilMax = 1_200_000;
const groups = [
  [1_300_000, 4],
  [4_000_000, 36],
  [Infinity, 8],
];

export function pick(models: Model[], r: Rates, rank: (m: Model) => number) {
  const ok = models
    .map((m) => ({ ...m, trims: m.trims.filter((t) => turnkey(t, r).recycling <= utilMax) }))
    .filter((m) => m.trims.length)
    .map((m) => ({ m, price: Math.min(...m.trims.map((t) => turnkey(t, r).total)) }))
    .sort((a, b) => rank(a.m) - rank(b.m));
  return groups.flatMap(([max, n], i) =>
    ok.filter(({ price }) => price > (groups[i - 1]?.[0] ?? 0) && price <= max).slice(0, n).map(({ m }) => m),
  );
}
