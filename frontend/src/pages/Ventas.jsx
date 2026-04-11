import Layout from "../components/Layout";
import { useState } from "react";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";

const Ventas = () => {
  const [productos] = useState([
    { id: 1, nombre: "Garrafón 20L", precio: 10 },
    { id: 2, nombre: "Botella 1L", precio: 5 }
  ]);

  const [ventas, setVentas] = useState([]);
  const [carrito, setCarrito] = useState([]);

  const agregarProducto = (prod) => {
    const existe = carrito.find(p => p.id === prod.id);

    if (existe) {
      setCarrito(
        carrito.map(p =>
          p.id === prod.id
            ? { ...p, cantidad: p.cantidad + 1 }
            : p
        )
      );
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };

  const eliminarProducto = (id) => {
    setCarrito(carrito.filter(p => p.id !== id));
  };

  const total = carrito.reduce(
    (sum, p) => sum + p.precio * p.cantidad,
    0
  );

  const registrarVenta = () => {
    if (carrito.length === 0) return;

    const nuevaVenta = {
      id: Date.now(),
      items: carrito,
      total
    };

    setVentas([...ventas, nuevaVenta]);
    setCarrito([]);
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6 text-blue-600" />
        Ventas
      </h1>

      {/* Productos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {productos.map(p => (
          <button
            key={p.id}
            onClick={() => agregarProducto(p)}
            className="border p-3 rounded hover:bg-blue-50"
          >
            <p className="font-semibold">{p.nombre}</p>
            <p className="text-blue-600">Q {p.precio}</p>
          </button>
        ))}
      </div>

      {/* Carrito */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-bold mb-2">Carrito</h2>

        {carrito.length === 0 ? (
          <p className="text-gray-400">Vacío</p>
        ) : (
          carrito.map(item => (
            <div key={item.id} className="flex justify-between mb-2">
              <span>{item.nombre} x{item.cantidad}</span>
              <div className="flex gap-2 items-center">
                <span>Q {item.precio * item.cantidad}</span>
                <button
                  onClick={() => eliminarProducto(item.id)}
                  className="text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}

        <hr className="my-2" />

        <p className="font-bold">Total: Q {total}</p>

        <button
          onClick={registrarVenta}
          className="mt-2 w-full bg-green-600 text-white p-2 rounded"
        >
          <Plus size={16} /> Registrar Venta
        </button>
      </div>

      {/* Historial */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">Ventas realizadas</h2>

        {ventas.map(v => (
          <div key={v.id} className="border-b py-2">
            <p className="font-semibold">Venta #{v.id}</p>
            <p>Total: Q {v.total}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Ventas;