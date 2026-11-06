import { cacheLife, cacheTag } from "next/cache";
import type { Car, Story } from "@/lib/catalog";

// Подборка хранится в Upstash Redis: хеш "cars" (id → JSON авто). Пишет бот, читает сайт.
// Переменные создаёт интеграция Upstash в Vercel (KV_*) или берутся из консоли Upstash (UPSTASH_*).
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export async function redis<T>(...command: (string | number)[]): Promise<T> {
  if (!url) throw new Error("Redis не настроен: нет KV_REST_API_URL / UPSTASH_REDIS_REST_URL");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Redis: ${data.error}`);
  return data.result;
}

// Записи хеша, новые сверху: id — время добавления в base36
const newest = async <T extends { id: string }>(key: string): Promise<T[]> => {
  if (!url) return [];
  const list = await redis<string[]>("HVALS", key);
  return list.map((s) => JSON.parse(s) as T).sort((a, b) => parseInt(b.id, 36) - parseInt(a.id, 36));
};

export async function getCars(): Promise<Car[]> {
  "use cache";
  cacheTag("cars");
  cacheLife("max");
  return newest<Car>("cars");
}

// Истории клиентов: хеш "stories" (id → JSON), тоже пишет бот
export async function getStories(): Promise<Story[]> {
  "use cache";
  cacheTag("stories");
  cacheLife("max");
  return newest<Story>("stories");
}

export const getCar = async (id: string) => (await getCars()).find((c) => c.id === id);
