import * as service from "../services/reparto.service.js";

export const getRutas = async (req, res) => {
    try {
        const { estado, piloto, fecha_inicio, fecha_fin, page, limit } = req.query;
        const result = await service.getAllRutas({
            estado, piloto, fecha_inicio, fecha_fin,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
        });
        res.json({ ok: true, ...result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: "Error al obtener rutas" });
    }
};

export const getRuta = async (req, res) => {
    try {
        const ruta = await service.getRutaById(req.params.id);
        if (!ruta) return res.status(404).json({ ok: false, message: "Ruta no encontrada" });
        res.json({ ok: true, data: ruta });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: "Error al obtener ruta" });
    }
};

export const createRuta = async (req, res) => {
    try {
        const { fecha, piloto, camion, zona_ruta, hora_salida, observaciones, detalle } = req.body;
        if (!fecha || !piloto || !detalle || detalle.length === 0) {
            return res.status(400).json({ ok: false, message: "fecha, piloto y detalle son requeridos" });
        }
        const ruta = await service.createRuta({ fecha, piloto, camion, zona_ruta, hora_salida, observaciones, detalle });
        res.status(201).json({ ok: true, data: ruta });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: err.message || "Error al crear ruta" });
    }
};

export const cerrarRuta = async (req, res) => {
    try {
        const { hora_regreso, efectivo_entregado, notas_regreso, detalle } = req.body;
        if (!detalle || detalle.length === 0) {
            return res.status(400).json({ ok: false, message: "El detalle de devoluciones es requerido" });
        }
        const ruta = await service.cerrarRuta(req.params.id, {
            hora_regreso, efectivo_entregado, notas_regreso, detalle
        });
        res.json({ ok: true, data: ruta });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: err.message || "Error al cerrar ruta" });
    }
};

export const updateRuta = async (req, res) => {
    try {
        const ruta = await service.updateRuta(req.params.id, req.body);
        if (!ruta) return res.status(404).json({ ok: false, message: "Ruta no encontrada" });
        res.json({ ok: true, data: ruta });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: "Error al actualizar ruta" });
    }
};

export const deleteRuta = async (req, res) => {
    try {
        const ruta = await service.deleteRuta(req.params.id);
        if (!ruta) return res.status(404).json({ ok: false, message: "Ruta no encontrada" });
        res.json({ ok: true, message: "Ruta eliminada", data: ruta });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: "Error al eliminar ruta" });
    }
};

export const getEstadisticas = async (req, res) => {
    try {
        const stats = await service.getEstadisticasReparto();
        res.json({ ok: true, data: stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, message: "Error al obtener estadísticas" });
    }
};