import Image from "next/image";
import Link from "next/link";
import { ageStatus, blockers, countryName, photoUrl, rub, type Car } from "@/lib/catalog";
import { calcPrice } from "@/lib/pricing";

type PhotoProps = { car: Car; src?: string; sizes: string; preload?: boolean; className?: string };

// Фото из Telegram через /api/photo, сжатое next/image под нужный размер
export function CarPhoto({ car, src = car.photos[0], sizes, preload, className = "" }: PhotoProps) {
  return (
    <Image
      src={photoUrl(src)}
      alt={`${car.make} ${car.model} ${car.year}`}
      width={1280}
      height={960}
      sizes={sizes}
      preload={preload}
      className={`aspect-[4/3] rounded-sm bg-ground-2 object-cover ${className}`}
    />
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
      href={`/cars/${car.id}`}
      className="group grid grid-cols-[88px_1fr] items-center gap-4 border-t border-line py-4 sm:grid-cols-[120px_1fr_auto] sm:gap-6"
    >
      <CarPhoto car={car} sizes="120px" className="w-full" />
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
