import {
  getTrialBalance,
  getJournalBook,
  getLedger,
  getBalanceSheet,
  getIncomeStatement,
  getCustomerStatement,
  getSupplierStatement,
  getFinancialIndicators
} from './report.service.js'
import { generateTrialBalanceExcel, generateBalanceSheetExcel, generateIncomeStatementExcel } from './report.excel.js'
import { generateAccountingReportPDF } from './report.pdf.js'

export async function trialBalance(req, res) {
  try {
    const data = await getTrialBalance(req.db)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function journalBook(req, res) {
  try {
    const { page, limit, from, to, search } = req.query
    const result = await getJournalBook(req.db, { page, limit, from, to, search })
    res.json({ ok: true, ...result })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function ledger(req, res) {
  try {
    const { accountId, from, to } = req.query
    if (!accountId) return res.status(400).json({ ok: false, message: 'accountId es obligatorio' })
    const data = await getLedger(req.db, accountId, { from, to })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function balanceSheet(req, res) {
  try {
    const { asOf } = req.query
    const data = await getBalanceSheet(req.db, { asOf })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function incomeStatement(req, res) {
  try {
    const { from, to } = req.query
    const data = await getIncomeStatement(req.db, { from, to })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function financialIndicators(req, res) {
  try {
    const { asOf } = req.query
    const data = await getFinancialIndicators(req.db, { asOf })
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function customerStatement(req, res) {
  try {
    const { nit } = req.query
    if (!nit) return res.status(400).json({ ok: false, message: 'nit es obligatorio' })
    const data = await getCustomerStatement(req.db, nit)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function supplierStatement(req, res) {
  try {
    const { nit } = req.query
    if (!nit) return res.status(400).json({ ok: false, message: 'nit es obligatorio' })
    const data = await getSupplierStatement(req.db, nit)
    res.json({ ok: true, data })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function trialBalanceExcel(req, res) {
  try {
    const data = await getTrialBalance(req.db)
    await generateTrialBalanceExcel(res, data)
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function balanceSheetExcel(req, res) {
  try {
    const { asOf } = req.query
    const data = await getBalanceSheet(req.db, { asOf })
    await generateBalanceSheetExcel(res, data)
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function balanceSheetPdf(req, res) {
  try {
    const { asOf } = req.query
    const data = await getBalanceSheet(req.db, { asOf })
    generateAccountingReportPDF(res, {
      title: 'Balance General',
      subtitle: asOf ? `Al ${asOf}` : `Al ${new Date().toLocaleDateString('es-CO')}`,
      sections: [
        { label: 'Activo', rows: data.assets, total: data.totalAssets },
        { label: 'Pasivo', rows: data.liabilities, total: data.totalLiabilities },
        { label: 'Patrimonio', rows: data.equity, total: data.equityFromAccounts }
      ],
      summaryRows: [
        { label: 'Utilidad/Pérdida del Ejercicio', value: data.netIncome },
        { label: 'Total Patrimonio', value: data.totalEquity, bold: true },
        { label: 'Total Pasivo + Patrimonio', value: data.totalLiabilitiesAndEquity, bold: true }
      ]
    })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function incomeStatementExcel(req, res) {
  try {
    const { from, to } = req.query
    const data = await getIncomeStatement(req.db, { from, to })
    await generateIncomeStatementExcel(res, data)
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}

export async function incomeStatementPdf(req, res) {
  try {
    const { from, to } = req.query
    const data = await getIncomeStatement(req.db, { from, to })
    generateAccountingReportPDF(res, {
      title: 'Estado de Resultados',
      subtitle: from || to ? `${from || '...'} a ${to || '...'}` : undefined,
      sections: [
        { label: 'Ingresos', rows: data.income, total: data.totalIncome },
        { label: 'Costo de Ventas', rows: data.cost, total: data.totalCost },
        { label: 'Gastos', rows: data.expense, total: data.totalExpense }
      ],
      summaryRows: [
        { label: 'Utilidad Bruta', value: data.grossProfit, bold: true },
        { label: 'Utilidad Neta', value: data.netIncome, bold: true }
      ]
    })
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message })
  }
}
