"use client"

import { useMemo, useState } from "react"
import {
  ChevronDown, AlertTriangle, BookOpen, FileSpreadsheet, FileText,
  Download, Search, ExternalLink, FolderOpen,
  Activity, Key, FileEdit, ShieldCheck, Files, Calculator, ArrowRightLeft, Lock, TrendingUp, HelpCircle
} from "lucide-react"
import { DOCUMENTS, CATEGORY_LABELS, DOC_SOURCE, type DocCategory, type DocFormat } from "./formularios"

type Topic = {
  id: string
  title: string
  status?: "activo" | "pendiente"
  content: string[]
}

const TOPICS: Topic[] = [
  {
    id: "dian-estado",
    title: "Conexión con la DIAN: estado actual",
    status: "pendiente",
    content: [
      "Bi360 todavía NO transmite facturas electrónicas, notas o documentos soporte directamente a la DIAN. Cada factura se genera y se guarda en el sistema, pero el CUFE y el estado \"aprobado por la DIAN\" no reflejan una validación real todavía.",
      "Para habilitar la transmisión real hay dos caminos: (1) contratar un proveedor tecnológico autorizado (Factus, Siigo, Alegra, ThePower, entre otros) que reciba las facturas desde Bi360 vía API y las envíe firmadas a la DIAN, o (2) certificarse directamente como facturador electrónico ante la DIAN (requiere certificado digital, Software ID y Software PIN propios).",
      "Mientras tanto, todos los demás módulos (contabilidad, notas crédito/débito, documento soporte, inventario, tesorería) funcionan de forma completa e independiente para la operación interna del negocio.",
    ],
  },
  {
    id: "cufe",
    title: "¿Qué es el CUFE?",
    content: [
      "El CUFE (Código Único de Facturación Electrónica) es un hash SHA-384 que identifica de forma única cada factura electrónica ante la DIAN. Se calcula a partir de los datos de la factura, la fecha, el software y la clave técnica asignada por la DIAN al facturador.",
      "Solo puede generarse un CUFE válido cuando la factura se transmite y es validada por la DIAN o por un proveedor tecnológico autorizado — no es un número que se pueda inventar localmente.",
    ],
  },
  {
    id: "notas",
    title: "Notas Crédito y Débito",
    status: "activo",
    content: [
      "Las Notas Crédito permiten anular total o parcialmente una factura (por devolución, descuento posterior o error), devuelven el inventario afectado y reducen el saldo pendiente de la factura original.",
      "Las Notas Débito incrementan el valor de una factura ya emitida (por ejemplo, intereses de mora o cobros adicionales) y no afectan el inventario.",
      "Ambas funcionan hoy de forma interna en Bi360 (módulo Notas Crédito / Notas Débito). Su transmisión electrónica a la DIAN queda sujeta a la conexión descrita arriba.",
    ],
  },
  {
    id: "doc-soporte",
    title: "Documento Soporte",
    status: "activo",
    content: [
      "El Documento Soporte (Resolución DIAN 000167 de 2021) lo debe generar el comprador cuando compra bienes o servicios a un proveedor que NO está obligado a facturar electrónicamente (por ejemplo, una persona natural no registrada).",
      "En Bi360 puedes registrar estos documentos desde el módulo Documento Soporte con los datos del proveedor, el concepto y el valor — quedan como respaldo interno de la compra mientras se habilita la transmisión electrónica a la DIAN.",
    ],
  },
  {
    id: "exogena",
    title: "Información Exógena",
    status: "pendiente",
    content: [
      "Es el reporte anual que ciertos contribuyentes deben presentar a la DIAN detallando ingresos, costos, gastos, retenciones y terceros con quienes se transaccionó durante el año.",
      "Bi360 ya registra toda la información contable necesaria (facturas, compras, pagos, terceros) para poder construir este reporte en una fase posterior; falta el módulo que lo consolide en el formato exigido por la DIAN.",
    ],
  },
  {
    id: "renta",
    title: "Declaración de Renta",
    status: "pendiente",
    content: [
      "Es el impuesto anual sobre las utilidades de la empresa. Su cálculo depende de reglas tributarias específicas (deducciones, rentas exentas, régimen tributario) que deben ser validadas siempre por un contador o revisor fiscal antes de presentarse.",
      "Un borrador asistido por IA está planeado como apoyo de referencia — nunca reemplazará la revisión profesional obligatoria.",
    ],
  },
  {
    id: "conciliacion",
    title: "Conciliación Bancaria",
    status: "activo",
    content: [
      "Desde Contabilidad → Conciliación Bancaria puedes registrar una conciliación puntual (saldo del extracto vs. saldo contable a una fecha) o importar un archivo CSV de tu extracto (columnas: fecha, descripción, monto).",
      "El sistema cruza automáticamente cada línea del extracto contra tus comprobantes contables (con una tolerancia de 5 días y $1 de diferencia por redondeo) y te muestra qué movimientos ya tienen soporte contable, cuáles no aparecen en libros y cuáles del extracto no tienen comprobante.",
    ],
  },
  {
    id: "cierre",
    title: "Cierre Contable",
    status: "activo",
    content: [
      "El cierre de un período contable calcula la utilidad o pérdida del ejercicio, la traslada a Resultados Acumulados y bloquea la creación de nuevos comprobantes con fecha dentro de ese período (para proteger la información ya cerrada).",
      "Puedes consultar y descargar el comprobante de cualquier cierre anterior desde el módulo Cierre Contable.",
    ],
  },
  {
    id: "indicadores",
    title: "Indicadores Financieros",
    status: "activo",
    content: [
      "Calculados en vivo a partir del Balance General y el Estado de Resultados: liquidez (razón corriente, prueba ácida, capital de trabajo), endeudamiento (nivel de endeudamiento, endeudamiento patrimonial) y rentabilidad (margen bruto, margen neto, ROA, ROE).",
      "El plan de cuentas colombiano estándar no separa corto y largo plazo con códigos distintos, así que el activo/pasivo \"corriente\" se aproxima por clase de cuenta — trátalos como una guía de gestión, no como un dictamen contable formal.",
    ],
  },
]

