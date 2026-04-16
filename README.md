# 🛒 Cotizador Supermercado

Sistema de generación de cotizaciones para supermercados con generación de PDF y envío por email.

## 🚀 Características

- ✅ Autenticación con JWT
- ✅ CRUD de clientes
- ✅ CRUD de productos con categorías
- ✅ Creación de cotizaciones con múltiples productos
- ✅ Cálculo automático de subtotal, IVA y descuentos
- ✅ Generación de PDF profesional
- ✅ Envío de cotizaciones por email
- ✅ Tracking de estado (pendiente, aceptada, rechazada, anulada)
- ✅ Dashboard con estadísticas
- ✅ Interfaz moderna y responsive

## 📋 Requisitos

- Node.js 18+
- npm o yarn

## 🛠️ Instalación

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tu configuración

# Ejecutar migraciones e iniciar servidor
npm run dev
```

El backend correrá en `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend correrá en `http://localhost:5173`

## 🔑 Credenciales por defecto

```
Email: admin@supermercado.com
Contraseña: admin123
```

## 📁 Estructura del Proyecto

```
proyecto1/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuración de base de datos
│   │   ├── controllers/    # Lógica de negocio
│   │   ├── database/       # Migraciones
│   │   ├── middleware/     # Auth y validaciones
│   │   ├── routes/         # Rutas API
│   │   ├── utils/          # PDF y email
│   │   └── app.js          # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── context/        # Contexto de autenticación
│   │   ├── pages/          # Páginas principales
│   │   ├── services/       # Llamadas API
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### Auth
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/registro` - Registrar usuario
- `GET /api/auth/perfil` - Obtener perfil

### Clientes
- `GET /api/clientes` - Listar clientes
- `GET /api/clientes/:id` - Obtener cliente
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente

### Productos
- `GET /api/productos` - Listar productos
- `GET /api/productos/categorias` - Listar categorías
- `GET /api/productos/:id` - Obtener producto
- `POST /api/productos` - Crear producto
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto

### Cotizaciones
- `GET /api/cotizaciones` - Listar cotizaciones
- `GET /api/cotizaciones/estadisticas` - Estadísticas
- `GET /api/cotizaciones/:id` - Obtener cotización
- `POST /api/cotizaciones` - Crear cotización
- `PUT /api/cotizaciones/:id/estado` - Actualizar estado
- `DELETE /api/cotizaciones/:id` - Eliminar cotización
- `GET /api/cotizaciones/:id/pdf` - Descargar PDF
- `POST /api/cotizaciones/:id/enviar-email` - Enviar por email

## 🎨 Tecnologías

**Backend:**
- Node.js + Express
- SQLite (better-sqlite3)
- JWT (jsonwebtoken)
- PDFKit (generación PDF)
- Nodemailer (envío emails)
- bcryptjs (encriptación)

**Frontend:**
- React 18
- Vite
- TailwindCSS
- React Router DOM
- React Hook Form
- Axios

## 📊 Base de Datos

El sistema usa SQLite con las siguientes tablas:

- `usuarios` - Usuarios del sistema
- `clientes` - Clientes (personas naturales y jurídicas)
- `categorias` - Categorías de productos
- `productos` - Catálogo de productos
- `cotizaciones` - Cotizaciones generadas
- `cotizacion_items` - Items de cada cotización
- `configuracion` - Configuración del sistema

## 🚀 Producción

### Build Frontend

```bash
cd frontend
npm run build
```

Los archivos estáticos se generan en `frontend/dist/`

### Iniciar Backend

```bash
cd backend
npm start
```

## 🔒 Seguridad

- Tokens JWT con expiración
- Contraseñas encriptadas con bcrypt
- Validación de autenticación en todas las rutas
- CORS configurado

## 📝 Licencia

MIT

## 👨‍💻 Desarrollado por

Tu Nombre - 2026
