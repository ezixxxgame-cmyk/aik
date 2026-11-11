import type { Model, Trim } from "./autohome";

// Ориентировочная цена под ключ для физлица, новое авто (до 3 лет), ставки 2026 года.
// Под ключ = авто по курсу ЦБ + доставка 5% от цены авто + пошлина + утильсбор.

export type Rates = { cny: number; eur: number; date: string };

export async function fetchRates(): Promise<Rates> {
  const res = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", { signal: AbortSignal.timeout(10_000) });
  const { Date: date, Valute: v } = await res.json();
  return { cny: v.CNY.Value / v.CNY.Nominal, eur: v.EUR.Value / v.EUR.Nominal, date };
}

// Пошлина (ЕТС): стоимость до N €, % от стоимости, но не меньше € за см³
const duty = [
  [8_500, 0.54, 2.5],
  [16_700, 0.48, 3.5],
  [42_300, 0.48, 5.5],
  [84_500, 0.48, 7.5],
  [169_000, 0.48, 15],
  [Infinity, 0.48, 20],
];

// Утильсбор, ₽ (постановление № 1291 в ред. с 01.12.2025): строки — мощность до N л. с.,
// столбцы — объём до 1, 2, 3, 3,5 л и больше. Льгота 3 400 ₽ — до 160 л. с. и до 3 л.
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

// Электромобили и последовательные гибриды считаются по 30-минутной мощности из документов,
// на autohome её нет — для них цена под ключ по запросу.
export function turnkey(t: Trim, r: Rates) {
  if (t.power === "ev" || t.power === "erev") return null;
  const car = t.price * r.cny;
  const eur = car / r.eur;
  const [, pct, perCc] = duty.find(([max]) => eur <= max)!;
  const customs = Math.max(eur * pct, t.cc * perCc) * r.eur;
  const recycling =
    t.hp <= 160 && t.cc <= 3000 ? 3_400 : util[hpBands.findIndex((h) => t.hp <= h)][ccBands.findIndex((c) => t.cc <= c)];
  const delivery = car * 0.05;
  return { car, delivery, customs, recycling, total: car + delivery + customs + recycling };
}

// Самая дешёвая комплектация под ключ (null — все электро/EREV) и минимальная цена в Китае
export function cheapest(m: Model, r: Rates) {
  const calc = m.trims
    .flatMap((t) => {
      const p = turnkey(t, r);
      return p ? [{ ...p, trim: t }] : [];
    })
    .sort((a, b) => a.total - b.total);
  return { best: calc[0] ?? null, china: Math.min(...m.trims.map((t) => t.price)) * r.cny };
}

export const ratesDate = (r: Rates) => new Date(r.date).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
