import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCotizacionesEstadisticas, getCotizaciones } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const PIPELINE_COLORS = {
  pendiente: '#f59e0b',
  aceptada: '#10b981',
  facturada: '#2563eb',
  rechazada: '#ef4444',
  anulada: '#64748b'
};

const numberValue = (value) => Number(value || 0);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentCotizaciones, setRecentCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCotizacionesEstadisticas(),
      getCotizaciones({ limit: 5 })
    ])
      .then(([statsRes, cotizacionesRes]) => {
        setStats(statsRes.data);
        setRecentCotizaciones(cotizacionesRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pipeline = useMemo(() => stats?.pipeline || [], [stats]);
  const categoriasInventario = useMemo(() => (stats?.categoriasInventario || []).slice(0, 6), [stats]);

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Cargando centro ejecutivo...</div>;
  }

  const kpis = [
    {
      label: 'Pipeline comercial',
      value: formatCurrency(stats?.valor_total),
      detail: `${stats?.total || 0} cotizaciones emitidas`,
      tone: 'bg-slate-950 text-white'
    },
    {
      label: 'Conversion',
      value: `${stats?.tasa_conversion || 0}%`,
      detail: `${stats?.aceptadas || 0} aceptadas de ${stats?.total || 0}`,
      tone: 'bg-emerald-600 text-white'
    },
    {
      label: 'Ticket promedio',
      value: formatCurrency(stats?.ticket_promedio),
      detail: 'Promedio por cotizacion',
      tone: 'bg-indigo-600 text-white'
    },
    {
      label: 'Inventario valorizado',
      value: formatCurrency(stats?.valor_inventario),
      detail: `${stats?.unidades_stock || 0} unidades en stock`,
      tone: 'bg-amber-500 text-slate-950'
    }
  ];

  const getEstadoBadge = (estado) => {
    const colors = {
      pendiente: 'bg-amber-100 text-amber-800',
      aceptada: 'bg-emerald-100 text-emerald-800',
      rechazada: 'bg-rose-100 text-rose-800',
      anulada: 'bg-slate-100 text-slate-700',
      facturada: 'bg-blue-100 text-blue-800'
    };

    return (
      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${colors[estado] || 'bg-slate-100 text-slate-700'}`}>
        {estado}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-950/10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Control tower</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em]">
              Operacion comercial, inventario y ventas en una sola vista.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Inspirado en los tableros de plataformas como Vextra, ProShops e InventarioPro: menos planillas,
              mas senales de accion.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Link to="/cotizaciones/nueva" className="rounded-xl bg-white px-4 py-3 text-center font-black text-slate-950">
              Nueva cotizacion
            </Link>
            <Link to="/productos" className="rounded-xl bg-white/10 px-4 py-3 text-center font-black text-white ring-1 ring-white/15">
              Inventario
            </Link>
            <Link to="/catalogo" className="rounded-xl bg-white/10 px-4 py-3 text-center font-black text-white ring-1 ring-white/15">
              Catalogo
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={`rounded-2xl p-5 shadow-lg ${kpi.tone}`}>
            <p className="text-xs font-black uppercase tracking-[0.16em] opacity-75">{kpi.label}</p>
            <p className="mt-4 text-3xl font-black tracking-[-0.03em]">{kpi.value}</p>
            <p className="mt-2 text-sm opacity-78">{kpi.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Ventas facturadas</h2>
              <p className="text-sm text-slate-500">Ultimos 7 dias con estado facturada.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-blue-700">
              Revenue
            </span>
          </div>
          <div className="h-72">
            {stats?.ventasPorDia?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.ventasPorDia}>
                  <defs>
                    <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fill="url(#dashboardRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-400">
                Aun no hay ventas facturadas para graficar.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-950">Pipeline por estado</h2>
            <p className="text-sm text-slate-500">Valor y volumen de oportunidades.</p>
          </div>
          <div className="h-72">
            {pipeline.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipeline} dataKey="valor" nameKey="estado" innerRadius={64} outerRadius={100} paddingAngle={4}>
                    {pipeline.map((entry) => (
                      <Cell key={entry.estado} fill={PIPELINE_COLORS[entry.estado] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-400">
                Sin cotizaciones en pipeline.
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {pipeline.map((item) => (
              <div key={item.estado} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">{item.estado}</p>
                <p className="mt-1 text-sm font-black text-slate-950">{formatCurrency(item.valor)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Inventario por categoria</h2>
              <p className="text-sm text-slate-500">Donde esta inmovilizado el valor.</p>
            </div>
            <Link to="/productos" className="text-sm font-black text-blue-700">Gestionar</Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoriasInventario} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="categoria" width={112} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="valor" fill="#0f172a" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Cotizaciones recientes</h2>
              <p className="text-sm text-slate-500">Seguimiento comercial de alta prioridad.</p>
            </div>
            <Link to="/cotizaciones" className="text-sm font-black text-blue-700">Ver todas</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">Numero</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">Cliente</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">Total</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentCotizaciones.map((cot) => (
                  <tr key={cot.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-4 text-sm font-black">
                      <Link to={`/cotizaciones/${cot.id}`} className="text-blue-700">{cot.numero}</Link>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-700">{cot.cliente_nombre}</td>
                    <td className="px-3 py-4 text-sm font-black text-slate-950">{formatCurrency(cot.total)}</td>
                    <td className="px-3 py-4">{getEstadoBadge(cot.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentCotizaciones.length === 0 && (
              <p className="py-8 text-center text-sm font-semibold text-slate-400">No hay cotizaciones aun.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
