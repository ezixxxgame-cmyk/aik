import Link from "next/link";
import RouteLine from "@/components/RouteLine";
import LeadForm from "@/components/LeadForm";
import MobileCta from "@/components/MobileCta";
import Stories from "@/components/Stories";
import { CarRow } from "@/components/car";
import { ArrowIcon, DocIcon, PhoneIcon, PinIcon, TelegramIcon } from "@/components/icons";
import { faq, site, stages, telegramUrl } from "@/config/site";
import { getCars, getStories } from "@/lib/cars";

const h2 = "display text-[clamp(2rem,7vw,3.5rem)]";

export default async function Home() {
  const [cars, stories] = await Promise.all([getCars(), getStories()]);

  return (
    <main className="relative">
      <RouteLine />

      {/* Первый экран */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 md:pt-16 md:pb-14">
        <div className="max-w-3xl">
          <h1 className="display text-[clamp(2.6rem,11vw,4.75rem)]">
            Авто из&nbsp;Кореи и&nbsp;Китая под&nbsp;ключ за&nbsp;<span className="num whitespace-nowrap">~{site.termDays}&nbsp;дней</span>
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-ink-2">
            Выкупаем, проверяем, растаможиваем и привозим в любой город России. Цену раскладываем по статьям до оплаты — вы видите, за что платите.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#lead"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-[10px] bg-key px-8 text-lg font-semibold text-on-key shadow-[0_6px_18px_-8px_rgb(47_59_92/0.45)] transition-colors hover:bg-key-hover"
            >
              Подобрать авто <ArrowIcon />
            </a>
            <Link
              href="/catalog"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-[10px] border-2 border-ink px-8 text-lg font-semibold transition-colors hover:bg-ink hover:text-ground"
            >
              Каталог авто
            </Link>
            <a
              href={telegramUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-[10px] px-5 font-medium underline decoration-ink/30 hover:decoration-ink"
            >
              <TelegramIcon /> Написать в Telegram
            </a>
          </div>
        </div>
      </section>

      {/* Этапы */}
      {/* Этапы в ряд; карта за ними без затемнения, текст отделён от неё ореолом цвета фона */}
      <section
        id="stages"
        className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-4 py-12 [text-shadow:0_0_4px_var(--ground),0_0_14px_var(--ground),0_0_28px_var(--ground)] sm:px-6 md:py-14"
      >
        <h2 className={h2}>Как машина едет к&nbsp;вам</h2>
        <p className="mt-4 max-w-xl text-lg text-ink-2">
          Четыре этапа, по каждому — срок и документ на руках. В сумме около {site.termDays} дней от выкупа до ключей.
        </p>
        <ol className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((s, i) => (
            <li key={s.route}>
              <div aria-hidden className="flex items-center gap-3">
                <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-key font-display text-base font-semibold text-on-key">
                  {i + 1}
                </span>
                {i < stages.length - 1 && <span className="-mr-4 hidden flex-1 border-t-2 border-dashed border-ink/30 lg:block" />}
              </div>
              <h3 className="mt-5 font-display text-2xl font-extrabold uppercase leading-none text-balance">{s.title}</h3>
              <p className="num mt-2 text-sm text-ink-2">
                <span className="font-semibold text-ink">
                  {s.days} {s.days === "1" ? "день" : "дней"}
                </span>{" "}
                · {s.place}
              </p>
              <p className="mt-3 leading-relaxed text-ink-2">{s.text}</p>
              <p className="mt-3 flex gap-2 text-sm font-medium">
                <DocIcon className="size-5 shrink-0" /> {s.result}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Подборка */}
      <section id="selection" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 md:py-14">
        <h2 className={h2}>Сейчас в&nbsp;подборке</h2>
        {cars.length ? (
          <>
            <p className="mt-4 max-w-xl text-ink-2">Авто, которые мы отобрали и можем привезти сейчас. Цена — под ключ, точную сумму с доставкой в ваш город фиксируем в договоре.</p>
            <div className="mt-8 border-b border-line">
              {cars.map((c) => (
                <CarRow key={c.id} car={c} />
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 max-w-xl text-ink-2">
            Подборка обновляется. <a href="#lead" className="font-medium text-ink underline">Оставьте заявку</a> — пришлём варианты под ваш бюджет.
          </p>
        )}
        <Link
          href="/catalog"
          className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-[10px] border-2 border-ink px-8 text-lg font-semibold transition-colors hover:bg-ink hover:text-ground sm:w-auto sm:inline-flex"
        >
          Каталог новых авто из Китая <ArrowIcon />
        </Link>
      </section>

      <Stories stories={stories} />

      {/* Заявка */}
      <section id="lead" className="relative z-10 scroll-mt-16 bg-band text-on-band">
        {/* На телефоне контакты под формой, на десктопе — под заголовком */}
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12">
          <div>
            <h2 className="display text-[clamp(2rem,5vw,3rem)]">Подберём авто под&nbsp;ваш бюджет</h2>
            <p className="mt-4 max-w-md text-lg text-on-band-2">
              Оставьте бюджет и модель — пришлём варианты с расчётом под ключ.
            </p>
          </div>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <LeadForm />
          </div>
          <div className="grid content-start gap-1">
            <a href={telegramUrl()} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 font-semibold underline decoration-on-band/30">
              <TelegramIcon className="text-key" /> @{site.telegram}
            </a>
            <span className="num flex min-h-11 items-center gap-3">
              <PhoneIcon className="text-key" /> {site.phone}
            </span>
          </div>
        </div>
      </section>

      {/* FAQ и документы */}
      <section id="faq" className="relative z-10 mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] md:py-14">
        <div>
          <h2 className="display text-[clamp(1.75rem,5vw,2.5rem)]">Частые вопросы</h2>
          <div className="mt-5 border-b border-line">
            {faq.map((f) => (
              <details key={f.q} className="group border-t border-line">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2.5 font-semibold">
                  {f.q}
                  <span aria-hidden className="faq-plus text-xl font-normal transition-transform">+</span>
                </summary>
                <p className="max-w-[60ch] pb-4 text-[0.95rem] leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <aside className="md:pt-1.5">
          <h3 className="font-display text-xl font-extrabold uppercase">Документы</h3>
          <ul className="mt-3 grid text-sm">
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
            <li className="flex min-h-11 items-start gap-3 pt-2.5">
              <PinIcon className="size-5 shrink-0" />
              <span>
                {site.address}
                <span className="mt-1 block text-ink-2">Карта офиса — заглушка</span>
              </span>
            </li>
          </ul>
        </aside>
      </section>

      <MobileCta />
    </main>
  );
}
