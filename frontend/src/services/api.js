import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
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
export const getCategorias = () => API.get('/productos/categorias');
export const createProducto = (data) => API.post('/productos', data);
export const importarInventario = (productos) => API.post('/productos/importar', productos);
export const updateProducto = (id, data) => API.put(`/productos/${id}`, data);
export const deleteProducto = (id) => API.delete(`/productos/${id}`);

// Cotizaciones
export const getCotizaciones = (params) => API.get('/cotizaciones', { params });
export const getCotizacion = (id) => API.get(`/cotizaciones/${id}`);
export const createCotizacion = (data) => API.post('/cotizaciones', data);
export const updateCotizacionEstado = (id, data) => API.put(`/cotizaciones/${id}/estado`, data);
export const convertirVenta = (id) => API.post(`/cotizaciones/${id}/convertir-venta`);
export const deleteCotizacion = (id) => API.delete(`/cotizaciones/${id}`);
export const getCotizacionesEstadisticas = () => API.get('/cotizaciones/estadisticas');
export const descargarPDF = (id) => {
  return axios.get(`/api/cotizaciones/${id}/pdf`, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
};
export const descargarFactura = (id) => {
  return axios.get(`/api/cotizaciones/${id}/factura/pdf`, {
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
export const solicitarPedidoPublico = (data) => API.post('/public/pedido', data);

export default API;
