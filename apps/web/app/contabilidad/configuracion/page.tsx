"use client"

import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Info } from "lucide-react"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

type Account = { id: string; code: string; name: string; allowsEntries: boolean }

const FIELD_GROUPS: { title: string; fields: { key: string; label: string }[] }[] = [
  {
    title: "Ventas",
    fields: [
      { key: "salesAccountId", label: "Cuenta de ventas (ingresos)" },
      { key: "salesTaxAccountId", label: "IVA por pagar / descontable" },
      { key: "accountsReceivableAccountId", label: "Cartera (clientes)" },
    ],
  },
  {
    title: "Inventario y costos",
    fields: [
      { key: "inventoryAccountId", label: "Inventario de mercancías" },
      { key: "costOfSalesAccountId", label: "Costo de mercancía vendida" },
    ],
  },
  {
    title: "Compras",
    fields: [{ key: "accountsPayableAccountId", label: "Proveedores" }],
  },
  {
    title: "Tesorería",
    fields: [
      { key: "cashAccountId", label: "Caja" },
      { key: "bankAccountId", label: "Bancos" },
    ],
  },
  {
    title: "Activos Fijos",
    fields: [
      { key: "depreciationExpenseAccountId", label: "Gasto por depreciación" },
      { key: "accumulatedDepreciationAccountId", label: "Depreciación acumulada" },
    ],
  },
  {
    title: "Cierre Contable",
    fields: [{ key: "retainedEarningsAccountId", label: "Utilidad / Pérdida del ejercicio" }],
  },
]

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

const selectClass =
  "h-11 w-full px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-[hsl(209,79%,35%,0.4)] focus:border-[hsl(209,79%,35%)] outline-none"

export default function ConfiguracionContablePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const authHeaders = () => {
    const token = getToken()
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [accRes, settingsRes] = await Promise.all([
          fetch(`${apiBase}accounting/accounts?active=true`, { headers: authHeaders() }),
          fetch(`${apiBase}accounting/settings`, { headers: authHeaders() }),
        ])
        const acc = await accRes.json()
        const s = await settingsRes.json()

        setAccounts((acc?.data ?? []).filter((a: Account) => a.allowsEntries))

        const data = s?.data ?? {}
        const flat: Record<string, string> = {}
        for (const group of FIELD_GROUPS) {
          for (const field of group.fields) {
            flat[field.key] = data[field.key] || ""
          }
        }
        setSettings(flat)
      } catch (err) {
        console.error(err)
        toast.error("Error al cargar la configuración contable")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}accounting/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.message || "Error al guardar")
        return
      }
      toast.success("Configuración contable guardada")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full max-w-none space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración Contable</h1>
        <p className="text-sm text-gray-500">Cuentas por defecto que usa la causación automática</p>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Esto solo define QUÉ cuentas usar. Para que la causación automática realmente se ejecute al
          facturar, comprar o registrar un pago, además debes activar los eventos correspondientes en{" "}
          <span className="font-semibold">Configuración → Integración IA</span>.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-6">
          {FIELD_GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{group.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">
                      {field.label}
                    </Label>
                    <select
                      className={selectClass}
                      value={settings[field.key] || ""}
                      onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                    >
                      <option value="">Sin asignar</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[hsl(209,79%,35%)] hover:bg-[hsl(209,79%,30%)] text-white rounded-xl disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
