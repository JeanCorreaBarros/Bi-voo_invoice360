"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Lock, Unlock } from "lucide-react"
import type { PosSession } from "./pos-types"
import { money } from "./pos-types"

const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://plasticoslc.com/api/"

function getToken() {
  try {
    return sessionStorage.getItem("token")
  } catch {
    return null
  }
}

async function authFetch(path: string, init?: RequestInit) {
  const token = getToken()
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || "Error de red")
  }
  return data
}

// ─────────────────────────────────────────────
// ABRIR TURNO — bloquea la venta hasta que haya un turno abierto
// ─────────────────────────────────────────────
export function PosOpenShiftDialog({
  open,
  onOpenChange,
  onOpened,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpened: () => void
}) {
  const [openingAmount, setOpeningAmount] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    setLoading(true)
    try {
      await authFetch("pos/shifts/open", {
        method: "POST",
        body: JSON.stringify({ openingAmount: Number(openingAmount) || 0, note }),
      })
      toast.success("Turno de caja abierto")
      onOpened()
    } catch (err: any) {
      toast.error(err.message || "No se pudo abrir el turno")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-[hsl(209,79%,35%,0.1)] flex items-center justify-center mb-2">
            <Unlock className="h-6 w-6 text-[hsl(209,79%,35%)]" />
          </div>
          <DialogTitle>Abrir turno de caja</DialogTitle>
          <DialogDescription>
            Registra la base inicial de efectivo para empezar a vender en el POS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="opening-amount">Base inicial en efectivo</Label>
            <Input
              id="opening-amount"
              type="number"
              min={0}
              placeholder="0"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="opening-note">Observaciones (opcional)</Label>
            <Textarea id="opening-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={handleOpen} disabled={loading}>
            {loading ? "Abriendo..." : "Abrir turno y empezar a vender"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────
// CERRAR TURNO — arqueo: esperado vs. contado
// ─────────────────────────────────────────────
export function PosCloseShiftDialog({
  open,
  session,
  onOpenChange,
  onClosed,
}: {
  open: boolean
  session: PosSession | null
  onOpenChange: (open: boolean) => void
  onClosed: () => void
}) {
  const [countedCashAmount, setCountedCashAmount] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  if (!session) return null

  const counted = Number(countedCashAmount || 0)

  const handleClose = async () => {
    if (countedCashAmount === "") {
      toast.error("Ingresa el efectivo contado en caja")
      return
    }
    setLoading(true)
    try {
      const data = await authFetch(`pos/shifts/${session.id}/close`, {
        method: "POST",
        body: JSON.stringify({ countedCashAmount: counted, note }),
      })
      const diff = Number(data.session.cashDifference || 0)
      if (diff === 0) toast.success("Turno cerrado: caja cuadrada")
      else toast(diff > 0 ? `Turno cerrado: sobrante de ${money(diff)}` : `Turno cerrado: faltante de ${money(Math.abs(diff))}`, { icon: "⚠️" })
      onClosed()
    } catch (err: any) {
      toast.error(err.message || "No se pudo cerrar el turno")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle>Cerrar turno de caja</DialogTitle>
          <DialogDescription>
            Cuenta el efectivo físico en caja para hacer el arqueo del turno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
            Base inicial: <span className="font-semibold text-gray-700">{money(session.openingAmount)}</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="counted-amount">Efectivo contado en caja</Label>
            <Input
              id="counted-amount"
              type="number"
              min={0}
              value={countedCashAmount}
              onChange={(e) => setCountedCashAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="close-note">Observaciones (opcional)</Label>
            <Textarea id="close-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" variant="destructive" onClick={handleClose} disabled={loading}>
            {loading ? "Cerrando..." : "Cerrar turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
