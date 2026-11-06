import type { ReactNode } from "react";
import { legal } from "@/config/site";

// Общая вёрстка юридических страниц. Текст — шаблон, перед запуском сверить с юристом.
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <h1 className="display text-[clamp(2rem,7vw,3.5rem)] leading-none">{title}</h1>
      <p className="mt-4 text-sm text-ink-2">Редакция от {legal.updated}. Значения в квадратных скобках — заглушки.</p>
      <div className="legal mt-10 grid gap-8 leading-relaxed">{children}</div>
    </main>
  );
}

export const Operator = () => (
  <>
    {legal.operator}, {legal.inn}, {legal.ogrn}, {legal.address}
  </>
);
