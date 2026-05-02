import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute — guarda de rutas con control de rol
 *
 * Props:
 *   rolesPermitidos: string[]  — roles que pueden acceder.
 *                                Si está vacío, cualquier usuario autenticado puede entrar.
 *   children: ReactNode
 */
const ProtectedRoute = ({ children, rolesPermitidos = [] }) => {
  // Leer token y usuario del localStorage
  const token = localStorage.getItem("token");
  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  })();

  // 1. Sin token → al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 2. Si hay roles requeridos, verificar que el usuario los tenga
  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol)) {
    // Redirigir al dashboard con mensaje de acceso denegado
    return <Navigate to="/dashboard" replace state={{ accesoDenegado: true }} />;
  }

  return children;
};

export default ProtectedRoute;