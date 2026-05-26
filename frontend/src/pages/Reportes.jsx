import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { getCotizaciones, getCotizacionesEstadisticas, getProductos, getProductosMetricas } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const STATUS_COLORS = {
  pendiente: '#f59e0b',
  aceptada: '#10b981',
  facturada: '#2563eb',
  rechazada: '#ef4444',
  anulada: '#64748b'
};

const Reportes = () => {
  const [stats, setStats] = useState(null);
  const [metricasProductos, setMetricasProductos] = useState(null);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCotizacionesEstadisticas(),
      getProductosMetricas(),
      getCotizaciones(),
      getProductos()
    ])
      .then(([statsRes, metricasRes, cotizacionesRes, productosRes]) => {
        setStats(statsRes.data);
        setMetricasProductos(metricasRes.data);
        setCotizaciones(cotizacionesRes.data);
        setProductos(productosRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const productosCriticos = useMemo(() => (
    [...productos]
      .filter(producto => Number(producto.stock_actual) < 25)
      .sort((a, b) => Number(a.stock_actual || 0) - Number(b.stock_actual || 0))
      .slice(0, 12)
  ), [productos]);

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      {
        'Pipeline comercial': Number(stats?.valor_total || 0),
        'Valor pendiente': Number(stats?.valor_pendiente || 0),
        'Valor aceptado/facturado': Number(stats?.valor_aceptado || 0),
        'Ticket promedio': Number(stats?.ticket_promedio || 0),
        'Conversion %': Number(stats?.tasa_conversion || 0),
        'Inventario valorizado': Number(stats?.valor_inventario || 0),
        'Productos': Number(stats?.total_productos || 0),
        'Unidades en stock': Number(stats?.unidades_stock || 0)
      }
    ]), 'Resumen');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cotizaciones.map(cot => ({
      Numero: cot.numero,
      Cliente: cot.cliente_nombre,
      Empresa: cot.cliente_empresa || '',
      Estado: cot.estado,
      Subtotal: Number(cot.subtotal || 0),
      IVA: Number(cot.iva || 0),
      Total: Number(cot.total || 0),
      Fecha: cot.creado_en ? new Date(cot.creado_en).toLocaleDateString('es-CL') : ''
    }))), 'Cotizaciones');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productos.map(producto => ({
      Producto: producto.nombre,
      Categoria: producto.categoria || '',
      Precio: Number(producto.precio_unitario || 0),
      Stock: Number(producto.stock_actual || 0),
      Unidad: producto.unidad_medida,
      'Valor inventario': Number(producto.valor_inventario || 0)
    }))), 'Inventario');

    XLSX.writeFile(wb, `Reportes_Comercial_Pro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Preparando reportes...</div>;
  }

  const kpis = [
    ['Pipeline comercial', formatCurrency(stats?.valor_total), `${stats?.total || 0} cotizaciones`, 'bg-slate-950 text-white'],
    ['Conversion', `${stats?.tasa_conversion || 0}%`, 'Aceptadas sobre emitidas', 'bg-emerald-600 text-white'],
    ['Inventario valorizado', formatCurrency(stats?.valor_inventario), `${stats?.unidades_stock || 0} unidades`, 'bg-blue-700 text-white'],
    ['Stock critico', Number(metricasProductos?.criticos || 0) + Number(metricasProductos?.sin_stock || 0), 'Productos bajo umbral', 'bg-rose-600 text-white']
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-950/10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Reportes</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em]">
              Inteligencia comercial e inventario para decisiones de gerencia.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Panel ejecutivo con exportacion, pipeline, valorizacion de stock y alertas operativas.
            </p>
          </div>
          <button
            type="button"
            onClick={exportarExcel}
            className="rounded-xl bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950"
          >
            Exportar Excel
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value, detail, tone]) => (
          <article key={label} className={`rounded-2xl p-5 shadow-sm ${tone}`}>
            <p className="text-xs font-black uppercase tracking-[0.14em] opacity-75">{label}</p>
            <p className="mt-3 text-2xl font-black">{value}</p>
            <p className="mt-1 text-sm opacity-75">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-slate-950">Pipeline por estado</h2>
          <p className="text-sm text-slate-500">Valor monetario agrupado por estado comercial.</p>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.pipeline || []} dataKey="valor" nameKey="estado" innerRadius={70} outerRadius={110} paddingAngle={4}>
                  {(stats?.pipeline || []).map((item) => (
                    <Cell key={item.estado} fill={STATUS_COLORS[item.estado] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-slate-950">Inventario por categoria</h2>
          <p className="text-sm text-slate-500">Valorizacion del stock disponible.</p>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(stats?.categoriasInventario || []).slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="categoria" width={120} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="valor" fill="#0f172a" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Cotizaciones para seguimiento</h2>
              <p className="text-sm text-slate-500">Prioriza oportunidades pendientes y de mayor valor.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">Numero</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">Cliente</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">Estado</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...cotizaciones].sort((a, b) => Number(b.total || 0) - Number(a.total || 0)).slice(0, 10).map(cot => (
                  <tr key={cot.id} className="border-b border-slate-100">
                    <td className="px-3 py-4 text-sm font-black text-blue-700">{cot.numero}</td>
                    <td className="px-3 py-4 text-sm text-slate-700">{cot.cliente_nombre}</td>
                    <td className="px-3 py-4 text-sm font-bold uppercase text-slate-500">{cot.estado}</td>
                    <td className="px-3 py-4 text-sm font-black text-slate-950">{formatCurrency(cot.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cotizaciones.length === 0 && (
              <p className="py-8 text-center text-sm font-semibold text-slate-400">Aun no hay cotizaciones para reportar.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-black text-slate-950">Alertas de inventario</h2>
          <p className="text-sm text-slate-500">Productos bajo el umbral recomendado.</p>
          <div className="mt-5 space-y-3">
            {productosCriticos.map(producto => (
              <div key={producto.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{producto.nombre}</p>
                  <p className="text-xs text-slate-500">{producto.categoria || 'Sin categoria'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${Number(producto.stock_actual) < 10 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {producto.stock_actual}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{producto.unidad_medida}</p>
                </div>
              </div>
            ))}
            {productosCriticos.length === 0 && (
              <p className="rounded-xl bg-emerald-50 p-5 text-center text-sm font-bold text-emerald-700">
                Inventario saludable: no hay alertas bajo 25 unidades.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default Reportes;
