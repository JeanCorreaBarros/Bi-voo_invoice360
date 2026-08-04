"use client"

import { useState } from "react"
import { ChevronDown, AlertTriangle, BookOpen } from "lucide-react"

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

function AccordionItem({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-semibold text-gray-800">{topic.title}</span>
          {topic.status === "pendiente" && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
              Pendiente DIAN
            </span>
          )}
          {topic.status === "activo" && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              Disponible
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-2.5">
          {topic.content.map((p, i) => (
            <p key={i} className="text-sm text-gray-600 leading-relaxed">{p}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocumentacionPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gray-400" /> Documentación
        </h1>
        <p className="text-sm text-gray-500">Facturación electrónica, DIAN y contabilidad: qué hace Bi360 hoy y qué falta</p>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 text-amber-700 text-xs rounded-xl px-4 py-3">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>La transmisión electrónica directa a la DIAN (facturas, notas, documento soporte) todavía no está conectada. Mira el primer tema de esta lista para el detalle.</p>
      </div>

      <div className="space-y-2.5">
        {TOPICS.map((t) => (
          <AccordionItem key={t.id} topic={t} />
        ))}
      </div>
    </div>
  )
}
