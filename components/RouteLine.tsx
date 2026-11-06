"use client";

import { useEffect, useRef, useState } from "react";
import { CarIcon, KeyIcon, ShipIcon, TruckIcon } from "./icons";
import { MAP_H, MAP_W, cities, land, route, russia } from "./map-data";

// Фон-карта: маршрут по карте России, иконка едет по мере скролла всей страницы
// (финиш — когда в кадр входит форма заявки, она закрывает карту).
// На вертикальном экране карта повёрнута: восток сверху, Краснодар внизу.
type Pt = [number, number];
type Line = { pts: Pt[]; cum: number[]; total: number };
type View = { s: number; rot: 0 | 90; tx: number; ty: number };

// Сглаживание опорных точек срезанием углов (Чайкин): без выбросов за пределы ломаной
const smooth = (pts: Pt[], passes = 4): Pt[] => {
  for (let n = 0; n < passes; n++) {
    const out: Pt[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
};

const prep = (raw: Pt[]): Line => {
  const pts = smooth(raw);
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, total: cum[cum.length - 1] };
};
const lines = { kr: prep(route.kr), cn: prep(route.cn), trunk: prep(route.trunk) };

// Точка на линии на расстоянии l от начала
const at = ({ pts, cum, total }: Line, l: number) => {
  l = Math.min(Math.max(l, 0), total);
  let i = 1;
  while (i < pts.length - 1 && cum[i] < l) i++;
  const k = (l - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const p: Pt = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
  return { p, i };
};

// Для доли t: точка, пройденная часть пути и курс (градусы в координатах карты, по хорде ±4 ед. — без дрожи)
const walk = (line: Line, t: number) => {
  const l = Math.min(Math.max(t, 0), 1) * line.total;
  const { p, i } = at(line, l);
  const d = "M" + [...line.pts.slice(0, i), p].map((q) => q.join(" ")).join("L");
  const [a, b] = [at(line, l - 4).p, at(line, l + 4).p];
  return { p, d, ang: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
};

const poly = (pts: Pt[]) => "M" + pts.map((q) => q.join(" ")).join("L");

// Корабль не поворачиваем: если морская линия в целом идёт влево по экрану — отражаем
const facesLeft = ({ pts }: Line, rot: number) => {
  const [a, b] = [pts[0], pts[pts.length - 1]];
  return (rot ? b[1] - a[1] : b[0] - a[0]) < 0;
};

// Доля скролла, на которой морская/китайская ветка доходит до Владивостока
const BRANCH = 0.2;
// Точки остановки для prefers-reduced-motion: порты, Владивосток, в пути, Краснодар
const STOPS = [0, BRANCH, 0.6, 1];
const ICON = 32;

export default function RouteLine() {
  const [view, setView] = useState<View | null>(null);
  const done = useRef<Record<string, SVGPathElement | null>>({});
  const icons = useRef<Record<string, SVGGElement | null>>({});
  const dots = useRef<Record<string, SVGGElement | null>>({});

  useEffect(() => {
    const fit = () => {
      const vw = innerWidth;
      const vh = innerHeight;
      if (vw < vh) {
        const s = Math.min((vw * 0.96) / MAP_H, (vh * 0.86) / MAP_W);
        setView({ s, rot: 90, tx: (vw - MAP_H * s) / 2, ty: (vh - MAP_W * s) / 2 + MAP_W * s + 24 });
      } else {
        const s = Math.min(vw / MAP_W, vh / MAP_H);
        setView({ s, rot: 0, tx: (vw - MAP_W * s) / 2, ty: (vh - MAP_H * s) / 2 + 24 });
      }
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (!view) return;
    const { s, rot } = view;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let cur = -1;
    const flipped: Record<string, boolean> = {};

    const target = () => {
      const lead = document.getElementById("lead");
      const max = lead
        ? lead.getBoundingClientRect().top + scrollY - innerHeight
        : document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0;
      return reduce.matches ? Math.max(...STOPS.filter((v) => v <= p + 0.001)) : p;
    };

    const draw = (p: number) => {
      const onTrunk = p >= BRANCH;
      const finished = p >= 0.99;

      const kr = walk(lines.kr, p / BRANCH);
      const cn = walk(lines.cn, p / BRANCH);
      const tk = walk(lines.trunk, (p - BRANCH) / (1 - BRANCH));
      done.current.kr?.setAttribute("d", kr.d);
      done.current.cn?.setAttribute("d", cn.d);
      done.current.trunk?.setAttribute("d", onTrunk ? tk.d : "");

      const put = (key: string, at: Pt, on: boolean) => {
        const g = icons.current[key];
        if (!g) return;
        g.setAttribute("transform", `translate(${at[0]} ${at[1]}) rotate(${rot}) scale(${1 / s})`);
        g.classList.toggle("off", !on);
      };
      // Машина и автовоз поворачиваются по курсу дороги и чуть покачиваются на неровностях.
      // Иконки нарисованы носом вправо: при движении влево отражаем (с гистерезисом, чтобы не мигали на вертикали).
      const drive = (key: string, w: ReturnType<typeof walk>, on: boolean, traveled: number) => {
        const g = icons.current[key];
        if (!g) return;
        let a = ((w.ang - rot + 540) % 360) - 180;
        const f = Math.abs(a) > (flipped[key] ? 80 : 100);
        flipped[key] = f;
        if (f) a += a > 0 ? -180 : 180;
        const bump = reduce.matches ? 0 : -Math.abs(Math.sin(traveled * s * 0.45)) * 1.1;
        g.setAttribute("transform", `translate(${w.p[0]} ${w.p[1]}) rotate(${rot + a}) scale(${1 / s}) translate(0 ${bump})`);
        (g.firstElementChild as SVGGElement).style.scale = f ? "-1 1" : "";
        g.classList.toggle("off", !on);
      };
      put("kr", kr.p, !onTrunk);
      drive("cn", cn, !onTrunk, (p / BRANCH) * lines.cn.total);
      drive("truck", tk, onTrunk && !finished, ((p - BRANCH) / (1 - BRANCH)) * lines.trunk.total);
      put("key", tk.p, finished);

      const lit: Record<string, boolean> = {
        Пусан: true,
        Суйфэньхэ: true,
        Владивосток: onTrunk,
        Краснодар: finished,
      };
      for (const [name, g] of Object.entries(dots.current)) g?.classList.toggle("on", !!lit[name]);
    };

    // Иконки догоняют скролл с мягким затуханием, а не прыгают за колесом мыши
    const tick = () => {
      raf = 0;
      const t = target();
      cur = cur < 0 || reduce.matches ? t : cur + (t - cur) * 0.14;
      if (Math.abs(t - cur) < 0.0004) cur = t;
      draw(cur);
      if (cur !== t) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [view]);

  if (!view) return <div aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
  const { s, rot, tx, ty } = view;
  const icon = { width: ICON, height: ICON, x: -ICON / 2, y: -ICON / 2 };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg width="100%" height="100%">
        <g transform={`translate(${tx} ${ty}) rotate(${-rot}) scale(${s})`}>
          <path d={land} className="map-land" vectorEffect="non-scaling-stroke" />
          <path d={russia} className="map-russia" vectorEffect="non-scaling-stroke" />
          {/* Дорога по суше: сначала все обочины, потом полотно, чтобы ветки сливались без швов */}
          {(["map-road-edge", "map-road"] as const).map((cls) =>
            (["cn", "trunk"] as const).map((k) => <path key={cls + k} d={poly(lines[k].pts)} className={cls} vectorEffect="non-scaling-stroke" />),
          )}
          {(["kr", "cn", "trunk"] as const).map((k) => (
            <g key={k}>
              <path d={poly(lines[k].pts)} className={k === "kr" ? "map-route" : "map-lane"} vectorEffect="non-scaling-stroke" />
              <path ref={(el) => void (done.current[k] = el)} className="map-done" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {cities.map((c) => (
            <g
              key={c.name}
              ref={c.main ? (el) => void (dots.current[c.name] = el) : undefined}
              transform={`translate(${c.p[0]} ${c.p[1]}) rotate(${rot}) scale(${1 / s})`}
              className={c.main ? "map-city" : `map-city-minor ${MOBILE_LABELS.has(c.name) ? "" : "map-city-sm"}`}
            >
              {c.main && <circle r={5} className="map-pulse" />}
              <circle r={c.main ? 4.5 : 2.5} className={c.main ? "map-dot" : "map-dot-minor"} />
              <text {...labelPos(c.name, c.main, rot)} fontSize={c.main ? 12 : 10.5} className={c.main ? "map-label" : "map-label-minor"}>
                {c.name}
              </text>
            </g>
          ))}
          <Marker refFn={(el) => void (icons.current.kr = el)} flip={facesLeft(lines.kr, rot)}>
            <ShipIcon {...icon} fill="var(--ground)" />
          </Marker>
          {/* Колёса стоят на осевой дороги: точка поворота — пятно контакта */}
          <Marker refFn={(el) => void (icons.current.cn = el)}>
            <CarIcon {...icon} y={-24} fill="var(--ground)" />
          </Marker>
          <Marker refFn={(el) => void (icons.current.truck = el)}>
            <TruckIcon {...icon} y={-26} fill="var(--ground)" />
          </Marker>
          <Marker refFn={(el) => void (icons.current.key = el)}>
            <KeyIcon {...icon} width={ICON + 6} height={ICON + 6} x={-(ICON + 6) / 2} y={-(ICON + 6) / 2} fill="var(--key)" className="map-key" />
          </Marker>
        </g>
      </svg>
    </div>
  );
}

// На телефоне карта мелкая: подписываем только города, которые не налезают друг на друга
const MOBILE_LABELS = new Set(["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Иркутск", "Якутск", "Норильск", "Магадан", "Мурманск"]);

// Подписи справа от точки; исключения — где соседи или край экрана
function labelPos(name: string, main: boolean, rot: number): { x: number; y: number; textAnchor: "start" | "middle" | "end" } {
  if (rot && name === "Пусан") return { x: 0, y: 20, textAnchor: "middle" };
  if (rot && name === "Суйфэньхэ") return { x: -9, y: 12, textAnchor: "end" };
  if (rot && main) return { x: -9, y: -6, textAnchor: "end" };
  if (name === "Суйфэньхэ") return { x: -9, y: -7, textAnchor: "end" };
  if (main) return { x: 9, y: name === "Пусан" ? 14 : -7, textAnchor: "start" };
  const side = rot ? undefined : SIDE[name];
  if (side === "left") return { x: -6, y: 3.5, textAnchor: "end" };
  if (side === "above") return { x: 0, y: -7, textAnchor: "middle" };
  if (side === "below") return { x: 0, y: 14, textAnchor: "middle" };
  return { x: 6, y: 3.5, textAnchor: "start" };
}
const SIDE: Record<string, "left" | "above" | "below"> = {
  Самара: "above",
  Волгоград: "below",
  Новосибирск: "below",
  Иркутск: "left",
  "Улан-Удэ": "below",
  "Петропавловск-Камчатский": "left",
};

function Marker({ refFn, flip, children }: { refFn: (el: SVGGElement | null) => void; flip?: boolean; children: React.ReactNode }) {
  return (
    <g ref={refFn} className="map-icon off">
      <g className="map-icon-in" style={flip ? { scale: "-1 1" } : undefined}>
        {children}
      </g>
    </g>
  );
}
