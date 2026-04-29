import * as comprasService from "../services/compras.service.js";

export const getCompras = async (req, res) => {
  try {
    const { estado, proveedor_id, fecha_inicio, fecha_fin, page, limit } = req.query;
    const result = await comprasService.getAllCompras({
      estado, proveedor_id, fecha_inicio, fecha_fin,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error al obtener compras" });
  }
};

export const getCompra = async (req, res) => {
  try {
    const compra = await comprasService.getCompraById(req.params.id);
    if (!compra) return res.status(404).json({ ok: false, message: "Compra no encontrada" });
    res.json({ ok: true, data: compra });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error al obtener compra" });
  }
};

export const createCompra = async (req, res) => {
  try {
    const { proveedor_id, fecha, metodo_pago, estado, notas, detalle } = req.body;

    if (!proveedor_id || !fecha || !detalle || detalle.length === 0) {
      return res.status(400).json({ ok: false, message: "proveedor_id, fecha y detalle son requeridos" });
    }

    const compra = await comprasService.createCompra({ proveedor_id, fecha, metodo_pago, estado, notas, detalle });
    res.status(201).json({ ok: true, data: compra });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error al crear compra" });
  }
};

export const updateCompra = async (req, res) => {
  try {
    const compra = await comprasService.updateCompra(req.params.id, req.body);
    if (!compra) return res.status(404).json({ ok: false, message: "Compra no encontrada" });
    res.json({ ok: true, data: compra });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error al actualizar compra" });
  }
};

export const deleteCompra = async (req, res) => {
  try {
    const compra = await comprasService.deleteCompra(req.params.id);
    if (!compra) return res.status(404).json({ ok: false, message: "Compra no encontrada" });
    res.json({ ok: true, message: "Compra eliminada", data: compra });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error al eliminar compra" });
  }
};

export const getEstadisticas = async (req, res) => {
  try {
    const stats = await comprasService.getEstadisticasCompras();
    res.json({ ok: true, data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Error al obtener estadísticas" });
  }
};