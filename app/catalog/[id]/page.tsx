import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PriceBox from "@/components/PriceBox";
import { engineText, fuels, modelPhoto } from "@/lib/autohome";
import { getModel, getRates } from "@/lib/cars";
import { rub } from "@/lib/catalog";
import { cheapest, ratesDate, turnkey } from "@/lib/customs";

export async function generateMetadata({ params }: PageProps<"/catalog/[id]">): Promise<Metadata> {
  const m = await getModel((await params).id);
  return { title: m ? `${m.brand} ${m.name} из Китая — A.I.K.` : "Модель не найдена — A.I.K." };
}

export default function ModelPage({ params }: PageProps<"/catalog/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <Link href="/catalog" className="inline-flex h-11 items-center text-sm font-medium underline decoration-ink/30">
        ← Каталог
      </Link>
      <Suspense>
        <ModelView params={params} />
      </Suspense>
    </main>
  );
}

async function ModelView({ params }: Pick<PageProps<"/catalog/[id]">, "params">) {
  const [m, rates] = await Promise.all([getModel((await params).id), getRates()]);
  if (!m) notFound();

  const { best, china } = cheapest(m, rates);
  const trims = [...m.trims].sort((a, b) => a.price - b.price);
  const title = `${m.brand} ${m.name}`;
  const breakdown: [string, number][] = best
    ? [["Авто в Китае", best.car], ["Доставка, 5%", best.delivery], ["Пошлина", best.customs], ["Утильсбор", best.recycling]]
    : [];

  return (
    <>
      <h1 className="display mt-2 text-[clamp(2.2rem,9vw,4rem)]">{title}</h1>
      <p className="mt-2 text-ink-2">{[m.level, fuels(m)].filter(Boolean).join(" · ")}</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-start">
        <div className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- фото с autohome уже нужного размера */}
          <img
            src={modelPhoto(m, "800x600")}
            alt={title}
            width={800}
            height={600}
            className="aspect-[4/3] w-full rounded-sm bg-ground-2 object-cover"
          />

          <h2 className="mt-10 font-display text-2xl font-extrabold uppercase">Комплектации</h2>
          <p className="mt-2 text-sm text-ink-2">
            В продаже в Китае: <span className="num">{trims.length}</span>. Курс ЦБ на <span className="num">{ratesDate(rates)}</span>.
          </p>
          <ul className="mt-4 border-b border-line">
            {trims.map((t, i) => {
              const p = turnkey(t, rates);
              return (
                <li key={i} className="flex justify-between gap-4 border-t border-line py-3">
                  <div className="min-w-0">
                    <p className="num font-medium">{engineText(t)}</p>
                    <p className="num text-sm text-ink-2">{[t.year, t.drive && `${t.drive} привод`].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num font-semibold">{p ? rub(p.total) : "по запросу"}</p>
                    <p className="num text-xs text-ink-2">в Китае {rub(t.price * rates.cny)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="lg:sticky lg:top-24">
          <PriceBox
            label={best ? "Под ключ, ориентировочно" : "Цена в Китае"}
            price={best?.total ?? china}
            message={`Здравствуйте! Интересует новый ${title} из Китая${best ? `, под ключ от ${rub(best.total)}` : ""}.`}
          >
            {best ? (
              <>
                <dl className="mt-4 text-sm">
                  {breakdown.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-t border-line py-2">
                      <dt className="text-ink-2">{k}</dt>
                      <dd className="num font-medium">{rub(v)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="num mt-3 text-xs leading-relaxed text-ink-2">
                  Расчёт для комплектации {best.trim.year} года: {engineText(best.trim)}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Под ключ посчитаем по документам: у электромобилей и EREV пошлина и утильсбор зависят от 30-минутной мощности.
              </p>
            )}
          </PriceBox>
        </div>
      </div>
    </>
  );
}
