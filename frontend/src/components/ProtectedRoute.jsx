import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const ProtectedRoute = ({ children, rolesPermitidos = [] }) => {
  const { user, cargando } = useAuth();

  // Esperar a que AuthProvider termine de verificar la cookie
  if (cargando) return null; // o un spinner de pantalla completa

  // Sin sesión → login
  if (!user) return <Navigate to="/" replace />;

  // Rol no permitido → dashboard
  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(user.rol)) {
    return (
      <Navigate to="/dashboard" replace state={{ accesoDenegado: true }} />
    );
  }

  return children;
};

export default ProtectedRoute;
