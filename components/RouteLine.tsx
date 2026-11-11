"use client";

import { useEffect, useRef } from "react";
import { MAP_H, MAP_W, cities, russia } from "./map-data";

// Фон-карта: Россия из точек в шахматной сетке, маршруты из Кореи и Китая через Владивосток по крупным городам.
// Старт: точки проявляются волной от Владивостока с белым фронтом, линии прорисовываются с постоянной скоростью,
// города загораются по прибытии. Дальше раз в 7 с от Владивостока идёт волна-сигнал, по маршрутам бегут
// светящиеся штрихи (точки рядом расступаются и светятся), у каждого пройденного города — вспышка-кольцо.
// Всё на одном canvas, чтобы штрихи шли ровно по линиям. В «Этапах» затемнение снимается.
// На вертикальном экране карта повёрнута: восток сверху.
type Pt = [number, number];
type Edge = { a: string; b: string; sea: boolean; pts: Pt[]; cum: number[]; len: number; t0: number; t1: number };
type Comet = { path: Edge[]; s: number; len: number; leg: number; legEnd: number; speed: number };

const P = Object.fromEntries(cities.map((c) => [c.name, c.p])) as Record<string, Pt>;
const HUB = "Владивосток";
const ORIGINS = ["Пусан", "Суйфэньхэ"];
// [откуда, куда, морем/через границу] — по порядку от источников, время старта считается за один проход
const EDGES: [string, string, boolean?][] = [
  ["Пусан", HUB, true],
  ["Суйфэньхэ", HUB, true],
  [HUB, "Хабаровск"],
  [HUB, "Петропавловск-Камчатский", true],
  ["Хабаровск", "Чита"],
  ["Хабаровск", "Якутск"],
  ["Якутск", "Магадан"],
  ["Чита", "Иркутск"],
  ["Иркутск", "Красноярск"],
  ["Красноярск", "Новосибирск"],
  ["Красноярск", "Норильск"],
  ["Новосибирск", "Омск"],
  ["Новосибирск", "Сургут"],
  ["Омск", "Екатеринбург"],
  ["Екатеринбург", "Казань"],
  ["Екатеринбург", "Самара"],
  ["Казань", "Москва"],
  ["Самара", "Волгоград"],
  ["Москва", "Санкт-Петербург"],
  ["Санкт-Петербург", "Мурманск"],
];
// Конечные города веток: штрихи идут туда по очереди — так по каждой линии регулярно кто-то едет
const LEAVES = EDGES.map((e) => e[1]).filter((n) => n !== HUB && !EDGES.some((e) => e[0] === n));
const LABEL: Record<string, string> = { Пусан: "Корея", Суйфэньхэ: "Китай", "Петропавловск-Камчатский": "Камчатка" };
// Сторона подписи: справа, слева, сверху, снизу
const SIDE: Record<string, "r" | "l" | "t" | "b"> = {
  Пусан: "l",
  Суйфэньхэ: "l",
  "Петропавловск-Камчатский": "l",
  Иркутск: "b",
  Чита: "b",
  Красноярск: "t",
  Новосибирск: "b",
  Омск: "b",
  Екатеринбург: "b",
  Самара: "b",
  Волгоград: "b",
  Москва: "l",
};
const SIDE_PORTRAIT: Record<string, "r" | "l" | "t" | "b"> = { [HUB]: "t", Суйфэньхэ: "l" };
// На вертикальном экране карта мелкая: подписываем только эти
const PORTRAIT_LABELS = new Set([HUB, ...ORIGINS, "Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Иркутск", "Якутск", "Магадан"]);

const SAMPLES = 40;
const REVEAL = 2.4; // волна проявления точек, с
const WAVE_EVERY = 7; // волна-сигнал, с
const PULSE = 1.2; // вспышка у города, с
const ease = (t: number) => 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 3;
const rgb = (hex: string) => {
  const n = parseInt(hex.trim().slice(1), 16);
  return `${n >> 16},${(n >> 8) & 255},${n & 255}`;
};

