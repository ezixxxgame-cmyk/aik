import { pricing } from "@/config/pricing";

// Авто из подборки. Добавляет владелец через Telegram-бота (app/api/bot), хранится в lib/cars.ts.
export type Car = {
  id: string;
  country: "KR" | "CN";
  make: string;
  model: string;
  grade: string;
  year: number;
  month: number;
  mileage: number;
  cc: number;
  hp: number;
  fuel: string;
  transmission: string;
  price: number;
  currency: string;
  photos: string[]; // file_id фото в Telegram
};

export const countryName = { KR: "Корея", CN: "Китай" } as const;

export const photoUrl = (fileId: string) => `/api/photo/${fileId}`;

// Возраст в месяцах на дату расчёта
export function ageMonths(car: Car, asOf = pricing.asOf) {
  const d = new Date(asOf);
  return (d.getFullYear() - car.year) * 12 + (d.getMonth() + 1 - car.month);
}

// Льготное окно: от 3 до 5 лет
export function ageStatus(car: Car) {
  const m = ageMonths(car);
  if (m < 36) return { kind: "young", months: 36 - m } as const;
  if (m < 60) return { kind: "ok", months: 60 - m } as const;
  return { kind: "old", months: 0 } as const;
}

export function blockers(car: Car) {
  const list: string[] = [];
  if (ageStatus(car).kind === "old") list.push("Старше 5 лет");
  if (car.hp > pricing.utilPowerLimit) list.push("Высокий утильсбор");
  return list;
}

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export const rub = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₽";
