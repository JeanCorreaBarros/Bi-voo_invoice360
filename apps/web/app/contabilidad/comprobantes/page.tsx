"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2, Ban, X, Search, ChevronDown } from "lucide-react"
import { useAiEvent } from "@/hooks/use-ai-event"
import { AiSuggestButton } from "@/components/ai-suggest-button"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

// Debe coincidir con el prompt por defecto del catálogo en
// apps/web/app/configuracion/page.tsx (AI_EVENTS) — se usa aquí solo como
// fallback mientras carga la configuración real del usuario.
const DEFAULT_PROMPT_SUGERENCIA_CUENTA =
  "Con base en la descripción del movimiento, sugiere la cuenta del PUC más adecuada para registrarlo."
const DEFAULT_PROMPT_CLASIFICACION_GASTOS =
  "Analiza la descripción del gasto y determina si debe registrarse como activo fijo (si es un bien duradero) o como gasto del período."

const ENTRY_TYPES = [
  { value: "DIARIO", label: "Comprobante de Diario" },
  { value: "INGRESO", label: "Comprobante de Ingreso" },
  { value: "EGRESO", label: "Comprobante de Egreso" },
  { value: "AJUSTE", label: "Ajuste" },
]

type Account = { id: string; code: string; name: string; allowsEntries: boolean }
type CostCenter = { id: string; code: string; name: string }
type Party = { id: string; name: string; nit: string | null }

type JournalEntry = {
  id: number
  number: number
  type: string
  date: string
  description: string | null
  status: string
  lines: { id: number; debit: string; credit: string; description?: string | null; account: { code: string; name: string } }[]
}

const PAGE_SIZE = 20

type LineForm = {
  accountId: string
  costCenterId: string
  thirdPartyType: "NONE" | "CUSTOMER" | "SUPPLIER" | "OTHER"
  customerId: string
  supplierId: string
  otherThirdPartyName: string
  otherThirdPartyNit: string
  debit: string
  credit: string
  description: string
}

const emptyLine: LineForm = {
  accountId: "",
  costCenterId: "",
  thirdPartyType: "NONE",
  customerId: "",
  supplierId: "",
  otherThirdPartyName: "",
  otherThirdPartyNit: "",
  debit: "",
  credit: "",
  description: "",
}

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

function money(n: number) {
  return `$${Number(n || 0).toLocaleString("es-CO")}`
}

const selectClass =
  "h-10 w-full px-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-900 focus:ring-2 focus:ring-[hsl(209,79%,35%,0.4)] focus:border-[hsl(209,79%,35%)] outline-none"

