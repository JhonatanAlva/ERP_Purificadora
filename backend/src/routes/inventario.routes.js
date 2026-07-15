import express from "express";
import * as controller from "../controllers/inventario.controller.js";
import { verificarToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// PRODUCTOS
router.get("/productos", verificarToken, controller.getProductos);
router.post("/productos", verificarToken, controller.createProducto);
router.put("/productos/:id", verificarToken, controller.updateProducto);
router.delete("/productos/:id", verificarToken, requireAdmin, controller.deleteProducto);
router.put("/productos/:id/activar", verificarToken, requireAdmin, controller.activarProducto);

// MOVIMIENTOS
router.get("/movimientos", verificarToken, controller.getMovimientos);
router.post("/movimientos", verificarToken, controller.createMovimiento);

export default router;