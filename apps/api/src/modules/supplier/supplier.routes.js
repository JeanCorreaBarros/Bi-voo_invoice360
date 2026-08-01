import express from "express";
import * as supplierController from "./supplier.controller.js";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireTenant } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

router.use(auth, requireTenant);

router.post("/", supplierController.create);
router.get("/", supplierController.findAll);
router.get("/:id", supplierController.findById);
router.put("/:id", supplierController.update);
router.delete("/:id", supplierController.deleteSupplier);

export default router;
