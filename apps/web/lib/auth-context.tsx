"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

interface Company {
  id: string
  businessName: string
  tradeName?: string | null
  nit: string
  logo?: string | null
}

interface User {
  id: string
  name: string
  email: string
  active: boolean
  createdAt: string
  updatedAt: string
  roles: string[]
  permissions: string[]
  companyId?: string | null
  company?: Company | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<string | null>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Validar sesión y cargar usuario al montar
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Intentar cargar del sessionStorage y localStorage
        const token = sessionStorage.getItem("token")
        const savedUser = localStorage.getItem("user")

        if (token && savedUser) {
          try {
            const userData = JSON.parse(savedUser)
            // Aquí puedes validar el token contra el servidor si es necesario
            // Por ahora, lo consideramos válido si existe
            setUser(userData)
          } catch (error) {
            console.error("Error parsing saved user:", error)
            // Limpiar datos inválidos
            sessionStorage.removeItem("token")
            localStorage.removeItem("user")
            localStorage.removeItem("roles")
            localStorage.removeItem("permissions")
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${apiUrl}auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      console.log("[Login] Status:", response.status, "| Body:", JSON.stringify(data))

      if (!response.ok) {
        // Devolvemos el mensaje exacto del servidor
        return data?.message || data?.error || `Error del servidor (${response.status})`
      }

      const { token, user: userData } = data

      sessionStorage.setItem("token", token)
      localStorage.setItem("roles", JSON.stringify(userData.roles))
      localStorage.setItem("permissions", JSON.stringify(userData.permissions))
      localStorage.setItem("user", JSON.stringify(userData))
      setUser(userData)

      return null // null = éxito
    } catch (error) {
      console.error("Login error:", error)
      return "Error de conexión. Verifica tu red e inténtalo de nuevo."
    } finally {
      setIsLoading(false)
    }
  }, [])


  const logout = useCallback(() => {
    setUser(null)
    // Limpiar sessionStorage
    sessionStorage.removeItem("token")
    // Limpiar localStorage
    localStorage.removeItem("user")
    localStorage.removeItem("roles")
    localStorage.removeItem("permissions")
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
