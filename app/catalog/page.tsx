import type { Metadata } from "next";
import { Suspense } from "react";
import CatalogBrowser from "@/components/CatalogBrowser";

export const metadata: Metadata = { title: "Каталог авто из Кореи и Китая — A.I.K." };

export default function CatalogPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <h1 className="display text-[clamp(2.4rem,9vw,4.5rem)]">Каталог</h1>
      <p className="mt-4 max-w-xl text-ink-2">
        Демо-каталог с тестовыми лотами. Цена указана под ключ с доставкой в Краснодар; точную сумму фиксирует менеджер.
      </p>
      <div className="mt-8">
        <Suspense>
          <CatalogBrowser />
        </Suspense>
      </div>
    </main>
  );
}
