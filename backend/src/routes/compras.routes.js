import { Router } from "express";
import {
    getCompras,
    getCompra,
    createCompra,
    updateCompra,
    deleteCompra,
    getEstadisticas,
} from "../controllers/compras.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verificarToken);

router.get("/estadisticas", getEstadisticas);   // GET  /api/compras/estadisticas
router.get("/", getCompras);         // GET  /api/compras
router.get("/:id", getCompra);          // GET  /api/compras/:id
router.post("/", createCompra);       // POST /api/compras
router.put("/:id", updateCompra);       // PUT  /api/compras/:id
router.delete("/:id", deleteCompra);       // DELETE /api/compras/:id

export default router;