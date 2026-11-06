import type { Metadata, Viewport } from "next";
import { Jost, Onest } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

const jost = Jost({ variable: "--font-jost", subsets: ["latin", "cyrillic"], weight: ["600", "800"] });
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "A.I.K. — авто из Кореи и Китая под ключ с доставкой по России",
  description: "Подбор, выкуп, таможня и доставка авто из Кореи и Китая в любой город России. Прозрачный расчёт цены.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dde4eb" },
    { media: "(prefers-color-scheme: dark)", color: "#151b2a" },
  ],
};

const themeScript = `try{var t=localStorage.getItem("theme");document.documentElement.dataset.theme=t||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}catch(e){}`;

const contract = `<!--
THESIS: маршрут сделки как чертёж — линия от Пусана и Суйфэньхэ до ключа в городе клиента ведёт весь скролл; отказ от тёмного «люкс»-героя с фото и красной кнопкой.
OWN-WORLD: холодный серо-голубой грунт, сланцево-синие чернила, жёлтый ключ только для действия; чертёжные уголки, табличные цифры, плотные заглавные Jost.
STORY: срок и этапы в днях → реальные авто с ценой по статьям → заявка или Telegram.
FIRST VIEWPORT: крупный оффер «под ключ за ~30 дней», жёлтая кнопка «Подобрать авто» в зоне большого пальца, под ней билет маршрута с иконками.
FORM: вариант 5 списка — шильдик/паспорт ТС как язык данных; seed c849c466.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${jost.variable} ${onest.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <div hidden dangerouslySetInnerHTML={{ __html: contract }} />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
