"use client";

import Link from "next/link";
import { useState } from "react";
import { TelegramIcon } from "./icons";
import { pricing } from "@/config/pricing";
import { telegramUrl } from "@/config/site";
import { rub, type Car } from "@/lib/catalog";
import { calcPrice } from "@/lib/pricing";

export default function PriceBox({ car }: { car: Car }) {
  const [city, setCity] = useState(pricing.defaultCity);
  const { rows, total } = calcPrice(car, city);

  const message = [
    `Здравствуйте! Интересует ${car.make} ${car.model} ${car.year} (${car.id}).`,
    `Расчёт под ключ, ${city}: от ${rub(total)}`,
    ...rows.map((r) => `— ${r.label}: ${rub(r.value)}`),
  ].join("\n");

  return (
    <div className="rounded-lg bg-paper p-5 shadow-[0_18px_40px_-24px_rgb(47_59_92/0.55)] sm:p-6">
      <label className="grid gap-1.5 text-sm text-ink-2">
        Город получения
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="h-12 rounded-md border border-line bg-ground px-3 text-base text-ink focus:border-ink focus:outline-none"
        >
          {Object.keys(pricing.cities).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <p className="mt-5 text-sm text-ink-2">Под ключ</p>
      <p className="num font-display text-[clamp(2rem,8vw,2.75rem)] font-semibold leading-tight">от {rub(total)}</p>

      <details className="mt-3 border-t border-line">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between text-sm font-semibold">
          Из чего складывается цена
          <span aria-hidden className="faq-plus text-xl font-normal transition-transform">+</span>
        </summary>
        <dl className="num pb-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4 border-t border-line py-2">
              <dt className="text-ink-2">{r.label}</dt>
              <dd className="shrink-0">{rub(r.value)}</dd>
            </div>
          ))}
        </dl>
      </details>

      <p className="mt-2 text-xs leading-relaxed text-ink-2">
        Точную цену зафиксирует менеджер. Ставки тестовые, курс ЦБ на{" "}
        {new Date(pricing.asOf).toLocaleDateString("ru-RU")}.
      </p>

      <div className="mt-5 grid gap-2">
        <Link
          href="/#lead"
          className="inline-flex h-14 items-center justify-center rounded-[10px] bg-key px-6 text-base font-semibold text-on-key transition-colors hover:bg-key-hover"
        >
          Оставить заявку
        </Link>
        <a
          href={telegramUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-ink/25 px-6 font-medium hover:border-ink"
        >
          <TelegramIcon /> Отправить в Telegram
        </a>
      </div>
    </div>
  );
}
