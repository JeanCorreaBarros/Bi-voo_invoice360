import { Router } from "express"
import {
  getSalesSummary,
  getSalesList,
  exportSalesPDF,
  exportSalesExcel,
  exportSalesZIP
} from "./sales.controller.js"
import { auth } from "../../../middlewares/auth.middleware.js"
import { requireTenant } from "../../../middlewares/tenant.middleware.js"

const router = Router()

router.use(auth, requireTenant)

router.get("/summary", getSalesSummary)
router.get("/list", getSalesList)
router.get("/export/pdf", exportSalesPDF)
router.get("/export/excel", exportSalesExcel)
router.get("/export/zip", exportSalesZIP)

export default router
