import { Router } from "express";
import { verificarToken, requireAdmin } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/proveedores.controller.js";

const router = Router();

router.use(verificarToken);

router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getById);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", requireAdmin, ctrl.remove);

export default router;