// ─── Configuración de navegación con control de roles ────────────────────────
// Importar esto en tu Layout.jsx para filtrar el menú según el rol del usuario

export const NAV_ITEMS = [
    // GENERAL
    {
        section: "GENERAL",
        items: [
            { label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard", roles: [] },
            { label: "Clientes", path: "/clientes", icon: "Users", roles: [] },
            { label: "Inventario", path: "/inventario", icon: "Package", roles: ["superadmin", "admin"] },
            { label: "Ventas", path: "/ventas", icon: "ShoppingCart", roles: [] },
            { label: "Pedidos", path: "/pedidos", icon: "ClipboardList", roles: [] },
            { label: "Compras", path: "/compras", icon: "ShoppingBag", roles: ["superadmin", "admin"] },
            { label: "Proveedores", path: "/proveedores", icon: "Building2", roles: ["superadmin", "admin"] },
        ],
    },
    // OPERACIONES
    {
        section: "OPERACIONES",
        items: [
            { label: "Reparto", path: "/reparto", icon: "Truck", roles: [] },
        ],
    },
    // FINANZAS
    {
        section: "FINANZAS",
        items: [
            { label: "Créditos", path: "/creditos", icon: "Wallet", roles: ["superadmin", "admin"] },
        ],
    },
    // ADMINISTRACIÓN
    {
        section: "ADMINISTRACIÓN",
        items: [
            { label: "Reportes", path: "/reportes", icon: "BarChart2", roles: ["superadmin", "admin"] },
            { label: "Usuarios", path: "/usuarios", icon: "UserCog", roles: ["superadmin"] },
        ],
    },
];

/**
 * Filtra los items de navegación según el rol del usuario.
 * items con roles: [] son visibles para todos los roles autenticados.
 */
export const filtrarNavPorRol = (rol) => {
    return NAV_ITEMS.map((seccion) => ({
        ...seccion,
        items: seccion.items.filter(
            (item) => item.roles.length === 0 || item.roles.includes(rol)
        ),
    })).filter((seccion) => seccion.items.length > 0); // ocultar secciones vacías
};