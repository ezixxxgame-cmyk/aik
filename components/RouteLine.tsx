"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CarIcon, KeyIcon, ShipIcon, TruckIcon } from "./icons";

// Фоновый маршрут: читает точки [data-route] внутри родителя и ведёт иконку по скроллу.
type Pt = { x: number; y: number };
type Geo = {
  w: number;
  h: number;
  kr: Pt[];
  cn: Pt[];
  trunk: Pt[];
  stops: { name: string; label: string; p: Pt; side: 1 | -1 }[];
};

const curve = (pts: Pt[]) =>
  pts.reduce((d, p, i) => {
    if (i === 0) return `M${p.x} ${p.y}`;
    const a = pts[i - 1];
    const m = (p.y - a.y) / 2;
    return `${d} C${a.x} ${a.y + m} ${p.x} ${p.y - m} ${p.x} ${p.y}`;
  }, "");

type Sample = { l: number; x: number; y: number };
const sample = (path: SVGPathElement): Sample[] => {
  const total = path.getTotalLength();
  const out: Sample[] = [];
  for (let l = 0; l <= total; l += 6) {
    const p = path.getPointAtLength(l);
    out.push({ l, x: p.x, y: p.y });
  }
  const end = path.getPointAtLength(total);
  out.push({ l: total, x: end.x, y: end.y });
  return out;
};
const atY = (s: Sample[], y: number) => s.find((p) => p.y >= y) ?? s[s.length - 1];

