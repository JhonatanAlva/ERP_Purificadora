import * as service from "../services/reportes.service.js";

// Validar y parsear rango de fechas del query
const parsearFechas = (query) => {
    const hoy = new Date().toISOString().split("T")[0];
    const inicio = new Date();
    inicio.setDate(1);

    let fecha_inicio = query.fecha_inicio || inicio.toISOString().split("T")[0];
    let fecha_fin = query.fecha_fin || hoy;

    // Sanitizar: solo YYYY-MM-DD
    const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexFecha.test(fecha_inicio)) fecha_inicio = inicio.toISOString().split("T")[0];
    if (!regexFecha.test(fecha_fin)) fecha_fin = hoy;

    // fecha_fin no puede ser anterior a fecha_inicio
    if (fecha_fin < fecha_inicio) fecha_fin = fecha_inicio;

    return { fecha_inicio, fecha_fin };
};

export const getResumen = async (req, res) => {
    try {
        const fechas = parsearFechas(req.query);
        const data = await service.getResumen(fechas);
        res.json({ ok: true, data, ...fechas });
    } catch (err) {
        console.error("[reportes/resumen]", err.message);
        res.status(500).json({ ok: false, message: "Error al generar resumen" });
    }
};

export const getVentasPorDia = async (req, res) => {
    try {
        const fechas = parsearFechas(req.query);
        const data = await service.getVentasPorDia(fechas);
        res.json({ ok: true, data });
    } catch (err) {
        console.error("[reportes/ventas-dia]", err.message);
        res.status(500).json({ ok: false, message: "Error" });
    }
};

export const getVentasPorMes = async (req, res) => {
    try {
        const data = await service.getVentasPorMes();
        res.json({ ok: true, data });
    } catch (err) {
        console.error("[reportes/ventas-mes]", err.message);
        res.status(500).json({ ok: false, message: "Error" });
    }
};

export const getProductosMasVendidos = async (req, res) => {
    try {
        const fechas = parsearFechas(req.query);
        const data = await service.getProductosMasVendidos(fechas);
        res.json({ ok: true, data });
    } catch (err) {
        console.error("[reportes/productos]", err.message);
        res.status(500).json({ ok: false, message: "Error" });
    }
};

export const getDetalleVentas = async (req, res) => {
    try {
        const fechas = parsearFechas(req.query);
        const data = await service.getDetalleVentas(fechas);
        res.json({ ok: true, data });
    } catch (err) {
        console.error("[reportes/detalle-ventas]", err.message);
        res.status(500).json({ ok: false, message: "Error" });
    }
};

export const getRepartoPorDia = async (req, res) => {
    try {
        const fechas = parsearFechas(req.query);
        const data = await service.getRepartoPorDia(fechas);
        res.json({ ok: true, data });
    } catch (err) {
        console.error("[reportes/reparto]", err.message);
        res.status(500).json({ ok: false, message: "Error" });
    }
};

export const getStockActual = async (req, res) => {
    try {
        const data = await service.getStockActual();
        res.json({ ok: true, data });
    } catch (err) {
        console.error("[reportes/stock]", err.message);
        res.status(500).json({ ok: false, message: "Error" });
    }
};

export const getAbonosPorDia = async (req, res) => {
    try {
        const fechas = parsearFechas(req.query);
        const data = await service.getAbonosPorDia(fechas);
        res.json({ ok: true, data });
    } catch (err) {
        console.error("[reportes/abonos]", err.message);
        res.status(500).json({ ok: false, message: "Error" });
    }
};