const TOPIC_ICONS: Record<string, any> = {
  "dian-estado": Activity,
  "cufe": Key,
  "notas": FileEdit,
  "doc-soporte": ShieldCheck,
  "exogena": Files,
  "renta": Calculator,
  "conciliacion": ArrowRightLeft,
  "cierre": Lock,
  "indicadores": TrendingUp,
}

function AccordionItem({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false)
  const Icon = TOPIC_ICONS[topic.id] || HelpCircle

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-200 bg-white ${
      open
        ? "border-blue-100 shadow-md ring-1 ring-blue-50/50"
        : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
    }`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
            open
              ? "bg-blue-50 text-[hsl(209,79%,35%)] border-blue-100"
              : "bg-gray-50 text-gray-400 border-gray-100"
          }`}>
            <Icon className="h-4.5 w-4.5" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
            <span className={`text-sm font-bold transition-colors ${open ? "text-[hsl(209,79%,35%)]" : "text-gray-800"}`}>
              {topic.title}
            </span>
            <div className="flex items-center gap-2">
              {topic.status === "pendiente" && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  Pendiente DIAN
                </span>
              )}
              {topic.status === "activo" && (
                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Disponible
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${open ? "bg-blue-50 text-[hsl(209,79%,35%)]" : "text-gray-400"}`}>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-3 pl-[56px] border-t border-gray-50/80">
          {topic.content.map((p, i) => (
            <p key={i} className="text-sm text-gray-600 leading-relaxed">{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}

const FORMAT_STYLES: Record<DocFormat, { label: string; className: string; Icon: typeof FileText }> = {
  xlsx: { label: "Excel", className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: FileSpreadsheet },
  xls:  { label: "Excel", className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: FileSpreadsheet },
  docx: { label: "Word",  className: "bg-blue-50 text-blue-700 border-blue-200",          Icon: FileText },
  pdf:  { label: "PDF",   className: "bg-red-50 text-red-600 border-red-200",             Icon: FileText },
}

function DocCard({ doc }: { doc: (typeof DOCUMENTS)[number] }) {
  const style = FORMAT_STYLES[doc.format]
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="space-y-4">
        {/* Top: Icon, Code & Badge */}
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110 ${style.className}`}>
            <style.Icon className="h-5 w-5" />
          </div>
          <div className="flex gap-1.5 items-center">
            {doc.code && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-gray-500 shadow-sm">
                N° {doc.code}
              </span>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${style.className}`}>
              {style.label}
            </span>
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-1">
          <h3 className="font-bold text-sm text-gray-800 leading-snug group-hover:text-[hsl(209,79%,35%)] transition-colors line-clamp-2">
            {doc.title}
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            {doc.description || "Formulario o formato oficial para descarga directa."}
          </p>
        </div>
      </div>

      {/* Bottom Download Info */}
      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-[11px] font-semibold text-gray-400 group-hover:text-[hsl(209,79%,35%)] transition-colors">
        <span>Descargar</span>
        <Download className="h-4 w-4 text-gray-300 group-hover:text-[hsl(209,79%,35%)] shrink-0 transition-colors" />
      </div>
    </a>
  )
}

function FormulariosTab() {
  const [search, setSearch] = useState("")

  const normalize = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

  const byCategory = useMemo(() => {
    const q = normalize(search.trim())
    const filtered = q
      ? DOCUMENTS.filter((d) =>
          normalize(`${d.code || ""} ${d.title} ${d.description || ""}`).includes(q)
        )
      : DOCUMENTS

    const groups: Record<DocCategory, typeof DOCUMENTS> = {
      formularios: [], liquidadores: [], formatos: [],
    }
    filtered.forEach((d) => groups[d.category].push(d))
    return groups
  }, [search])

  const totalFound = Object.values(byCategory).reduce((n, list) => n + list.length, 0)

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número o nombre: 300, IVA, retención, nómina..."
          className="w-full h-11 pl-10 pr-4 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[hsl(209,79%,35%)] outline-none text-sm"
        />
      </div>

      {totalFound === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <FolderOpen className="h-10 w-10 text-gray-300 mb-2" />
          <p className="font-semibold text-gray-700">Sin resultados</p>
          <p className="text-sm text-gray-400 mt-1">Prueba con otro número de formulario o palabra clave</p>
        </div>
      ) : (
        (Object.keys(CATEGORY_LABELS) as DocCategory[]).map((cat) => {
          const docs = byCategory[cat]
          if (docs.length === 0) return null
          return (
            <div key={cat} className="space-y-3">
              <div className="border-b border-gray-100 pb-2">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  {CATEGORY_LABELS[cat].label}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {docs.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{CATEGORY_LABELS[cat].hint}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {docs.map((doc) => (
                  <DocCard key={`${doc.url}-${doc.title}`} doc={doc} />
                ))}
              </div>
            </div>
          )
        })
      )}

      <div className="flex items-start gap-2 bg-gray-50 text-gray-500 text-xs rounded-xl px-4 py-3">
        <ExternalLink className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Los archivos se descargan desde{" "}
          <a href={DOC_SOURCE.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[hsl(209,79%,35%)] hover:underline">
            {DOC_SOURCE.name}
          </a>
          , que los mantiene actualizados por año gravable. Bi360 no aloja copias para que nunca queden desactualizados.
          Verifica siempre con tu contador que el formulario corresponda al periodo que vas a declarar.
        </p>
      </div>
    </div>
  )
}

export default function DocumentacionPage() {
  const [tab, setTab] = useState<"guias" | "formularios">("guias")

  return (
    <div className="w-full space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gray-400" /> Documentación
        </h1>
        <p className="text-sm text-gray-500">Guías del sistema y formularios oficiales de la DIAN listos para descargar</p>
      </div>

      <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1.5 w-fit shadow-sm">
        {([
          { id: "guias", label: "Guías", icon: BookOpen },
          { id: "formularios", label: `Formularios y formatos (${DOCUMENTS.length})`, icon: FolderOpen },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === id
                ? "bg-[hsl(209,79%,35%)] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "guias" ? (
        <div className="w-full space-y-5">
          <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-amber-50/40 border border-amber-100 text-amber-800 text-xs rounded-2xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-amber-900">Nota sobre Transmisión Electrónica</p>
              <p className="text-amber-700/90 leading-relaxed">
                La transmisión electrónica directa a la DIAN (facturas, notas, documento soporte) todavía no está conectada. Mira el primer tema de esta lista para ver el detalle y las alternativas vigentes.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {TOPICS.map((t) => (
              <AccordionItem key={t.id} topic={t} />
            ))}
          </div>
        </div>
      ) : (
        <FormulariosTab />
      )}
    </div>
  )
}
