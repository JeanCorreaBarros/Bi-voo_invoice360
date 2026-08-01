import express from "express"
import * as controller from "./inventory.controller.js"
import { auth } from "../../middlewares/auth.middleware.js"
import { requireTenant } from "../../middlewares/tenant.middleware.js"

const router = express.Router()

router.use(auth, requireTenant)

router.get("/inventory/kardex/:productId", controller.kardex)

router.get("/inventory/kardex", controller.kardexAll)

router.get("/inventory/stock", controller.stock)

export default router
