import React, { useState, useEffect } from 'react';
import { getPublicProductos, getPublicConfig, solicitarPedidoPublico } from '../services/api';

const CatalogoPublico = () => {
  const [config, setConfig] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrito
  const [carrito, setCarrito] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Formulario de checkout
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null); // guardará el nro de pedido

  useEffect(() => {
    Promise.all([getPublicConfig(), getPublicProductos()])
      .then(([confRes, prodRes]) => {
        setConfig(confRes.data);
        setProductos(prodRes.data.filter(p => true)); // Se muestran todos, opcional p.stock_actual > 0
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (producto) => {
    setCarrito(prev => {
      const exist = prev.find(item => item.producto_id === producto.id);
      if (exist) {
        return prev.map(item => item.producto_id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { producto_id: producto.id, nombre: producto.nombre, precio: producto.precio_unitario, cantidad: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCarrito(prev => prev.filter(item => item.producto_id !== id));
  };

  const updateCantidad = (id, cant) => {
    if (cant < 1) return;
    setCarrito(prev => prev.map(item => item.producto_id === id ? { ...item, cantidad: cant } : item));
  };

  const calcularSubtotal = () => carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) return alert('El carrito está vacío');
    setSending(true);
    try {
      const res = await solicitarPedidoPublico({
        ...formData,
        carrito
      });
      setSuccess(res.data.numero);
      setCarrito([]);
      setIsCartOpen(false);
    } catch (error) {
      alert('Hubo un error al enviar tu pedido. Por favor intenta de nuevo.');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-xl text-gray-500">Cargando catálogo...</div>;
  }

  const SUPERMERCADO_NOMBRE = config?.SUPERMERCADO_NOMBRE || 'Súper en Línea';
  const MONEDA = config?.MONEDA || '$';

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* HEADER HEROICO */}
      <header className="bg-blue-800 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {config?.SUPERMERCADO_LOGO ? (
              <img src={config.SUPERMERCADO_LOGO} alt="Logo" className="h-10 object-contain bg-white rounded-md p-1" />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
                {SUPERMERCADO_NOMBRE.charAt(0)}
              </div>
            )}
            <h1 className="text-xl font-bold tracking-wide hidden sm:block">{SUPERMERCADO_NOMBRE}</h1>
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-full transition relative"
          >
            <span className="text-xl">🛒</span>
            <span className="font-semibold">Pedir</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {success ? (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center mx-auto max-w-lg mt-10 border-t-8 border-green-500">
            <h2 className="text-3xl font-bold text-green-600 mb-4">¡Pedido Recibido! 🎉</h2>
            <p className="text-gray-600 text-lg mb-6">Tu orden ha sido registrada exitosamente en nuestro sistema. Uno de nuestros asesores la está preparando.</p>
            <div className="bg-green-50 text-green-800 p-4 rounded-lg text-2xl font-mono font-bold tracking-wider mb-6 shadow-inner">
              {success}
            </div>
            <p className="text-gray-500 text-sm mb-8">Por favor guarda este número de folio para cualquier duda.</p>
            <button 
              onClick={() => setSuccess(null)}
              className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 font-semibold shadow-md transition"
            >
              Hacer otro pedido
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">Nuestros Productos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {productos.map(prod => (
                <div key={prod.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition flex flex-col">
                  {prod.imagen_url ? (
                    <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-48 object-cover border-b" />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center border-b">
                      <span className="text-4xl text-gray-300">🛍️</span>
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-grow">
                    <div className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">{prod.categoria || 'Sin Categoría'}</div>
                    <h3 className="font-bold text-gray-800 text-lg mb-1 leading-tight">{prod.nombre}</h3>
                    <p className="text-gray-500 text-sm flex-grow mb-3 line-clamp-2">{prod.descripcion}</p>
                    <div className="flex items-end justify-between mt-auto">
                      <span className="font-bold text-2xl text-gray-900">${prod.precio_unitario.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(prod)}
                      className="mt-4 w-full bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white font-bold py-2 rounded-lg transition"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              ))}
              {productos.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  Aún no hay productos en el catálogo.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* SIDEBAR DE CARRITO Y CHECKOUT */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsCartOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white flex flex-col shadow-2xl animate-fade-in-right">
            
            <div className="bg-blue-800 p-4 text-white flex justify-between items-center shadow-md">
              <h2 className="text-xl font-bold flex items-center">
                🛒 Tu Pedido ({totalItems})
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="text-white hover:text-red-200 text-2xl leading-none">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {carrito.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <div className="text-5xl mb-4">🛒</div>
                  El carrito está vacío.
                </div>
              ) : (
                <div className="space-y-4">
                  {carrito.map(item => (
                    <div key={item.producto_id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <h4 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{item.nombre}</h4>
                        <span className="text-blue-600 font-bold">${item.precio.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => updateCantidad(item.producto_id, item.cantidad - 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">-</button>
                        <span className="w-4 text-center font-semibold">{item.cantidad}</span>
                        <button onClick={() => updateCantidad(item.producto_id, item.cantidad + 1)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">+</button>
                      </div>
                      <button onClick={() => removeFromCart(item.producto_id)} className="ml-3 text-red-500 hover:text-red-700">🗑️</button>
                    </div>
                  ))}
                  
                  <div className="bg-white p-4 rounded-lg shadow-md mt-6 border-t font-semibold">
                    <div className="flex justify-between text-gray-600 mb-1">
                      <span>Subtotal (aprox):</span>
                      <span>${calcularSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-center text-gray-400 mt-2">Los impuestos (IVA) se calcularán en el total definitivo al enviar la orden.</div>
                  </div>

                  <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-md mt-4 border border-blue-100">
                    <h3 className="font-bold text-gray-800 mb-3 border-b pb-2">📝 Datos de Contacto</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Nombre Completo *</label>
                        <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Correo Electrónico *</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">WhatsApp / Teléfono</label>
                        <input type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Dirección de Entrega</label>
                        <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Calle, Número, Colonia" />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={sending}
                      className="w-full mt-5 bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {sending ? 'Procesando...' : '📩 Enviar Pedido Web'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogoPublico;
