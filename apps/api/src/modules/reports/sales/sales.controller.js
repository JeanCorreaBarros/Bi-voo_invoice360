import {
  getSalesSummaryService,
  getSalesService
} from "./sales.service.js"

import { generateSalesPDF, generateSalesPDFBuffer } from "./sales.pdf.js"
import { generateSalesExcel } from "./sales.excel.js"
import { generateSalesZIP } from "./sales.zip.js"

const EXPORT_LIMIT = 2000
const MAX_RANGE_DAYS = 90

const validateParams = (from, to) => {
  if (!from || !to) {
    throw new Error("Parámetros requeridos: from, to")
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw new Error("Fechas inválidas. Usa formato ISO: YYYY-MM-DD")
  }

  const diff = (toDate - fromDate) / (1000 * 60 * 60 * 24)

  if (diff > MAX_RANGE_DAYS) {
    throw new Error("Rango máximo permitido 90 días")
  }

  return { fromDate, toDate }
}

export const getSalesSummary = async (req, res) => {
  try {
    const { from, to } = req.query

    validateParams(from, to)

    const result = await getSalesSummaryService(req.db, {
      from,
      to
    })

    res.json({
      totalVentas: Number(result._sum.orderTotalAfterTax || 0),
      totalImpuestos: Number(result._sum.orderTotalTax || 0),
      cantidadFacturas: result._count.id || 0
    })

  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const getSalesList = async (req, res) => {
  try {
    const { from, to, page, limit } = req.query

    validateParams(from, to)

    const result = await getSalesService(req.db, {
      from,
      to,
      page,
      limit
    })

    res.json(result)

  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const exportSalesPDF = async (req, res) => {
  try {
    const { from, to } = req.query

    validateParams(from, to)

    const { data, pagination } = await getSalesService(req.db, {
      from,
      to,
      page: 1,
      limit: EXPORT_LIMIT
    })

    if (pagination.total > EXPORT_LIMIT) {
      return res.status(400).json({
        error: `Máximo ${EXPORT_LIMIT} registros para exportar`
      })
    }

    generateSalesPDF(res, data)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const exportSalesExcel = async (req, res) => {
  try {
    const { from, to } = req.query

    validateParams(from, to)

    const { data, pagination } = await getSalesService(req.db, {
      from,
      to,
      page: 1,
      limit: EXPORT_LIMIT
    })

    if (pagination.total > EXPORT_LIMIT) {
      return res.status(400).json({
        error: `Máximo ${EXPORT_LIMIT} registros para exportar`
      })
    }

    await generateSalesExcel(res, data)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const exportSalesZIP = async (req, res) => {
  try {
    const { from, to } = req.query

    validateParams(from, to)

    const { data } = await getSalesService(req.db, {
      from,
      to,
      page: 1,
      limit: EXPORT_LIMIT
    })

    // Generar PDF en buffer
    const pdfBuffer = await generateSalesPDFBuffer(data)

    const files = [
      {
        name: "reporte_ventas.pdf",
        content: pdfBuffer
      }
    ]

    generateSalesZIP(res, files)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
