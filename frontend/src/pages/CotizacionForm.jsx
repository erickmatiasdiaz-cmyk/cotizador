import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { getClientes, getProductos, createCotizacion } from '../services/api';

const CotizacionForm = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [productoSearch, setProductoSearch] = useState('');

  const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      cliente_id: '',
      items: [{ producto_id: '', cantidad: 1, precio_unitario: 0 }],
      descuento_porcentaje: 0,
      notas: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  useEffect(() => {
    getClientes({ search: clienteSearch })
      .then(res => setClientes(res.data))
      .catch(console.error);
    
    getProductos({ search: productoSearch })
      .then(res => setProductos(res.data))
      .catch(console.error);
  }, [clienteSearch, productoSearch]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await createCotizacion({
        cliente_id: parseInt(data.cliente_id),
        items: data.items.map(item => ({
          producto_id: parseInt(item.producto_id),
          cantidad: parseFloat(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario)
        })),
        descuento_porcentaje: parseFloat(data.descuento_porcentaje) || 0,
        notas: data.notas
      });
      
      alert(`✅ Cotización creada exitosamente\nNúmero: ${response.data.id}`);
      navigate('/cotizaciones');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al crear cotización');
    } finally {
      setLoading(false);
    }
  };



  const hasStockIssues = watch('items').some(item => {
    const producto = productos.find(p => p.id === parseInt(item.producto_id));
    return producto && parseFloat(item.cantidad || 0) > producto.stock_actual;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Nueva Cotización</h1>
        <p className="text-gray-600 mt-1">Crea una nueva cotización para un cliente</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-md p-6">
        {/* Cliente */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente *
          </label>
          <input
            type="text"
            placeholder="Buscar cliente por nombre o empresa..."
            value={clienteSearch}
            onChange={(e) => setClienteSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
          />
          <select
            {...register('cliente_id', { required: 'Selecciona un cliente' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona un cliente</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre} {cliente.empresa ? `(${cliente.empresa})` : ''}
              </option>
            ))}
          </select>
          {errors.cliente_id && (
            <p className="text-red-600 text-sm mt-1">{errors.cliente_id.message}</p>
          )}
          <button
            type="button"
            onClick={() => navigate('/clientes')}
            className="text-blue-600 text-sm mt-2 hover:text-blue-800"
          >
            + Crear nuevo cliente
          </button>
        </div>

        {/* Items */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos</h3>
          
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
              <div className="col-span-12">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={productoSearch}
                  onChange={(e) => setProductoSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                />
              </div>
              <div className="col-span-6">
                <label className="block text-xs text-gray-600 mb-1">Producto</label>
                <Controller
                  name={`items.${index}.producto_id`}
                  control={control}
                  rules={{ required: 'Requerido' }}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      onChange={(e) => {
                        field.onChange(e);
                        const producto = productos.find(p => p.id === parseInt(e.target.value));
                        if (producto) {
                          setValue(`items.${index}.precio_unitario`, producto.precio_unitario);
                        }
                      }}
                    >
                      <option value="">Seleccionar</option>
                      {productos.map(prod => (
                        <option key={prod.id} value={prod.id}>
                          {prod.nombre} - ${prod.precio_unitario} (Stock: {prod.stock_actual})
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Cantidad</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register(`items.${index}.cantidad`, { required: 'Requerido', min: 0.01 })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    watch(`items.${index}.producto_id`) && 
                    parseFloat(watch(`items.${index}.cantidad`) || 0) > (productos.find(p => p.id === parseInt(watch(`items.${index}.producto_id`)))?.stock_actual || 0)
                    ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {watch(`items.${index}.producto_id`) && 
                 parseFloat(watch(`items.${index}.cantidad`) || 0) > (productos.find(p => p.id === parseInt(watch(`items.${index}.producto_id`)))?.stock_actual || 0) && (
                  <p className="text-xs text-red-600 mt-1 font-bold">¡Stock insuficiente!</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Precio Unit.</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register(`items.${index}.precio_unitario`, { required: 'Requerido', min: 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                  disabled={fields.length === 1}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => append({ producto_id: '', cantidad: 1, precio_unitario: 0 })}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            ➕ Agregar Producto
          </button>
        </div>

        {/* Descuento y Notas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descuento (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('descuento_porcentaje', { min: 0, max: 100 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              {...register('notas')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/cotizaciones')}
            className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || hasStockIssues}
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Cotización'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CotizacionForm;
