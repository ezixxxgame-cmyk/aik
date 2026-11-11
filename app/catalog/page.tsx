import type { Metadata } from "next";
import Link from "next/link";
import { brands, fuels, modelPhoto, type Model } from "@/lib/autohome";
import { getModels, getRates } from "@/lib/cars";
import { rub } from "@/lib/catalog";
import { cheapest, ratesDate, type Rates } from "@/lib/customs";

export const metadata: Metadata = {
  title: "Новые авто из Китая — каталог A.I.K.",
  description: "Модели BYD, Geely, Chery, Haval, Li Auto, Zeekr и других брендов с ориентировочной ценой под ключ.",
};

const slug = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default async function CatalogPage() {
  const [models, rates] = await Promise.all([getModels(), getRates()]);
  const groups = brands
    .map(([, b]) => [b, models.filter((m) => m.brand === b)] as const)
    .filter(([, list]) => list.length);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="display text-[clamp(2.2rem,9vw,4rem)]">Новые авто из&nbsp;Китая</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
        Цены производителя по курсу ЦБ на <span className="num">{ratesDate(rates)}</span>. Под ключ — ориентировочно для
        физлица: авто, доставка 5% от его цены, пошлина и утильсбор. Электромобили и EREV считаем по документам.
      </p>

      {groups.length ? (
        <>
          <nav aria-label="Бренды" className="mt-8 flex flex-wrap gap-2">
            {groups.map(([b, list]) => (
              <a
                key={b}
                href={`#${slug(b)}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink/25 px-4 text-sm font-medium hover:border-ink"
              >
                {b} <span className="num text-ink-2">{list.length}</span>
              </a>
            ))}
          </nav>
          {groups.map(([b, list]) => (
            <section key={b} id={slug(b)} className="mt-14 scroll-mt-20">
              <h2 className="font-display text-3xl font-extrabold uppercase">{b}</h2>
              <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((m) => (
                  <li key={m.id}>
                    <ModelCard model={m} rates={rates} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <p className="mt-8 max-w-xl text-ink-2">
          Каталог обновляется. <Link href="/#lead" className="font-medium text-ink underline">Оставьте заявку</Link> — подберём модель и посчитаем цену.
        </p>
      )}
    </main>
  );
}

function ModelCard({ model: m, rates }: { model: Model; rates: Rates }) {
  const { best, china } = cheapest(m, rates);
  return (
    <Link href={`/catalog/${m.id}`} className="group block">
      {/* eslint-disable-next-line @next/next/no-img-element -- фото с autohome уже нужного размера */}
      <img
        src={modelPhoto(m, "480x360")}
        alt={`${m.brand} ${m.name}`}
        width={480}
        height={360}
        loading="lazy"
        className="aspect-[4/3] w-full rounded-sm bg-ground-2 object-cover"
      />
      <p className="mt-3 font-display text-lg font-semibold uppercase leading-tight group-hover:underline">{m.name}</p>
      <p className="mt-1 text-sm text-ink-2">{[m.level, fuels(m)].filter(Boolean).join(" · ")}</p>
      <p className="num mt-2 font-semibold">{best ? `от ${rub(best.total)}` : "под ключ — по запросу"}</p>
      <p className="num text-xs text-ink-2">{best ? "под ключ" : `в Китае от ${rub(china)}`}</p>
    </Link>
  );
}
