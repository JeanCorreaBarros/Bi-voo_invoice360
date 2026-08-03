"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Boxes,
  History,
  Warehouse,
  ArrowRightLeft,
} from "lucide-react"

const SIDEBAR_SECTIONS: {
  title: string
  items: { icon: any; label: string; href: string }[]
}[] = [
  {
    title: "General",
    items: [
      { icon: LayoutDashboard, label: "Resumen", href: "/inventario" },
      { icon: Package, label: "Catálogo", href: "/inventario/catalogo" },
    ],
  },
  {
    title: "Existencias",
    items: [
      { icon: Boxes, label: "Existencias", href: "/inventario/existencias" },
      { icon: History, label: "Movimientos (Kardex)", href: "/inventario/movimientos" },
    ],
  },
  {
    title: "Bodegas",
    items: [
      { icon: Warehouse, label: "Bodegas", href: "/inventario/bodegas" },
      { icon: ArrowRightLeft, label: "Transferencias", href: "/inventario/transferencias" },
    ],
  },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) =>
    pathname === href || (href !== "/inventario" && pathname?.startsWith(href))
}

export function InventorySidebar() {
  const router = useRouter()
  const isActive = useIsActive()

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-gray-100 sticky top-[57px] h-[calc(100vh-57px)] py-6 px-3 gap-4 overflow-y-auto">
      {SIDEBAR_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active = isActive(item.href)
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-150 w-full ${
                  active
                    ? "bg-[hsl(209,79%,35%)] text-white shadow-sm"
                    : "text-gray-500 hover:bg-[hsl(209,79%,35%,0.08)] hover:text-[hsl(209,79%,35%)]"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}

// Versión móvil: tab-bar horizontal scrolleable, se usa dentro del layout en
// vez del sidebar fijo (que solo aparece en lg+).
export function InventoryMobileTabs() {
  const router = useRouter()
  const isActive = useIsActive()
  const allItems = SIDEBAR_SECTIONS.flatMap((s) => s.items)

  return (
    <div className="lg:hidden flex gap-2 overflow-x-auto px-4 py-3 border-b border-gray-100 bg-white scrollbar-hide">
      {allItems.map((item) => {
        const active = isActive(item.href)
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 ${
              active ? "bg-[hsl(209,79%,35%)] text-white" : "bg-gray-50 text-gray-500"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
