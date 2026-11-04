import Link from "next/link";
import RouteLine from "@/components/RouteLine";
import BudgetPicker from "@/components/BudgetPicker";
import LeadForm from "@/components/LeadForm";
import { CarRow } from "@/components/car";
import { ArrowIcon, CarIcon, DocIcon, KeyIcon, PhoneIcon, PinIcon, ShipIcon, TelegramIcon } from "@/components/icons";
import { faq, site, stages, telegramUrl } from "@/config/site";
import { pricing } from "@/config/pricing";
import { blockers, cars, getCar, rub } from "@/lib/catalog";
import { calcPrice } from "@/lib/pricing";

const sample = getCar("kr-101342")!;
const sampleCalc = calcPrice(sample);
const featured = [...cars].sort((a, b) => blockers(a).length - blockers(b).length).slice(0, 6);
const budgetItems = cars.map((c) => ({
  id: c.id,
  title: `${c.make} ${c.model}`,
  year: c.year,
  total: calcPrice(c).total,
  blocked: blockers(c).length > 0,
}));

// Позиция точки маршрута для этапа: на мобиле — левый край, на десктопе — напротив текста
const stageX = ["0.08", "0.08", "0.08", "0.08"];
const stageXMd = ["0.7", "0.3", "0.7", "0.3"];

const stories = [
  { car: "Kia K5, 2023", city: "Краснодар", days: 29 },
  { car: "Hyundai Avante, 2024", city: "Ростов-на-Дону", days: 31 },
  { car: "Changan UNI-K, 2022", city: "Краснодар", days: 24 },
];

const h2 = "display text-[clamp(2rem,7vw,3.5rem)]";

