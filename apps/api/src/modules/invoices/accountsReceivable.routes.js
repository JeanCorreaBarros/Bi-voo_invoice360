import express from "express"
import * as controller from "./accountsReceivable.controller.js"
import { auth } from "../../middlewares/auth.middleware.js"
import { requireTenant } from "../../middlewares/tenant.middleware.js"

const router = express.Router()

router.use(auth, requireTenant)

router.get("/accounts-receivable", controller.getAccountsReceivable)

router.get("/accounts-receivable/overdue", controller.getOverdueInvoices)

router.get(
  "/reports/accounts-receivable-by-customer",
  controller.accountsReceivableByCustomer
)

export default router
