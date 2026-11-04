"use client";

import { useEffect, useRef, useState } from "react";
import { CarIcon, KeyIcon, ShipIcon, TruckIcon } from "./icons";
import { MAP_H, MAP_W, cities, land, route, russia } from "./map-data";

// Фон-карта: маршрут по карте России, иконка едет со скроллом,
// точки пути привязаны к секциям-этапам через [data-route].
type Pt = [number, number];
type Line = { pts: Pt[]; cum: number[]; total: number };

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
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export default function RouteLine() {
  const [s, setS] = useState(0);
  const world = useRef<SVGGElement>(null);
  const done = useRef<Record<string, SVGPathElement | null>>({});
  const icons = useRef<Record<string, SVGGElement | null>>({});
  const dots = useRef<Record<string, SVGCircleElement | null>>({});

  useEffect(() => {
    const fit = () => setS(Math.max(innerWidth / MAP_W, (innerHeight * 0.92) / MAP_H));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (!s) return;
    const names = ["ports", "vladivostok", "transit", "krasnodar"];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let ys: number[] = [];
    let raf = 0;

    const measure = () => {
      ys = names.map((n) => {
        const el = document.querySelector(`[data-route="${n}"]`);
        return el ? el.getBoundingClientRect().top + scrollY + 40 : 0;
      });
    };

    const update = () => {
      raf = 0;
      if (!world.current || ys.some((y) => !y)) return;
      const [ports, vl, tr, ks] = ys;
      let y = scrollY + innerHeight * 0.55;
      if (reduce.matches) y = Math.max(0, ...ys.filter((v) => v <= y));
      const f = (a: number, b: number) => clamp((y - a) / (b - a), 0, 1);
      const branch = f(ports, vl);
      const trunk = y < tr ? f(vl, tr) * 0.5 : 0.5 + f(tr, ks) * 0.5;
      const onTrunk = y >= vl;
      const finished = y >= ks;

      const kr = walk(lines.kr, branch);
      const cn = walk(lines.cn, branch);
      const tk = walk(lines.trunk, onTrunk ? trunk : 0);
      done.current.kr?.setAttribute("d", kr.d);
      done.current.cn?.setAttribute("d", cn.d);
      done.current.trunk?.setAttribute("d", onTrunk ? tk.d : "");

      const put = (key: string, p: Pt, on: boolean) => {
        const g = icons.current[key];
        if (!g) return;
        g.setAttribute("transform", `translate(${p[0]} ${p[1]}) scale(${1 / s})`);
        g.style.opacity = on ? "1" : "0";
      };
      put("kr", kr.p, !onTrunk);
      put("cn", cn.p, !onTrunk);
      put("truck", tk.p, onTrunk && !finished);
      put("key", tk.p, finished);

      const lit: Record<string, boolean> = {
        Пусан: y >= ports,
        Суйфэньхэ: y >= ports,
        Владивосток: onTrunk,
        Краснодар: finished,
      };
      for (const [name, c] of Object.entries(dots.current)) c?.classList.toggle("on", !!lit[name]);

      // Камера держит активную иконку в кадре, не выходя за края карты
      const focus: Pt = onTrunk ? tk.p : [(kr.p[0] + cn.p[0]) / 2, (kr.p[1] + cn.p[1]) / 2];
      const tx = clamp(innerWidth * 0.5 - focus[0] * s, innerWidth - MAP_W * s, 0);
      const ty =
        MAP_H * s <= innerHeight
          ? (innerHeight - MAP_H * s) / 2
          : clamp(innerHeight * 0.55 - focus[1] * s, innerHeight - MAP_H * s, 0);
      world.current.setAttribute("transform", `translate(${tx} ${ty}) scale(${s})`);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [s]);

  return (
    <div aria-hidden className="map pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {s > 0 && (
        <svg width="100%" height="100%">
          <g ref={world}>
            <path d={land} className="map-land" vectorEffect="non-scaling-stroke" />
            <path d={russia} className="map-russia" vectorEffect="non-scaling-stroke" />
            {(["kr", "cn", "trunk"] as const).map((k) => (
              <g key={k}>
                <path d={poly(route[k])} className="map-route" vectorEffect="non-scaling-stroke" />
                <path ref={(el) => void (done.current[k] = el)} className="map-done" vectorEffect="non-scaling-stroke" />
              </g>
            ))}
            {cities.map((c) => (
              <g key={c.name} transform={`translate(${c.p[0]} ${c.p[1]})`}>
                <circle
                  ref={c.main ? (el) => void (dots.current[c.name] = el) : undefined}
                  r={(c.main ? 4.5 : 2.5) / s}
                  className={c.main ? "map-dot" : "map-dot-minor"}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={(c.name === "Суйфэньхэ" ? -9 : 9) / s}
                  y={(c.name === "Пусан" ? 14 : -7) / s}
                  textAnchor={c.name === "Суйфэньхэ" ? "end" : "start"}
                  fontSize={(c.main ? 12 : 10.5) / s}
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
      )}
    </div>
  );
}

function Marker({ refFn, keyIcon, children }: { refFn: (el: SVGGElement | null) => void; keyIcon?: boolean; children: React.ReactNode }) {
  return (
    <g ref={refFn} className={`map-icon ${keyIcon ? "map-key" : ""}`} style={{ opacity: 0 }}>
      <circle r={19} />
      {children}
    </g>
  );
}
