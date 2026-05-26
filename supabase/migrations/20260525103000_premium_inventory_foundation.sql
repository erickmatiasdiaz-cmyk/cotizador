create table if not exists empresas (
  id bigserial primary key,
  nombre text not null,
  rut text,
  email text,
  telefono text,
  direccion text,
  logo_url text,
  plan text not null default 'premium',
  creado_en timestamptz not null default now()
);

create table if not exists stock_movimientos (
  id bigserial primary key,
  producto_id bigint references productos(id) on delete set null,
  usuario_id bigint references usuarios(id) on delete set null,
  tipo text not null,
  cantidad numeric(12, 2) not null default 0,
  stock_anterior numeric(12, 2) not null default 0,
  stock_nuevo numeric(12, 2) not null default 0,
  motivo text,
  creado_en timestamptz not null default now()
);

create table if not exists cotizacion_eventos (
  id bigserial primary key,
  cotizacion_id bigint references cotizaciones(id) on delete cascade,
  usuario_id bigint references usuarios(id) on delete set null,
  evento text not null,
  detalle text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_stock_movimientos_producto on stock_movimientos(producto_id);
create index if not exists idx_stock_movimientos_creado_en on stock_movimientos(creado_en);
create index if not exists idx_cotizacion_eventos_cotizacion on cotizacion_eventos(cotizacion_id);

insert into empresas (nombre, email, telefono, direccion)
select
  coalesce((select valor from configuracion where clave = 'SUPERMERCADO_NOMBRE'), 'Comercial Pro'),
  (select valor from configuracion where clave = 'SUPERMERCADO_EMAIL'),
  (select valor from configuracion where clave = 'SUPERMERCADO_TELEFONO'),
  (select valor from configuracion where clave = 'SUPERMERCADO_DIRECCION')
where not exists (select 1 from empresas);
