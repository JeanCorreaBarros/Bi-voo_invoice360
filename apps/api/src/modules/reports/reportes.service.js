import { platformDb } from "../../lib/db.js"

// Catálogo de reportes: compartido por toda la plataforma, vive en la BD platform.

// LISTAR REPORTES
export async function getAllReportes() {
  return platformDb.reporte.findMany({
    include: {
      descargas: true
    },
    orderBy: {
      createdAt: "desc"
    }
  })
}

// OBTENER UNO
export async function getReporte(id) {
  return platformDb.reporte.findUnique({
    where: { id: Number(id) },
    include: {
      descargas: true
    }
  })
}

// CREAR REPORTE
export async function createReporte(data) {

  return platformDb.reporte.create({
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion,
      icon: data.icon,
      descargas: data.descargas ? { create: data.descargas } : undefined
    },
    include: {
      descargas: true
    }
  })

}

// ACTUALIZAR REPORTE
export async function updateReporte(id, data) {

  return platformDb.reporte.update({
    where: { id: Number(id) },
    data
  })

}

// ELIMINAR REPORTE
export async function deleteReporte(id) {

  return platformDb.reporte.delete({
    where: { id: Number(id) }
  })

}

// CREAR DESCARGA
export async function createDescarga(data) {

  return platformDb.descarga.create({
    data: {
      tipo: data.tipo,
      label: data.label,
      endpoint: data.endpoint,
      reporteId: Number(data.reporteId)
    }
  })

}

// ELIMINAR DESCARGA
export async function deleteDescarga(id) {

  return platformDb.descarga.delete({
    where: { id: Number(id) }
  })

}