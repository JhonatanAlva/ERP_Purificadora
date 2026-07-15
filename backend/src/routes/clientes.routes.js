import { Router } from "express";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente
} from "../controllers/clientes.controller.js";
import { verificarToken, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Obtener clientes
router.get("/", verificarToken, getClientes);

// Crear cliente
router.post("/", verificarToken, createCliente);

// Actualizar cliente
router.put("/:id", verificarToken, updateCliente);

// Desactivar cliente (requiere admin o superadmin)
router.delete("/:id", verificarToken, requireAdmin, deleteCliente);

export default router;