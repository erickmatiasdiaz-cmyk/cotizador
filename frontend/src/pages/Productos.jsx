import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getProductos, getCategorias, createProducto, updateProducto, deleteProducto } from '../services/api';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '',
      descripcion: '',
      categoria_id: '',
      precio_unitario: 0,
      stock_actual: 0,
      unidad_medida: 'unidad',
      imagen_url: ''
    }
  });

  useEffect(() => {
    loadProductos();
    getCategorias().then(res => setCategorias(res.data)).catch(console.error);
  }, [search, categoriaFilter]);

  const loadProductos = () => {
    setLoading(true);
    getProductos({ search, categoria_id: categoriaFilter })
      .then(res => setProductos(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const onSubmit = async (data) => {
    try {
      const productoData = {
        ...data,
        categoria_id: data.categoria_id ? parseInt(data.categoria_id) : null,
        precio_unitario: parseFloat(data.precio_unitario),
        stock_actual: parseInt(data.stock_actual)
      };

      if (editingId) {
        await updateProducto(editingId, productoData);
        alert('✅ Producto actualizado exitosamente');
      } else {
        await createProducto(productoData);
        alert('✅ Producto creado exitosamente');
      }
      
      reset();
      setEditingId(null);
      setShowForm(false);
      loadProductos();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar producto');
    }
  };

  const handleEdit = (producto) => {
    reset(producto);
    setEditingId(producto.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      await deleteProducto(id);
      alert('Producto eliminado');
      loadProductos();
    } catch (error) {
      alert('Error al eliminar producto');
    }
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Productos</h1>
          <p className="text-gray-600 mt-1">Gestiona el catálogo de productos</p>
        </div>
        <button
          onClick={() => {
            reset();
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition font-medium"
        >
          ➕ Nuevo Producto
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {editingId ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  {...register('nombre', { required: 'Requerido' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.nombre && (
                  <p className="text-red-600 text-sm mt-1">{errors.nombre.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  {...register('descripcion')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Imagen (Opcional)
                </label>
                <input
                  type="url"
                  {...register('imagen_url')}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  {...register('categoria_id')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Medida
                </label>
                <select
                  {...register('unidad_medida')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unidad">Unidad</option>
                  <option value="kg">Kilogramo (kg)</option>
                  <option value="lb">Libra (lb)</option>
                  <option value="lt">Litro (lt)</option>
                  <option value="galon">Galón</option>
                  <option value="metro">Metro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Unitario *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('precio_unitario', { required: 'Requerido', min: 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.precio_unitario && (
                  <p className="text-red-600 text-sm mt-1">{errors.precio_unitario.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Actual
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('stock_actual', { min: 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition"
              >
                {editingId ? 'Actualizar' : 'Crear'} Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nombre</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Categoría</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Precio</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Stock</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Unidad</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto) => (
                  <tr key={producto.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium">{producto.nombre}</td>
                    <td className="py-3 px-4 text-sm">{producto.categoria || '-'}</td>
                    <td className="py-3 px-4 text-sm font-semibold">${producto.precio_unitario.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        producto.stock_actual > 10 
                          ? 'bg-green-100 text-green-800' 
                          : producto.stock_actual > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {producto.stock_actual}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{producto.unidad_medida}</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(producto)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(producto.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {productos.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No se encontraron productos
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Productos;
