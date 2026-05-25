import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/api';

const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '',
      descripcion: ''
    }
  });

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = () => {
    setLoading(true);
    getCategorias()
      .then(res => setCategorias(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await updateCategoria(editingId, data);
        alert('✅ Categoría actualizada exitosamente');
      } else {
        await createCategoria(data);
        alert('✅ Categoría creada exitosamente');
      }
      
      reset();
      setEditingId(null);
      setShowForm(false);
      loadCategorias();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar categoría');
    }
  };

  const handleEdit = (categoria) => {
    reset({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || ''
    });
    setEditingId(categoria.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría? Los productos asociados quedarán "Sin categoría".')) return;
    
    try {
      await deleteCategoria(id);
      alert('Categoría eliminada');
      loadCategorias();
    } catch (error) {
      alert('Error al eliminar categoría');
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
          <h1 className="text-3xl font-bold text-gray-800">Categorías</h1>
          <p className="text-gray-600 mt-1">Organiza tus productos por grupos</p>
        </div>
        <button
          onClick={() => {
            reset();
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition font-medium"
        >
          ➕ Nueva Categoría
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
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
                {editingId ? 'Actualizar' : 'Crear'} Categoría
              </button>
            </div>
          </form>
        </div>
      )}

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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Descripción</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Productos</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-blue-900">{cat.nombre}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{cat.descripcion || '-'}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        {cat.total_productos} productos
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(cat)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
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
            {categorias.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No hay categorías definidas aún
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Categorias;
