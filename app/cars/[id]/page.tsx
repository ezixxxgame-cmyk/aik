import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PriceBox from "@/components/PriceBox";
import { AgeNote, Blockers, CarPhoto } from "@/components/car";
import { getCar } from "@/lib/cars";
import { countryName } from "@/lib/catalog";

export async function generateMetadata({ params }: PageProps<"/cars/[id]">): Promise<Metadata> {
  const car = await getCar((await params).id);
  return { title: car ? `${car.make} ${car.model} ${car.year} — A.I.K.` : "Авто не найдено — A.I.K." };
}

export default function CarPage({ params }: PageProps<"/cars/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <Link href="/#selection" className="inline-flex h-11 items-center text-sm font-medium underline decoration-ink/30">
        ← Подборка
      </Link>
      <Suspense>
        <CarView params={params} />
      </Suspense>
    </main>
  );
}

async function CarView({ params }: Pick<PageProps<"/cars/[id]">, "params">) {
  const car = await getCar((await params).id);
  if (!car) notFound();

  const specs: [string, string][] = [
    ["Год выпуска", `${String(car.month).padStart(2, "0")}.${car.year}`],
    ["Пробег", `${new Intl.NumberFormat("ru-RU").format(car.mileage)} км`],
    ["Двигатель", `${(car.cc / 1000).toFixed(1)} л, ${car.hp} л. с., ${car.fuel.toLowerCase()}`],
    ["Коробка", car.transmission],
    ["Комплектация", car.grade],
    ["Страна", countryName[car.country]],
    ["Номер лота", car.id],
  ];

  return (
    <>
      <h1 className="display mt-2 text-[clamp(2.2rem,9vw,4rem)]">
        {car.make} {car.model} <span className="num text-ink-2">{car.year}</span>
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-2">
        <AgeNote car={car} />
        <Blockers car={car} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-start">
        <div className="min-w-0">
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {car.photos.map((src, i) => (
              <CarPhoto
                key={i}
                car={car}
                src={src}
                sizes={i ? "(min-width: 640px) 240px, 85vw" : "(min-width: 1024px) 700px, 90vw"}
                preload={i === 0}
                className={`w-[85%] shrink-0 snap-center sm:w-full ${i === 0 ? "sm:col-span-3" : ""}`}
              />
            ))}
          </div>

          <h2 className="mt-10 font-display text-2xl font-extrabold uppercase">Характеристики</h2>
          <dl className="mt-4 grid sm:grid-cols-2 sm:gap-x-8">
            {specs.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-t border-line py-3">
                <dt className="text-ink-2">{k}</dt>
                <dd className="num text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:sticky lg:top-24">
          <PriceBox car={car} />
        </div>
      </div>
    </>
  );
}
