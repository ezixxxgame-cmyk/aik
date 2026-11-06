import { revalidateTag } from "next/cache";
import { after, connection } from "next/server";
import { ids, log, nextStep, steps, tg, toCar, type Draft, type Field } from "@/lib/bot";
import { redis } from "@/lib/cars";
import { rub, type Car, type Story } from "@/lib/catalog";
import { site } from "@/config/site";

// Webhook Telegram-бота: владелец добавляет авто кнопками, авто сразу появляется в подборке на главной.
// Истории клиентов: фото + текст, появляются в секции «Истории клиентов».
// Telegram подписывает запросы секретом из setWebhook; писать боту могут только TELEGRAM_OWNER_IDS.
// Действия и ошибки уходят в лог-бот (lib/bot.ts → log).

type User = { id: number; first_name?: string; username?: string };
type PhotoSize = { file_id: string; width: number; height: number };
type Message = { message_id: number; chat: { id: number }; from?: User; text?: string; caption?: string; photo?: PhotoSize[] };
type Update = {
  update_id?: number;
  message?: Message;
  callback_query?: { id: string; from: User; data?: string; message?: Message };
};
const who = (u?: User) =>
  u ? [u.first_name, u.username && `@${u.username}`, `ID ${u.id}`].filter(Boolean).join(", ") : "неизвестно";
type Button = { text: string; callback_data: string };

const DAY = 86_400;
const keyboard = (rows: Button[][]) => ({ reply_markup: { inline_keyboard: rows } });
const rowsOf = (buttons: Button[], size: number) =>
  Array.from({ length: Math.ceil(buttons.length / size) }, (_, i) => buttons.slice(i * size, (i + 1) * size));
const cancel: Button = { text: "Отменить", callback_data: "cancel" };
const photosDone: Button = { text: "Фото готовы", callback_data: "photos" };
const addStory: Button = { text: "Добавить историю", callback_data: "sadd" };
const menu = keyboard([
  [{ text: "Добавить авто", callback_data: "add" }],
  [{ text: "Авто на сайте", callback_data: "list" }],
  [addStory],
  [{ text: "Истории на сайте", callback_data: "slist" }],
]);
const manage = (c: Car) =>
  keyboard([[{ text: "Изменить цену", callback_data: `price:${c.id}` }], [{ text: "Снять с сайта", callback_data: `del:${c.id}` }]]);
const STORY_MAX = 500; // знаков текста истории
const manageStory = (s: Story) => keyboard([[{ text: "Удалить с сайта", callback_data: `sdel:${s.id}` }]]);
const snippet = (t: string) => {
  const s = t.replace(/\s+/g, " ");
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
};

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

// Регистрация вебхуков обоих ботов прямо с Vercel: после деплоя или смены токена/секрета открыть
// https://aik-alpha.vercel.app/api/bot — покажет адрес, очередь и последнюю ошибку Telegram.
// Ключ не нужен: адрес и секрет берутся из кода и env, повторный вызов ничего не ломает.
export async function GET() {
  await connection();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Нет TELEGRAM_WEBHOOK_SECRET в env" }, { status: 500 });
  const hooks = [
    { bot: "admin", token: process.env.TELEGRAM_BOT_TOKEN, path: "/api/bot", updates: ["message", "callback_query"] },
    { bot: "log", token: process.env.TELEGRAM_LOG_BOT_TOKEN, path: "/api/log-bot", updates: ["message"] },
  ];
  const status = await Promise.all(
    hooks.map(async ({ bot, token, path, updates }) => {
      if (!token) return { bot, error: "Нет токена в env" };
      // max_connections 1: апдейты идут по очереди, шаги анкеты не перепутаются
      const params = { url: site.url + path, secret_token: secret, allowed_updates: updates, max_connections: 1 };
      const set = await tg("setWebhook", params, token);
      const { result: info } = await tg("getWebhookInfo", {}, token);
      return {
        bot,
        setWebhook: set.description,
        url: info?.url,
        pending: info?.pending_update_count,
        lastError: info?.last_error_message,
        lastErrorAt: info?.last_error_date && new Date(info.last_error_date * 1000).toISOString(),
      };
    }),
  );
  return Response.json(status);
}

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 401 });
  }
  let update: Update = {};
  try {
    update = await req.json();
    // Telegram шлёт апдейт повторно, если не дождался ответа; второй раз не обрабатываем
    const fresh = await redis<string | null>("SET", `tg-update:${update.update_id}`, 1, "NX", "EX", DAY);
    if (fresh) await handle(update, new URL(req.url).origin);
  } catch (e) {
    console.error(e);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    const text = `Ошибка: ${e instanceof Error ? e.message : e}`;
    if (chatId) await tg("sendMessage", { chat_id: chatId, text }).catch(console.error);
    after(() => log(`${text}\nКто: ${who(update.message?.from ?? update.callback_query?.from)}`));
  }
  // Всегда 200: иначе Telegram повторяет запрос и задерживает следующие сообщения
  return new Response();
}

