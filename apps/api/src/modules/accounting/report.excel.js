import ExcelJS from 'exceljs'

function money(sheet, colIndex) {
  sheet.getColumn(colIndex).numFmt = '#,##0.00'
}

export async function generateTrialBalanceExcel(res, rows) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Balance de Prueba')
  sheet.columns = [
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Cuenta', key: 'name', width: 40 },
    { header: 'Débitos', key: 'debit', width: 16 },
    { header: 'Créditos', key: 'credit', width: 16 },
    { header: 'Saldo', key: 'balance', width: 16 }
  ]
  sheet.getRow(1).font = { bold: true }
  rows.forEach((r) => sheet.addRow(r))
  money(sheet, 3)
  money(sheet, 4)
  money(sheet, 5)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=balance_de_prueba.xlsx')
  await workbook.xlsx.write(res)
  res.end()
}

export async function generateBalanceSheetExcel(res, data) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Balance General')
  sheet.columns = [
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Cuenta', key: 'name', width: 40 },
    { header: 'Saldo', key: 'balance', width: 18 }
  ]
  sheet.getRow(1).font = { bold: true }

  const addSection = (title, rows, total) => {
    const titleRow = sheet.addRow({ code: '', name: title, balance: '' })
    titleRow.font = { bold: true }
    rows.forEach((r) => sheet.addRow(r))
    const totalRow = sheet.addRow({ code: '', name: `Total ${title}`, balance: total })
    totalRow.font = { bold: true }
    sheet.addRow({})
  }

  addSection('Activo', data.assets, data.totalAssets)
  addSection('Pasivo', data.liabilities, data.totalLiabilities)
  addSection('Patrimonio', data.equity, data.equityFromAccounts)
  sheet.addRow({ code: '', name: 'Utilidad/Pérdida del Ejercicio', balance: data.netIncome }).font = { italic: true }
  sheet.addRow({ code: '', name: 'Total Patrimonio', balance: data.totalEquity }).font = { bold: true }
  sheet.addRow({})
  sheet.addRow({ code: '', name: 'Total Pasivo + Patrimonio', balance: data.totalLiabilitiesAndEquity }).font = { bold: true }

  money(sheet, 3)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=balance_general.xlsx')
  await workbook.xlsx.write(res)
  res.end()
}

export async function generateIncomeStatementExcel(res, data) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Estado de Resultados')
  sheet.columns = [
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Cuenta', key: 'name', width: 40 },
    { header: 'Saldo', key: 'balance', width: 18 }
  ]
  sheet.getRow(1).font = { bold: true }

  const addSection = (title, rows, total) => {
    const titleRow = sheet.addRow({ code: '', name: title, balance: '' })
    titleRow.font = { bold: true }
    rows.forEach((r) => sheet.addRow(r))
    const totalRow = sheet.addRow({ code: '', name: `Total ${title}`, balance: total })
    totalRow.font = { bold: true }
    sheet.addRow({})
  }

  addSection('Ingresos', data.income, data.totalIncome)
  addSection('Costo de Ventas', data.cost, data.totalCost)
  sheet.addRow({ code: '', name: 'Utilidad Bruta', balance: data.grossProfit }).font = { bold: true }
  sheet.addRow({})
  addSection('Gastos', data.expense, data.totalExpense)
  sheet.addRow({ code: '', name: 'Utilidad Neta', balance: data.netIncome }).font = { bold: true }

  money(sheet, 3)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename=estado_de_resultados.xlsx')
  await workbook.xlsx.write(res)
  res.end()
}
