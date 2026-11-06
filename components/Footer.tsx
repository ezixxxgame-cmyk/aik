import Link from "next/link";
import { site, telegramUrl } from "@/config/site";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © 2026 {site.name} {site.fullName}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="underline">
            Политика конфиденциальности
          </Link>
          <Link href="/consent" className="underline">
            Согласие на обработку данных
          </Link>
          <a href={telegramUrl()} target="_blank" rel="noopener noreferrer" className="underline">
            @{site.telegram}
          </a>
          <span className="num">{site.phone}</span>
        </div>
      </div>
    </footer>
  );
}
