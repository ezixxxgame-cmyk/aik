import Link from "next/link";
import { ageStatus, blockers, countryName, rub, type Car } from "@/lib/catalog";
import { calcPrice } from "@/lib/pricing";

// Заглушка фото: чертёжная рамка с названием модели
export function CarPhoto({ car, angle, className = "" }: { car: Car; angle?: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${car.make} ${car.model}: фото-заглушка${angle ? `, ${angle}` : ""}`}
      className={`ticks relative grid aspect-[4/3] [container-type:inline-size] place-items-center overflow-hidden rounded-sm p-4 ${className}`}
    >
      <span className="display text-center text-[clamp(1.25rem,6cqi,2.5rem)] text-ink/25">
        {car.model}
      </span>
      <span className="absolute bottom-2 left-3 text-[11px] font-medium uppercase tracking-wider text-ink-2">
        {angle ?? "Фото — заглушка"}
      </span>
    </div>
  );
}

export function AgeNote({ car }: { car: Car }) {
  const s = ageStatus(car);
  const m = `${s.months} мес.`;
  if (s.kind === "ok") return <span>Проходит по льготной пошлине ещё <b className="num">{m}</b></span>;
  if (s.kind === "young") return <span>До льготной пошлины <b className="num">{m}</b></span>;
  return <span>Вне льготного возраста</span>;
}

export function Blockers({ car }: { car: Car }) {
  const list = blockers(car);
  if (!list.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {list.map((b) => (
        <span key={b} className="rounded-full border border-danger/50 px-2 py-0.5 text-xs font-medium text-danger">
          Непроходной: {b.toLowerCase()}
        </span>
      ))}
    </span>
  );
}

// Строка «табло» для главной
export function CarRow({ car }: { car: Car }) {
  const { total } = calcPrice(car);
  return (
    <Link
      href={`/catalog/${car.id}`}
      className="group grid grid-cols-[88px_1fr] items-center gap-4 border-t border-line py-4 sm:grid-cols-[120px_1fr_auto] sm:gap-6"
    >
      <CarPhoto car={car} className="aspect-[4/3] w-full p-1 [&>span:last-child]:hidden" />
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold uppercase leading-tight group-hover:underline">
          {car.make} {car.model}
        </p>
        <p className="num mt-1 text-sm text-ink-2">
          {car.year} · {new Intl.NumberFormat("ru-RU").format(car.mileage)} км · {countryName[car.country]}
        </p>
        <p className="num mt-1 font-semibold sm:hidden">от {rub(total)}</p>
        <div className="mt-1.5 text-xs text-ink-2">
          {blockers(car).length ? <Blockers car={car} /> : <AgeNote car={car} />}
        </div>
      </div>
      <p className="num hidden text-right text-lg font-semibold sm:block">
        от {rub(total)}
        <span className="block text-xs font-normal text-ink-2">под ключ</span>
      </p>
    </Link>
  );
}

// Карточка для каталога
export function CarCard({ car }: { car: Car }) {
  const { total } = calcPrice(car);
  return (
    <Link href={`/catalog/${car.id}`} className="group flex flex-col gap-3">
      <CarPhoto car={car} className="transition-[filter] group-hover:brightness-[0.97]" />
      <div>
        <p className="font-display text-lg font-semibold uppercase leading-tight group-hover:underline">
          {car.make} {car.model}
        </p>
        <p className="num mt-0.5 text-sm text-ink-2">
          {car.year} · {new Intl.NumberFormat("ru-RU").format(car.mileage)} км · {countryName[car.country]}
        </p>
        <p className="num mt-2 text-lg font-semibold">
          от {rub(total)} <span className="text-sm font-normal text-ink-2">под ключ</span>
        </p>
        <div className="mt-1.5 text-xs text-ink-2">
          {blockers(car).length ? <Blockers car={car} /> : <AgeNote car={car} />}
        </div>
      </div>
    </Link>
  );
}
