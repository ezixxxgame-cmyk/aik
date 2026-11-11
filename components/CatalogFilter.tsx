"use client";

import Link from "next/link";
import { useState } from "react";
import { rub } from "@/lib/catalog";

// prices: тип двигателя → минимальная цена под ключ
export type Card = { id: string; brand: string; name: string; level: string; body: string; prices: Record<string, number>; photo: string };

const initial = { brand: "", body: "", fuel: "", max: "", sort: "asc" };
type Filter = typeof initial;

const bodies = ["Кроссовер", "Седан, хэтчбек", "Минивэн", "Пикап", "Спорткар"];
const engines = [["ДВС", "ДВС"], ["гибрид", "Гибрид"], ["EREV", "EREV"], ["электро", "Электро"]];
const prices = [2, 3, 4, 5, 7, 10];

// Фильтр каталога: данные уже на странице, фильтрация на клиенте без запросов
export default function CatalogFilter({ cards }: { cards: Card[] }) {
  const [f, setF] = useState(initial);

  const list = cards
    .map((c) => ({ ...c, price: f.fuel ? c.prices[f.fuel] : Math.min(...Object.values(c.prices)) }))
    .filter(
      (c) =>
        c.price !== undefined &&
        (!f.brand || c.brand === f.brand) &&
        (!f.body || c.body === f.body) &&
        (!f.max || c.price <= Number(f.max) * 1_000_000),
    )
    .sort((a, b) => (f.sort === "asc" ? a.price - b.price : b.price - a.price));

  const field = (key: keyof Filter, label: string, options: string[][]) => (
    <label className="grid gap-1.5 text-sm text-ink-2">
      {label}
      <select
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        className="h-12 w-full min-w-0 rounded-md border border-ink/25 bg-paper px-3 text-base text-ink focus:border-ink"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5 [&>:last-child]:col-span-2 md:[&>:last-child]:col-span-1">
        {field("brand", "Марка", [["", "Все марки"], ...[...new Set(cards.map((c) => c.brand))].sort().map((b) => [b, b])])}
        {field("body", "Кузов", [["", "Любой"], ...bodies.filter((b) => cards.some((c) => c.body === b)).map((b) => [b, b])])}
        {field("fuel", "Двигатель", [["", "Любой"], ...engines])}
        {field("max", "Цена до", [["", "Любая"], ...prices.map((p) => [String(p), `${p} млн ₽`])])}
        {field("sort", "Сортировка", [["asc", "Сначала дешевле"], ["desc", "Сначала дороже"]])}
      </div>

      <p className="mt-6 text-sm text-ink-2" aria-live="polite">
        Найдено: <span className="num">{list.length}</span>
      </p>

      {list.length ? (
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/catalog/${c.id}`} className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element -- фото с autohome уже нужного размера */}
                <img
                  src={c.photo}
                  alt={`${c.brand} ${c.name}`}
                  width={480}
                  height={360}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-sm bg-ground-2 object-cover"
                />
                <p className="mt-3 text-sm text-ink-2">{c.brand}</p>
                <p className="font-display text-lg font-semibold uppercase leading-tight group-hover:underline">{c.name}</p>
                <p className="mt-1 text-sm text-ink-2">{[c.level, Object.keys(c.prices).join(", ")].filter(Boolean).join(" · ")}</p>
                <p className="num mt-3 font-display text-[clamp(1.25rem,5vw,1.6rem)] font-semibold leading-tight">от {rub(c.price)}</p>
                <p className="text-xs text-ink-2">под ключ</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-ink-2">
          Под эти условия моделей нет.{" "}
          <button type="button" onClick={() => setF(initial)} className="min-h-11 font-medium text-ink underline">
            Сбросить фильтр
          </button>
        </p>
      )}
    </>
  );
}
