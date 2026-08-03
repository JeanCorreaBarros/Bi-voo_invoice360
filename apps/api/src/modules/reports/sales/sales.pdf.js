import PDFDocument from "pdfkit"

const ITEMS_PER_PAGE = 15
const PAGE_HEIGHT = 792 // puntos
const MARGIN = 30
const CONTENT_HEIGHT = PAGE_HEIGHT - (MARGIN * 2) - 40

export const generateSalesPDF = (res, data) => {
  const doc = new PDFDocument({ margin: MARGIN })

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", "attachment; filename=reporte_ventas.pdf")

  doc.pipe(res)
  addPDFContent(doc, data)
  doc.end()
}

export const generateSalesPDFBuffer = (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN })
    const chunks = []

    doc.on("data", chunk => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    addPDFContent(doc, data)
    doc.end()
  })
}

const addPDFContent = (doc, data) => {
  // Página de portada
  doc.fontSize(24).text("Reporte de Ventas", { align: "center" })
  doc.moveDown(0.5)
  doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}`, { align: "center" })
  doc.fontSize(12).text(`Total de registros: ${data.length}`, { align: "center" })
  doc.moveDown(2)

  let itemsInPage = 0

  data.forEach((inv, index) => {
    // Verificar si necesitamos una nueva página
    if (itemsInPage > 0 && itemsInPage % ITEMS_PER_PAGE === 0) {
      doc.addPage()
      doc.fontSize(10).text(`Página ${Math.floor(index / ITEMS_PER_PAGE) + 1}`, { align: "right" })
      doc.moveDown()
      itemsInPage = 0
    }

    // Dibujar item
    doc.fontSize(10)
    doc.text(
      `${index + 1}. Factura: ${inv.orderPrefix}-${inv.orderId}`,
      { width: CONTENT_HEIGHT }
    )
    doc.fontSize(9).text(
      `   Cliente: ${inv.orderReceiverName} | NIT: ${inv.orderReceiverNit}`,
      { width: CONTENT_HEIGHT }
    )
    doc.fontSize(9).text(
      `   Total: $${Number(inv.orderTotalAfterTax).toLocaleString()} | Estado: ${inv.status} | DIAN: ${inv.dianStatus}`,
      { width: CONTENT_HEIGHT }
    )
    doc.fontSize(9).text(
      `   Fecha: ${new Date(inv.orderDate).toLocaleDateString()}`,
      { width: CONTENT_HEIGHT }
    )
    doc.moveDown(0.5)

    itemsInPage++
  })

  // Página final
  doc.addPage()
  doc.fontSize(10).text("--- Fin del Reporte ---", { align: "center" })
  doc.moveDown()
  doc.fontSize(8).text(`Generado: ${new Date().toLocaleString()}`, { align: "center" })
}
