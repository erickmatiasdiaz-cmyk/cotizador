import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCotizacionesEstadisticas, getCotizaciones } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  const statCards = [
    {
      title: 'Total Cotizaciones',
      value: stats?.total || 0,
      icon: '📝',
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Pendientes',
      value: stats?.pendientes || 0,
      icon: '⏳',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Aceptadas',
      value: stats?.aceptadas || 0,
      icon: '✅',
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Valor Total',
      value: formatCurrency(stats?.valor_total || 0),
      icon: '💰',
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Stock en Alerta',
      value: stats?.bajoStockCount || 0,
      icon: '⚠️',
      color: stats?.bajoStockCount > 0 ? 'bg-red-500' : 'bg-gray-400',
      textColor: stats?.bajoStockCount > 0 ? 'text-red-600' : 'text-gray-600'
    }
  ];

  const getEstadoBadge = (estado) => {
    const colors = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aceptada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800',
      anulada: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[estado] || 'bg-gray-100'}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <span className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </span>
            </div>
            <p className="text-gray-600 text-sm">{stat.title}</p>
            <p className={`text-2xl font-bold ${stat.textColor} mt-1`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ingresos Area Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ingresos por Ventas (7 Días)</h2>
          {stats?.ventasPorDia && stats.ventasPorDia.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.ventasPorDia} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value}`} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">Sin datos de facturación recientes</div>
          )}
        </div>

        {/* Top Productos Pie Chart */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Top 5 Productos Vendidos</h2>
          {stats?.topProductos && stats.topProductos.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topProductos}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="cantidad"
                    nameKey="nombre"
                  >
                    {stats.topProductos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} u.`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center mt-2 flex-wrap gap-2">
                {stats.topProductos.map((entry, index) => (
                  <div key={index} className="flex items-center text-xs text-gray-600">
                    <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    {entry.nombre}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">No hay estadística de productos</div>
          )}
        </div>
      </div>

      {/* Recent Cotizaciones & Low Stock Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Cotizaciones */}
        <div className="bg-white rounded-xl shadow-md p-6 xl:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Cotizaciones Recientes</h2>
            <Link to="/cotizaciones" className="text-blue-600 hover:text-blue-800 text-sm">
              Ver todas →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Número</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentCotizaciones.map((cot) => (
                  <tr key={cot.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      <Link to={`/cotizaciones/${cot.id}`} className="text-blue-600 hover:text-blue-800">
                        {cot.numero}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm">{cot.cliente_nombre}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-blue-900">{formatCurrency(cot.total)}</td>
                    <td className="py-3 px-4">{getEstadoBadge(cot.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentCotizaciones.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay cotizaciones aún</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Alertas de Stock</h2>
            <Link to="/productos" className="text-blue-600 hover:text-blue-800 text-sm">
              Gestionar →
            </Link>
          </div>
          <div className="space-y-4">
            {stats?.bajoStockLista && stats.bajoStockLista.length > 0 ? (
              stats.bajoStockLista.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{prod.nombre}</span>
                    <span className="text-xs text-gray-500">{prod.unidad}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-600">{prod.stock}</span>
                    <p className="text-[10px] text-red-400 uppercase font-bold">Quedan</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-gray-500 text-sm">Todo el stock está en niveles óptimos</p>
              </div>
            )}
            {stats?.bajoStockCount > 5 && (
              <p className="text-xs text-center text-gray-400 mt-2">
                Y {stats.bajoStockCount - 5} productos más en alerta...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
