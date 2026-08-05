import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import authRoutes from './routes/auth.routes.js'
import testRoutes from './routes/test.routes.js'

import accessRoutes from './modules/access/access.routes.js';

import userRoutes from './modules/users/user.routes.js'

import companyRoutes from './modules/company/company.routes.js'

import supportTicketRoutes from './modules/supportTickets/supportTicket.routes.js'
import creditNoteRoutes from './modules/creditNote/creditNote.routes.js'
import debitNoteRoutes from './modules/debitNote/debitNote.routes.js'
import supportDocumentRoutes from './modules/supportDocument/supportDocument.routes.js'

import productRoutes from './modules/products/product.routes.js'

import invoiceRoutes from './modules/invoices/invoice.routes.js'
import recurringTemplateRoutes from './modules/invoices/recurringTemplate.routes.js'
import scheduledInvoiceRoutes from './modules/invoices/scheduledInvoice.routes.js'

import resolutionRoutes from "./modules/resolution/resolution.routes.js";

import purchaseRoutes from './modules/purchases/purchase.routes.js'

import supplierRoutes from "./modules/supplier/supplier.routes.js";

import customerRoutes from "./modules/customer/customer.routes.js";

import dashboardRoutes from './modules/dashboard/dashboard.routes.js'

import invoicePdfRoutes from './modules/invoice-pdf/invoice-pdf.routes.js'

import reportssalesRoutes from "./modules/reports/sales/sales.routes.js"

import accountsReceivableRoutes from "./modules/invoices/accountsReceivable.routes.js"

import paymentRoutes from "./modules/payments/payment.routes.js"


import inventoryRoutes from "./modules/inventory/inventory.routes.js"
import warehouseRoutes from "./modules/warehouses/warehouse.routes.js"
import batchRoutes from "./modules/batches/batch.routes.js"

import reportesRoutes from "./modules/reports/reportes.routes.js"

import accountingRoutes from "./modules/accounting/accounting.routes.js"
import aiSettingsRoutes from "./modules/aiSettings/aiSettings.routes.js"
import aiChatRoutes from "./modules/aiChat/aiChat.routes.js"
import treasuryRoutes from "./modules/treasury/treasury.routes.js"
import purchasePaymentRoutes from "./modules/purchases/purchasePayment.routes.js"
import fixedAssetRoutes from "./modules/fixedAssets/fixedAsset.routes.js"
import posRoutes from "./modules/pos/pos.routes.js"


dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

// health check
app.get('/api', (req, res) => {
  res.json({ ok: true, message: 'API Plasticos LC funcionando 🚀' })
})
//app.use("/uploads", express.static(path.join(__dirname, "uploads")))
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

app.use('/api/auth', authRoutes)
app.use('/api/test', testRoutes)
app.use('/api', accessRoutes);

app.use('/api/users', userRoutes)

app.use("/api/companies", companyRoutes)
app.use("/api/support-tickets", supportTicketRoutes)
app.use("/api/credit-notes", creditNoteRoutes)
app.use("/api/debit-notes", debitNoteRoutes)
app.use("/api/support-documents", supportDocumentRoutes)

app.use('/api/products', productRoutes)

app.use('/api/invoices', invoiceRoutes)
app.use('/api/recurring-invoice-templates', recurringTemplateRoutes)
app.use('/api/scheduled-invoices', scheduledInvoiceRoutes)

app.use("/api/resolutions", resolutionRoutes);

app.use('/api/purchases', purchaseRoutes)

app.use("/api/suppliers", supplierRoutes);

app.use("/api/customers", customerRoutes);

app.use('/api/dashboard', dashboardRoutes)





app.use('/api/invoice-documents', invoicePdfRoutes)

app.use("/api/reports-sales", reportssalesRoutes)

app.use("/api", accountsReceivableRoutes)

app.use("/api", paymentRoutes)

app.use("/api", inventoryRoutes)
app.use("/api/warehouses", warehouseRoutes)
app.use("/api/batches", batchRoutes)



app.use("/api", reportesRoutes)

app.use("/api/accounting", accountingRoutes)

app.use("/api/settings", aiSettingsRoutes)

app.use("/api/ai", aiChatRoutes)

app.use("/api/treasury", treasuryRoutes)

app.use("/api/purchase-payments", purchasePaymentRoutes)

app.use("/api/fixed-assets", fixedAssetRoutes)

app.use("/api/pos", posRoutes)

export default app
