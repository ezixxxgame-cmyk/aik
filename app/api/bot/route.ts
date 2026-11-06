import { revalidateTag } from "next/cache";
import { nextStep, steps, tg, toCar, type Draft, type Field } from "@/lib/bot";
import { redis } from "@/lib/cars";
import { rub, type Car } from "@/lib/catalog";

// Webhook Telegram-бота: владелец добавляет авто кнопками, авто сразу появляется в подборке на главной.
// Telegram подписывает запросы секретом из setWebhook; писать боту могут только TELEGRAM_OWNER_IDS.

type PhotoSize = { file_id: string; width: number; height: number };
type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string; photo?: PhotoSize[] };
type Update = {
  message?: Message;
  callback_query?: { id: string; from: { id: number }; data?: string; message?: Message };
};
type Button = { text: string; callback_data: string };

const DAY = 86_400;
const keyboard = (rows: Button[][]) => ({ reply_markup: { inline_keyboard: rows } });
const rowsOf = (buttons: Button[], size: number) =>
  Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) => buttons.slice(i * size, (i + 1) * size));
const cancel: Button = { text: "Отменить", callback_data: "cancel" };
const photosDone: Button = { text: "Фото готовы", callback_data: "photos" };
const menu = keyboard([[{ text: "Добавить авто", callback_data: "add" }], [{ text: "Авто на сайте", callback_data: "list" }]]);
const manage = (c: Car) =>
  keyboard([[{ text: "Изменить цену", callback_data: `price:${c.id}` }], [{ text: "Снять с сайта", callback_data: `del:${c.id}` }]]);

const title = (c: Car) => `${c.make} ${c.model} ${c.year}`;
const summary = (c: Car) =>
  [
    `${title(c)}, ${c.mileage.toLocaleString("ru-RU")} км`,
    [c.cc ? `${(c.cc / 1000).toFixed(1)} л` : "", `${c.hp} л. с.`, c.fuel, c.transmission, `привод ${c.drive}`]
      .filter(Boolean)
      .join(", ")
      .toLowerCase(),
    c.grade && `Комплектация: ${c.grade}`,
    `Цена на сайте: ${rub(c.price)}`,
  ]
    .filter(Boolean)
    .join("\n");

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 401 });
  }
  const update: Update = await req.json();
  try {
    await handle(update, new URL(req.url).origin);
  } catch (e) {
    console.error(e);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    const text = `Ошибка: ${e instanceof Error ? e.message : e}`;
    if (chatId) await tg("sendMessage", { chat_id: chatId, text }).catch(console.error);
  }
  // Всегда 200: иначе Telegram повторяет запрос и задерживает следующие сообщения
  return new Response();
}

