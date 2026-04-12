import { Router } from "express";
import {
  getVentas,
  getVentaDetalle,
  crearVenta,
  cancelarVenta
} from "../controllers/ventas.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";


const router = Router();

router.get("/", verificarToken, getVentas);
router.get("/:id", verificarToken, getVentaDetalle);
router.post("/", verificarToken, crearVenta);
router.patch("/:id/cancelar", verificarToken, cancelarVenta);

export default router;