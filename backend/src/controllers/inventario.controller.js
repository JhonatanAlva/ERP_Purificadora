import * as service from "../services/inventario.service.js";

// PRODUCTOS
export const getProductos = async (req, res) => {
  try {
    const data = await service.getProductos();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProducto = async (req, res) => {
  try {
    await service.createProducto(req.body);
    res.json({ message: "Producto creado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProducto = async (req, res) => {
  try {
    await service.updateProducto(req.params.id, req.body);
    res.json({ message: "Producto actualizado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteProducto = async (req, res) => {
  try {
    await service.deleteProducto(req.params.id);
    res.json({ message: "Producto desactivado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const activarProducto = async (req, res) => {
  try {
    await service.activarProducto(req.params.id);
    res.json({ message: "Producto activado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// MOVIMIENTOS
export const getMovimientos = async (req, res) => {
  try {
    const data = await service.getMovimientos();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createMovimiento = async (req, res) => {
  try {
    const result = await service.createMovimiento(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};