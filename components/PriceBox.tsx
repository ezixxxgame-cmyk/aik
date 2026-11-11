import Link from "next/link";
import { TelegramIcon } from "./icons";
import { telegramUrl } from "@/config/site";
import { rub } from "@/lib/catalog";

type Props = { price: number; message: string; label?: string; children?: React.ReactNode };

export default function PriceBox({ price, message, label = "Под ключ", children }: Props) {
  return (
    <div className="rounded-lg bg-paper p-5 shadow-[0_18px_40px_-24px_rgb(47_59_92/0.55)] sm:p-6">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="num font-display text-[clamp(2rem,8vw,2.75rem)] font-semibold leading-tight">от {rub(price)}</p>
      {children}
      <p className="mt-2 text-xs leading-relaxed text-ink-2">Точную цену зафиксирует менеджер в договоре.</p>

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
