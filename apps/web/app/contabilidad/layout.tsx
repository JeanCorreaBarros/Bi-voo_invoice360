"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { ModuleSidebar, ModuleMobileTabs } from "@/components/module-sidebar"

export default function ContabilidadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      <DashboardHeader />
      <ModuleMobileTabs module="contabilidad" />
      <div className="flex-1 flex">
        <ModuleSidebar module="contabilidad" />
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 min-w-0">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
