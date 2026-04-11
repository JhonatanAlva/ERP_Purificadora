import Layout from "../components/Layout";
import { useState } from "react";
import { ShoppingBag, Plus, Trash2 } from "lucide-react";

const Compras = () => {
  const [compras, setCompras] = useState([]);
  const [productos] = useState([
    { id: 1, nombre: "Garrafón 20L", precio: 8 },
    { id: 2, nombre: "Botella 1L", precio: 3 }
  ]);

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

  const registrarCompra = () => {
    if (carrito.length === 0) return;

    const nuevaCompra = {
      id: Date.now(),
      items: carrito,
      total
    };

    setCompras([...compras, nuevaCompra]);
    setCarrito([]);
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <ShoppingBag className="w-6 h-6 text-blue-600" />
        Compras
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
        <h2 className="font-bold mb-2">Carrito de compra</h2>

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
          onClick={registrarCompra}
          className="mt-2 w-full bg-green-600 text-white p-2 rounded flex items-center justify-center gap-1"
        >
          <Plus size={16} /> Registrar Compra
        </button>
      </div>

      {/* Historial */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">Compras realizadas</h2>

        {compras.map(c => (
          <div key={c.id} className="border-b py-2">
            <p className="font-semibold">Compra #{c.id}</p>
            <p>Total: Q {c.total}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Compras;