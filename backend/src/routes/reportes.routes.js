import { Router } from "express";
import {
    getResumen,
    getVentasPorDia,
    getVentasPorMes,
    getProductosMasVendidos,
    getDetalleVentas,
    getRepartoPorDia,
    getStockActual,
    getAbonosPorDia,
} from "../controllers/reportes.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";

const router = Router();
router.use(verificarToken);

// GET /api/reportes/resumen?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD
router.get("/resumen", getResumen);
router.get("/ventas-dia", getVentasPorDia);
router.get("/ventas-mes", getVentasPorMes);
router.get("/productos-vendidos", getProductosMasVendidos);
router.get("/detalle-ventas", getDetalleVentas);
router.get("/reparto-dia", getRepartoPorDia);
router.get("/stock", getStockActual);
router.get("/abonos-dia", getAbonosPorDia);

export default router;