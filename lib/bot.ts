import type { Car } from "@/lib/catalog";

// Вызов Telegram Bot API. Токен — TELEGRAM_BOT_TOKEN.
export async function tg(method: string, params: object) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

export const template = `Марка: Kia
Модель: K5
Комплектация: 2.0 Prestige
Выпуск: 03.2022
Пробег: 45 000
Объём: 1999
Мощность: 160
Топливо: бензин
Коробка: автомат
Цена: 21 500 000 вон`;

export type CarFields = Omit<Car, "id" | "photos">;

// Разбирает описание по шаблону «Поле: значение». Комплектация необязательна.
export function parseCar(text: string): { car?: CarFields; errors: string[] } {
  const f: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) f[line.slice(0, i).trim().toLowerCase().replace("ё", "е")] = line.slice(i + 1).trim();
  }
  const errors: string[] = [];
  const need = (key: string, label: string) => {
    if (!f[key]) errors.push(`нет поля «${label}»`);
    return f[key] ?? "";
  };
  const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", ".").match(/\d+(\.\d+)?/)?.[0] ?? NaN);

  const make = need("марка", "Марка");
  const model = need("модель", "Модель");
  const fuel = need("топливо", "Топливо").toLowerCase();
  const transmission = need("коробка", "Коробка").toLowerCase();

  const release = need("выпуск", "Выпуск");
  const [, m, y] = release.match(/^(\d{1,2})\D+(\d{4})$/) ?? [];
  const month = Number(m);
  const year = Number(y);
  if (release && !(month >= 1 && month <= 12 && year >= 1990 && year <= 2100)) errors.push("Выпуск: месяц и год, например 03.2022");

  const mileage = num(need("пробег", "Пробег"));
  if (f["пробег"] && !(mileage >= 0)) errors.push("Пробег: число в км");

  const volume = num(need("объем", "Объём"));
  const cc = Math.round(volume < 20 ? volume * 1000 : volume); // 2.0 л или 1999 см³
  if (f["объем"] && !(cc >= 500 && cc <= 10_000)) errors.push("Объём: в см³ (1999) или литрах (2.0)");

  const hp = num(need("мощность", "Мощность"));
  if (f["мощность"] && !(hp >= 30 && hp <= 1500)) errors.push("Мощность: число л. с.");

  const priceText = need("цена", "Цена");
  const currency = /krw|вон|₩/i.test(priceText) ? "KRW" : /cny|юан|¥/i.test(priceText) ? "CNY" : "";
  const price = Math.round(num(priceText) * (/млн/i.test(priceText) ? 1e6 : /тыс/i.test(priceText) ? 1e3 : 1));
  if (priceText && !currency) errors.push("Цена: укажите валюту — вон или юань");
  if (priceText && !(price > 0)) errors.push("Цена: число, например 21 500 000 вон");

  if (errors.length) return { errors };
  return {
    errors,
    car: {
      country: currency === "KRW" ? "KR" : "CN",
      make,
      model,
      grade: f["комплектация"] ?? "",
      year,
      month,
      mileage,
      cc,
      hp,
      fuel,
      transmission,
      price,
      currency,
    },
  };
}
