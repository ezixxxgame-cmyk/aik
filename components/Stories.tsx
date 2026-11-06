import Image from "next/image";
import { photoUrl, type Story } from "@/lib/catalog";

const SHOWN = 3;
const grid = "grid gap-x-6 gap-y-12 sm:grid-cols-2 md:grid-cols-3";

// «Показать ещё 1 историю / 2 истории / 5 историй»
const more = (n: number) => {
  const [a, b] = [n % 10, n % 100];
  const word = a === 1 && b !== 11 ? "историю" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "истории" : "историй";
  return `Показать ещё ${n} ${word}`;
};

function Item({ story }: { story: Story }) {
  return (
    <figure>
      <Image
        src={photoUrl(story.photo)}
        alt="Фото из истории клиента"
        width={1280}
        height={960}
        sizes="(min-width: 1152px) 352px, (min-width: 768px) 30vw, (min-width: 640px) 50vw, 100vw"
        className="aspect-[4/3] w-full rounded-sm bg-ground-2 object-cover"
      />
      <figcaption className="mt-4 max-w-[60ch] whitespace-pre-line leading-relaxed">{story.text}</figcaption>
    </figure>
  );
}

// Истории клиентов из бота: первые три видны, остальные — по кнопке
export default function Stories({ stories }: { stories: Story[] }) {
  if (!stories.length) return null;
  const rest = stories.slice(SHOWN);

  return (
    <section id="stories" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24">
      <h2 className="display text-[clamp(2rem,7vw,3.5rem)]">Истории клиентов</h2>
      <div className={`mt-10 ${grid}`}>
        {stories.slice(0, SHOWN).map((s) => (
          <Item key={s.id} story={s} />
        ))}
      </div>
      {rest.length > 0 && (
        <details className="group mt-12">
          <summary className="inline-flex h-12 cursor-pointer items-center rounded-[10px] border border-ink/25 px-6 font-medium hover:border-ink group-open:hidden">
            {more(rest.length)}
          </summary>
          <div className={grid}>
            {rest.map((s) => (
              <Item key={s.id} story={s} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
