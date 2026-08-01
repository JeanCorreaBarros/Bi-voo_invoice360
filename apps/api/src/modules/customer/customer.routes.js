import express from "express";
import * as customerController from "./customer.controller.js";
import { auth } from "../../middlewares/auth.middleware.js";
import { requireTenant } from "../../middlewares/tenant.middleware.js";

const router = express.Router();

router.use(auth, requireTenant);

router.post("/", customerController.create);
router.get("/", customerController.findAll);
router.get("/:id", customerController.findById);
router.put("/:id", customerController.update);
router.delete("/:id", customerController.deleteCustomer);

router.patch("/:id/deactivate", customerController.deactivate);
router.patch("/:id/activate", customerController.activate);

export default router;
