import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login      from "./pages/Login";
import Dashboard  from "./pages/Dashboard";
import Clientes   from "./pages/Clientes";
import Inventario from "./pages/Inventario";
import Ventas     from "./pages/Ventas";
import Pedidos    from "./pages/Pedidos";
import Compras    from "./pages/Compras";
import Proveedores from "./pages/Proveedores";
import Creditos   from "./pages/Creditos";
import Reparto    from "./pages/Reparto";
import Reportes   from "./pages/Reportes";
import Usuarios   from "./pages/Usuarios";
import ProtectedRoute from "./components/ProtectedRoute";

// ─── Permisos por página ──────────────────────────────────────────────────────
const PERMISOS = {
  "/dashboard":   [],
  "/clientes":    [],
  "/ventas":      [],
  "/pedidos":     [],
  "/reparto":     [],
  "/inventario":  ["superadmin", "admin"],
  "/compras":     ["superadmin", "admin"],
  "/proveedores": ["superadmin", "admin"],
  "/creditos":    ["superadmin", "admin"],
  "/reportes":    ["superadmin", "admin"],
  "/usuarios":    ["superadmin"],
};

function App() {
  return (
    <HashRouter>
      <Routes>

        {/* Pública */}
        <Route path="/" element={<Login />} />

        {/* Protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/dashboard"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clientes"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/clientes"]}>
              <Clientes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ventas"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/ventas"]}>
              <Ventas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pedidos"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/pedidos"]}>
              <Pedidos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reparto"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/reparto"]}>
              <Reparto />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventario"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/inventario"]}>
              <Inventario />
            </ProtectedRoute>
          }
        />

        <Route
          path="/compras"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/compras"]}>
              <Compras />
            </ProtectedRoute>
          }
        />

        <Route
          path="/proveedores"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/proveedores"]}>
              <Proveedores />
            </ProtectedRoute>
          }
        />

        <Route
          path="/creditos"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/creditos"]}>
              <Creditos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reportes"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/reportes"]}>
              <Reportes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <ProtectedRoute rolesPermitidos={PERMISOS["/usuarios"]}>
              <Usuarios />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </HashRouter>
  );
}

export default App;