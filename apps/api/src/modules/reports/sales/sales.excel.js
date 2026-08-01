import ExcelJS from "exceljs"

export const generateSalesExcel = async (res, data) => {

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Ventas")

  sheet.columns = [
    { header: "Prefijo", key: "orderPrefix", width: 10 },
    { header: "Número", key: "orderId", width: 10 },
    { header: "Cliente", key: "orderReceiverName", width: 30 },
    { header: "NIT", key: "orderReceiverNit", width: 15 },
    { header: "Fecha", key: "orderDate", width: 20 },
    { header: "Total", key: "orderTotalAfterTax", width: 15 }
  ]

  data.forEach(inv => {
    sheet.addRow(inv)
  })

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=reporte_ventas.xlsx"
  )

  await workbook.xlsx.write(res)
  res.end()
}
