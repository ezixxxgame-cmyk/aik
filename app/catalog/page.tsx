import type { Metadata } from "next";
import Link from "next/link";
import CatalogFilter from "@/components/CatalogFilter";
import { bodyOf, modelPhoto, powerName } from "@/lib/autohome";
import { getModels, getRates } from "@/lib/cars";
import { turnkey } from "@/lib/customs";

export const metadata: Metadata = {
  title: "Новые авто из Китая — каталог A.I.K.",
  description: "Популярные модели BYD, Geely, Chery, Haval, Li Auto, Zeekr и других брендов с ценой под ключ.",
};

export default async function CatalogPage() {
  const [models, rates] = await Promise.all([getModels(), getRates()]);
  const cards = models.map((m) => ({
    id: m.id,
    brand: m.brand,
    name: m.name,
    level: m.level,
    body: bodyOf(m.level),
    // минимальная цена под ключ по паре «двигатель|год»: фильтр «Гибрид, 2025» показывает цену гибрида 2025 года
    prices: m.trims.reduce<Record<string, number>>((acc, t) => {
      const key = `${powerName[t.power]}|${t.year}`;
      acc[key] = Math.min(acc[key] ?? Infinity, turnkey(t, rates).total);
      return acc;
    }, {}),
    photo: modelPhoto(m, "480x360"),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="display text-[clamp(2.2rem,9vw,4rem)]">Новые авто из&nbsp;Китая</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
        Популярные модели с ценой под ключ: выкуп, доставка, растаможка и оформление уже в цене.
      </p>

      {cards.length ? (
        <CatalogFilter cards={cards} />
      ) : (
        <p className="mt-8 max-w-xl text-ink-2">
          Каталог обновляется. <Link href="/#lead" className="font-medium text-ink underline">Оставьте заявку</Link> — подберём модель и посчитаем цену.
        </p>
      )}
    </main>
  );
}