export default function RouteLine() {
  const svg = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const done = useRef<Record<string, SVGPathElement | null>>({});
  const icons = useRef<Record<string, SVGGElement | null>>({});
  const dots = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const host = svg.current?.parentElement;
    if (!host) return;
    const measure = () => {
      const box = host.getBoundingClientRect();
      const md = window.innerWidth >= 768;
      const pt = (el: Element): Pt => {
        const r = el.getBoundingClientRect();
        const f = Number((el as HTMLElement).dataset[md ? "xMd" : "x"] ?? 0.5);
        return { x: Math.round(box.width * f), y: Math.round(r.top - box.top + (md ? 34 : 22)) };
      };
      const get = (n: string) => host.querySelector(`[data-route="${n}"]`);
      const names = ["ports", "vladivostok", "transit", "krasnodar"] as const;
      const els = names.map(get);
      const origin = get("origin");
      if (!origin || els.some((e) => !e)) return;
      const [ports, vl, tr, ks] = els.map((e) => pt(e!));
      const o = origin.getBoundingClientRect().top - box.top;
      const w = box.width;
      const kr = [{ x: w * (md ? 0.025 : 0.05), y: o }, { x: w * (md ? 0.035 : 0.08), y: ports.y }, vl];
      const cn = [{ x: w * (md ? 0.975 : 0.95), y: o }, { x: w * (md ? 0.965 : 0.92), y: ports.y }, vl];
      setGeo({
        w,
        h: box.height,
        kr,
        cn,
        trunk: [vl, tr, ks],
        stops: [
          { name: "Пусан", label: "kr", p: kr[1], side: 1 },
          { name: "Суйфэньхэ", label: "cn", p: cn[1], side: -1 },
          { name: "Владивосток", label: "vl", p: vl, side: vl.x > w / 2 ? -1 : 1 },
          { name: "В пути", label: "tr", p: tr, side: tr.x > w / 2 ? -1 : 1 },
          { name: "Краснодар", label: "ks", p: ks, side: ks.x > w / 2 ? -1 : 1 },
        ],
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!geo || !svg.current) return;
    const s = {
      kr: sample(paths.current.kr!),
      cn: sample(paths.current.cn!),
      trunk: sample(paths.current.trunk!),
    };
    const merge = geo.trunk[0].y;
    const krasnodar = geo.trunk[2].y;
    const stopYs = geo.stops.map((st) => st.p.y);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const place = (key: "kr" | "cn" | "trunk", y: number, visible: boolean) => {
      const p = atY(s[key], y);
      const g = icons.current[key];
      if (g) {
        g.setAttribute("transform", `translate(${p.x} ${p.y})`);
        g.style.opacity = visible ? "1" : "0";
      }
      const d = done.current[key];
      const total = s[key][s[key].length - 1].l;
      if (d) {
        d.style.strokeDasharray = String(total);
        d.style.strokeDashoffset = String(total - p.l);
      }
    };

    const update = () => {
      raf = 0;
      const top = svg.current!.getBoundingClientRect().top;
      let y = innerHeight * 0.55 - top;
      if (reduce.matches) y = Math.max(geo.kr[0].y, ...stopYs.filter((v) => v <= y));
      place("kr", Math.min(y, merge), y < merge);
      place("cn", Math.min(y, merge), y < merge);
      place("trunk", Math.max(merge, Math.min(y, krasnodar)), y >= merge);
      const finished = y >= krasnodar;
      icons.current.truck?.style.setProperty("opacity", finished ? "0" : "1");
      icons.current.key?.style.setProperty("opacity", finished ? "1" : "0");
      dots.current.forEach((c, i) => c?.classList.toggle("on", stopYs[i] <= y + 1));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [geo]);

  const lines = geo && { kr: curve(geo.kr), cn: curve(geo.cn), trunk: curve(geo.trunk) };

  return (
    <svg
      ref={svg}
      aria-hidden
      className="route pointer-events-none absolute inset-0 z-0 h-full w-full"
      width={geo?.w}
      height={geo?.h}
    >
      {geo && lines && (
        <>
          {(["kr", "cn", "trunk"] as const).map((k) => (
            <g key={k}>
              <path ref={(el) => void (paths.current[k] = el)} d={lines[k]} className="route-base" />
              <path
                ref={(el) => void (done.current[k] = el)}
                d={lines[k]}
                className="route-done"
                style={{ strokeDasharray: 0 }}
              />
            </g>
          ))}
          {geo.stops.map((st, i) => (
            <g key={st.label} transform={`translate(${st.p.x} ${st.p.y})`}>
              <circle ref={(el) => void (dots.current[i] = el)} r={5} className="route-dot" />
              {i > 1 && (
                <text
                  x={st.side * 12}
                  y={-10}
                  textAnchor={st.side > 0 ? "start" : "end"}
                  className="route-label"
                >
                  {st.name}
                </text>
              )}
            </g>
          ))}
          {/* Порты подписаны вдоль линии у края, чтобы не налезать на текст */}
          {[geo.kr, geo.cn].map((b, i) => (
            <text
              key={i}
              transform={`translate(${(b[0].x + b[1].x) / 2} ${(b[0].y + b[1].y) / 2}) rotate(${i ? 90 : -90})`}
              y={15}
              textAnchor="middle"
              className="route-label"
            >
              {geo.stops[i].name}
            </text>
          ))}
          <Marker refFn={(el) => void (icons.current.kr = el)}>
            <ShipIcon x={-12} y={-12} />
          </Marker>
          <Marker refFn={(el) => void (icons.current.cn = el)}>
            <CarIcon x={-12} y={-12} />
          </Marker>
          <Marker refFn={(el) => void (icons.current.trunk = el)}>
            <g ref={(el) => void (icons.current.truck = el)} className="route-swap">
              <TruckIcon x={-12} y={-12} />
            </g>
            <g ref={(el) => void (icons.current.key = el)} className="route-swap route-key" style={{ opacity: 0 }}>
              <KeyIcon x={-12} y={-12} />
            </g>
          </Marker>
        </>
      )}
    </svg>
  );
}

function Marker({ refFn, children }: { refFn: (el: SVGGElement | null) => void; children: React.ReactNode }) {
  return (
    <g ref={refFn} className="route-icon">
      <circle r={20} />
      {children}
    </g>
  );
}
