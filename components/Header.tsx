import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { TelegramIcon } from "./icons";
import { telegramUrl } from "@/config/site";

const nav = [
  { href: "/#stages", label: "Этапы" },
  { href: "/catalog", label: "Каталог" },
  { href: "/#faq", label: "Вопросы" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="mr-auto flex items-center gap-2.5" aria-label="A.I.K. — на главную">
          <Image src="/logo.png" alt="" width={182} height={104} className="h-8 w-auto rounded-sm" priority />
          <span className="hidden font-display text-sm font-semibold uppercase leading-tight tracking-wide text-ink-2 sm:block">
            Auto Import
            <br />
            Krasnodar
          </span>
        </Link>
        <nav aria-label="Основное" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-4 py-2.5 text-sm font-medium hover:bg-ground-2">
              {n.label}
            </Link>
          ))}
        </nav>
        <a
          href={telegramUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Написать в Telegram"
          className="grid size-11 place-items-center rounded-full hover:bg-ground-2"
        >
          <TelegramIcon />
        </a>
        <ThemeToggle />
        <Link
          href="/catalog"
          className="ml-1 rounded-full border border-ink/25 px-4 py-2.5 text-sm font-medium hover:border-ink md:hidden"
        >
          Каталог
        </Link>
      </div>
    </header>
  );
}
