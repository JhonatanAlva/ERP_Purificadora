import { Router } from "express";
import {
    getUsuarios, getUsuario, createUsuario,
    updateUsuario, cambiarPassword, toggleActivo,
    deleteUsuario, getEstadisticas,
} from "../controllers/usuarios.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";

const router = Router();

// ── Middleware: solo superadmin puede acceder a este módulo ──────────────────
const soloSuperAdmin = (req, res, next) => {
    if (req.user?.rol !== "superadmin") {
        return res.status(403).json({ ok: false, message: "Acceso denegado. Se requiere rol superadmin." });
    }
    next();
};

router.use(verificarToken);
router.use(soloSuperAdmin);

router.get("/estadisticas", getEstadisticas);   // GET    /api/usuarios/estadisticas
router.get("/", getUsuarios);        // GET    /api/usuarios
router.get("/:id", getUsuario);         // GET    /api/usuarios/:id
router.post("/", createUsuario);      // POST   /api/usuarios
router.put("/:id", updateUsuario);      // PUT    /api/usuarios/:id
router.put("/:id/password", cambiarPassword);    // PUT    /api/usuarios/:id/password
router.put("/:id/toggle", toggleActivo);       // PUT    /api/usuarios/:id/toggle
router.delete("/:id", deleteUsuario);      // DELETE /api/usuarios/:id

export default router;