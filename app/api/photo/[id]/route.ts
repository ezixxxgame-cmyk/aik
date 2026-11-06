import { tg } from "@/lib/bot";

// Фото авто лежат в Telegram; отдаём их с сайта, не раскрывая токен бота. CDN кеширует на год.
export async function GET(_req: Request, ctx: RouteContext<"/api/photo/[id]">) {
  const { id } = await ctx.params;
  const file = await tg("getFile", { file_id: id });
  if (!file.ok) return new Response(null, { status: 404 });

  const res = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.result.file_path}`);
  if (!res.ok) return new Response(null, { status: 502 });
  return new Response(res.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