async function handle({ message: msg, callback_query: cb }: Update, origin: string) {
  const chatId = msg?.chat.id ?? cb?.message?.chat.id;
  const userId = (msg ?? cb)?.from?.id;
  if (!chatId || !userId) return;

  const send = (text: string, extra: object = {}) =>
    tg("sendMessage", { chat_id: chatId, text, ...extra }).catch(console.error);
  const owners = (process.env.TELEGRAM_OWNER_IDS ?? "").split(",").map((s) => s.trim());
  if (!owners.includes(String(userId))) return send(`Бот только для владельца сайта. Ваш ID: ${userId}`);

  const draftKey = `form:${chatId}`; // анкета нового авто (хеш)
  const photosKey = `form-photos:${chatId}`;
  const editKey = `price-edit:${chatId}`; // id авто, которому меняют цену

  const getDraft = async () => {
    const flat = await redis<string[]>("HGETALL", draftKey);
    const d: Draft = {};
    for (let i = 0; i < flat.length; i += 2) d[flat[i] as keyof Draft] = flat[i + 1];
    return d;
  };
  const save = async (fields: Draft) => {
    await redis("HSET", draftKey, ...Object.entries(fields).flatMap(([k, v]) => [k, v ?? ""]));
    await redis("EXPIRE", draftKey, DAY);
  };
  const clearDraft = () => redis("DEL", draftKey, photosKey, editKey);

  // Вопрос следующего шага или итог с кнопкой «Опубликовать»
  const askNext = async (d: Draft, after?: string) => {
    const step = nextStep(d, after);
    if (!step) {
      await save({ step: "done" });
      const count = await redis<number>("LLEN", photosKey);
      const rows = [[{ text: "Опубликовать", callback_data: "pub" }], [cancel]];
      return send(`Проверьте:\n${summary(toCar(d, "", []))}\nФото: ${count}`, keyboard(rows));
    }
    await save({ step: step.key });
    const options = (step.options?.(d) ?? []).map((text, i) => ({ text, callback_data: `s:${step.key}:${i}` }));
    const skip = step.optional ? [[{ text: "Пропустить", callback_data: `skip:${step.key}` }]] : [];
    return send(`${steps.indexOf(step) + 1}/${steps.length}. ${step.ask}`, keyboard([...rowsOf(options, 4), ...skip, [cancel]]));
  };

  // Ответ на шаг: текстом или кнопкой (label — подпись кнопки)
  const answer = async (d: Draft, key: Field, text: string) => {
    const step = steps.find((s) => s.key === key)!;
    const value = step.parse ? step.parse(text) : step.options?.(d).includes(text) ? text : null;
    if (value === null) return send(step.parse ? "Не понял значение, попробуйте ещё раз." : "Выберите вариант кнопкой.");
    d[key] = value;
    await save({ [key]: value });
    return askNext(d, key);
  };

  if (cb) {
    const [action, arg, index] = (cb.data ?? "").split(":");
    const edit = (text: string) =>
      tg("editMessageText", { chat_id: chatId, message_id: cb.message?.message_id, text }).catch(console.error);
    let note = "";

    if (action === "add") {
      await clearDraft();
      await save({ step: "photos" });
      await send("Пришлите фото авто — можно альбомом. Когда все загрузятся, нажмите «Фото готовы».", keyboard([[photosDone], [cancel]]));
    } else if (action === "photos") {
      const d = await getDraft();
      const count = await redis<number>("LLEN", photosKey);
      if (d.step !== "photos") note = "Фото уже приняты";
      else if (!count) note = "Сначала пришлите фото";
      else {
        await edit(`Фото: ${count}`);
        await askNext(d);
      }
    } else if (action === "s" || action === "skip") {
      const d = await getDraft();
      const step = steps.find((s) => s.key === arg);
      if (!step || d.step !== arg) note = "Этот шаг уже пройден";
      else {
        const label = action === "skip" ? "" : (step.options?.(d)[Number(index)] ?? "");
        await edit(`${cb.message?.text}\n→ ${label || "пропущено"}`);
        if (action === "skip") {
          await save({ [step.key]: "" });
          await askNext(d, step.key);
        } else await answer(d, step.key, label);
      }
    } else if (action === "pub") {
      const d = await getDraft();
      const photos = await redis<string[]>("LRANGE", photosKey, 0, -1);
      if (d.step !== "done" || !photos.length) note = "Черновик устарел — добавьте авто заново";
      else {
        const car = toCar(d, Date.now().toString(36), photos);
        await redis("HSET", "cars", car.id, JSON.stringify(car));
        await clearDraft();
        revalidateTag("cars", { expire: 0 });
        await edit(`Опубликовано:\n${summary(car)}`);
        await send(`${origin}/cars/${car.id}`, manage(car));
      }
    } else if (action === "cancel") {
      await clearDraft();
      await edit("Отменено.");
      await send("Что сделать?", menu);
    } else if (action === "list") {
      const cars = (await redis<string[]>("HVALS", "cars")).map((s) => JSON.parse(s) as Car);
      const rows = cars.map((c) => [{ text: `${title(c)} — ${rub(c.price)}`, callback_data: `car:${c.id}` }]);
      await send(cars.length ? "Авто на сайте:" : "На сайте пока нет авто.", keyboard([...rows, [{ text: "Добавить авто", callback_data: "add" }]]));
    } else {
      // Действия с опубликованным авто: car / price / del
      const saved = await redis<string | null>("HGET", "cars", arg ?? "");
      const car: Car | null = saved && JSON.parse(saved);
      if (!car) note = "Это авто уже снято с сайта";
      else if (action === "car") await send(`${summary(car)}\n${origin}/cars/${car.id}`, manage(car));
      else if (action === "price") {
        await redis("SET", editKey, car.id, "EX", 3600);
        await send(`Новая цена для ${title(car)}, ₽? Напишите число.`);
      } else if (action === "del") {
        await redis("HDEL", "cars", car.id);
        revalidateTag("cars", { expire: 0 });
        await edit(`Снято с сайта: ${title(car)}`);
        note = "Снято";
      }
    }
    await tg("answerCallbackQuery", { callback_query_id: cb.id, ...(note && { text: note }) }).catch(console.error);
    return;
  }
  if (!msg) return;

  if (msg.photo) {
    const d = await getDraft();
    if (!d.step) await save({ step: "photos" });
    // Telegram присылает несколько размеров; берём самый крупный до 1280 px
    const photo = msg.photo.findLast((p) => Math.max(p.width, p.height) <= 1280) ?? msg.photo[0];
    const count = await redis<number>("RPUSH", photosKey, photo.file_id);
    await redis("EXPIRE", photosKey, DAY);
    if (count === 1) await send("Фото получены. Когда загрузятся все, нажмите «Фото готовы».", keyboard([[photosDone], [cancel]]));
    return;
  }

  const text = msg.text?.trim() ?? "";
  if (text.startsWith("/")) return send("Что сделать?", menu);

  const editId = await redis<string | null>("GET", editKey);
  if (editId) {
    const price = steps.find((s) => s.key === "price")!.parse!(text);
    if (!price) return send("Напишите цену числом, например 2 450 000.");
    await redis("DEL", editKey);
    const saved = await redis<string | null>("HGET", "cars", editId);
    if (!saved) return send("Это авто уже снято с сайта.");
    const car: Car = { ...JSON.parse(saved), price: Number(price) };
    await redis("HSET", "cars", car.id, JSON.stringify(car));
    revalidateTag("cars", { expire: 0 });
    return send(`Цена обновлена: ${title(car)} — ${rub(car.price)}`);
  }

  const d = await getDraft();
  if (d.step === "photos") return send("Пришлите фото или нажмите «Фото готовы».", keyboard([[photosDone], [cancel]]));
  if (d.step === "done") return askNext(d, steps.at(-1)!.key);
  if (d.step) return answer(d, d.step as Field, text);
  return send("Что сделать?", menu);
}
