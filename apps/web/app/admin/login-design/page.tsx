"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Rocket, ShieldAlert, Copy, Smartphone, Monitor, RotateCcw } from "lucide-react";

/* ─────────────────────────────────────────────
   Misma geometría que components/login-page.tsx
   (duplicada a propósito: esto es un laboratorio
   de diseño desconectado del login real; cuando
   elijas los valores, los llevo a mano al archivo
   final).
───────────────────────────────────────────── */

function smoothPath(points: [number, number][]) {
  let d = `${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

type WaveLayer = {
  name: string;
  base: number;
  a1: number;
  f1: number;
  p1: number;
  a2: number;
  f2: number;
  p2: number;
  color: string;
};

function waveDepth(l: WaveLayer, t: number) {
  return (
    l.base +
    l.a1 * Math.sin(2 * Math.PI * l.f1 * t + l.p1) +
    l.a2 * Math.sin(2 * Math.PI * l.f2 * t + l.p2)
  );
}

const POINTS = 40;
const VIEW = 760;

function verticalWavePath(l: WaveLayer, viewH: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= POINTS; i++) {
    const t = i / POINTS;
    pts.push([100 - waveDepth(l, t), t * viewH]);
  }
  const top = pts[0][1];
  const bottom = pts[pts.length - 1][1];
  return `M100,${top.toFixed(2)} L${smoothPath(pts)} L100,${bottom.toFixed(2)} Z`;
}

function horizontalWavePath(l: WaveLayer, viewW: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= POINTS; i++) {
    const t = i / POINTS;
    pts.push([t * viewW, 100 - waveDepth(l, t)]);
  }
  const left = pts[0][0];
  const right = pts[pts.length - 1][0];
  return `M${left.toFixed(2)},100 L${smoothPath(pts)} L${right.toFixed(2)},100 Z`;
}

const DEFAULT_LAYERS: WaveLayer[] = [
  { name: "Atrás", base: 23, a1: 8, f1: 2.5, p1: 3.5, a2: 3, f2: 0.8, p2: 3.3, color: "hsl(217,72%,24%)" },
  { name: "Media", base: 20, a1: 4, f1: 1.6, p1: 1.6, a2: 7, f2: 3.7, p2: 1.9, color: "hsl(211,74%,42%)" },
  { name: "Adelante", base: 14, a1: 5, f1: 2, p1: 3.7, a2: 6, f2: 4.1, p2: 2.4, color: "#ffffff" },
];

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500">
        {label} ({step < 1 ? value.toFixed(1) : value})
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[hsl(213,88%,52%)]"
      />
    </div>
  );
}

export default function LoginDesignLab() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [layers, setLayers] = useState<WaveLayer[]>(DEFAULT_LAYERS);

  useEffect(() => {
    try {
      const permissions: string[] = JSON.parse(localStorage.getItem("permissions") || "[]");
      setAuthorized(permissions.includes("company.manage"));
    } catch {
      setAuthorized(false);
    }
  }, []);

  const updateLayer = (idx: number, patch: Partial<WaveLayer>) => {
    setLayers((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const reset = () => setLayers(DEFAULT_LAYERS);

  const paths = useMemo(
    () =>
      layers.map((l) =>
        orientation === "vertical" ? verticalWavePath(l, VIEW) : horizontalWavePath(l, VIEW)
      ),
    [layers, orientation]
  );

  const snippet = useMemo(() => {
    const lines = layers.map(
      (l) =>
        `  { base: ${l.base}, a1: ${l.a1}, f1: ${l.f1}, p1: ${l.p1}, a2: ${l.a2}, f2: ${l.f2}, p2: ${l.p2}, color: "${l.color}" },`
    );
    return `const LAYERS: WaveLayer[] = [\n${lines.join("\n")}\n]`;
  }, [layers]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Configuración copiada");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  if (authorized === null) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Verificando acceso...</div>;
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-red-300" />
        <h1 className="text-lg font-bold text-gray-800">Acceso restringido</h1>
        <p className="text-sm text-gray-500 max-w-sm">Esta sección es exclusiva para SUPER_ADMIN.</p>
        <Button onClick={() => router.push("/")} className="bg-blue-950 hover:bg-blue-800 text-white rounded-xl">
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      <DashboardHeader />

      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Diseño del login — nubes</h1>
              <p className="text-sm text-gray-500">
                Ondas suaves (spline), igual que el login real. Mueve los controles y cuando
                quede bien, dale a "Copiar configuración" y pásamela.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="text-gray-500 shrink-0">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restablecer
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
            {/* ── Vista previa ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={orientation === "vertical" ? "default" : "outline"}
                  size="sm"
                  className={orientation === "vertical" ? "bg-blue-950 hover:bg-blue-800" : ""}
                  onClick={() => setOrientation("vertical")}
                >
                  <Monitor className="h-4 w-4 mr-1.5" /> Desktop
                </Button>
                <Button
                  variant={orientation === "horizontal" ? "default" : "outline"}
                  size="sm"
                  className={orientation === "horizontal" ? "bg-blue-950 hover:bg-blue-800" : ""}
                  onClick={() => setOrientation("horizontal")}
                >
                  <Smartphone className="h-4 w-4 mr-1.5" /> Mobile
                </Button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                {orientation === "vertical" ? (
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[hsl(213,85%,48%)] to-[hsl(214,84%,32%)] h-[520px] flex flex-col items-center justify-center gap-4 text-white">
                    <svg
                      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[62%]"
                      viewBox={`0 0 100 ${VIEW}`}
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      {paths.map((d, i) => (
                        <path key={i} d={d} fill={layers[i].color} />
                      ))}
                    </svg>
                    <div className="relative z-10 flex flex-col items-center gap-3 pr-[30%]">
                      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl">
                        <Rocket className="h-9 w-9 text-[hsl(213,88%,45%)]" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-bold">Bi360</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[hsl(213,85%,48%)] to-[hsl(214,84%,32%)] h-[220px] flex flex-col items-center justify-center gap-3 text-white">
                    <svg
                      className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-[75%]"
                      viewBox={`0 0 ${VIEW} 100`}
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      {paths.map((d, i) => (
                        <path key={i} d={d} fill={layers[i].color} />
                      ))}
                    </svg>
                    <div className="relative z-10 flex flex-col items-center gap-2 pb-[35%]">
                      <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-xl">
                        <Rocket className="h-6 w-6 text-[hsl(213,88%,45%)]" strokeWidth={1.5} />
                      </div>
                      <p className="text-xs font-bold">Bi360</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Configuración</p>
                  <Button variant="ghost" size="sm" onClick={copySnippet} className="h-7 px-2 text-blue-600">
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                  </Button>
                </div>
                <pre className="text-[11px] leading-relaxed bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600">
                  {snippet}
                </pre>
              </div>
            </div>

            {/* ── Controles ── */}
            <div className="space-y-4">
              {layers.map((layer, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                  <p className="text-sm font-bold text-gray-800">
                    Capa {idx + 1} — {layer.name}
                  </p>

                  <div>
                    <label className="text-xs font-medium text-gray-500">Color (sólido)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={/^#/.test(layer.color) ? layer.color : "#ffffff"}
                        onChange={(e) => updateLayer(idx, { color: e.target.value })}
                        className="h-9 w-12 rounded-md border border-gray-200 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={layer.color}
                        onChange={(e) => updateLayer(idx, { color: e.target.value })}
                        className="flex-1 h-9 px-2 rounded-md border border-gray-200 text-xs font-mono"
                        placeholder="hsl(...) o #rrggbb"
                      />
                    </div>
                  </div>
                  <Slider
                    label="Profundidad base"
                    value={layer.base}
                    min={5}
                    max={70}
                    onChange={(v) => updateLayer(idx, { base: v })}
                  />

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Onda principal
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Slider label="Amplitud" value={layer.a1} min={0} max={35} onChange={(v) => updateLayer(idx, { a1: v })} />
                      <Slider label="Frecuencia" value={layer.f1} min={0.3} max={6} step={0.1} onChange={(v) => updateLayer(idx, { f1: v })} />
                      <Slider label="Fase" value={layer.p1} min={0} max={6.28} step={0.1} onChange={(v) => updateLayer(idx, { p1: v })} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Onda secundaria (textura)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Slider label="Amplitud" value={layer.a2} min={0} max={20} onChange={(v) => updateLayer(idx, { a2: v })} />
                      <Slider label="Frecuencia" value={layer.f2} min={0.3} max={8} step={0.1} onChange={(v) => updateLayer(idx, { f2: v })} />
                      <Slider label="Fase" value={layer.p2} min={0} max={6.28} step={0.1} onChange={(v) => updateLayer(idx, { p2: v })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
