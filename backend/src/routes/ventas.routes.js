import { Router } from "express";
import {
  getVentas,
  getVentaDetalle,
  crearVenta
} from "../controllers/ventas.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";


const router = Router();

router.get("/", verificarToken, getVentas);
router.get("/:id", verificarToken, getVentaDetalle);
router.post("/", verificarToken, crearVenta);

export default router;