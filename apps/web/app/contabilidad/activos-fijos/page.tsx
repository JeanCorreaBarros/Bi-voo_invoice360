"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Plus, TrendingDown } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Account = { id: string; code: string; name: string }
type FixedAsset = {
  id: string
  code: string
  name: string
  accountId: string
  purchaseDate: string
  purchaseCost: string
  usefulLifeMonths: number
  accumulatedDepreciation: string
  active: boolean
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

const selectClass =
  "h-12 w-full px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-[hsl(209,79%,35%,0.4)] focus:border-[hsl(209,79%,35%)] outline-none"

export default function ActivosFijosPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [depreciatingId, setDepreciatingId] = useState<string | null>(null)

  const emptyForm = { code: "", name: "", accountId: "", purchaseDate: new Date().toISOString().slice(0, 10), purchaseCost: "", usefulLifeMonths: "60" }
  const [form, setForm] = useState(emptyForm)

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [assetRes, accRes] = await Promise.all([
        fetch(`${apiBase}fixed-assets?active=true`, { headers: authHeaders() }),
        fetch(`${apiBase}accounting/accounts?active=true`, { headers: authHeaders() }),
      ])
      const assetData = await assetRes.json()
      const accData = await accRes.json()
      setAssets(assetData?.data ?? [])
      setAccounts((accData?.data ?? []).filter((a: any) => a.allowsEntries))
    } catch (err) {
      console.error(err)
      toast.error("Error al cargar activos fijos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleSave = async () => {
    if (!form.code || !form.name || !form.accountId || !form.purchaseCost) {
      toast.error("Completa código, nombre, cuenta y costo de compra")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}fixed-assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al guardar")
        return
      }
      toast.success("Activo fijo creado")
      setIsModalOpen(false)
      setForm(emptyForm)
      await fetchAll()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDepreciate = async (asset: FixedAsset) => {
    setDepreciatingId(asset.id)
    try {
      const res = await fetch(`${apiBase}fixed-assets/${asset.id}/depreciate`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al depreciar")
        return
      }
      toast.success(`Depreciación registrada: ${money(data.data.amount)}`)
      await fetchAll()
    } catch {
      toast.error("Error al depreciar")
    } finally {
      setDepreciatingId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Activos Fijos</h1>
          <p className="text-sm text-gray-500">Propiedad, planta y equipo — depreciación en línea recta</p>
        </div>
        <Button
          onClick={() => { setForm(emptyForm); setIsModalOpen(true) }}
          className="h-10 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white flex items-center gap-2 text-sm px-4 rounded-xl"
        >
          <Plus className="h-4 w-4" /> Nuevo Activo
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : assets.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No hay activos fijos registrados</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Código", "Nombre", "Costo", "Vida Útil", "Depreciado", "Saldo", "Acciones"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assets.map((a) => {
                const cost = Number(a.purchaseCost)
                const accumulated = Number(a.accumulatedDepreciation)
                const remaining = cost - accumulated
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">{a.code}</td>
                    <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">{a.name}</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900 whitespace-nowrap">{money(cost)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{a.usefulLifeMonths} meses</td>
                    <td className="px-5 py-3 text-sm text-right text-gray-700 whitespace-nowrap">{money(accumulated)}</td>
                    <td className="px-5 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">{money(remaining)}</td>
                    <td className="px-5 py-3">
                      {remaining > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,35%,0.08)]"
                          disabled={depreciatingId === a.id}
                          onClick={() => handleDepreciate(a)}
                        >
                          <TrendingDown className="h-4 w-4 mr-1" /> {depreciatingId === a.id ? "..." : "Depreciar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white w-[calc(100%-1.5rem)] sm:max-w-md rounded-3xl p-0 border-none shadow-2xl flex flex-col">
          <div className="px-6 py-5 bg-[hsl(209,79%,27%,0.02)] border-b border-gray-100">
            <DialogTitle className="text-xl font-black text-[hsl(209,79%,27%)]">Nuevo Activo Fijo</DialogTitle>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Código</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="h-12 rounded-xl border-gray-200" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Vida útil (meses)</Label>
                <Input type="number" value={form.usefulLifeMonths} onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })} className="h-12 rounded-xl border-gray-200" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 rounded-xl border-gray-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Cuenta contable (PPE)</Label>
              <select className={selectClass} value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">Selecciona una cuenta...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Fecha de compra</Label>
                <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="h-12 rounded-xl border-gray-200" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Costo de compra</Label>
                <Input type="number" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} className="h-12 rounded-xl border-gray-200" />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:bg-gray-100">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-[2] h-12 bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white font-black rounded-xl disabled:opacity-50">
              {saving ? "Guardando..." : "Crear Activo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
