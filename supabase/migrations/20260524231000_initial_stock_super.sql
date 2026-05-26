create table if not exists usuarios (
  id bigserial primary key,
  nombre text not null,
  email text not null unique,
  password text not null,
  rol text not null default 'vendedor',
  creado_en timestamptz not null default now()
);

create table if not exists clientes (
  id bigserial primary key,
  nombre text not null,
  empresa text,
  rfc text,
  email text,
  telefono text,
  direccion text,
  tipo text not null default 'natural',
  creado_en timestamptz not null default now()
);

create table if not exists categorias (
  id bigserial primary key,
  nombre text not null unique,
  descripcion text
);

create table if not exists productos (
  id bigserial primary key,
  nombre text not null,
  descripcion text,
  categoria_id bigint references categorias(id) on delete set null,
  precio_unitario numeric(12, 2) not null,
  stock_actual integer not null default 0,
  unidad_medida text not null default 'unidad',
  imagen_url text
);

create table if not exists cotizaciones (
  id bigserial primary key,
  numero text not null unique,
  cliente_id bigint references clientes(id) on delete set null,
  usuario_id bigint references usuarios(id) on delete set null,
  subtotal numeric(12, 2) not null default 0,
  iva numeric(12, 2) not null default 0,
  descuento_porcentaje numeric(6, 2) not null default 0,
  descuento_monto numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notas text,
  validez_dias integer not null default 15,
  fecha_validez date,
  estado text not null default 'pendiente',
  stock_descontado boolean not null default false,
  enviado_email boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  factura_numero text,
  factura_fecha timestamptz
);

create table if not exists cotizacion_items (
  id bigserial primary key,
  cotizacion_id bigint not null references cotizaciones(id) on delete cascade,
  producto_id bigint not null references productos(id),
  cantidad numeric(12, 2) not null,
  precio_unitario numeric(12, 2) not null,
  subtotal numeric(12, 2) not null
);

create table if not exists configuracion (
  id bigserial primary key,
  clave text not null unique,
  valor text not null
);

create table if not exists auditoria (
  id bigserial primary key,
  usuario_id bigint references usuarios(id) on delete set null,
  usuario_email text,
  accion text not null,
  entidad text not null,
  entidad_id bigint,
  detalle text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_clientes_nombre on clientes(nombre);
create index if not exists idx_productos_categoria_id on productos(categoria_id);
create index if not exists idx_productos_nombre on productos(nombre);
create index if not exists idx_cotizaciones_cliente_id on cotizaciones(cliente_id);
create index if not exists idx_cotizaciones_estado on cotizaciones(estado);
create index if not exists idx_cotizaciones_creado_en on cotizaciones(creado_en);
create index if not exists idx_cotizacion_items_cotizacion_id on cotizacion_items(cotizacion_id);

insert into configuracion (clave, valor) values
  ('SUPERMERCADO_NOMBRE', 'Mi Supermercado'),
  ('SUPERMERCADO_DIRECCION', 'Calle Principal #123'),
  ('SUPERMERCADO_TELEFONO', '+1 234 567 8900'),
  ('SUPERMERCADO_EMAIL', 'contacto@supermercado.com'),
  ('SUPERMERCADO_LOGO', ''),
  ('IVA_PORCENTAJE', '16'),
  ('MONEDA', 'MXN')
on conflict (clave) do nothing;

insert into usuarios (nombre, email, password, rol)
values ('Administrador', 'admin@supermercado.com', '$2a$10$76X2kMNnMjUGVHL8nWF0zOvDA7yHtd67f7igMsl7da3fFLlO0hcBW', 'admin')
on conflict (email) do nothing;

insert into categorias (nombre, descripcion) values
  ('Abarrotes', 'Productos de abarrotes en general'),
  ('Lacteos', 'Leche, quesos, yogures'),
  ('Carnes', 'Carnes frias y frescas'),
  ('Frutas y Verduras', 'Productos frescos'),
  ('Bebidas', 'Refrescos, jugos, agua'),
  ('Limpieza', 'Productos de limpieza'),
  ('Higiene', 'Productos de higiene personal'),
  ('Panaderia', 'Pan y productos de panaderia'),
  ('Lacteos y Huevos', 'Productos lacteos y huevos'),
  ('Enlatados', 'Productos enlatados y conservas')
on conflict (nombre) do nothing;
