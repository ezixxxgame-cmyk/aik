"use client";

import Link from "next/link";
import { useState } from "react";
import { TelegramIcon } from "./icons";
import { telegramUrl } from "@/config/site";
import { submitLead } from "@/lib/lead";

const card = "rounded-xl bg-paper p-5 text-ink shadow-[0_24px_48px_-28px_rgb(0_0_0/0.65)] sm:p-8";
const label = "grid gap-2 text-[0.95rem] font-semibold";
const field =
  "h-12 w-full rounded-lg border border-ink/20 bg-ground px-4 text-base font-normal text-ink placeholder:text-ink-2 transition-colors hover:border-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/20";
const budgets = ["до 2 млн ₽", "2–3 млн ₽", "3–4 млн ₽", "от 4 млн ₽"];

export default function LeadForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [phoneError, setPhoneError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") ?? "").trim();
    if (phone.replace(/\D/g, "").length < 10) {
      setPhoneError("Укажите телефон полностью — 10 цифр после +7");
      return;
    }
    setPhoneError("");
    setState("sending");
    try {
      await submitLead({
        name: String(f.get("name") ?? ""),
        phone,
        budget: String(f.get("budget") ?? ""),
        model: String(f.get("model") ?? ""),
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent")
    return (
      <div role="status" className={card}>
        <p className="font-display text-2xl font-extrabold uppercase">Заявка принята</p>
        <p className="mt-2 leading-relaxed text-ink-2">Менеджер свяжется с вами и пришлёт варианты с расчётом под ваш бюджет.</p>
        <a
          href={telegramUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex h-12 items-center gap-2 rounded-[10px] border border-ink/25 px-5 font-medium hover:border-ink"
        >
          <TelegramIcon /> Написать в Telegram
        </a>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className={`${card} grid gap-5 sm:grid-cols-2`}>
      <label className={label}>
        Имя
        <input name="name" autoComplete="given-name" className={field} placeholder="Как к вам обращаться" />
      </label>
      <label className={label}>
        <span>
          Телефон <span className="text-danger">*</span>
        </span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          aria-invalid={!!phoneError}
          aria-describedby={phoneError ? "phone-error" : undefined}
          className={`${field} num ${phoneError ? "border-danger" : ""}`}
          placeholder="+7 900 000-00-00"
        />
        {phoneError && (
          <span id="phone-error" className="text-sm font-normal text-danger">
            {phoneError}
          </span>
        )}
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-[0.95rem] font-semibold">Бюджет</legend>
        <div className="flex flex-wrap gap-2">
          {budgets.map((b) => (
            <label
              key={b}
              className="num inline-flex h-11 cursor-pointer items-center rounded-full border border-ink/20 px-4 text-[0.95rem] font-medium transition-colors hover:border-ink/50 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-ground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink/30"
            >
              <input type="radio" name="budget" value={b} className="sr-only" />
              {b}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={`${label} sm:col-span-2`}>
        Желаемая модель
        <input name="model" className={field} placeholder="Kia Sorento, Hyundai Tucson…" />
      </label>
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-5">
        <button
          type="submit"
          disabled={state === "sending"}
          className="h-14 cursor-pointer rounded-[10px] bg-key px-8 text-base font-semibold text-on-key shadow-[0_6px_18px_-8px_rgb(47_59_92/0.45)] transition-colors hover:bg-key-hover disabled:cursor-wait disabled:opacity-70"
        >
          {state === "sending" ? "Отправляем…" : "Отправить заявку"}
        </button>
        <p className="text-xs leading-relaxed text-ink-2">
          Нажимая кнопку, вы даёте{" "}
          <Link href="/consent" target="_blank" className="underline decoration-ink-2/50 underline-offset-2 hover:text-ink">
            согласие на обработку персональных данных
          </Link>{" "}
          и принимаете{" "}
          <Link href="/privacy" target="_blank" className="underline decoration-ink-2/50 underline-offset-2 hover:text-ink">
            политику конфиденциальности
          </Link>
          .
        </p>
      </div>
      {state === "error" && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          Не получилось отправить. Попробуйте ещё раз или напишите нам в Telegram.
        </p>
      )}
    </form>
  );
}
