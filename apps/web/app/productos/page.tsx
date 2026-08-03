"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// El catálogo de productos ahora vive dentro del módulo de Inventario
// (/inventario/catalogo), como una sección más de su sidebar. Esta ruta se
// conserva como redirección para no romper enlaces o marcadores viejos.
export default function ProductosRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/inventario/catalogo")
  }, [router])

  return null
}
