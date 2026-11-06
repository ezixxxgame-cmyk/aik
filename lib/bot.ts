import type { Car } from "@/lib/catalog";

// Вызов Telegram Bot API. По умолчанию — админ-бот (TELEGRAM_BOT_TOKEN).
export async function tg(method: string, params: object, token = process.env.TELEGRAM_BOT_TOKEN) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

// Список ID из env через запятую
export const ids = (s = "") => s.split(",").map((x) => x.trim()).filter(Boolean);

// Лог-бот (TELEGRAM_LOG_BOT_TOKEN) присылает действия в админ-боте в чаты TELEGRAM_LOG_CHAT_IDS, по умолчанию — владельцам.
// Telegram доставит только в чаты, где лог-боту хоть раз написали.
export const logChats = () => ids(process.env.TELEGRAM_LOG_CHAT_IDS || process.env.TELEGRAM_OWNER_IDS);

export async function log(text: string) {
  const token = process.env.TELEGRAM_LOG_BOT_TOKEN;
  if (!token) return;
  const params = { text, link_preview_options: { is_disabled: true } };
  await Promise.all(logChats().map((chat_id) => tg("sendMessage", { chat_id, ...params }, token).catch(console.error)));
}

// Число из текста: «2 450 000 ₽», «2,45 млн», «45000 км», «1.6»
export function num(text: string) {
  const n = Number(text.replace(/\s/g, "").replace(",", ".").match(/\d+(\.\d+)?/)?.[0] ?? NaN);
  return n * (/млн/i.test(text) ? 1e6 : /тыс/i.test(text) ? 1e3 : 1);
}

const inRange = (n: number, min: number, max: number) => (n >= min && n <= max ? String(Math.round(n)) : null);
const short = (s: string) => (s && s.length <= 60 ? s : null);
const thisYear = new Date().getFullYear();

export type Field = Exclude<keyof Car, "id" | "photos">;
export type Draft = Partial<Record<Field | "step", string>>;
type Step = {
  key: Field;
  ask: string;
  options?: (d: Draft) => string[];
  parse?: (text: string) => string | null; // разбор введённого текста и вариантов кнопок; null — ошибка
  skip?: (d: Draft) => boolean;
  optional?: boolean;
};

const makes: Record<string, string[]> = {
  Корея: ["Kia", "Hyundai", "Genesis", "KGM", "Renault", "Chevrolet"],
  Китай: ["Geely", "Chery", "Haval", "Changan", "Exeed", "Omoda", "Tank", "Jetour", "BYD", "Zeekr", "Li Auto", "Hongqi"],
};

// Шаги добавления авто. Кнопки — для готовых вариантов, текст — для остального.
export const steps: Step[] = [
  { key: "country", ask: "Откуда авто?", options: () => ["Корея", "Китай"] },
  { key: "make", ask: "Марка? Выберите или напишите.", options: (d) => makes[d.country ?? "Корея"], parse: short },
  { key: "model", ask: "Модель? Напишите, например: K5", parse: short },
  {
    key: "year",
    ask: "Год выпуска? Выберите или напишите.",
    options: () => Array.from({ length: 8 }, (_, i) => String(thisYear - 7 + i)),
    parse: (t) => inRange(num(t), 1990, thisYear + 1),
  },
  { key: "mileage", ask: "Пробег, км? Напишите число.", parse: (t) => inRange(num(t), 0, 1_000_000) },
  { key: "fuel", ask: "Топливо?", options: () => ["Бензин", "Дизель", "Гибрид", "Электро"] },
  {
    key: "cc",
    ask: "Объём двигателя, л? Выберите или напишите.",
    options: () => ["1.0", "1.2", "1.4", "1.5", "1.6", "2.0", "2.2", "2.4", "2.5", "3.0", "3.5"],
    parse: (t) => {
      const v = num(t);
      return inRange(v < 20 ? v * 1000 : v, 500, 10_000); // литры или см³
    },
    skip: (d) => d.fuel === "Электро",
  },
  { key: "hp", ask: "Мощность, л. с.? Напишите число.", parse: (t) => inRange(num(t), 30, 2000) },
  { key: "transmission", ask: "Коробка?", options: () => ["Автомат", "Робот", "Вариатор", "Механика"] },
  { key: "drive", ask: "Привод?", options: () => ["Передний", "Задний", "Полный"] },
  { key: "grade", ask: "Комплектация? Напишите или пропустите.", parse: short, optional: true },
  {
    key: "price",
    ask: "Цена для клиента под ключ, ₽? Это число покажется на сайте. Например: 2 450 000",
    parse: (t) => inRange(num(t), 10_000, 1_000_000_000),
  },
];

// Следующий шаг после key (или первый), с учётом пропусков
export function nextStep(d: Draft, key?: string) {
  const from = key ? steps.findIndex((s) => s.key === key) + 1 : 0;
  return steps.slice(from).find((s) => !s.skip?.(d));
}

export function toCar(d: Draft, id: string, photos: string[]): Car {
  return {
    id,
    country: d.country === "Китай" ? "CN" : "KR",
    make: d.make ?? "",
    model: d.model ?? "",
    grade: d.grade ?? "",
    year: Number(d.year),
    mileage: Number(d.mileage),
    cc: Number(d.cc ?? 0),
    hp: Number(d.hp),
    fuel: d.fuel ?? "",
    transmission: d.transmission ?? "",
    drive: d.drive ?? "",
    price: Number(d.price),
    photos,
  };
}
