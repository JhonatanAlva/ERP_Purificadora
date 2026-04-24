import * as service from "../services/proveedores.service.js";

export const getAll = async (req, res) => {
    try {
        const data = await service.getAll();
        res.json(data);
    } catch (err) {
        console.error("Error getAll proveedores:", err);
        res.status(500).json({ error: "Error al obtener proveedores" });
    }
};

export const getById = async (req, res) => {
    try {
        const proveedor = await service.getById(req.params.id);
        if (!proveedor) return res.status(404).json({ error: "Proveedor no encontrado" });
        res.json(proveedor);
    } catch (err) {
        console.error("Error getById proveedor:", err);
        res.status(500).json({ error: "Error al obtener proveedor" });
    }
};

export const create = async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre?.trim()) {
            return res.status(400).json({ error: "El nombre es requerido" });
        }
        const nuevo = await service.create(req.body);
        res.status(201).json(nuevo);
    } catch (err) {
        console.error("Error create proveedor:", err);
        res.status(500).json({ error: "Error al crear proveedor" });
    }
};

export const update = async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre?.trim()) {
            return res.status(400).json({ error: "El nombre es requerido" });
        }
        const actualizado = await service.update(req.params.id, req.body);
        if (!actualizado) return res.status(404).json({ error: "Proveedor no encontrado" });
        res.json(actualizado);
    } catch (err) {
        console.error("Error update proveedor:", err);
        res.status(500).json({ error: "Error al actualizar proveedor" });
    }
};

export const remove = async (req, res) => {
    try {
        const eliminado = await service.remove(req.params.id);
        if (!eliminado) return res.status(404).json({ error: "Proveedor no encontrado" });
        res.json({ message: "Proveedor eliminado correctamente" });
    } catch (err) {
        console.error("Error delete proveedor:", err);
        res.status(500).json({ error: "Error al eliminar proveedor" });
    }
};