export default function ComprobantesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [customers, setCustomers] = useState<Party[]>([])
  const [suppliers, setSuppliers] = useState<Party[]>([])

  const [type, setType] = useState("DIARIO")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState("")
  const [lines, setLines] = useState<LineForm[]>([{ ...emptyLine }, { ...emptyLine }])
  const [lineSuggestions, setLineSuggestions] = useState<Record<number, { cuenta?: string; clasificacion?: string }>>({})

  const aiCuenta = useAiEvent("cont_sugerencia_cuenta", DEFAULT_PROMPT_SUGERENCIA_CUENTA)
  const aiGastos = useAiEvent("cont_clasificacion_gastos", DEFAULT_PROMPT_CLASIFICACION_GASTOS)

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchEntries = async (targetPage: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(targetPage) })
      if (search.trim()) params.set("search", search.trim())
      const res = await fetch(`${apiBase}accounting/entries?${params.toString()}`, { headers: authHeaders() })
      const data = await res.json()
      setLastPage(data?.meta?.lastPage ?? 1)
      setPage(targetPage)
      setEntries((prev) => (append ? [...prev, ...(data?.data ?? [])] : data?.data ?? []))
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar comprobantes")
    } finally {
      append ? setLoadingMore(false) : setLoading(false)
    }
  }

  const fetchFormData = async () => {
    try {
      const [accRes, ccRes, custRes, supRes] = await Promise.all([
        fetch(`${apiBase}accounting/accounts?active=true`, { headers: authHeaders() }),
        fetch(`${apiBase}accounting/cost-centers?active=true`, { headers: authHeaders() }),
        fetch(`${apiBase}customers`, { headers: authHeaders() }),
        fetch(`${apiBase}suppliers`, { headers: authHeaders() }),
      ])
      const acc = await accRes.json()
      const cc = await ccRes.json()
      const cust = await custRes.json()
      const sup = await supRes.json()

      setAccounts((acc?.data ?? []).filter((a: Account) => a.allowsEntries))
      setCostCenters(cc?.data ?? [])
      setCustomers(Array.isArray(cust) ? cust : cust?.data ?? [])
      setSuppliers(Array.isArray(sup) ? sup : sup?.data ?? [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchFormData()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchEntries(1, false), 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0)
  const balanced = Math.round(totalDebit * 100) === Math.round(totalCredit * 100) && totalDebit > 0

  const updateLine = (index: number, patch: Partial<LineForm>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }])
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index))

  const resetForm = () => {
    setType("DIARIO")
    setDate(new Date().toISOString().slice(0, 10))
    setDescription("")
    setLines([{ ...emptyLine }, { ...emptyLine }])
    setLineSuggestions({})
  }

  const handleSave = async () => {
    if (!balanced) {
      toast.error("El comprobante no cuadra: los débitos deben ser iguales a los créditos")
      return
    }
    if (lines.some((l) => !l.accountId)) {
      toast.error("Todas las líneas necesitan una cuenta")
      return
    }

    setSaving(true)
    try {
      const payload = {
        type,
        date,
        description: description || undefined,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          costCenterId: l.costCenterId || undefined,
          customerId: l.thirdPartyType === "CUSTOMER" ? l.customerId || undefined : undefined,
          supplierId: l.thirdPartyType === "SUPPLIER" ? l.supplierId || undefined : undefined,
          otherThirdPartyName: l.thirdPartyType === "OTHER" ? l.otherThirdPartyName || undefined : undefined,
          otherThirdPartyNit: l.thirdPartyType === "OTHER" ? l.otherThirdPartyNit || undefined : undefined,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description || undefined,
        })),
      }

      const res = await fetch(`${apiBase}accounting/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al guardar el comprobante")
        return
      }

      toast.success("Comprobante creado")
      setIsModalOpen(false)
      resetForm()
      await fetchEntries(1, false)
    } catch {
      toast.error("Error al guardar el comprobante")
    } finally {
      setSaving(false)
    }
  }

  const handleVoid = async (entry: JournalEntry) => {
    if (!confirm(`¿Anular el comprobante ${entry.type}-${entry.number}?`)) return
    try {
      const res = await fetch(`${apiBase}accounting/entries/${entry.id}/void`, {
        method: "PATCH",
        headers: authHeaders(),
      })
      if (!res.ok) {
        toast.error("Error al anular")
        return
      }
      await fetchEntries(1, false)
      toast.success("Comprobante anulado")
    } catch {
      toast.error("Error al anular")
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Comprobantes Contables</h1>
          <p className="text-sm text-gray-500">Registro manual de movimientos contables</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="h-10 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white flex items-center gap-2 text-sm px-4 rounded-xl"
        >
          <Plus className="h-4 w-4" /> Nuevo Comprobante
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9 h-11 rounded-xl"
          placeholder="Buscar por descripción, número o cuenta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando comprobantes...</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          {search ? `Sin resultados para "${search}"` : "No hay comprobantes registrados todavía"}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
            {entries.map((entry) => {
              const total = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0)
              const expanded = expandedId === entry.id
              return (
                <div key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : entry.id)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      <span className="text-sm font-mono text-gray-700 whitespace-nowrap">{entry.type}-{entry.number}</span>
                      <span className="text-sm text-gray-500 whitespace-nowrap">{new Date(entry.date).toLocaleDateString("es-CO")}</span>
                      <span className="text-sm text-gray-700 truncate hidden sm:inline">{entry.description || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{money(total)}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                          entry.status === "VOID" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {entry.status === "VOID" ? "Anulado" : "Registrado"}
                      </span>
                      {entry.status !== "VOID" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-red-500 hover:bg-red-50"
                          title="Anular"
                          onClick={(e) => { e.stopPropagation(); handleVoid(entry) }}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-5 pb-4 bg-gray-50/60">
                      <p className="text-xs text-gray-500 sm:hidden mb-2">{entry.description || "Sin descripción"}</p>
                      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Cuenta</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Débito</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Crédito</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {entry.lines.map((line) => (
                              <tr key={line.id}>
                                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{line.account.code} - {line.account.name}</td>
                                <td className="px-3 py-2 text-gray-500">{line.description || "—"}</td>
                                <td className="px-3 py-2 text-right text-gray-900">{Number(line.debit) > 0 ? money(Number(line.debit)) : ""}</td>
                                <td className="px-3 py-2 text-right text-gray-900">{Number(line.credit) > 0 ? money(Number(line.credit)) : ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {page < lastPage && (
            <div className="border-t border-gray-100 p-3 text-center">
              <Button variant="ghost" size="sm" disabled={loadingMore} onClick={() => fetchEntries(page + 1, true)}>
                {loadingMore ? "Cargando..." : "Cargar más"}
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1rem)] sm:max-w-3xl max-h-[94dvh] overflow-hidden rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.02)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">Nuevo Comprobante</DialogTitle>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Tipo</Label>
                <select className={selectClass + " h-12 text-sm"} value={type} onChange={(e) => setType(e.target.value)}>
                  {ENTRY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl border-gray-200" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Descripción</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-12 rounded-xl border-gray-200" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Líneas</p>
                <Button variant="ghost" size="sm" onClick={addLine} className="text-[hsl(209,79%,35%)] text-xs h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar línea
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={index} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.2fr_auto] gap-2">
                      <select
                        className={selectClass}
                        value={line.accountId}
                        onChange={(e) => updateLine(index, { accountId: e.target.value })}
                      >
                        <option value="">Cuenta...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                        ))}
                      </select>
                      <select
                        className={selectClass}
                        value={line.costCenterId}
                        onChange={(e) => updateLine(index, { costCenterId: e.target.value })}
                      >
                        <option value="">Centro de costo (opcional)</option>
                        {costCenters.map((c) => (
                          <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:bg-red-50 hover:text-red-500 h-10"
                        disabled={lines.length <= 2}
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        className={selectClass}
                        value={line.thirdPartyType}
                        onChange={(e) => updateLine(index, { thirdPartyType: e.target.value as LineForm["thirdPartyType"] })}
                      >
                        <option value="NONE">Sin tercero</option>
                        <option value="CUSTOMER">Cliente</option>
                        <option value="SUPPLIER">Proveedor</option>
                        <option value="OTHER">Otro</option>
                      </select>

                      {line.thirdPartyType === "CUSTOMER" && (
                        <select
                          className={selectClass + " sm:col-span-2"}
                          value={line.customerId}
                          onChange={(e) => updateLine(index, { customerId: e.target.value })}
                        >
                          <option value="">Seleccionar cliente...</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}{c.nit ? ` (${c.nit})` : ""}</option>
                          ))}
                        </select>
                      )}
                      {line.thirdPartyType === "SUPPLIER" && (
                        <select
                          className={selectClass + " sm:col-span-2"}
                          value={line.supplierId}
                          onChange={(e) => updateLine(index, { supplierId: e.target.value })}
                        >
                          <option value="">Seleccionar proveedor...</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}{s.nit ? ` (${s.nit})` : ""}</option>
                          ))}
                        </select>
                      )}
                      {line.thirdPartyType === "OTHER" && (
                        <>
                          <input
                            placeholder="Nombre"
                            value={line.otherThirdPartyName}
                            onChange={(e) => updateLine(index, { otherThirdPartyName: e.target.value })}
                            className="h-10 px-2 rounded-lg border border-gray-200 text-xs"
                          />
                          <input
                            placeholder="NIT / documento"
                            value={line.otherThirdPartyNit}
                            onChange={(e) => updateLine(index, { otherThirdPartyNit: e.target.value })}
                            className="h-10 px-2 rounded-lg border border-gray-200 text-xs"
                          />
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Débito"
                        value={line.debit}
                        onChange={(e) => updateLine(index, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                        className="h-10 px-2 rounded-lg border border-gray-200 text-sm text-right"
                      />
                      <input
                        type="number"
                        placeholder="Crédito"
                        value={line.credit}
                        onChange={(e) => updateLine(index, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                        className="h-10 px-2 rounded-lg border border-gray-200 text-sm text-right"
                      />
                    </div>

                    <input
                      placeholder="Descripción de la línea (ayuda a la IA a sugerir)"
                      value={line.description}
                      onChange={(e) => updateLine(index, { description: e.target.value })}
                      className="h-10 w-full px-2 rounded-lg border border-gray-200 text-xs"
                    />

                    {(aiCuenta.enabled || aiGastos.enabled) && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex flex-wrap gap-2">
                          {aiCuenta.enabled && (
                            <AiSuggestButton
                              label="Sugerir cuenta"
                              prompt={aiCuenta.prompt}
                              context={line.description}
                              onResult={(text) =>
                                setLineSuggestions((prev) => ({ ...prev, [index]: { ...prev[index], cuenta: text } }))
                              }
                              className="h-8 text-xs"
                            />
                          )}
                          {aiGastos.enabled && (
                            <AiSuggestButton
                              label="¿Activo o gasto?"
                              prompt={aiGastos.prompt}
                              context={line.description}
                              onResult={(text) =>
                                setLineSuggestions((prev) => ({ ...prev, [index]: { ...prev[index], clasificacion: text } }))
                              }
                              className="h-8 text-xs"
                            />
                          )}
                        </div>
                        {lineSuggestions[index]?.cuenta && (
                          <p className="relative text-xs text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5 pr-7">
                            <span className="font-semibold">Cuenta sugerida:</span> {lineSuggestions[index]!.cuenta}
                            <button
                              onClick={() => setLineSuggestions((prev) => ({ ...prev, [index]: { ...prev[index], cuenta: undefined } }))}
                              aria-label="Cerrar"
                              className="absolute top-1 right-1 opacity-60 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </p>
                        )}
                        {lineSuggestions[index]?.clasificacion && (
                          <p className="relative text-xs text-purple-600 bg-purple-50 rounded-lg px-2.5 py-1.5 pr-7">
                            <span className="font-semibold">Clasificación:</span> {lineSuggestions[index]!.clasificacion}
                            <button
                              onClick={() => setLineSuggestions((prev) => ({ ...prev, [index]: { ...prev[index], clasificacion: undefined } }))}
                              aria-label="Cerrar"
                              className="absolute top-1 right-1 opacity-60 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold ${balanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                <span>Débitos: {money(totalDebit)} · Créditos: {money(totalCredit)}</span>
                <span>{balanced ? "Cuadrado ✓" : "No cuadra"}</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !balanced}
              className="flex-[2] h-12 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white font-black rounded-xl disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Comprobante"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
