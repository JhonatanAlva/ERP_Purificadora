import { Router } from "express";
import {
    getRutas,
    getRuta,
    createRuta,
    cerrarRuta,
    updateRuta,
    deleteRuta,
    getEstadisticas,
} from "../controllers/reparto.controller.js";
import { verificarToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.use(verificarToken);

router.get("/estadisticas", getEstadisticas);   // GET    /api/reparto/estadisticas
router.get("/", getRutas);           // GET    /api/reparto
router.get("/:id", getRuta);            // GET    /api/reparto/:id
router.post("/", createRuta);         // POST   /api/reparto
router.put("/:id/cerrar", requireAdmin, cerrarRuta);  // PUT    /api/reparto/:id/cerrar (admin+)
router.put("/:id", updateRuta);         // PUT    /api/reparto/:id
router.delete("/:id", requireAdmin, deleteRuta);      // DELETE /api/reparto/:id (admin+)

export default router;