import { useState, useEffect, useRef } from "react";
import { AuthContext } from "./AuthContextInstance";
import api from "../services/api";

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [cargando, setCargando] = useState(true);
  const verificado = useRef(false); // evita llamadas duplicadas

  useEffect(() => {
    if (verificado.current) return;
    verificado.current = true;

    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch((err) => {
        if (err.response?.status !== 401) {
          console.error("[AuthContext] Error inesperado:", err.message);
        }
        setUser(null);
      })
      .finally(() => setCargando(false));
  }, []);

  const login = (userData) => setUser(userData);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignorar */ }
    verificado.current = false; // permitir re-verificar al próximo login
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}