import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getPerfil } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPerfil()
      .then(res => setUsuario(res.data))
      .catch(() => setUsuario(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const response = await apiLogin({ email, password });
    setUsuario(response.data.usuario);
    return response.data;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('No se pudo cerrar sesion en el servidor:', error);
    }
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
