"use client";

import Link from "next/link";
import { useState } from "react";
import { submitLead } from "@/lib/lead";

const field =
  "h-12 w-full rounded-md border border-on-band/25 bg-on-band/5 px-4 text-base text-on-band placeholder:text-on-band-2/70 focus:border-key focus:outline-none";

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
      <div role="status" className="rounded-md border border-key/60 p-6">
        <p className="font-display text-2xl font-semibold uppercase">Заявка принята</p>
        <p className="mt-2 text-on-band-2">Менеджер свяжется с вами и пришлёт варианты с расчётом под ваш бюджет.</p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm text-on-band-2">
        Имя
        <input name="name" autoComplete="given-name" className={field} placeholder="Как к вам обращаться" />
      </label>
      <label className="grid gap-1.5 text-sm text-on-band-2">
        Телефон
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          aria-invalid={!!phoneError}
          aria-describedby="phone-error"
          className={`${field} num ${phoneError ? "border-danger" : ""}`}
          placeholder="+7 900 000-00-00"
        />
        {phoneError && (
          <span id="phone-error" className="text-sm text-[#ffb4a9]">
            {phoneError}
          </span>
        )}
      </label>
      <label className="grid gap-1.5 text-sm text-on-band-2">
        Бюджет
        <input name="budget" inputMode="numeric" className={`${field} num`} placeholder="например, 3 000 000 ₽" />
      </label>
      <label className="grid gap-1.5 text-sm text-on-band-2">
        Желаемая модель
        <input name="model" className={field} placeholder="Kia Sorento, Hyundai Tucson…" />
      </label>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={state === "sending"}
          className="h-14 cursor-pointer rounded-md bg-key px-8 text-base font-semibold text-on-key transition-colors hover:bg-key-hover disabled:cursor-wait disabled:opacity-70"
        >
          {state === "sending" ? "Отправляем…" : "Отправить заявку"}
        </button>
        <p className="text-xs leading-relaxed text-on-band-2">
          Нажимая кнопку, вы даёте{" "}
          <Link href="/consent" target="_blank" className="underline decoration-on-band-2/50 underline-offset-2 hover:text-on-band">
            согласие на обработку персональных данных
          </Link>{" "}
          и принимаете{" "}
          <Link href="/privacy" target="_blank" className="underline decoration-on-band-2/50 underline-offset-2 hover:text-on-band">
            политику конфиденциальности
          </Link>
          .
        </p>
      </div>
      {state === "error" && (
        <p role="alert" className="text-sm text-[#ffb4a9] sm:col-span-2">
          Не получилось отправить. Попробуйте ещё раз или напишите нам в Telegram.
        </p>
      )}
    </form>
  );
}
