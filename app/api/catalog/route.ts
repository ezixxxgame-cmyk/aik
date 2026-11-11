import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import { fetchModels, type Model } from "@/lib/autohome";
import { redis } from "@/lib/cars";

export const maxDuration = 300;

// Обновление каталога из autohome (~1 мин). Запускает Vercel Cron раз в сутки или вручную;
// чаще раза в 12 часов не обходит, пустой результат не сохраняет.
export async function GET() {
  await connection();
  if (!(await redis("SET", "catalog-lock", "1", "EX", 43_200, "NX"))) return Response.json({ skipped: "обновлялся меньше 12 часов назад" });
  const models = await fetchModels();
  if (!models.length) {
    await redis("DEL", "catalog-lock");
    return Response.json({ error: "autohome недоступен" }, { status: 502 });
  }
  // Бренд не загрузился — оставляем его модели из прошлого обхода
  const loaded = new Set(models.map((m) => m.brand));
  const old: Model[] = JSON.parse((await redis<string | null>("GET", "catalog")) ?? "[]");
  models.push(...old.filter((m) => !loaded.has(m.brand)));
  await redis("SET", "catalog", JSON.stringify(models));
  revalidateTag("catalog", { expire: 0 });
  return Response.json({ models: models.length, trims: models.reduce((s, m) => s + m.trims.length, 0) });
}