export default function RouteLine() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;

    // ---- Раскладка под экран: точки, линии, время прибытия в города ----
    let W = 0;
    let H = 0;
    let dpr = 1;
    let s = 1;
    let G = 8; // шаг сетки точек, px
    let portrait = false;
    let dots = new Float32Array(0);
    let dist = new Float32Array(0);
    let cell = new Int32Array(0); // индекс точки по клетке сетки
    let cols = 0;
    let rows = 0;
    let maxDist = 1;
    let toScreen = (p: Pt): Pt => p;
    let edges: Edge[] = [];
    let parent: Record<string, Edge> = {};
    let arrive: Record<string, number> = {};
    let introEnd = 0;

    // Холст ровно по размеру слоя, CSS его не масштабирует — карта не растягивается
    const layout = () => {
      const rect = el.getBoundingClientRect();
      W = Math.round(rect.width);
      H = Math.round(rect.height);
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      portrait = W < H;
      s = portrait ? Math.min((W * 0.96) / MAP_H, (H * 0.86) / MAP_W) : Math.min(W / MAP_W, H / MAP_H);
      const tx = portrait ? (W - MAP_H * s) / 2 : (W - MAP_W * s) / 2;
      const ty = portrait ? (H - MAP_W * s) / 2 + MAP_W * s + 24 : (H - MAP_H * s) / 2 + 24;
      toScreen = ([x, y]) => (portrait ? [tx + s * y, ty - s * x] : [tx + s * x, ty + s * y]);
      G = Math.max(6, (MAP_W * s) / 150);

      // Точки: шахматная сетка, внутри России — по растру контура
      const m = document.createElement("canvas");
      m.width = W;
      m.height = H;
      const mc = m.getContext("2d", { willReadFrequently: true })!;
      mc.setTransform(portrait ? 0 : s, portrait ? -s : 0, portrait ? s : 0, portrait ? 0 : s, tx, ty);
      mc.fill(new Path2D(russia));
      const px = mc.getImageData(0, 0, W, H).data;
      const rowH = G * 0.866;
      rows = Math.ceil(H / rowH);
      cols = Math.ceil(W / G) + 1;
      cell = new Int32Array(rows * cols).fill(-1);
      const list: number[] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const x = (r % 2 ? G : G / 2) + c * G;
          const y = G / 2 + r * rowH;
          if (x >= W || y >= H || px[(Math.round(y) * W + Math.round(x)) * 4 + 3] < 128) continue;
          cell[r * cols + c] = list.length / 2;
          list.push(x, y);
        }
      dots = Float32Array.from(list);
      const hub = toScreen(P[HUB]);
      dist = new Float32Array(dots.length / 2);
      for (let i = 0; i < dist.length; i++) dist[i] = Math.hypot(dots[i * 2] - hub[0], dots[i * 2 + 1] - hub[1]);
      maxDist = dist.reduce((m, v) => Math.max(m, v), 1);

      // Линии: квадратичная дуга (суша выгнута к северу, море — к югу), разбитая на отрезки с длинами
      const speed = 370 * s; // px/с, линия прорисовывается с постоянной скоростью
      arrive = { [ORIGINS[0]]: 0.3, [ORIGINS[1]]: 0.45 };
      parent = {};
      edges = EDGES.map(([a, b, sea = false]) => {
        const [A, B] = [P[a], P[b]];
        const [dx, dy] = [B[0] - A[0], B[1] - A[1]];
        const len = Math.hypot(dx, dy);
        let [nx, ny] = [-dy / len, dx / len];
        if (sea ? ny < 0 : ny > 0) [nx, ny] = [-nx, -ny];
        const bend = len * (sea ? 0.2 : 0.12);
        const C: Pt = [(A[0] + B[0]) / 2 + nx * bend, (A[1] + B[1]) / 2 + ny * bend];
        const pts: Pt[] = [];
        const cum = [0];
        for (let i = 0; i <= SAMPLES; i++) {
          const t = i / SAMPLES;
          const k = 1 - t;
          pts.push(toScreen([k * k * A[0] + 2 * k * t * C[0] + t * t * B[0], k * k * A[1] + 2 * k * t * C[1] + t * t * B[1]]));
          if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        }
        const e: Edge = { a, b, sea, pts, cum, len: cum[SAMPLES], t0: arrive[a], t1: 0 };
        e.t1 = e.t0 + e.len / speed;
        arrive[b] = Math.max(arrive[b] ?? 0, e.t1);
        if (!ORIGINS.includes(a)) parent[b] = e;
        return e;
      });
      introEnd = Math.max(...edges.map((e) => e.t1)) + 0.5;
      comets.length = 0;
      pulses.length = 0;
      dotLayer = topLayer = null;
    };

    const pointAt = (e: Edge, d: number): Pt => {
      let i = 1;
      while (i < SAMPLES && e.cum[i] < d) i++;
      const k = Math.max(0, Math.min(1, (d - e.cum[i - 1]) / (e.cum[i] - e.cum[i - 1] || 1)));
      const [a, b] = [e.pts[i - 1], e.pts[i]];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    };

    // ---- Цвета темы ----
    let ink = "";
    let ground = "";
    let hot = "";
    let white = "";
    let core = "";
    let font = "";
    let dark = false;
    let glow: HTMLCanvasElement | null = null;
    const theme = () => {
      const css = getComputedStyle(html);
      dark = html.dataset.theme === "dark";
      ink = rgb(css.getPropertyValue("--ink"));
      ground = rgb(css.getPropertyValue("--ground"));
      hot = rgb(css.getPropertyValue(dark ? "--key" : "--route-done"));
      white = dark ? "255,255,255" : hot;
      core = dark ? "rgba(255,248,225,0.95)" : `rgb(${rgb(css.getPropertyValue("--key"))})`;
      font = getComputedStyle(document.body).fontFamily;
      // Свечение точки: круг с радиальным градиентом
      glow = document.createElement("canvas");
      glow.width = glow.height = Math.ceil(8 * dpr);
      const g = glow.getContext("2d")!;
      const r = glow.width / 2;
      const gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, `rgba(${white},0.9)`);
      gr.addColorStop(0.3, `rgba(${white},0.35)`);
      gr.addColorStop(1, `rgba(${white},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, glow.width, glow.width);
      dotLayer = topLayer = null;
    };

    // ---- Сцена: точки, линии, города (во время старта рисуется каждый кадр, потом кэшируется) ----
    const dotR = () => Math.max(0.8, G * 0.19);
    const dotsPath = (c: CanvasRenderingContext2D, test: (i: number) => boolean) => {
      const r = dotR();
      c.beginPath();
      for (let i = 0; i < dist.length; i++) {
        if (!test(i)) continue;
        const [x, y] = [dots[i * 2], dots[i * 2 + 1]];
        c.moveTo(x + r, y);
        c.arc(x, y, r, 0, Math.PI * 2);
      }
      c.fill();
    };

    const drawDots = (c: CanvasRenderingContext2D, t: number) => {
      const R = maxDist * ease(t / REVEAL) + 2;
      c.fillStyle = `rgba(${ink},0.3)`;
      dotsPath(c, (i) => dist[i] <= R);
      if (R < maxDist) {
        // Горящий фронт волны проявления
        c.fillStyle = `rgba(${white},0.6)`;
        dotsPath(c, (i) => dist[i] <= R && dist[i] > R - 4 * G);
      }
    };

    const strokePart = (c: CanvasRenderingContext2D, e: Edge, upTo: number) => {
      c.beginPath();
      c.moveTo(...e.pts[0]);
      for (let i = 1; i <= SAMPLES && e.cum[i - 1] < upTo; i++) {
        if (e.cum[i] <= upTo) c.lineTo(...e.pts[i]);
        else c.lineTo(...pointAt(e, upTo));
      }
      c.stroke();
    };

    const drawEdges = (c: CanvasRenderingContext2D, t: number) => {
      c.lineWidth = portrait ? 1 : 1.3;
      c.lineCap = "round";
      for (const e of edges) {
        const p = (t - e.t0) / (e.t1 - e.t0);
        if (p <= 0) continue;
        c.setLineDash(e.sea ? [3, 4] : []);
        c.strokeStyle = `rgba(${hot},${e.sea ? 0.6 : 0.55})`;
        strokePart(c, e, e.len * Math.min(p, 1));
        if (p < 1) {
          // Светящаяся голова рисующейся линии
          const [x, y] = pointAt(e, e.len * p);
          c.save();
          c.shadowColor = `rgba(${hot},1)`;
          c.shadowBlur = 12 * dpr;
          c.fillStyle = core;
          c.beginPath();
          c.arc(x, y, 2.6, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }
      c.setLineDash([]);
    };

    const drawNodes = (c: CanvasRenderingContext2D, t: number) => {
      const fs = portrait ? 10 : 12;
      const k = portrait ? 0.8 : 1;
      for (const id of Object.keys(arrive)) {
        const a = ease((t - arrive[id]) / 0.5);
        if (a <= 0) continue;
        const [x, y] = toScreen(P[id]);
        const isHub = id === HUB;
        const isOrigin = ORIGINS.includes(id);
        c.globalAlpha = a;
        c.lineWidth = 1;
        c.strokeStyle = `rgba(${hot},0.9)`;
        c.beginPath();
        c.arc(x, y, (isHub ? 8 : 5) * k, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = isHub ? `rgb(${hot})` : isOrigin ? `rgb(${ground})` : `rgb(${ink})`;
        c.beginPath();
        c.arc(x, y, (isHub ? 3.6 : 2.4) * k, 0, Math.PI * 2);
        c.fill();
        if (isOrigin) c.stroke();

        if (portrait && !PORTRAIT_LABELS.has(id)) continue;
        const size = isOrigin ? fs - 1 : isHub ? fs + 1 : fs;
        c.font = `${isHub || isOrigin ? 700 : 500} ${size}px ${font}`;
        const label = isOrigin ? (LABEL[id] ?? id).toUpperCase() : (LABEL[id] ?? id);
        const tw = c.measureText(label).width;
        const gap = isHub ? 13 : 9;
        const side = (portrait ? SIDE_PORTRAIT[id] : SIDE[id]) ?? "r";
        let lx = side === "r" ? x + gap : side === "l" ? x - gap - tw : x - tw / 2;
        const ly = side === "t" ? y - gap - size / 2 : side === "b" ? y + gap + size / 2 : y;
        lx = Math.max(2, Math.min(W - tw - 2, lx));
        c.textBaseline = "middle";
        c.lineWidth = 4;
        c.lineJoin = "round";
        c.strokeStyle = `rgba(${ground},0.85)`;
        c.strokeText(label, lx, ly);
        c.fillStyle = isHub ? `rgb(${ink})` : isOrigin ? `rgb(${hot})` : `rgba(${ink},0.82)`;
        c.fillText(label, lx, ly);
      }
      c.globalAlpha = 1;
    };

    const scene = (c: CanvasRenderingContext2D, t: number) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      drawDots(c, t);
      drawEdges(c, t);
      drawNodes(c, t);
    };

    // ---- Живой слой: волна-сигнал, штрихи по маршрутам, вспышки у городов ----
    const comets: Comet[] = [];
    const pulses: { id: string; t0: number }[] = [];
    let spawnAt = 0;
    let turn = 0;
    let dotLayer: HTMLCanvasElement | null = null;
    let topLayer: HTMLCanvasElement | null = null;
    const layer = (draw: (c: CanvasRenderingContext2D) => void) => {
      const c = document.createElement("canvas");
      c.width = cv.width;
      c.height = cv.height;
      const g = c.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(g);
      return c;
    };
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

    const spawn = (t: number) => {
      const path: Edge[] = [];
      for (let id = LEAVES[turn++ % LEAVES.length]; parent[id]; id = parent[id].a) path.unshift(parent[id]);
      const origin = pick(ORIGINS);
      path.unshift(edges.find((e) => e.a === origin)!);
      const len = path.reduce((n, e) => n + e.len, 0);
      comets.push({ path, s: 0, len, leg: 0, legEnd: path[0].len, speed: (154 + Math.random() * 61) * s });
      spawnAt = t + 0.6 + Math.random() * 0.6;
    };

    const cometPoint = (cm: Comet, d: number): Pt => {
      d = Math.max(d, 0);
      for (const e of cm.path) {
        if (d <= e.len) return pointAt(e, d);
        d -= e.len;
      }
      return cm.path[cm.path.length - 1].pts[SAMPLES];
    };

    const live = (t: number, dt: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, cv.width, cv.height);
      dotLayer ??= layer((c) => drawDots(c, Infinity));
      ctx.drawImage(dotLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Волна-сигнал от Владивостока: точки в полосе светлеют ступенями
      const R = (((t - introEnd) % WAVE_EVERY) / WAVE_EVERY) * (maxDist + 12 * G);
      const band = 5 * G;
      for (let k = 1; k <= 3; k++) {
        ctx.fillStyle = `rgba(${white},${0.12 * k})`;
        dotsPath(ctx, (i) => {
          const q = 1 - Math.abs(dist[i] - R) / band;
          return q > 0 && Math.ceil(q * 3) === k;
        });
      }

      // Штрихи
      if (t >= spawnAt && comets.length < 7) spawn(t);
      const dash = Math.max(12, 17 * s);
      const lit: { pts: Pt[]; c: Pt; a: number }[] = [];
      for (let j = comets.length - 1; j >= 0; j--) {
        const cm = comets[j];
        cm.s += cm.speed * dt;
        while (cm.leg < cm.path.length && cm.s >= cm.legEnd) {
          pulses.push({ id: cm.path[cm.leg].b, t0: t });
          cm.leg++;
          if (cm.leg < cm.path.length) cm.legEnd += cm.path[cm.leg].len;
        }
        if (cm.s >= cm.len) {
          comets.splice(j, 1);
          continue;
        }
        const pts = Array.from({ length: 7 }, (_, i) => cometPoint(cm, cm.s - (dash * i) / 6));
        lit.push({ pts, c: pts[3], a: Math.min(1, cm.s / dash, (cm.len - cm.s) / dash) });
      }

      // Точки рядом со штрихом: стираем на месте и рисуем сдвинутыми от него, с мягким свечением
      const push = 3.4 * G;
      const moved: number[] = [];
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      const r0 = dotR() + 0.7;
      for (const {
        c: [x, y],
        a,
      } of lit) {
        const ra = Math.max(0, Math.floor((y - push - G / 2) / (G * 0.866)));
        const rb = Math.min(rows - 1, Math.ceil((y + push - G / 2) / (G * 0.866)));
        for (let r = ra; r <= rb; r++) {
          const off = r % 2 ? G : G / 2;
          const ca = Math.max(0, Math.floor((x - push - off) / G));
          const cb = Math.min(cols - 1, Math.ceil((x + push - off) / G));
          for (let c = ca; c <= cb; c++) {
            const i = cell[r * cols + c];
            if (i < 0) continue;
            const [dx, dy] = [dots[i * 2] - x, dots[i * 2 + 1] - y];
            const d = Math.hypot(dx, dy);
            if (d >= push || d < 0.5) continue;
            const f = (1 - d / push) ** 2 * a;
            const o = (f * 0.8 * G) / d;
            ctx.moveTo(dots[i * 2] + r0, dots[i * 2 + 1]);
            ctx.arc(dots[i * 2], dots[i * 2 + 1], r0, 0, Math.PI * 2);
            moved.push(dots[i * 2] + dx * o, dots[i * 2 + 1] + dy * o, f);
          }
        }
      }
      ctx.fill();
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      for (let i = 0; i < moved.length; i += 3) {
        ctx.globalAlpha = Math.min(0.5, 0.06 + moved[i + 2] * 0.6);
        ctx.drawImage(glow!, moved[i] - 4, moved[i + 1] - 4, 8, 8);
      }

      // Линии и города поверх точек
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      topLayer ??= layer((c) => {
        drawEdges(c, Infinity);
        drawNodes(c, Infinity);
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(topLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Штрих: ореол с размытием и яркая сердцевина, ровно по линии
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = `rgba(${hot},0.9)`;
      for (const { pts, a } of lit) {
        ctx.globalAlpha = a;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.shadowBlur = 14 * dpr;
        ctx.strokeStyle = `rgb(${hot})`;
        ctx.lineWidth = portrait ? 2.2 : 2.6;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = core;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // Вспышки у городов
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 1.5;
      for (let j = pulses.length - 1; j >= 0; j--) {
        const age = t - pulses[j].t0;
        if (age > PULSE) {
          pulses.splice(j, 1);
          continue;
        }
        const [x, y] = toScreen(P[pulses[j].id]);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(${hot},${0.8 * (1 - age / PULSE)})`;
        ctx.beginPath();
        ctx.arc(x, y, 5 + ease(age / PULSE) * (portrait ? 12 : 20), 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    // ---- Цикл ----
    let clock = 0;
    let last = 0;
    let raf = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      clock += dt;
      if (clock < introEnd) scene(ctx, clock);
      else {
        delete el.dataset.intro;
        live(clock, dt);
      }
      raf = requestAnimationFrame(frame);
    };
    const still = () => {
      delete el.dataset.intro;
      scene(ctx, Infinity);
    };

    layout();
    theme();
    if (reduce) still();
    else {
      el.dataset.intro = "";
      raf = requestAnimationFrame(frame);
    }

    // Слой высотой в «большой» экран (lvh): адресная строка телефона его не меняет, пересчёт — только при реальной смене размера
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (Math.round(width) === W && Math.round(height) === H) return;
      layout();
      if (reduce) still();
    });
    ro.observe(el);
    const mo = new MutationObserver(() => {
      theme();
      if (reduce) still();
    });
    mo.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(() => {
      topLayer = null;
      if (reduce) still();
    });

    // «Этапы» в центре экрана — снимаем затемнение
    const stages = document.getElementById("stages");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.dataset.stage = "";
        else delete el.dataset.stage;
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    if (stages) io.observe(stages);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={root} aria-hidden className="map pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh overflow-hidden">
      <canvas ref={canvas} className="absolute top-0 left-0" />
      <div className="map-dim absolute inset-0 bg-ground" />
    </div>
  );
}
