"use client";

import { useEffect, useState } from "react";
import { ArrowIcon, TelegramIcon } from "./icons";
import { telegramUrl } from "@/config/site";

// Панель внизу экрана на телефоне: появляется после первого экрана, прячется, когда форма заявки в кадре
export default function MobileCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const lead = document.getElementById("lead");
    const check = () => setShow(scrollY > innerHeight * 0.7 && !!lead && lead.getBoundingClientRect().top > innerHeight);
    check();
    addEventListener("scroll", check, { passive: true });
    addEventListener("resize", check);
    return () => {
      removeEventListener("scroll", check);
      removeEventListener("resize", check);
    };
  }, []);

  return (
    <div
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-ground/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 motion-reduce:transition-none md:hidden ${show ? "" : "translate-y-full"}`}
    >
      <a
        href="#lead"
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-key font-semibold text-on-key hover:bg-key-hover"
      >
        Подобрать авто <ArrowIcon />
      </a>
      <a
        href={telegramUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Написать в Telegram"
        className="grid size-12 place-items-center rounded-[10px] border border-ink/25"
      >
        <TelegramIcon />
      </a>
    </div>
  );
}
