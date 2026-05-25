import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CotizacionesList from './pages/CotizacionesList';
import CotizacionForm from './pages/CotizacionForm';
import CotizacionDetail from './pages/CotizacionDetail';
import Clientes from './pages/Clientes';
import Productos from './pages/Productos';
import Configuraciones from './pages/Configuraciones';
import Categorias from './pages/Categorias';

import CatalogoPublico from './pages/CatalogoPublico';
import Presentacion from './pages/Presentacion';

const AdminOnly = ({ usuario, children }) => {
  if (usuario?.rol !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
};

const AppRoutes = () => {
  const { usuario, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">Cargando...</div>;
  }

  return (
    <Routes>
      <Route path="/presentacion" element={<Presentacion />} />
      <Route path="/catalogo" element={<CatalogoPublico />} />
      
      {!usuario ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/presentacion" />} />
        </>
      ) : (
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cotizaciones" element={<CotizacionesList />} />
              <Route path="/cotizaciones/nueva" element={<CotizacionForm />} />
              <Route path="/cotizaciones/:id" element={<CotizacionDetail />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/productos" element={<AdminOnly usuario={usuario}><Productos /></AdminOnly>} />
              <Route path="/configuraciones" element={<AdminOnly usuario={usuario}><Configuraciones /></AdminOnly>} />
              <Route path="/categorias" element={<AdminOnly usuario={usuario}><Categorias /></AdminOnly>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        } />
      )}
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
