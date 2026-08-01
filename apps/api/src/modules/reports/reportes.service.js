import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// LISTAR REPORTES
export async function getAllReportes() {
  return prisma.reporte.findMany({
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
  return prisma.reporte.findUnique({
    where: { id: Number(id) },
    include: {
      descargas: true
    }
  })
}

// CREAR REPORTE
export async function createReporte(data) {

  return prisma.reporte.create({
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion,
      icon: data.icon
    }
  })

}

// ACTUALIZAR REPORTE
export async function updateReporte(id, data) {

  return prisma.reporte.update({
    where: { id: Number(id) },
    data
  })

}

// ELIMINAR REPORTE
export async function deleteReporte(id) {

  return prisma.reporte.delete({
    where: { id: Number(id) }
  })

}

// CREAR DESCARGA
export async function createDescarga(data) {

  return prisma.descarga.create({
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

  return prisma.descarga.delete({
    where: { id: Number(id) }
  })

}