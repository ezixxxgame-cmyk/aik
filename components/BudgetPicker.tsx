"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { id: string; title: string; year: number; total: number; blocked: boolean };

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
const presets = [2_500_000, 3_500_000, 5_000_000];

export default function BudgetPicker({ items }: { items: Item[] }) {
  const [max, setMax] = useState(3_500_000);
  const fit = items.filter((i) => i.total <= max).sort((a, b) => b.total - a.total);

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12">
      <div>
        <label htmlFor="budget" className="text-sm font-medium text-ink-2">
          Ваш бюджет, до
        </label>
        <div className="mt-2 flex items-baseline border-b-2 border-ink pb-2">
          <input
            id="budget"
            inputMode="numeric"
            value={max ? fmt(max) : ""}
            onChange={(e) => setMax(Number(e.target.value.replace(/\D/g, "")) || 0)}
            className="num w-full min-w-0 bg-transparent font-display text-[clamp(2rem,9vw,3.5rem)] font-semibold leading-none focus:outline-none"
          />
          <span className="font-display text-3xl font-semibold">₽</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setMax(p)}
              aria-pressed={max === p}
              className="num h-11 cursor-pointer rounded-full border border-ink/25 px-4 text-sm font-medium transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-ground"
            >
              {fmt(p / 1_000_000)} млн
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        <p className="num text-sm text-ink-2">
          {fit.length ? `Подходит ${fit.length} из ${items.length} авто в подборке` : "В подборке нет авто в этом бюджете — подберём под заказ"}
        </p>
        <ul className="mt-3">
          {fit.slice(0, 4).map((i) => (
            <li key={i.id}>
              <Link
                href={`/cars/${i.id}`}
                className="flex items-baseline justify-between gap-4 border-t border-line py-3 hover:underline"
              >
                <span className="min-w-0 truncate">
                  {i.title} <span className="num text-ink-2">{i.year}</span>
                  {i.blocked && <span className="ml-2 text-xs text-danger">непроходной</span>}
                </span>
                <span className="num shrink-0 font-semibold">от {fmt(Math.round(i.total))} ₽</span>
              </Link>
            </li>
          ))}
        </ul>
        <a href="#lead" className="mt-3 inline-flex h-11 items-center gap-2 border-t border-line pt-3 text-sm font-semibold underline">
          Подобрать авто до {fmt(max)} ₽
        </a>
      </div>
    </div>
  );
}
