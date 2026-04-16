import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/cotizaciones', label: 'Cotizaciones', icon: '📝' },
    { path: '/cotizaciones/nueva', label: 'Nueva Cotización', icon: '➕' },
    { path: '/clientes', label: 'Clientes', icon: '👥' },
    { path: '/productos', label: 'Productos', icon: '📦' },
    { path: '/configuraciones', label: 'Configuración', icon: '⚙️' },
    { path: '/catalogo', label: 'Ver Catálogo Web', icon: '🌐' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🛒</span>
              <h1 className="text-xl font-bold">Cotizador Supermercado</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-200">{usuario.nombre}</span>
              <button
                onClick={handleLogout}
                className="bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-screen">
          <nav className="p-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-2 transition ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
