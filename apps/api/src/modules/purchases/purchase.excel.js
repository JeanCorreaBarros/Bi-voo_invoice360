import ExcelJS from 'exceljs'

export async function generatePurchasesExcel(res, purchases) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Compras')

  sheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Proveedor', key: 'supplierName', width: 32 },
    { header: 'NIT', key: 'supplierNit', width: 16 },
    { header: 'Factura Proveedor', key: 'invoiceNumber', width: 18 },
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'IVA', key: 'tax', width: 12 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Estado', key: 'status', width: 12 }
  ]

  for (const p of purchases) {
    sheet.addRow({
      id: p.id,
      supplierName: p.supplierName,
      supplierNit: p.supplierNit || '',
      invoiceNumber: p.invoiceNumber || '',
      date: new Date(p.date).toLocaleDateString('es-CO'),
      subtotal: Number(p.subtotal),
      tax: Number(p.tax),
      total: Number(p.total),
      status: p.status
    })
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=reporte_compras.xlsx')

  await workbook.xlsx.write(res)
  res.end()
}
