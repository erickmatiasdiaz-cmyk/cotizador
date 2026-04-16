import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/api';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nombre: '',
      empresa: '',
      rfc: '',
      email: '',
      telefono: '',
      direccion: '',
      tipo: 'natural'
    }
  });

  useEffect(() => {
    loadClientes();
  }, [search]);

  const loadClientes = () => {
    setLoading(true);
    getClientes({ search })
      .then(res => setClientes(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await updateCliente(editingId, data);
        alert('✅ Cliente actualizado exitosamente');
      } else {
        await createCliente(data);
        alert('✅ Cliente creado exitosamente');
      }
      
      reset();
      setEditingId(null);
      setShowForm(false);
      loadClientes();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar cliente');
    }
  };

  const handleEdit = (cliente) => {
    reset(cliente);
    setEditingId(cliente.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;
    
    try {
      await deleteCliente(id);
      alert('Cliente eliminado');
      loadClientes();
    } catch (error) {
      alert('Error al eliminar cliente');
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
          <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
          <p className="text-gray-600 mt-1">Gestiona tu base de datos de clientes</p>
        </div>
        <button
          onClick={() => {
            reset();
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition font-medium"
        >
          ➕ Nuevo Cliente
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  {...register('empresa')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RFC
                </label>
                <input
                  {...register('rfc')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  {...register('telefono')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  {...register('tipo')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="natural">Persona Natural</option>
                  <option value="juridica">Persona Jurídica</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <textarea
                {...register('direccion')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
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
                {editingId ? 'Actualizar' : 'Crear'} Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, empresa, email o RFC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Empresa</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">RFC</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Teléfono</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium">{cliente.nombre}</td>
                    <td className="py-3 px-4 text-sm">{cliente.empresa || '-'}</td>
                    <td className="py-3 px-4 text-sm">{cliente.rfc || '-'}</td>
                    <td className="py-3 px-4 text-sm">{cliente.email || '-'}</td>
                    <td className="py-3 px-4 text-sm">{cliente.telefono || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        cliente.tipo === 'juridica' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {cliente.tipo === 'juridica' ? 'Jurídica' : 'Natural'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id)}
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
            {clientes.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No se encontraron clientes
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clientes;
