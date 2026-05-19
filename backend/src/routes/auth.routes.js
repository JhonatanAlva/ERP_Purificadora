import express from "express";
import rateLimit from "express-rate-limit";
import { login, logout, getMe } from "../controllers/auth.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";

const router = express.Router();

const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Demasiados intentos de login. Intenta en 15 minutos." },
});

router.post("/login",  limitadorLogin, login); // rate limit solo en login
router.post("/logout", logout);
router.get("/me",      verificarToken, getMe); // sin rate limit estricto

export default router;