"use client"

import { useState, useEffect } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { User, Lock, LogOut, CheckCircle2, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PerfilPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"personal" | "security">("personal")
  const [user, setUser] = useState<any>(null)
  
  // Forms state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    // Load user data from storage
    try {
      const userData = localStorage.getItem("user") || sessionStorage.getItem("user")
      if (userData) {
        const parsed = JSON.parse(userData)
        setUser(parsed)
        setName(parsed.name || "")
        setEmail(parsed.email || "")
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const handleLogout = () => {
    sessionStorage.clear()
    localStorage.clear()
    router.push("/")
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name.charAt(0).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      <DashboardHeader />

      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* ── Sidebar (Left Column) ── */}
          <div className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col items-center">
              
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-[#EBF3FB] text-[#00529B] flex items-center justify-center text-4xl font-bold">
                  {getInitials(name)}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center border-2 border-white hover:bg-orange-600 transition-colors shadow-sm">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {/* Name & Role */}
              <h2 className="text-xl font-bold text-gray-900 text-center mb-1 leading-tight">
                {name || "Usuario"}
              </h2>
              <p className="text-sm font-semibold text-gray-400 mb-8">
                {user?.role?.name || "Rol"}
              </p>

              {/* Tabs Menu */}
              <div className="w-full flex flex-col gap-2 border-b border-gray-100 pb-6 mb-6">
                <button
                  onClick={() => setActiveTab("personal")}
                  className={`flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    activeTab === "personal"
                      ? "bg-orange-50/70 text-orange-500"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <User className="w-5 h-5" />
                  Información Personal
                </button>

                <button
                  onClick={() => setActiveTab("security")}
                  className={`flex items-center gap-3 w-full px-5 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    activeTab === "security"
                      ? "bg-orange-50/70 text-orange-500"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  Seguridad y Contraseña
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-5 py-3 rounded-2xl font-bold text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>

          {/* ── Content (Right Column) ── */}
          <div className="flex-1">
            <div className="bg-white rounded-[24px] p-6 lg:p-10 shadow-sm border border-gray-100 min-h-full">
              
              {activeTab === "personal" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-2xl font-black text-gray-900 mb-8">Información Personal</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-[#64748B]">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm font-semibold text-gray-800 transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-[#64748B]">Correo Electrónico</label>
                      <div className="relative">
                        <input 
                          type="email" 
                          value={email}
                          disabled
                          className="w-full h-12 pl-4 pr-32 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-500 outline-none text-sm font-semibold cursor-not-allowed shadow-sm"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 bg-[#F0FDF4] text-[#16A34A] rounded-lg text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verificado
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 flex flex-col-reverse sm:flex-row items-center gap-4">
                      <button className="w-full sm:w-auto px-8 h-12 rounded-xl font-bold text-orange-500 border-2 border-orange-100 hover:bg-orange-50 transition-colors">
                        Descartar
                      </button>
                      <button className="w-full sm:w-auto px-8 h-12 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20">
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-2xl font-black text-gray-900 mb-8">Seguridad y Contraseña</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-[#64748B]">Contraseña Actual</label>
                      <input 
                        type="password" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm font-semibold text-gray-800 transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-[#64748B]">Nueva Contraseña</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-sm font-semibold text-gray-800 transition-all shadow-sm"
                      />
                    </div>

                    <div className="pt-6">
                      <button className="w-full sm:w-auto px-8 h-12 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-md shadow-orange-500/20">
                        Actualizar Contraseña
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
