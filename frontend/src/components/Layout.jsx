import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  ClipboardList,
  Truck,
  BarChart3,
  UserCog,
  Menu,
  X,
  Droplets,
  ShoppingBag,
  Building2,
  ChevronRight,
  Wallet,
  LogOut,
} from "lucide-react";
import logo from "../assets/logo.png";

const navMain = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Clientes", icon: Users, path: "/clientes" },
  { label: "Inventario", icon: Package, path: "/inventario" },
  { label: "Ventas", icon: ShoppingCart, path: "/ventas" },
  { label: "Pedidos", icon: ClipboardList, path: "/pedidos" },
  { label: "Compras", icon: ShoppingBag, path: "/compras" },
  { label: "Proveedores", icon: Building2, path: "/proveedores" },
];

const navOperaciones = [{ label: "Reparto", icon: Truck, path: "/reparto" }];
const navFinanzas = [{ label: "Créditos", icon: Wallet, path: "/creditos" }];
const navAdmin = [
  { label: "Reportes", icon: BarChart3, path: "/reportes" },
  { label: "Usuarios", icon: UserCog, path: "/usuarios" },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  // Leer usuario del localStorage (lo guarda el login)
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const renderSection = (title, items) => (
    <div>
      <p className="text-xs text-gray-500 uppercase px-3 mb-2 mt-4">{title}</p>
      {items.map((item) => {
        const IconComponent = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
              ${isActive(item.path)
                ? "bg-sky-500 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
          >
            <IconComponent size={18} />
            <span>{item.label}</span>
            {isActive(item.path) && <ChevronRight className="ml-auto w-4 h-4" />}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "#111827" }}
      >
        {/* LOGO */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <img
            src={logo}
            alt="Logo"
            className="w-9 h-9 rounded-xl shadow-lg object-contain"
          />
          <div>
            <p className="text-white font-bold text-sm">Purificadora El Glaciar</p>
            <p className="text-sky-400 text-xs">Sistema de Gestión</p>
          </div>
          <button
            className="ml-auto lg:hidden text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          {renderSection("General", navMain)}
          {renderSection("Operaciones", navOperaciones)}
          {renderSection("Finanzas", navFinanzas)}
          {renderSection("Administración", navAdmin)}
        </nav>

        {/* USUARIO + LOGOUT en sidebar */}
        <div className="px-3 pb-3 border-t border-white/10 pt-3">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.nombre}</p>
                <p className="text-gray-500 text-xs truncate">{user.rol}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition"
          >
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>

        {/* FOOTER */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-gray-500 text-xs text-center">© 2026 Purificadora El Glaciar</p>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b px-4 py-3 flex items-center shadow-sm">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <h1 className="ml-3 font-semibold text-gray-800">
            {[...navMain, ...navOperaciones, ...navFinanzas, ...navAdmin]
              .find((n) => isActive(n.path))?.label || "Dashboard"}
          </h1>

          {/* PERFIL + LOGOUT en header */}
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700 leading-none">{user.nombre}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.rol}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}