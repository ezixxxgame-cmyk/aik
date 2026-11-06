import { logChats, tg } from "@/lib/bot";

// Webhook лог-бота: на любое сообщение отвечает, приходят ли сюда логи. Сами логи шлёт log() из lib/bot.ts.
export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 401 });
  }
  try {
    const { message }: { message?: { chat: { id: number } } } = await req.json();
    const chatId = message?.chat.id;
    if (chatId) {
      const text = logChats().includes(String(chatId))
        ? "Логи включены: сюда приходят действия в админ-боте и ошибки."
        : `Логи сюда не приходят. ID чата: ${chatId} — добавьте его в TELEGRAM_LOG_CHAT_IDS на Vercel.`;
      await tg("sendMessage", { chat_id: chatId, text }, process.env.TELEGRAM_LOG_BOT_TOKEN);
    }
  } catch (e) {
    console.error(e);
  }
  // Всегда 200, чтобы Telegram не копил очередь повторов
  return new Response();
}
