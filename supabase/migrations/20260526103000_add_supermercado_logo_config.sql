insert into configuracion (clave, valor)
values ('SUPERMERCADO_LOGO', '')
on conflict (clave) do nothing;
