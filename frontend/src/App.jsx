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

import CatalogoPublico from './pages/CatalogoPublico';

const ProtectedRoute = ({ children }) => {
  const { usuario, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }
  
  return usuario ? children : <Navigate to="/catalogo" />;
};

const AppRoutes = () => {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/catalogo" element={<CatalogoPublico />} />
      
      {!usuario ? (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/catalogo" />} />
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
              <Route path="/productos" element={<Productos />} />
              <Route path="/configuraciones" element={<Configuraciones />} />
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
