import express from "express"
import * as controller from "./reportes.controller.js"
import { auth } from "../../middlewares/auth.middleware.js"

const router = express.Router()

router.use(auth)

// REPORTES (catálogo compartido, no depende de empresa)
router.get("/reports", controller.getReportes)
router.get("/reports/:id", controller.getReporte)

router.post("/reports", controller.createReporte)
router.put("/reports/:id", controller.updateReporte)
router.delete("/reports/:id", controller.deleteReporte)

// DESCARGAS
router.post("/reports/descargas", controller.createDescarga)
router.delete("/reports/descargas/:id", controller.deleteDescarga)

export default router
