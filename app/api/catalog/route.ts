import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { fetchModels, rank, type Model } from "@/lib/autohome";
import { redis } from "@/lib/cars";
import { fetchRates, pick } from "@/lib/customs";

export const maxDuration = 300;

// Обновление каталога из autohome (~15 с). Запускает Vercel Cron раз в 3 суток (vercel.json) или вручную;
// чаще раза в 12 часов не обходит, пустой результат не сохраняет.
export async function GET() {
  await connection();
  if (!(await redis("SET", "catalog-lock", "1", "EX", 43_200, "NX"))) return Response.json({ skipped: "обновлялся меньше 12 часов назад" });
  const [all, rates] = await Promise.all([fetchModels(), fetchRates()]);
  if (!all.length) {
    await redis("DEL", "catalog-lock");
    return Response.json({ error: "autohome недоступен" }, { status: 502 });
  }
  // Бренд не загрузился — оставляем его модели из прошлого обхода
  const loaded = new Set(all.map((m) => m.brand));
  const old: Model[] = JSON.parse((await redis<string | null>("GET", "catalog")) ?? "[]");
  all.push(...old.filter((m) => !loaded.has(m.brand)));
  const models = pick(all, rates, rank);
  await redis("SET", "catalog", JSON.stringify(models));
  revalidateTag("catalog", { expire: 0 });
  return Response.json({ models: models.length, trims: models.reduce((s, m) => s + m.trims.length, 0) });
}
