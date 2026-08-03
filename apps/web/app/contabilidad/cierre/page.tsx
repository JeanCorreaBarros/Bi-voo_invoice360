"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Lock, AlertTriangle, Eye, Printer } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type PeriodClose = {
  id: number
  periodEnd: string
  createdAt: string
  journalEntry: {
    id: number
    number: number
    description: string | null
    lines: { debit: string; credit: string; account: { code: string; name: string } }[]
  }
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number | string) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`
}

export default function CierreContablePage() {
  const [closes, setCloses] = useState<PeriodClose[]>([])
  const [loading, setLoading] = useState(true)
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10))
  const [closing, setClosing] = useState(false)
  const [selected, setSelected] = useState<PeriodClose | null>(null)

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchCloses = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}accounting/period-closes`, { headers: authHeaders() })
      const data = await res.json()
      setCloses(data?.data ?? [])
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar cierres contables")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCloses()
  }, [])

  const handleClose = async () => {
    if (!periodEnd) {
      toast.error("Selecciona una fecha de cierre")
      return
    }
    setClosing(true)
    try {
      const res = await fetch(`${apiBase}accounting/period-closes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ periodEnd }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al cerrar el periodo")
        return
      }
      const netIncome = Number(data.data.netIncome)
      toast.success(
        netIncome >= 0
          ? `Periodo cerrado. Utilidad: ${money(netIncome)}`
          : `Periodo cerrado. Pérdida: ${money(Math.abs(netIncome))}`
      )
      await fetchCloses()
    } catch {
      toast.error("Error al cerrar el periodo")
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cierre Contable</h1>
        <p className="text-sm text-gray-500">
          Lleva a cero las cuentas de ingresos, costos y gastos, y traslada el resultado del periodo a Utilidad/Pérdida del Ejercicio
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Esta acción genera un comprobante contable permanente. Antes de cerrar, verifica el Estado de Resultados del periodo.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 max-w-xs">
          <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Fecha de cierre</Label>
          <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="h-12 rounded-xl border-gray-200" />
        </div>

        <Button
          onClick={handleClose}
          disabled={closing}
          className="h-12 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white font-black rounded-xl px-6 disabled:opacity-50 flex items-center gap-2"
        >
          <Lock className="h-4 w-4" /> {closing ? "Cerrando..." : "Cerrar Periodo"}
        </Button>
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3">Historial de cierres</h2>
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Cargando...</div>
        ) : closes.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No se han registrado cierres contables</div>
        ) : (
          <div className="space-y-3">
            {closes.map((c) => {
              const resultLine = c.journalEntry.lines.find((l) => l.account.name.includes("Ejercicio"))
              const isProfit = resultLine ? Number(resultLine.credit) > 0 : true
              const amount = resultLine ? Number(resultLine.credit) || Number(resultLine.debit) : 0
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      Cierre al {new Date(c.periodEnd).toLocaleDateString("es-CO", { timeZone: "UTC" })}
                    </p>
                    <p className="text-xs text-gray-500">Comprobante N° {c.journalEntry.number} — {c.journalEntry.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black ${isProfit ? "text-emerald-600" : "text-red-600"}`}>
                      {isProfit ? "+" : "-"}{money(amount)}
                    </span>
                    <Button variant="ghost" size="sm" className="rounded-lg text-gray-400 hover:text-[hsl(209,79%,35%)]">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprobante N° {selected?.journalEntry.number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div id="comprobante-print" className="space-y-4">
                <h2 className="font-bold text-gray-900">Comprobante N° {selected.journalEntry.number}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Cierre al</p>
                    <p className="text-gray-800 font-medium">
                      {new Date(selected.periodEnd).toLocaleDateString("es-CO", { timeZone: "UTC" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Descripción</p>
                    <p className="text-gray-800 font-medium">{selected.journalEntry.description}</p>
                  </div>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Cuenta</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Debe</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Haber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selected.journalEntry.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-800">
                            <span className="font-mono text-xs text-gray-400 mr-1">{line.account.code}</span>
                            {line.account.name}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {Number(line.debit) > 0 ? money(Number(line.debit)) : ""}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {Number(line.credit) > 0 ? money(Number(line.credit)) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-100 font-bold">
                        <td className="px-3 py-2 text-gray-700">Total</td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {money(selected.journalEntry.lines.reduce((s, l) => s + Number(l.debit || 0), 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {money(selected.journalEntry.lines.reduce((s, l) => s + Number(l.credit || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <Button
                onClick={() => window.print()}
                className="h-10 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white font-bold rounded-xl px-5 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> Descargar / Imprimir PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
