import * as clienteService from "../services/clientes.service.js";

// 🔹 Obtener clientes
export const getClientes = async (req, res) => {
  try {
    const { page = 1, limit = 10, estado = "todos" } = req.query;

    const result = await clienteService.obtenerClientes({
      page: Number(page),
      limit: Number(limit),
      estado,
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener clientes" });
  }
};

// 🔹 Crear cliente
export const createCliente = async (req, res) => {
  try {
    const {
      nombre,
      telefono,
      zona,
      direccion,
      tipo,
      garrafones_prestados,
      notas,
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: "Nombre es obligatorio" });
    }

    const nuevoCliente = await clienteService.crearCliente({
      nombre,
      telefono,
      zona,
      direccion,
      tipo,
      garrafones_prestados,
      notas,
    });

    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear cliente" });
  }
};

// 🔹 Actualizar cliente
export const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const actualizado = await clienteService.actualizarCliente(id, req.body);

    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar cliente" });
  }
};

// 🔹 Desactivar cliente (soft delete)
export const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    await clienteService.eliminarCliente(id);

    res.json({ message: "Cliente desactivado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar cliente" });
  }
};
