import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCotizacion, updateCotizacionEstado, descargarPDF, descargarFactura, enviarEmail, convertirVenta } from '../services/api';

const CotizacionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCotizacion();
  }, [id]);

  const loadCotizacion = () => {
    setLoading(true);
    getCotizacion(id)
      .then(res => setCotizacion(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleUpdateEstado = async (estado) => {
    if (!window.confirm(`¿Marcar cotización como ${estado}?`)) return;
    
    try {
      await updateCotizacionEstado(id, { estado });
      alert(`Cotización marcada como ${estado}`);
      loadCotizacion();
    } catch (error) {
      alert('Error al actualizar estado');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await descargarPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cotizacion.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al descargar PDF');
    }
  };

  const handleDownloadFactura = async () => {
    try {
      const response = await descargarFactura(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cotizacion.factura_numero || 'factura'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al descargar Factura');
    }
  };

  const handleSendEmail = async () => {
    if (!window.confirm('¿Enviar cotización por email al cliente?')) return;
    
    try {
      await enviarEmail(id);
      alert('Email enviado exitosamente');
      loadCotizacion();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al enviar email');
    }
  };

  const handleConvertirVenta = async () => {
    if (!window.confirm('¿Estás seguro de convertir esta cotización en VENTA? Esto descontará el inventario irreversiblemente.')) return;
    
    try {
      await convertirVenta(id);
      alert('Venta concretada y stock actualizado exitosamente.');
      loadCotizacion();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al convertir en venta');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  if (!cotizacion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Cotización no encontrada</p>
        <button
          onClick={() => navigate('/cotizaciones')}
          className="text-blue-600 hover:text-blue-800 mt-4"
        >
          ← Volver a cotizaciones
        </button>
      </div>
    );
  }

  const getEstadoBadge = (estado) => {
    const colors = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aceptada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
      anulada: 'bg-gray-100 text-gray-800',
      facturada: 'bg-purple-100 text-purple-800'
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${colors[estado] || 'bg-gray-100'}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={() => navigate('/cotizaciones')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Volver
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              Cotización {cotizacion.numero}
            </h1>
            {cotizacion.factura_numero && (
              <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold text-sm">
                COMPROBANTE: {cotizacion.factura_numero}
              </span>
            )}
          </div>
          <p className="text-gray-600">
            Creada el {new Date(cotizacion.creado_en).toLocaleDateString('es-MX')}
          </p>
        </div>
        <div className="flex space-x-3">
          {getEstadoBadge(cotizacion.estado)}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Acciones</h3>
        <div className="flex flex-wrap gap-3">
          {cotizacion.estado !== 'facturada' && (
            <button
              onClick={handleDownloadPDF}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              📄 Descargar Cotización
            </button>
          )}
          {cotizacion.estado === 'facturada' && (
            <button
              onClick={handleDownloadFactura}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-bold"
            >
              🧾 Descargar Factura (PDF)
            </button>
          )}
          <button
            onClick={handleSendEmail}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            📧 Enviar por Email
          </button>
          {cotizacion.estado === 'pendiente' && (
            <>
              <button
                onClick={() => handleUpdateEstado('aceptada')}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
              >
                ✅ Marcar como Aceptada
              </button>
              <button
                onClick={() => handleUpdateEstado('rechazada')}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                ❌ Marcar como Rechazada
              </button>
              <button
                onClick={() => handleUpdateEstado('anulada')}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                ⛔ Anular
              </button>
            </>
          )}
          {cotizacion.estado === 'aceptada' && (
            <button
              onClick={handleConvertirVenta}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-bold"
            >
              💳 Convertir a Venta Facturada
            </button>
          )}
        </div>
      </div>

      {/* Cliente Info */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nombre</p>
            <p className="font-medium">{cotizacion.cliente_nombre}</p>
          </div>
          {cotizacion.cliente_empresa && (
            <div>
              <p className="text-sm text-gray-600">Empresa</p>
              <p className="font-medium">{cotizacion.cliente_empresa}</p>
            </div>
          )}
          {cotizacion.cliente_rfc && (
            <div>
              <p className="text-sm text-gray-600">RFC</p>
              <p className="font-medium">{cotizacion.cliente_rfc}</p>
            </div>
          )}
          {cotizacion.cliente_email && (
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{cotizacion.cliente_email}</p>
            </div>
          )}
          {cotizacion.cliente_telefono && (
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="font-medium">{cotizacion.cliente_telefono}</p>
            </div>
          )}
          {cotizacion.cliente_direccion && (
            <div>
              <p className="text-sm text-gray-600">Dirección</p>
              <p className="font-medium">{cotizacion.cliente_direccion}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Producto</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Cantidad</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Precio Unit.</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cotizacion.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 px-4">{item.producto_nombre}</td>
                  <td className="py-3 px-4 text-center">{item.cantidad}</td>
                  <td className="py-3 px-4 text-right">${item.precio_unitario.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-semibold">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex justify-end">
          <div className="w-full md:w-1/2 lg:w-1/3">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">${cotizacion.subtotal.toFixed(2)}</span>
            </div>
            {cotizacion.descuento_porcentaje > 0 && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">
                  Descuento ({cotizacion.descuento_porcentaje}%):
                </span>
                <span className="font-medium text-red-600">
                  -${cotizacion.descuento_monto.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">IVA (16%):</span>
              <span className="font-medium">${cotizacion.iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-3 text-xl">
              <span className="font-bold text-blue-900">TOTAL:</span>
              <span className="font-bold text-blue-900">${cotizacion.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {cotizacion.notas && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Notas</h3>
          <p className="text-gray-700">{cotizacion.notas}</p>
        </div>
      )}
    </div>
  );
};

export default CotizacionDetail;
