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

const prep = (pts: Pt[]): Line => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, total: cum[cum.length - 1] };
};
const lines = { kr: prep(route.kr), cn: prep(route.cn), trunk: prep(route.trunk) };

// Точка на ломаной и пройденная часть пути для доли t
const walk = ({ pts, cum, total }: Line, t: number) => {
  const l = Math.min(Math.max(t, 0), 1) * total;
  let i = 1;
  while (i < pts.length - 1 && cum[i] < l) i++;
  const k = (l - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const p: Pt = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
  const d = "M" + [...pts.slice(0, i), p].map((q) => q.join(" ")).join("L");
  return { p, d };
};

const poly = (pts: Pt[]) => "M" + pts.map((q) => q.join(" ")).join("L");

// Доля скролла, на которой морская/китайская ветка доходит до Владивостока
const BRANCH = 0.2;
// Точки остановки для prefers-reduced-motion: порты, Владивосток, в пути, Краснодар
const STOPS = [0, BRANCH, 0.6, 1];

export default function RouteLine() {
  const [view, setView] = useState<View | null>(null);
  const done = useRef<Record<string, SVGPathElement | null>>({});
  const icons = useRef<Record<string, SVGGElement | null>>({});
  const dots = useRef<Record<string, SVGCircleElement | null>>({});

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

    const update = () => {
      raf = 0;
      const lead = document.getElementById("lead");
      const max = lead
        ? lead.getBoundingClientRect().top + scrollY - innerHeight
        : document.documentElement.scrollHeight - innerHeight;
      let p = max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0;
      if (reduce.matches) p = Math.max(...STOPS.filter((v) => v <= p + 0.001));
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
        g.style.opacity = on ? "1" : "0";
      };
      put("kr", kr.p, !onTrunk);
      put("cn", cn.p, !onTrunk);
      put("truck", tk.p, onTrunk && !finished);
      put("key", tk.p, finished);

      const lit: Record<string, boolean> = {
        Пусан: true,
        Суйфэньхэ: true,
        Владивосток: onTrunk,
        Краснодар: finished,
      };
      for (const [name, c] of Object.entries(dots.current)) c?.classList.toggle("on", !!lit[name]);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
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

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg width="100%" height="100%">
        <g transform={`translate(${tx} ${ty}) rotate(${-rot}) scale(${s})`}>
          <path d={land} className="map-land" vectorEffect="non-scaling-stroke" />
          <path d={russia} className="map-russia" vectorEffect="non-scaling-stroke" />
          {(["kr", "cn", "trunk"] as const).map((k) => (
            <g key={k}>
              <path d={poly(route[k])} className="map-route" vectorEffect="non-scaling-stroke" />
              <path ref={(el) => void (done.current[k] = el)} className="map-done" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {cities.map((c) => (
            <g key={c.name} transform={`translate(${c.p[0]} ${c.p[1]}) rotate(${rot}) scale(${1 / s})`}>
              <circle
                ref={c.main ? (el) => void (dots.current[c.name] = el) : undefined}
                r={c.main ? 4.5 : 2.5}
                className={c.main ? "map-dot" : "map-dot-minor"}
              />
              <text {...labelPos(c.name, c.main, rot)}
                fontSize={c.main ? 12 : 10.5}
                className={c.main ? "map-label" : "map-label-minor"}
              >
                {c.name}
              </text>
            </g>
          ))}
          <Marker refFn={(el) => void (icons.current.kr = el)}><ShipIcon x={-12} y={-12} /></Marker>
          <Marker refFn={(el) => void (icons.current.cn = el)}><CarIcon x={-12} y={-12} /></Marker>
          <Marker refFn={(el) => void (icons.current.truck = el)}><TruckIcon x={-12} y={-12} /></Marker>
          <Marker refFn={(el) => void (icons.current.key = el)} keyIcon><KeyIcon x={-12} y={-12} /></Marker>
        </g>
      </svg>
    </div>
  );
}

// На вертикальной карте порты у правого края — подписи уходят влево
function labelPos(name: string, main: boolean, rot: number): { x: number; y: number; textAnchor: "start" | "middle" | "end" } {
  if (rot && name === "Пусан") return { x: 0, y: 20, textAnchor: "middle" };
  if (rot && name === "Суйфэньхэ") return { x: -9, y: 12, textAnchor: "end" };
  if (rot && main) return { x: -9, y: -6, textAnchor: "end" };
  if (name === "Суйфэньхэ") return { x: -9, y: -7, textAnchor: "end" };
  return { x: 9, y: name === "Пусан" ? 14 : -7, textAnchor: "start" };
}

function Marker({ refFn, keyIcon, children }: { refFn: (el: SVGGElement | null) => void; keyIcon?: boolean; children: React.ReactNode }) {
  return (
    <g ref={refFn} className={`map-icon ${keyIcon ? "map-key" : ""}`} style={{ opacity: 0 }}>
      <circle r={19} />
      {children}
    </g>
  );
}
