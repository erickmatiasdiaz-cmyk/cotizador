import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getProductos, getCategorias, getProductosMetricas, createProducto, updateProducto, deleteProducto } from '../services/api';
import { formatCurrency } from '../utils/formatters';

const MAX_PRODUCT_IMAGE_BYTES = 1.6 * 1024 * 1024;
const MAX_PRODUCT_IMAGE_SIDE = 1100;

const optimizeProductImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(1, MAX_PRODUCT_IMAGE_SIDE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);

        if (dataUrl.length > MAX_PRODUCT_IMAGE_BYTES * 1.4) {
          reject(new Error('La imagen sigue siendo demasiado pesada. Prueba con una foto mas liviana.'));
          return;
        }

        resolve(dataUrl);
      };

      image.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error('No se pudo cargar el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [metricas, setMetricas] = useState(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
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
  const imagenPreview = watch('imagen_url');

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
    getProductosMetricas().then(res => setMetricas(res.data)).catch(console.error);
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

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const optimizedImage = await optimizeProductImage(file);
      setValue('imagen_url', optimizedImage, { shouldDirty: true });
    } catch (error) {
      alert(error.message || 'No se pudo procesar la imagen.');
      event.target.value = null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Inventory command center</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-gray-900">Productos e inventario</h1>
          <p className="text-gray-600 mt-1">Gestion comercial, valorizacion y alertas operativas del catalogo.</p>
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

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Productos activos', metricas?.total_productos || 0, `${metricas?.unidades_stock || 0} unidades totales`, 'bg-slate-950 text-white'],
          ['Inventario valorizado', formatCurrency(metricas?.valor_inventario || 0), 'Precio x stock disponible', 'bg-blue-700 text-white'],
          ['Stock critico', Number(metricas?.criticos || 0) + Number(metricas?.sin_stock || 0), 'Productos bajo umbral operativo', 'bg-rose-600 text-white'],
          ['Precio promedio', formatCurrency(metricas?.precio_promedio || 0), 'Referencia comercial catalogo', 'bg-amber-400 text-slate-950']
        ].map(([label, value, detail, tone]) => (
          <article key={label} className={`rounded-2xl p-5 shadow-sm ${tone}`}>
            <p className="text-xs font-black uppercase tracking-[0.14em] opacity-75">{label}</p>
            <p className="mt-3 text-2xl font-black">{value}</p>
            <p className="mt-1 text-sm opacity-75">{detail}</p>
          </article>
        ))}
      </section>

      {metricas?.movimientos?.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-950">Ultimos movimientos de stock</h2>
            <p className="text-sm text-slate-500">Trazabilidad base para auditoria e inventario profesional.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metricas.movimientos.slice(0, 4).map((mov) => (
              <div key={mov.id} className="rounded-xl bg-slate-50 p-4">
                <p className="truncate text-sm font-black text-slate-950">{mov.producto || 'Producto eliminado'}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{mov.tipo}</p>
                <p className="mt-3 text-sm text-slate-600">
                  {mov.stock_anterior} -&gt; <span className="font-black text-slate-950">{mov.stock_nuevo}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen del producto
                </label>
                <input type="hidden" {...register('imagen_url')} />
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                  {imagenPreview ? (
                    <img
                      src={imagenPreview}
                      alt="Vista previa del producto"
                      className="h-28 w-28 rounded-lg border border-gray-200 bg-white object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white text-sm font-semibold text-gray-400">
                      Sin imagen
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-3">
                      <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
                        Seleccionar imagen
                        <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                      </label>
                      {imagenPreview && (
                        <button
                          type="button"
                          onClick={() => setValue('imagen_url', '', { shouldDirty: true })}
                          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                        >
                          Quitar imagen
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      La imagen se optimiza y se guarda en la base de datos junto al producto.
                    </p>
                  </div>
                </div>
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Imagen</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nombre</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Categoría</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Precio</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Stock</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Unidad</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto) => (
                  <tr key={producto.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {producto.imagen_url ? (
                        <img 
                          src={producto.imagen_url} 
                          alt={producto.nombre} 
                          className="w-10 h-10 object-cover rounded shadow-sm"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/40?text=📦'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xl shadow-sm border border-gray-200">
                          📦
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">{producto.nombre}</td>
                    <td className="py-3 px-4 text-sm">{producto.categoria || '-'}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-blue-900">{formatCurrency(producto.precio_unitario)}</td>
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
                    <td className="py-3 px-4 text-sm font-black text-slate-900">{formatCurrency(producto.valor_inventario || 0)}</td>
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
