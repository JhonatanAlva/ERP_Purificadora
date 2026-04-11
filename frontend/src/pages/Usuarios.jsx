import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { UserCog, User, Crown } from "lucide-react";

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    // simulación de usuarios
    const lista = [
      {
        id: 1,
        nombre: "Admin",
        email: "admin@test.com",
        rol: "admin"
      },
      {
        id: 2,
        nombre: "Usuario",
        email: "user@test.com",
        rol: "user"
      }
    ];

    setUsuarios(lista);

    // opcional: puedes incluir el usuario logueado
    if (user) {
      setUsuarios((prev) => [...prev, user]);
    }
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <UserCog className="w-6 h-6 text-blue-600" />
        Usuarios
      </h1>

      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Nombre</th>
            <th className="p-2">Email</th>
            <th className="p-2">Rol</th>
          </tr>
        </thead>

        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-2 flex items-center gap-2">
                <User size={16} /> {u.nombre}
              </td>
              <td className="p-2">{u.email}</td>
              <td className="p-2 text-center">
                {u.rol === "admin" ? (
                  <span className="text-purple-600 flex items-center justify-center gap-1">
                    <Crown size={14} /> Admin
                  </span>
                ) : (
                  <span className="text-blue-600">Usuario</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

export default Usuarios;