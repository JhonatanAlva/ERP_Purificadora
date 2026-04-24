import { Router } from "express";
import * as ctrl from "../controllers/pedidos.controller.js";

const router = Router();

router.get("/", ctrl.getPedidos);
router.get("/:id", ctrl.getDetalle);
router.post("/", ctrl.createPedido);
router.put("/:id", ctrl.updatePedido);
router.patch("/:id/estado", ctrl.updateEstado);
router.delete("/:id", ctrl.deletePedido);

export default router;