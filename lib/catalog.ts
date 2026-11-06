// Авто из подборки. Добавляет владелец через Telegram-бота (app/api/bot), хранится в lib/cars.ts.
export type Car = {
  id: string;
  country: "KR" | "CN";
  make: string;
  model: string;
  grade: string;
  year: number;
  mileage: number;
  cc: number; // 0 у электромобилей
  hp: number;
  fuel: string;
  transmission: string;
  drive: string;
  price: number; // цена для клиента под ключ, ₽ — как указал владелец
  photos: string[]; // file_id фото в Telegram
};

export const countryName = { KR: "Корея", CN: "Китай" } as const;

export const photoUrl = (fileId: string) => `/api/photo/${fileId}`;

export const rub = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₽";
