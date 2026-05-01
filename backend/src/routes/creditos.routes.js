import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
    getCreditos,
    getCredito,
    createCredito,
    abonar,
    cancelarCredito,
    getEstadisticas,
} from "../controllers/creditos.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";

const router = Router();

// ── Rate limiting específico para operaciones financieras ────────────────────
// Máximo 30 abonos por IP cada 15 minutos
const limitadorAbonos = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { ok: false, message: "Demasiadas operaciones. Intenta en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Máximo 20 créditos nuevos por IP cada hora
const limitadorCreacion = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { ok: false, message: "Límite de creación alcanzado. Intenta en 1 hora." },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Todas las rutas requieren token ─────────────────────────────────────────
router.use(verificarToken);

router.get("/estadisticas", getEstadisticas);            // GET    /api/creditos/estadisticas
router.get("/", getCreditos);                 // GET    /api/creditos
router.get("/:id", getCredito);                  // GET    /api/creditos/:id
router.post("/", limitadorCreacion, createCredito);             // POST   /api/creditos
router.post("/:id/abonar", limitadorAbonos, abonar);              // POST   /api/creditos/:id/abonar
router.put("/:id/cancelar", cancelarCredito);             // PUT    /api/creditos/:id/cancelar

export default router;