export default function Home() {
  return (
    <main className="relative">
      <RouteLine />

      {/* Первый экран */}
      <section className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end md:pt-16 md:pb-24">
        <div>
          <h1 className="display text-[clamp(2.6rem,11vw,4.75rem)]">
            Авто из&nbsp;Кореи и&nbsp;Китая под&nbsp;ключ за&nbsp;<span className="num whitespace-nowrap">~{site.termDays}&nbsp;дней</span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-ink-2">
            Выкупаем, проверяем, растаможиваем и привозим в Краснодар. Цену раскладываем по статьям до оплаты — вы видите, за что платите.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#lead"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-md bg-key px-8 text-lg font-semibold text-on-key shadow-[0_6px_18px_-8px_rgb(47_59_92/0.45)] transition-colors hover:bg-key-hover"
            >
              Подобрать авто <ArrowIcon />
            </a>
            <a
              href={telegramUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-md px-5 font-medium underline decoration-ink/30 hover:decoration-ink"
            >
              <TelegramIcon /> Написать в Telegram
            </a>
          </div>

          <div data-route="origin" className="mt-10 border-t border-line pt-4">
            <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium">
              <li className="flex items-center gap-1.5"><ShipIcon className="size-5" /> Пусан</li>
              <li className="text-ink-2">или</li>
              <li className="flex items-center gap-1.5"><CarIcon className="size-5" /> Суйфэньхэ</li>
              <li aria-hidden className="text-ink-2">→</li>
              <li>Владивосток</li>
              <li aria-hidden className="text-ink-2">→</li>
              <li className="flex items-center gap-1.5"><KeyIcon className="size-5 text-[#c99a12] dark:text-key" /> Краснодар</li>
            </ol>
          </div>
        </div>

        {/* Доказательство: расчёт реального лота из каталога */}
        <aside aria-label="Пример расчёта" className="md:max-w-lg rounded-lg bg-paper p-5 shadow-[0_18px_40px_-24px_rgb(47_59_92/0.55)] sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-display text-lg font-semibold uppercase">{sample.make} {sample.model} · {sample.year}</p>
            <span className="shrink-0 text-xs text-ink-2">пример</span>
          </div>
          <dl className="num mt-4 text-sm">
            {sampleCalc.rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-4 border-t border-line py-2">
                <dt className="text-ink-2">{r.label}</dt>
                <dd className="shrink-0">{rub(r.value)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3">
              <dt className="font-semibold">Под ключ в Краснодаре</dt>
              <dd className="shrink-0 whitespace-nowrap font-display text-2xl font-semibold">{rub(sampleCalc.total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-2">
            Ставки тестовые, курс на {new Date(pricing.asOf).toLocaleDateString("ru-RU")}.{" "}
            <Link href={`/catalog/${sample.id}`} className="underline">Открыть авто</Link>
          </p>
        </aside>
      </section>

      {/* Этапы */}
      <section id="stages" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
        <h2 className={h2}>Как машина едет к&nbsp;вам</h2>
        <p className="mt-4 max-w-xl text-lg text-ink-2">
          Четыре этапа, по каждому — срок и документ на руках. В сумме около {site.termDays} дней от выкупа до ключей.
        </p>
        <ol className="mt-12 grid gap-14 md:mt-20 md:gap-24">
          {stages.map((s, i) => (
            <li
              key={s.route}
              data-route={s.route}
              data-x={stageX[i]}
              data-x-md={stageXMd[i]}
              className={`max-w-md pl-12 md:pl-0 ${i % 2 ? "md:ml-auto" : ""}`}
            >
              <p className="text-sm font-medium uppercase tracking-wider text-ink-2">{s.place}</p>
              <h3 className="mt-1 font-display text-3xl font-extrabold uppercase leading-none sm:text-4xl">{s.title}</h3>
              <p className="num mt-3 font-display text-xl font-semibold">
                {s.days} {s.days === "1" ? "день" : "дней"}
              </p>
              <p className="mt-3 leading-relaxed text-ink-2">{s.text}</p>
              <p className="mt-4 flex gap-2 text-sm font-medium">
                <DocIcon className="size-5 shrink-0" /> {s.result}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Подборка */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className={h2}>Сейчас в&nbsp;подборке</h2>
          <Link href="/catalog" className="inline-flex h-11 items-center gap-2 font-semibold underline">
            Смотреть все {cars.length} <ArrowIcon className="size-5" />
          </Link>
        </div>
        <p className="mt-4 max-w-xl text-ink-2">Демо-каталог: тестовые лоты из Кореи и Китая. Цена — под ключ в Краснодаре.</p>
        <div className="mt-8 rounded-lg bg-ground/80 border-b border-line">
          {featured.map((c) => (
            <CarRow key={c.id} car={c} />
          ))}
        </div>
      </section>

      {/* Бюджет */}
      <section className="relative z-10 bg-ground-2">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <h2 className={`${h2} mb-10`}>Что вы получите за&nbsp;свой бюджет</h2>
          <BudgetPicker items={budgetItems} />
        </div>
      </section>

      {/* Истории */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <h2 className={h2}>Выдачи клиентам</h2>
        <p className="mt-4 text-sm text-ink-2">Заглушка: здесь будут реальные фото выдачи и подписи клиентов.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 md:grid-rows-2">
          {stories.map((s, i) => (
            <figure key={s.car} className={i === 0 ? "md:row-span-2" : ""}>
              <div
                className={`ticks grid place-items-center rounded-sm ${i === 0 ? "aspect-[4/3] md:aspect-auto md:h-[calc(100%-3.5rem)]" : "aspect-[16/7]"}`}
              >
                <KeyIcon className="size-10 text-ink/25" />
              </div>
              <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-semibold">{s.car} · {s.city}</span>
                <span className="num text-sm text-ink-2">{s.days} дней до ключей · пример</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ и документы */}
      <section id="faq" className="relative z-10 mx-auto grid max-w-6xl scroll-mt-20 gap-12 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] md:py-24">
        <div>
          <h2 className={h2}>Частые вопросы</h2>
          <div className="mt-8 border-b border-line">
            {faq.map((f) => (
              <details key={f.q} className="group border-t border-line bg-ground/80">
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-lg font-semibold">
                  {f.q}
                  <span aria-hidden className="faq-plus text-2xl font-normal transition-transform">+</span>
                </summary>
                <p className="max-w-[60ch] pb-5 leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <aside className="md:pt-3">
          <h3 className="font-display text-2xl font-extrabold uppercase">Документы</h3>
          <ul className="mt-5 grid gap-1 text-sm">
            <li>
              <a href="#" aria-disabled className="flex min-h-11 items-center gap-3 underline decoration-ink/30">
                <DocIcon className="size-5 shrink-0" /> Образец договора (PDF, заглушка)
              </a>
            </li>
            <li className="flex min-h-11 items-start gap-3 pt-2.5">
              <DocIcon className="size-5 shrink-0" />
              <span>
                Реквизиты (заглушка)
                <span className="num mt-1 block text-ink-2">ИНН XXXXXXXXXX · ОГРН XXXXXXXXXXXXX</span>
              </span>
            </li>
          </ul>
          <div className="ticks mt-6 grid aspect-[4/3] place-items-center rounded-sm">
            <span className="flex flex-col items-center gap-2 text-center text-sm text-ink-2">
              <PinIcon className="size-7 text-ink" />
              Карта офиса — заглушка
            </span>
          </div>
          <p className="mt-3 text-sm">{site.address}</p>
        </aside>
      </section>

      {/* Заявка */}
      <section id="lead" className="relative z-10 scroll-mt-16 bg-band text-on-band">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:py-24">
          <div>
            <h2 className={h2}>Подберём авто под&nbsp;ваш бюджет</h2>
            <p className="mt-4 text-lg text-on-band-2">
              Оставьте бюджет и модель — пришлём варианты с расчётом под ключ.
            </p>
            <div className="mt-8 grid gap-2">
              <a href={telegramUrl()} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 font-semibold underline decoration-on-band/30">
                <TelegramIcon className="text-key" /> @{site.telegram}
              </a>
              <span className="num flex min-h-11 items-center gap-3">
                <PhoneIcon className="text-key" /> {site.phone}
              </span>
            </div>
          </div>
          <LeadForm />
        </div>
      </section>
    </main>
  );
}
