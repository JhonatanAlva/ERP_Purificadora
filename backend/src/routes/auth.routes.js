import express from "express";
import { login, logout, getMe } from "../controllers/auth.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", verificarToken, getMe);

export default router;
