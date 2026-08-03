import { Router } from "express"
import * as controller from "./company.controller.js"
import { upload } from "../../middlewares/upload.js"
import { auth } from "../../middlewares/auth.middleware.js"
import { hasPermission } from "../../middlewares/permission.middleware.js"

const router = Router()

// Quitamos la restricción global de SUPER_ADMIN para que los tenants puedan ver y editar su propia empresa
router.use(auth)

router.post("/", hasPermission("company.manage"), controller.create)
router.get("/", controller.list)
router.get("/:id", controller.getById)
router.put("/:id", controller.update)
router.delete("/:id", hasPermission("company.manage"), controller.remove)
router.patch("/:id/activate", hasPermission("company.manage"), controller.activate)

router.get("/:id/admin", controller.getAdmin)
router.post("/:id/admin", controller.createAdmin)
router.put("/:id/admin", controller.updateAdmin)
router.patch(
  "/:id/logo",
  upload.single("logo"),
  controller.uploadLogo
)

export default router
