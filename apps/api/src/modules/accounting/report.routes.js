import { Router } from 'express'
import { hasPermission } from '../../middlewares/permission.middleware.js'
import {
  trialBalance,
  journalBook,
  ledger,
  balanceSheet,
  incomeStatement,
  balanceSheetComparative,
  incomeStatementComparative,
  financialIndicators,
  customerStatement,
  supplierStatement,
  trialBalanceExcel,
  balanceSheetExcel,
  balanceSheetPdf,
  incomeStatementExcel,
  incomeStatementPdf
} from './report.controller.js'

const router = Router()

router.get('/trial-balance', hasPermission('accounting.entry.read'), trialBalance)
router.get('/journal', hasPermission('accounting.entry.read'), journalBook)
router.get('/ledger', hasPermission('accounting.entry.read'), ledger)
router.get('/balance-sheet', hasPermission('accounting.entry.read'), balanceSheet)
router.get('/income-statement', hasPermission('accounting.entry.read'), incomeStatement)
router.get('/balance-sheet/comparative', hasPermission('accounting.entry.read'), balanceSheetComparative)
router.get('/income-statement/comparative', hasPermission('accounting.entry.read'), incomeStatementComparative)
router.get('/financial-indicators', hasPermission('accounting.entry.read'), financialIndicators)
router.get('/customer-statement', hasPermission('accounting.entry.read'), customerStatement)
router.get('/supplier-statement', hasPermission('accounting.entry.read'), supplierStatement)

router.get('/trial-balance/export/excel', hasPermission('accounting.entry.read'), trialBalanceExcel)
router.get('/balance-sheet/export/excel', hasPermission('accounting.entry.read'), balanceSheetExcel)
router.get('/balance-sheet/export/pdf', hasPermission('accounting.entry.read'), balanceSheetPdf)
router.get('/income-statement/export/excel', hasPermission('accounting.entry.read'), incomeStatementExcel)
router.get('/income-statement/export/pdf', hasPermission('accounting.entry.read'), incomeStatementPdf)

export default router
