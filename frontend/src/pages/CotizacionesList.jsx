import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCotizaciones, deleteCotizacion, enviarEmail, descargarPDF } from '../services/api';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../utils/formatters';

const CotizacionesList = () => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  useEffect(() => {
    loadCotizaciones();
  }, [search, estadoFilter]);

  const loadCotizaciones = () => {
    setLoading(true);
    getCotizaciones({ search, estado: estadoFilter })
      .then(res => setCotizaciones(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta cotización?')) return;
    
    try {
      await deleteCotizacion(id);
      loadCotizaciones();
    } catch (error) {
      alert('Error al eliminar cotización');
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      const response = await descargarPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cotizacion-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error al descargar PDF');
    }
  };

  const handleSendEmail = async (id) => {
    if (!window.confirm('¿Enviar cotización por email al cliente?')) return;
    
    try {
      await enviarEmail(id);
      alert('Email enviado exitosamente');
      loadCotizaciones();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al enviar email');
    }
  };

  const handleExportExcel = () => {
    if (cotizaciones.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const dataToExport = cotizaciones.map(cot => ({
      'Número': cot.numero,
      'Cliente': cot.cliente_nombre,
      'Empresa': cot.cliente_empresa || '-',
      'Subtotal': cot.subtotal,
      'Descuento %': cot.descuento_porcentaje,
      'IVA': cot.iva,
      'Total': cot.total,
      'Estado': cot.estado.toUpperCase(),
      'Fecha': new Date(cot.creado_en).toLocaleDateString('es-MX')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
    XLSX.writeFile(wb, `Reporte_Cotizaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getEstadoBadge = (estado) => {
    const colors = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aceptada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
      anulada: 'bg-gray-100 text-gray-800',
      facturada: 'bg-purple-100 text-purple-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[estado] || 'bg-gray-100'}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  const resumen = cotizaciones.reduce((acc, cot) => {
    acc.total += Number(cot.total || 0);
    acc[cot.estado] = (acc[cot.estado] || 0) + 1;
    return acc;
  }, { total: 0 });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Commercial pipeline</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-gray-900">Cotizaciones</h1>
          <p className="text-gray-600 mt-1">Seguimiento, exportacion y control de oportunidades comerciales.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportExcel}
            className="bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition font-medium flex items-center"
          >
            <span className="mr-2">📊</span> Exportar a Excel
          </button>
          <Link
            to="/cotizaciones/nueva"
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition font-medium"
          >
            ➕ Nueva Cotización
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Valor filtrado', formatCurrency(resumen.total), `${cotizaciones.length} documentos en vista`, 'bg-slate-950 text-white'],
          ['Pendientes', resumen.pendiente || 0, 'Requieren gestion comercial', 'bg-amber-400 text-slate-950'],
          ['Aceptadas', resumen.aceptada || 0, 'Listas para convertir o facturar', 'bg-emerald-600 text-white'],
          ['Facturadas', resumen.facturada || 0, 'Ventas cerradas en el pipeline', 'bg-blue-700 text-white']
        ].map(([label, value, detail, tone]) => (
          <article key={label} className={`rounded-2xl p-5 shadow-sm ${tone}`}>
            <p className="text-xs font-black uppercase tracking-[0.14em] opacity-75">{label}</p>
            <p className="mt-3 text-2xl font-black">{value}</p>
            <p className="mt-1 text-sm opacity-75">{detail}</p>
          </article>
        ))}
      </section>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Buscar por número, cliente o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aceptada">Aceptada</option>
            <option value="rechazada">Rechazada</option>
            <option value="anulada">Anulada</option>
            <option value="facturada">Facturada</option>
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Número</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Subtotal</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Descuento</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Estado</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((cot) => (
                  <tr key={cot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      <Link to={`/cotizaciones/${cot.id}`} className="text-blue-600 hover:text-blue-800">
                        {cot.numero}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm">{cot.cliente_nombre}</td>
                    <td className="py-3 px-4 text-sm font-medium">{formatCurrency(cot.subtotal)}</td>
                    <td className="py-3 px-4 text-sm">
                      {cot.descuento_porcentaje > 0 ? `${cot.descuento_porcentaje}%` : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-blue-900">{formatCurrency(cot.total)}</td>
                    <td className="py-3 px-4">{getEstadoBadge(cot.estado)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(cot.creado_en).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadPDF(cot.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                          title="Descargar PDF"
                        >
                          📄 PDF
                        </button>
                        <button
                          onClick={() => handleSendEmail(cot.id)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                          title="Enviar por email"
                        >
                          📧 Email
                        </button>
                        <button
                          onClick={() => handleDelete(cot.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cotizaciones.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No se encontraron cotizaciones
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CotizacionesList;
