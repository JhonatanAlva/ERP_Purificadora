import express from "express";
import * as controller from "../controllers/inventario.controller.js";

const router = express.Router();

// PRODUCTOS
router.get("/productos", controller.getProductos);
router.post("/productos", controller.createProducto);
router.put("/productos/:id", controller.updateProducto);
router.delete("/productos/:id", controller.deleteProducto);

// MOVIMIENTOS
router.get("/movimientos", controller.getMovimientos);
router.post("/movimientos", controller.createMovimiento);

export default router;