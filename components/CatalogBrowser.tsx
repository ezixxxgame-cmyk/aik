"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CarCard } from "./car";
import { cars } from "@/lib/catalog";
import { calcPrice } from "@/lib/pricing";

const totals = new Map(cars.map((c) => [c.id, calcPrice(c).total]));
const makes = [...new Set(cars.map((c) => c.make))].sort();
const years = [...new Set(cars.map((c) => c.year))].sort();

const control =
  "h-12 w-full rounded-md border border-line bg-paper px-3 text-base text-ink focus:border-ink focus:outline-none";

export default function CatalogBrowser() {
  const params = useSearchParams();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(0);
  const [max, setMax] = useState(Number(params.get("max")) || 0);

  const models = [...new Set(cars.filter((c) => !make || c.make === make).map((c) => c.model))].sort();
  const list = cars.filter(
    (c) =>
      (!make || c.make === make) &&
      (!model || c.model === model) &&
      (!year || c.year >= year) &&
      (!max || totals.get(c.id)! <= max),
  );

  const reset = () => {
    setMake("");
    setModel("");
    setYear(0);
    setMax(0);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end">
        <label className="grid gap-1.5 text-sm text-ink-2">
          Марка
          <select value={make} onChange={(e) => (setMake(e.target.value), setModel(""))} className={control}>
            <option value="">Все</option>
            {makes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-ink-2">
          Модель
          <select value={model} onChange={(e) => setModel(e.target.value)} className={control}>
            <option value="">Все</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-ink-2">
          Год, от
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${control} num`}>
            <option value={0}>Любой</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-ink-2">
          Цена под ключ, до ₽
          <input
            inputMode="numeric"
            value={max ? new Intl.NumberFormat("ru-RU").format(max) : ""}
            onChange={(e) => setMax(Number(e.target.value.replace(/\D/g, "")) || 0)}
            placeholder="Без ограничения"
            className={`${control} num`}
          />
        </label>
        <button
          type="button"
          onClick={reset}
          className="col-span-2 h-12 cursor-pointer rounded-[10px] px-4 text-sm font-medium underline decoration-ink/30 hover:decoration-ink md:col-span-1"
        >
          Сбросить
        </button>
      </div>

      <p className="num mt-6 text-sm text-ink-2" aria-live="polite">
        Найдено: {list.length}
      </p>

      {list.length ? (
        <div className="mt-4 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <CarCard key={c.id} car={c} />
          ))}
        </div>
      ) : (
        <div className="mt-6 border-t border-line pt-6">
          <p className="font-semibold">Под эти условия в демо-каталоге ничего нет.</p>
          <p className="mt-1 text-ink-2">Ослабьте фильтры или оставьте заявку — подберём авто под заказ.</p>
        </div>
      )}
    </>
  );
}
