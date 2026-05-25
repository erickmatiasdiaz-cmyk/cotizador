import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (credentials) => API.post('/auth/login', credentials);
export const getPerfil = () => API.get('/auth/perfil');

// Clientes
export const getClientes = (params) => API.get('/clientes', { params });
export const getCliente = (id) => API.get(`/clientes/${id}`);
export const createCliente = (data) => API.post('/clientes', data);
export const updateCliente = (id, data) => API.put(`/clientes/${id}`, data);
export const deleteCliente = (id) => API.delete(`/clientes/${id}`);

// Productos
export const getProductos = (params) => API.get('/productos', { params });
export const getProducto = (id) => API.get(`/productos/${id}`);
export const createProducto = (data) => API.post('/productos', data);
export const importarInventario = (productos) => API.post('/productos/importar', productos);
export const updateProducto = (id, data) => API.put(`/productos/${id}`, data);
export const deleteProducto = (id) => API.delete(`/productos/${id}`);

// Categorías
export const getCategorias = () => API.get('/categorias');
export const createCategoria = (data) => API.post('/categorias', data);
export const updateCategoria = (id, data) => API.put(`/categorias/${id}`, data);
export const deleteCategoria = (id) => API.delete(`/categorias/${id}`);

// Cotizaciones
export const getCotizaciones = (params) => API.get('/cotizaciones', { params });
export const getCotizacion = (id) => API.get(`/cotizaciones/${id}`);
export const createCotizacion = (data) => API.post('/cotizaciones', data);
export const updateCotizacionEstado = (id, data) => API.put(`/cotizaciones/${id}/estado`, data);
export const convertirVenta = (id) => API.post(`/cotizaciones/${id}/convertir-venta`);
export const deleteCotizacion = (id) => API.delete(`/cotizaciones/${id}`);
export const getCotizacionesEstadisticas = () => API.get('/cotizaciones/estadisticas');
export const descargarPDF = (id) => {
  return axios.get(`${API_BASE_URL}/cotizaciones/${id}/pdf`, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
};
export const descargarFactura = (id) => {
  return axios.get(`${API_BASE_URL}/cotizaciones/${id}/factura/pdf`, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
};
export const enviarEmail = (id) => API.post(`/cotizaciones/${id}/enviar-email`);

// Configuracion
// Configuracion
export const getConfiguracion = () => API.get('/configuracion');
export const updateConfiguracion = (data) => API.put('/configuracion', data);

// Rutas Públicas (Catálogo Web Libre)
export const getPublicConfig = () => API.get('/public/configuracion');
export const getPublicProductos = () => API.get('/public/productos');
export const getPublicCategorias = () => API.get('/public/categorias');
export const solicitarPedidoPublico = (data) => API.post('/public/pedido', data);

export default API;
