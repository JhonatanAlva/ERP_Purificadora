import express from "express";
import cors from "cors";
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

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/api/health", (req, res) => {
  res.json({
    message: "API funcionando correctamente",
  });
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/compras", comprasRoutes);
app.use("/api/reparto", repartoRoutes);
app.use("/api/creditos", creditosRoutes);
app.use("/api/reportes", reportesRoutes);

export default app;