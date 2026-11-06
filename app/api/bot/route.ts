import { revalidateTag } from "next/cache";
import { parseCar, template, tg } from "@/lib/bot";
import { redis } from "@/lib/cars";
import { rub, type Car } from "@/lib/catalog";
import { calcPrice } from "@/lib/pricing";

// Webhook Telegram-бота. Владелец присылает фото, затем описание — авто появляется в подборке на главной.
// Telegram подписывает запросы секретом из setWebhook; писать боту могут только TELEGRAM_OWNER_IDS.

type PhotoSize = { file_id: string; width: number; height: number };
type Message = {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
  text?: string;
  caption?: string;
  photo?: PhotoSize[];
  media_group_id?: string;
};
type Update = {
  message?: Message;
  callback_query?: { id: string; from: { id: number }; data?: string; message?: Message };
};

const help = `Как добавить авто в подборку на сайте:
1. Пришлите фото — можно альбомом.
2. Затем отдельным сообщением — описание по шаблону (нажмите, чтобы скопировать):

<pre>${template}</pre>

/list — что сейчас на сайте, снять авто
/cancel — сбросить загруженные фото`;

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 401 });
  }
  const { message: msg, callback_query: cb }: Update = await req.json();
  const chatId = msg?.chat.id ?? cb?.message?.chat.id;
  const userId = (msg ?? cb)?.from?.id;
  if (!chatId || !userId) return new Response();

  // Ошибка ответа не должна ронять запрос: иначе Telegram повторит его и фото задвоятся
  const reply = (text: string, extra: object = {}) =>
    tg("sendMessage", { chat_id: chatId, text, ...extra }).catch(console.error);
  const owners = (process.env.TELEGRAM_OWNER_IDS ?? "").split(",").map((s) => s.trim());
  if (!owners.includes(String(userId))) {
    await reply(`Бот только для владельца сайта. Ваш ID: ${userId}`);
    return new Response();
  }

  const draft = `draft:${chatId}`;
  const title = (c: Car) => `${c.make} ${c.model} ${c.year}`;

  if (cb?.data?.startsWith("del:")) {
    const id = cb.data.slice(4);
    const saved = await redis<string | null>("HGET", "cars", id);
    if (saved) {
      await redis("HDEL", "cars", id);
      revalidateTag("cars", { expire: 0 });
      await reply(`Снято с сайта: ${title(JSON.parse(saved))}`);
    }
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: saved ? "Снято" : "Уже снято" });
    return new Response();
  }
  if (!msg) return new Response();

  if (msg.photo) {
    // Telegram присылает несколько размеров; берём самый крупный до 1280 px
    const photo = msg.photo.findLast((p) => Math.max(p.width, p.height) <= 1280) ?? msg.photo[0];
    await redis("RPUSH", draft, photo.file_id);
    await redis("EXPIRE", draft, 86_400);
    // На альбом отвечаем один раз
    const first = !msg.media_group_id || (await redis("SET", `album:${msg.media_group_id}`, 1, "NX", "EX", 600)) === "OK";
    if (first) {
      await reply(
        "Фото получены. Когда загрузятся все, пришлите описание отдельным сообщением." +
          (msg.caption ? " Подпись к фото не используется." : ""),
      );
    }
    return new Response();
  }

  const text = msg.text?.trim() ?? "";
  if (text === "/cancel") {
    await redis("DEL", draft);
    await reply("Загруженные фото сброшены.");
    return new Response();
  }
  if (text === "/list") {
    const cars = (await redis<string[]>("HVALS", "cars")).map((s) => JSON.parse(s) as Car);
    await reply(cars.length ? "Сейчас на сайте. Нажмите, чтобы снять:" : "Подборка пуста.", {
      reply_markup: { inline_keyboard: cars.map((c) => [{ text: title(c), callback_data: `del:${c.id}` }]) },
    });
    return new Response();
  }
  if (!text || text.startsWith("/")) {
    await reply(help, { parse_mode: "HTML" });
    return new Response();
  }

  const { car, errors } = parseCar(text);
  if (!car) {
    await reply(`Не получилось разобрать:\n— ${errors.join("\n— ")}\n\nШаблон:\n<pre>${template}</pre>`, { parse_mode: "HTML" });
    return new Response();
  }
  const photos = await redis<string[]>("LRANGE", draft, 0, -1);
  if (!photos.length) {
    await reply("Сначала пришлите фото авто, затем описание.");
    return new Response();
  }

  const saved: Car = { id: Date.now().toString(36), ...car, photos };
  await redis("HSET", "cars", saved.id, JSON.stringify(saved));
  await redis("DEL", draft);
  revalidateTag("cars", { expire: 0 });
  await reply(
    `Опубликовано: ${title(saved)}, ${photos.length} фото, от ${rub(calcPrice(saved).total)} под ключ.\n${new URL(req.url).origin}/cars/${saved.id}`,
    { reply_markup: { inline_keyboard: [[{ text: "Снять с сайта", callback_data: `del:${saved.id}` }]] } },
  );
  return new Response();
}
