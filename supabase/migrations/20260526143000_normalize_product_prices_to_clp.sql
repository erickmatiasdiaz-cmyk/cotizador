update configuracion
set valor = 'CLP'
where clave = 'MONEDA';

update productos
set precio_unitario = round(precio_unitario, 0);
