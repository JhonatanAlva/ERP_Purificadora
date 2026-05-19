import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import clientesRoutes from "./routes/clientes.routes.js";
import inventarioRoutes from "./routes/inventario.routes.js";
import ventasRoutes from "./routes/ventas.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";
import proveedoresRoutes from "./routes/proveedores.routes.js";
import comprasRoutes from "./routes/compras.routes.js";
import repartoRoutes from "./routes/reparto.routes.js";
import creditosRoutes from "./routes/creditos.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";

const app = express();

app.use(helmet());

const origenesPermitidos = (process.env.CORS_ORIGINS || "http://localhost:5174")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origenesPermitidos.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origen no permitido → ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Rate limit general — excluye /auth/me para no bloquear verificaciones
const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/auth/me", // /auth/me no cuenta para el límite
  message: { ok: false, message: "Demasiadas peticiones. Intenta en 15 minutos." },
});

app.use(limitadorGeneral);

app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({ message: "API funcionando correctamente" });
});

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use("/api/auth",        authRoutes);        // limitadorLogin ya está dentro
app.use("/api/clientes",    clientesRoutes);
app.use("/api/inventario",  inventarioRoutes);
app.use("/api/ventas",      ventasRoutes);
app.use("/api/pedidos",     pedidosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/compras",     comprasRoutes);
app.use("/api/reparto",     repartoRoutes);
app.use("/api/creditos",    creditosRoutes);
app.use("/api/reportes",    reportesRoutes);
app.use("/api/usuarios",    usuariosRoutes);

app.use((err, req, res, next) => {
  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ ok: false, message: err.message });
  }
  console.error("[ERROR GLOBAL]", err.message);
  res.status(500).json({ ok: false, message: "Error interno del servidor" });
});

export default app;