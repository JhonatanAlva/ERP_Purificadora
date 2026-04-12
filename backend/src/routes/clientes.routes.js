import { Router } from "express";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente
} from "../controllers/clientes.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";

const router = Router();

// Obtener clientes
router.get("/", verificarToken, getClientes);

// Crear cliente
router.post("/", verificarToken, createCliente);

// Actualizar cliente
router.put("/:id", verificarToken, updateCliente);

// Desactivar cliente
router.delete("/:id", verificarToken, deleteCliente);

export default router;