async function handle({ message: msg, callback_query: cb }: Update, origin: string) {
  const chatId = msg?.chat.id ?? cb?.message?.chat.id;
  const from = (msg ?? cb)?.from;
  const userId = from?.id;
  if (!chatId || !userId) return;

  const send = (text: string, extra: object = {}) =>
    tg("sendMessage", { chat_id: chatId, text, ...extra }).catch(console.error);
  // Запись в лог-бот уходит после ответа Telegram и не тормозит админ-бота
  const act = (text: string) => after(() => log(`${text}\nКто: ${who(from)}`));
  if (!ids(process.env.TELEGRAM_OWNER_IDS).includes(String(userId))) {
    act("Чужой пользователь пишет админ-боту");
    return send(`Бот только для владельца сайта. Ваш ID: ${userId}`);
  }

  const draftKey = `form:${chatId}`; // анкета нового авто (хеш)
  const photosKey = `form-photos:${chatId}`;
  const editKey = `price-edit:${chatId}`; // id авто, которому меняют цену
  const storyKey = `story-form:${chatId}`; // новая история: "wait" — ждём фото, иначе file_id фото и ждём текст

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
  const clearDraft = () => redis("DEL", draftKey, photosKey, editKey, storyKey);

  // Публикация истории. Слишком длинный текст не берём: фото остаётся, просим сократить
  const publishStory = async (photo: string, text: string) => {
    if (text.length > STORY_MAX) {
      await redis("SET", storyKey, photo, "EX", DAY);
      return send(`Текст длинный: ${text.length} знаков, максимум ${STORY_MAX}. Сократите и пришлите ещё раз.`, keyboard([[cancel]]));
    }
    const story: Story = { id: Date.now().toString(36), photo, text };
    await redis("HSET", "stories", story.id, JSON.stringify(story));
    await redis("DEL", storyKey);
    revalidateTag("stories", { expire: 0 });
    act(`История опубликована:\n${text}\n${origin}/#stories`);
    return send(`История опубликована:\n${text}\n${origin}/#stories`, manageStory(story));
  };

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
        act(`Авто опубликовано:\n${summary(car)}\n${origin}/cars/${car.id}`);
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
    } else if (action === "sadd") {
      await clearDraft();
      await redis("SET", storyKey, "wait", "EX", DAY);
      await send("Пришлите одно фото для истории. Можно сразу с подписью — она станет текстом.", keyboard([[cancel]]));
    } else if (action === "slist") {
      const stories = (await redis<string[]>("HVALS", "stories")).map((s) => JSON.parse(s) as Story);
      const rows = stories.map((s) => [{ text: snippet(s.text), callback_data: `story:${s.id}` }]);
      await send(stories.length ? "Истории на сайте:" : "На сайте пока нет историй.", keyboard([...rows, [addStory]]));
    } else if (action === "story" || action === "sdel") {
      const saved = await redis<string | null>("HGET", "stories", arg ?? "");
      const story: Story | null = saved && JSON.parse(saved);
      if (!story) note = "Эта история уже удалена";
      else if (action === "story") await send(story.text, manageStory(story));
      else {
        await redis("HDEL", "stories", story.id);
        revalidateTag("stories", { expire: 0 });
        act(`История удалена: ${snippet(story.text)}`);
        await edit(`Удалено с сайта: ${snippet(story.text)}`);
        note = "Удалено";
      }
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
        act(`Авто снято с сайта: ${title(car)}, ${rub(car.price)}`);
        await edit(`Снято с сайта: ${title(car)}`);
        note = "Снято";
      }
    }
    await tg("answerCallbackQuery", { callback_query_id: cb.id, ...(note && { text: note }) }).catch(console.error);
    return;
  }
  if (!msg) return;

  if (msg.photo) {
    // Telegram присылает несколько размеров; берём самый крупный до 1280 px
    const photo = msg.photo.findLast((p) => Math.max(p.width, p.height) <= 1280) ?? msg.photo[0];
    if (await redis<string | null>("GET", storyKey)) {
      const caption = msg.caption?.trim();
      if (caption) return publishStory(photo.file_id, caption);
      await redis("SET", storyKey, photo.file_id, "EX", DAY);
      return send("Фото есть. Теперь напишите текст истории — пару предложений.", keyboard([[cancel]]));
    }
    const d = await getDraft();
    if (!d.step) await save({ step: "photos" });
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
    const old: Car = JSON.parse(saved);
    const car: Car = { ...old, price: Number(price) };
    await redis("HSET", "cars", car.id, JSON.stringify(car));
    revalidateTag("cars", { expire: 0 });
    act(`Цена изменена: ${title(car)}\nБыло ${rub(old.price)}, стало ${rub(car.price)}\n${origin}/cars/${car.id}`);
    return send(`Цена обновлена: ${title(car)} — ${rub(car.price)}`);
  }

  const story = await redis<string | null>("GET", storyKey);
  if (story === "wait") return send("Сначала пришлите фото.", keyboard([[cancel]]));
  if (story) return text ? publishStory(story, text) : send("Напишите текст истории.", keyboard([[cancel]]));

  const d = await getDraft();
  if (d.step === "photos") return send("Пришлите фото или нажмите «Фото готовы».", keyboard([[photosDone], [cancel]]));
  if (d.step === "done") return askNext(d, steps.at(-1)!.key);
  if (d.step) return answer(d, d.step as Field, text);
  return send("Что сделать?", menu);
}
